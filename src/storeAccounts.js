// B2B account actions: branches of a business, and adding another product to the account.
import { addDays, nowISO, todayISO, uid } from './config';
import { accountOf } from './accounts';

export function accountActions({ update, notify, log, actorName, toast }) {
  return {
    // Owner / manager: look at one branch, or 'all'.
    setBranch: (branchId) => update(() => ({ branchId: branchId || 'all' })),

    // POST / PATCH /v1/partners/:id/branches
    saveBranch: (branch) => {
      update((s) => {
        if (branch.id) return { branches: s.branches.map((b) => (b.id === branch.id ? { ...b, ...branch } : b)), activity: log(s, actorName(s), `Updated branch ${branch.name}`) };
        const id = uid('br');
        return {
          branches: [...s.branches, { id, partnerId: s.partnerId, name: branch.name, area: branch.area || branch.name, city: branch.city || 'Chennai', phone: branch.phone || '', address: branch.address || '', isMain: false, status: 'active', createdAt: todayISO() }],
          activity: log(s, actorName(s), `Opened branch ${branch.name}`),
        };
      });
      toast(branch.id ? 'Branch updated' : 'Branch added');
    },
    setBranchStatus: (id, status) => {
      update((s) => {
        const b = s.branches.find((x) => x.id === id);
        if (!b || (b.isMain && status !== 'active')) return {};
        return { branches: s.branches.map((x) => (x.id === id ? { ...x, status } : x)), branchId: s.branchId === id ? 'all' : s.branchId, activity: log(s, actorName(s), `${status === 'active' ? 'Reopened' : 'Closed'} branch ${b.name}`) };
      });
      toast(status === 'active' ? 'Branch reopened' : 'Branch closed. Its records stay in reports.');
    },
    setMainBranch: (id) => {
      update((s) => {
        const b = s.branches.find((x) => x.id === id);
        return { branches: s.branches.map((x) => (x.partnerId === b.partnerId ? { ...x, isMain: x.id === id } : x)), activity: log(s, actorName(s), `Made ${b.name} the main branch`) };
      });
      toast('Main branch changed');
    },
    // A team member works in one branch, or in all of them (branchId null).
    setMemberBranch: (memberId, branchId) => {
      update((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, branchId: branchId || null } : m)) }));
      toast('Branch updated');
    },
    // Hand a lead (and its quotes, booking, invoice and calendar hold) to another branch.
    moveLeadBranch: (leadId, branchId) => {
      update((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        const b = s.bookings.find((x) => x.leadId === leadId);
        const to = s.branches.find((x) => x.id === branchId);
        return {
          leads: s.leads.map((l) => (l.id === leadId ? { ...l, branchId } : l)),
          quotes: s.quotes.map((q) => (q.leadId === leadId ? { ...q, branchId } : q)),
          bookings: s.bookings.map((x) => (b && x.id === b.id ? { ...x, branchId } : x)),
          invoices: s.invoices.map((i) => (b && i.bookingId === b.id ? { ...i, branchId } : i)),
          blocks: s.blocks.map((x) => (b && x.bookingId === b.id ? { ...x, branchId } : x)),
          activity: log(s, actorName(s), `Moved lead ${lead.contactName} to ${to ? to.name : 'another branch'}`),
        };
      });
      toast('Moved to the other branch');
    },

    // Owner sets up a product that Vizha (or their reseller) has enabled for the organization.
    // It becomes its own business (listing, CRM module, team, branches) and goes to admin review.
    addProduct: ({ category, name, area, city }) => {
      const pid = uid('p');
      update((s) => {
        const acc = accountOf(s);
        const from = s.partners.find((p) => p.id === s.partnerId);
        const owner = s.members.find((m) => m.partnerId === s.partnerId && m.role === 'owner');
        const nb = makeBusiness(s, { pid, acc, category, name, area, city, gstin: from.gstin, ownerId: from.ownerId, owner });
        return {
          ...nb,
          activity: [{ id: uid('al'), partnerId: pid, actor: actorName(s), action: `Started ${catName(s, category)} as ${name}`, at: nowISO() }, ...s.activity],
          notifications: notify(s, 'admin', `${from.name} set up ${catName(s, category)} (${name}) - review the new listing`, '/admin/verification'),
          partnerId: pid,
          branchId: 'all',
        };
      });
      toast('Product set up. Add packages to your listing, then it goes live after review.');
      return pid;
    },
    // Owner asks for a product that is not enabled yet (upgrade / add-on). The Super Admin decides.
    requestProduct: (category) => {
      update((s) => {
        const acc = accountOf(s);
        const to = acc && acc.parentId ? 'reseller' : 'admin';
        return {
          productRequests: [{ id: uid('pr'), accountId: acc.id, category, status: 'pending', at: nowISO(), by: actorName(s), to }, ...(s.productRequests || [])],
          notifications: notify(s, to, `${acc.name} asked for ${catName(s, category)}`, to === 'admin' ? '/admin/orgs' : '/reseller'),
        };
      });
      toast('Request sent. You will be notified once it is enabled.');
    },

    // ---------- Super Admin: organizations and their products ----------
    // PATCH /v1/admin/orgs/:id/products - enable or disable one of the 11 products for an organization.
    setProductEnabled: (accountId, category, on, by = 'Super Admin') => {
      update((s) => applyProduct(s, accountId, category, on, by));
      toast(on ? 'Product enabled' : 'Product disabled. Its listing is hidden and the CRM module is locked.');
    },
    decideProductRequest: (id, approve) => {
      update((s) => {
        const r = (s.productRequests || []).find((x) => x.id === id);
        const base = approve ? applyProduct(s, r.accountId, r.category, true, r.to === 'reseller' ? 'Partner' : 'Super Admin') : {};
        return { ...base, productRequests: (base.productRequests || s.productRequests).map((x) => (x.id === id ? { ...x, status: approve ? 'approved' : 'declined', decidedAt: nowISO() } : x)) };
      });
      toast(approve ? 'Approved and enabled' : 'Request declined');
    },
    setOrgStatus: (accountId, status) => {
      update((s) => {
        const ids = [accountId, ...(s.accounts || []).filter((a) => a.parentId === accountId).map((a) => a.id)];
        return {
          accounts: s.accounts.map((a) => (ids.includes(a.id) ? { ...a, status } : a)),
          partners: s.partners.map((p) => (ids.includes(p.accountId) ? { ...p, orgSuspended: status !== 'active' } : p)),
        };
      });
      toast(status === 'active' ? 'Organization reactivated' : 'Organization suspended. Its listings are hidden.');
    },
    // POST /v1/admin/orgs - a direct customer or a reseller partner, with its products.
    createOrg: ({ type, name, ownerName, ownerPhone, city, area, products, gstin }) => {
      const aid = uid('ac');
      update((s) => {
        const acc = { id: aid, type, parentId: null, ownerId: null, ownerName, ownerPhone, name, gstin: gstin || '', city: city || 'Chennai', createdAt: todayISO(), status: 'active', enabledProducts: products, maxSubOrgs: type === 'reseller' ? 10 : undefined };
        let next = { ...s, accounts: [...s.accounts, acc] };
        // A direct customer gets a business for every enabled product straight away.
        if (type === 'direct') products.forEach((c) => (next = { ...next, ...makeBusiness(next, { pid: uid('p'), acc, category: c, name: products.length > 1 ? `${name} ${catName(next, c)}` : name, area, city, gstin, ownerName, ownerPhone }) }));
        return { accounts: next.accounts, partners: next.partners, listings: next.listings, subscriptions: next.subscriptions, branches: next.branches, members: next.members };
      });
      toast(type === 'reseller' ? 'Partner organization created' : 'Customer organization created');
      return aid;
    },

    // ---------- Reseller partner ----------
    // POST /v1/partners/:id/sub-orgs - a new business under the partner, using one of the partner's products.
    createSubOrg: ({ name, ownerName, ownerPhone, area, city, category, gstin }) => {
      update((s) => {
        const parent = (s.accounts || []).find((a) => a.id === (s.resellerId || 'ac-res1'));
        const aid = uid('ac');
        const acc = { id: aid, type: 'sub', parentId: parent.id, ownerId: null, ownerName, ownerPhone, name, gstin: gstin || '', city: city || 'Chennai', createdAt: todayISO(), status: 'active', enabledProducts: [category] };
        const next = { ...s, accounts: [...s.accounts, acc] };
        return {
          ...makeBusiness(next, { pid: uid('p'), acc, category, name, area, city, gstin, ownerName, ownerPhone }),
          accounts: next.accounts,
          notifications: notify(s, 'admin', `${parent.name} added a sub-organization: ${name}`, '/admin/orgs'),
        };
      });
      toast('Sub-organization created. Its listing goes live after review.');
    },
    // Partner opens one of its sub-organizations in the CRM with owner rights.
    manageSubOrg: (partnerId) => update(() => ({ role: 'owner', partnerId, branchId: 'all', managedBy: 'ac-res1' })),
    stopManaging: () => update(() => ({ role: 'reseller', managedBy: null })),
  };
}

const catName = (s, c) => (s.categories.find((x) => x.id === c) || { name: c }).name;

// A new business for one product: partner record, draft listing, plan, main branch and owner.
function makeBusiness(s, { pid, acc, category, name, area, city, gstin, ownerId, owner, ownerName, ownerPhone }) {
  const template = s.listings.find((l) => l.category === category) || {};
  const today = todayISO();
  const partner = { id: pid, name, ownerId: ownerId || null, accountId: acc.id, category, gstin: gstin || acc.gstin || '', verification: 'pending', subscription: 'active', city: city || acc.city || 'Chennai', joined: today, productAddedAt: nowISO(), productStatus: 'active' };
  const listing = {
    id: uid('l'), partnerId: pid, category, title: name, area: area || '', distanceKm: 5, priceFrom: 0, priceUnit: template.priceUnit || 'per event', rating: 0, ratingCount: 0, featured: false, verified: false,
    years: 0, responseTime: 'within 3 hours', capacity: 1, eventTypes: template.eventTypes || [], about: '', highlights: [], packages: [], addons: [], attributes: {}, faqs: [], serviceAreas: [],
    hours: template.hours || {}, availability: { ...(template.availability || { capacity: 1, closedWeekdays: [], leadDays: null, dailyOrders: 6 }), capacity: 1 }, pricingRules: [], extraCategories: [],
  };
  const sub = { partnerId: pid, plan: 'Partner Basic', price: 199, status: 'active', periodStart: today, periodEnd: addDays(today, 30), autoRenew: true, trialEnds: null, history: [], events: [{ at: nowISO(), text: `${catName(s, category)} enabled for ${acc.name}.` }] };
  const ownerMember = owner ? { ...owner, id: uid('m'), partnerId: pid, branchId: null } : { id: uid('m'), partnerId: pid, name: ownerName || acc.ownerName || 'Owner', phone: ownerPhone || acc.ownerPhone || '', role: 'owner', status: 'active', title: 'Owner', branchId: null };
  return {
    partners: [...s.partners, partner],
    listings: [...s.listings, listing],
    subscriptions: { ...s.subscriptions, [pid]: sub },
    branches: [...s.branches, { id: 'br-' + pid + '-0', partnerId: pid, name: area || 'Main branch', area: area || '', city: city || 'Chennai', phone: '', address: '', isMain: true, status: 'active', createdAt: today }],
    members: [...s.members, ownerMember],
  };
}

// Enable / disable a product for an organization. Enabling a product a direct customer or
// sub-organization doesn't run yet creates its business; disabling hides it (data is kept).
function applyProduct(s, accountId, category, on, by) {
  const acc = s.accounts.find((a) => a.id === accountId);
  const enabled = on ? [...new Set([...(acc.enabledProducts || []), category])] : (acc.enabledProducts || []).filter((c) => c !== category);
  let next = { ...s, accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, enabledProducts: enabled } : a)) };
  const accNext = next.accounts.find((a) => a.id === accountId);
  // The businesses affected: this org's own, plus (for a reseller) every sub-org's business in that product.
  const orgIds = acc.type === 'reseller' ? next.accounts.filter((a) => a.parentId === accountId).map((a) => a.id) : [accountId];
  const existing = next.partners.find((p) => p.accountId === accountId && p.category === category);
  if (on && acc.type !== 'reseller' && !existing) {
    const anyBiz = next.partners.find((p) => p.accountId === accountId);
    const owner = anyBiz && next.members.find((m) => m.partnerId === anyBiz.id && m.role === 'owner');
    const area = anyBiz ? (next.branches.find((b) => b.partnerId === anyBiz.id && b.isMain) || {}).area : '';
    next = { ...next, ...makeBusiness(next, { pid: uid('p'), acc: accNext, category, name: anyBiz ? `${acc.name} ${catName(next, category)}` : acc.name, area, city: acc.city, gstin: acc.gstin, ownerId: anyBiz ? anyBiz.ownerId : null, owner }) };
  }
  const subOff = (p) => orgIds.includes(p.accountId) && p.category === category;
  next.partners = next.partners.map((p) => (subOff(p) ? { ...p, productStatus: on ? 'active' : 'disabled' } : p));
  const rq = (s.productRequests || []).map((r) => (r.accountId === accountId && r.category === category && r.status === 'pending' ? { ...r, status: on ? 'approved' : 'declined', decidedAt: nowISO() } : r));
  return {
    accounts: next.accounts, partners: next.partners, listings: next.listings, subscriptions: next.subscriptions, branches: next.branches, members: next.members, productRequests: rq,
    notifications: [{ id: uid('n'), to: 'partner', text: `${catName(s, category)} was ${on ? 'enabled' : 'disabled'} for ${acc.name} by ${by}`, link: '/partner/products', at: nowISO(), read: false }, ...s.notifications],
  };
}
