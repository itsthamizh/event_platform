// B2B accounts: one business account (the studio, caterer, etc. that buys the Vizha CRM)
// can own businesses in several of the 11 products, and each business can run several branches.
//
//   account (owner) -> businesses (one per product bought) -> branches
//
// Records that live in a branch carry branchId: leads, quotes, bookings, invoices, blocks,
// expenses, inventory and team members. A member with no branchId (owner, manager) works across
// all branches; a member with a branchId only ever sees that branch.

// Demo role -> member id, same mapping as ROLES in store.js (kept here to avoid a circular import).
const ROLE_MEMBER = { owner: 'm1', manager: 'm6', sales: 'm2', accounts: 'm3', crew: 'm4' };

// Extra branches for the demo businesses that run more than one. Every business gets a main branch.
const EXTRA_BRANCHES = {
  p1: [
    { name: 'Anna Nagar', area: 'Anna Nagar', city: 'Chennai', phone: '+91 98401 20020', address: '2nd Avenue, Anna Nagar' },
    { name: 'Coimbatore', area: 'RS Puram', city: 'Coimbatore', phone: '+91 98402 30030', address: 'DB Road, RS Puram' },
  ],
  p2: [{ name: 'Velachery', area: 'Velachery', city: 'Chennai', phone: '+91 98402 40040', address: '100 Feet Road, Velachery' }],
  p4: [{ name: 'ECR Beach Lawn', area: 'ECR', city: 'Chennai', phone: '+91 98403 50050', address: 'East Coast Road, Neelankarai' }],
};
// Staff tied to one branch in the demo (everyone else works across all branches).
const MEMBER_BRANCH = { m3: 0, m4: 0, m5: 1, m7: 2 };

// Karthik Raja's group runs all 11 products, each its own business with its own team.
const GROUP_EXTRA = ['p8', 'p4', 'p2', 'p3', 'p6', 'p7', 'p5', 'p9', 'p10', 'p11'];

export function buildAccounts({ partners, listings, leads, quotes, bookings, invoices, blocks, expenses, inventory, members, users }) {
  const branches = [];
  partners.forEach((p) => {
    const listing = listings.find((l) => l.partnerId === p.id) || {};
    branches.push({ id: 'br-' + p.id + '-0', partnerId: p.id, name: listing.area || 'Main branch', area: listing.area || '', city: p.city || 'Chennai', phone: '', address: '', isMain: true, status: 'active', createdAt: p.joined || '2025-01-01' });
    (EXTRA_BRANCHES[p.id] || []).forEach((b, i) => branches.push({ id: 'br-' + p.id + '-' + (i + 1), partnerId: p.id, ...b, isMain: false, status: 'active', createdAt: '2026-04-01' }));
  });
  const branchIds = (pid) => branches.filter((b) => b.partnerId === pid).map((b) => b.id);
  // Spread a partner's leads over its branches (main branch gets the most).
  const pick = (pid, k) => {
    const ids = branchIds(pid);
    if (ids.length === 1) return ids[0];
    const slot = k % (ids.length + 2);
    return slot < 3 ? ids[0] : ids[slot - 2];
  };
  const counter = {};
  const leadBranch = {};
  const outLeads = leads.map((l) => {
    counter[l.partnerId] = (counter[l.partnerId] || 0) + 1;
    const branchId = pick(l.partnerId, counter[l.partnerId] - 1);
    leadBranch[l.id] = branchId;
    return { ...l, branchId };
  });
  const main = (pid) => 'br-' + pid + '-0';
  const outBookings = bookings.map((b) => ({ ...b, branchId: leadBranch[b.leadId] || main(b.partnerId) }));
  const bookingBranch = Object.fromEntries(outBookings.map((b) => [b.id, b.branchId]));
  const outQuotes = quotes.map((q) => ({ ...q, branchId: leadBranch[q.leadId] || main(q.partnerId) }));
  const outInvoices = invoices.map((i) => ({ ...i, branchId: bookingBranch[i.bookingId] || main(i.partnerId) }));
  const outBlocks = blocks.map((b) => ({ ...b, branchId: (b.bookingId && bookingBranch[b.bookingId]) || main(b.partnerId) }));
  const outExpenses = expenses.map((x) => ({ ...x, branchId: bookingBranch[x.bookingId] || (x.partnerId ? main(x.partnerId) : null) }));
  const invCount = {};
  const outInventory = inventory.map((it) => {
    const ids = branchIds(it.partnerId);
    invCount[it.partnerId] = (invCount[it.partnerId] || 0) + 1;
    return { ...it, branchId: ids[(invCount[it.partnerId] - 1) % ids.length] };
  });
  const outMembers = members.map((m) => {
    const ids = branchIds(m.partnerId);
    return MEMBER_BRANCH[m.id] !== undefined && ids.length > 1 ? { ...m, branchId: ids[MEMBER_BRANCH[m.id]] } : { ...m, branchId: null };
  });
  // One organization (account) per owner. Direct B2B customers own their businesses; a reseller
  // partner owns no business itself and manages sub-organizations, each a business of its own.
  const accounts = [];
  // Demo: Karthik Raja's group (a B2B customer) runs all 11 products. The people who started
  // each business stay on as its Business Head (manager role).
  partners = partners.map((p) => (GROUP_EXTRA.includes(p.id) ? { ...p, ownerId: 'u10' } : p));
  const m1 = members.find((m) => m.id === 'm1');
  GROUP_EXTRA.forEach((pid) => {
    members = members.map((m) => (m.partnerId === pid && m.role === 'owner' ? { ...m, role: 'manager', title: 'Business Head' } : m));
    if (m1) members = [...members, { ...m1, id: 'm1-' + pid, partnerId: pid, branchId: null }];
  });
  const outPartners = partners.map((p) => {
    const aid = p.ownerId && p.ownerId !== 'new' ? 'ac-' + p.ownerId : 'ac-' + p.id;
    let acc = accounts.find((a) => a.id === aid);
    if (!acc) {
      const owner = users.find((u) => u.id === p.ownerId);
      const om = members.find((m) => m.partnerId === p.id && m.role === 'owner') || members.find((m) => m.partnerId === p.id && m.role === 'manager');
      acc = { id: aid, type: 'direct', parentId: null, ownerId: p.ownerId, ownerName: owner ? owner.name : om ? om.name : '', ownerPhone: om ? om.phone : '', name: p.name, gstin: p.gstin, city: p.city || 'Chennai', createdAt: p.joined || '2025-01-01', status: 'active', enabledProducts: [] };
      accounts.push(acc);
    }
    if (!acc.enabledProducts.includes(p.category)) acc.enabledProducts.push(p.category);
    return { ...p, accountId: aid, productStatus: 'active', productAddedAt: p.joined || '2025-01-01' };
  });
  const grp = accounts.find((x) => x.id === 'ac-u10');
  if (grp) grp.name = 'Lens & Light Group';
  // Demo reseller: a partner that bought Photography (and Invitations) and runs 4 photography studios.
  const reseller = { id: 'ac-res1', type: 'reseller', parentId: null, ownerId: null, ownerName: 'Arvind Menon', ownerPhone: '+91 98450 70707', name: 'FrameWorks Partner Network', gstin: '33AAFFN4512R1Z4', city: 'Chennai', createdAt: '2025-11-01', status: 'active', enabledProducts: ['photography', 'invitation'], maxSubOrgs: 10 };
  accounts.push(reseller);
  outPartners
    .filter((p) => p.category === 'photography' && p.id !== 'p1')
    .slice(0, 4)
    .forEach((p) => {
      const acc = accounts.find((a) => a.id === p.accountId);
      if (acc) Object.assign(acc, { type: 'sub', parentId: reseller.id });
    });
  return { accounts, branches, partners: outPartners, leads: outLeads, quotes: outQuotes, bookings: outBookings, invoices: outInvoices, blocks: outBlocks, expenses: outExpenses, inventory: outInventory, members: members.map((m) => ({ ...m, branchId: (outMembers.find((x) => x.id === m.id) || {}).branchId || null })) };
}

// ---------- Selectors ----------
export const currentPartner = (s) => s.partners.find((p) => p.id === s.partnerId);
export const accountOf = (s, partnerId = s.partnerId) => {
  const p = s.partners.find((x) => x.id === partnerId);
  return p ? (s.accounts || []).find((a) => a.id === p.accountId) : null;
};
// The businesses (products) this organization has, oldest first. Disabled products are left out
// unless asked for (My products shows them greyed out).
export const accountBusinesses = (s, partnerId = s.partnerId, withDisabled = false) => {
  const acc = accountOf(s, partnerId);
  const list = acc ? s.partners.filter((p) => p.accountId === acc.id) : s.partners.filter((p) => p.id === partnerId);
  return list.filter((p) => withDisabled || p.productStatus !== 'disabled').sort((a, b) => (a.productAddedAt || '').localeCompare(b.productAddedAt || ''));
};
export const orgBusinesses = (s, accountId) => s.partners.filter((p) => p.accountId === accountId);
export const subOrgs = (s, resellerId) => (s.accounts || []).filter((a) => a.parentId === resellerId);
export const parentOrg = (s, acc) => (acc && acc.parentId ? (s.accounts || []).find((a) => a.id === acc.parentId) : null);
export const resellerAccount = (s) => (s.accounts || []).find((a) => a.id === (s.resellerId || 'ac-res1'));
// Products a sub-organization may use come from its reseller; a direct customer's from Vizha.
export const productEnabled = (s, acc, category) => !!acc && (acc.enabledProducts || []).includes(category) && (!acc.parentId || (parentOrg(s, acc) || { enabledProducts: [] }).enabledProducts.includes(category));
export const branchesOf = (s, partnerId = s.partnerId) => (s.branches || []).filter((b) => b.partnerId === partnerId);
export const activeBranches = (s, partnerId = s.partnerId) => branchesOf(s, partnerId).filter((b) => b.status === 'active');
export const mainBranch = (s, partnerId = s.partnerId) => branchesOf(s, partnerId).find((b) => b.isMain) || branchesOf(s, partnerId)[0] || null;
export const branchName = (s, id) => ((s.branches || []).find((b) => b.id === id) || {}).name || '';

export const memberFor = (s) => {
  const mid = ROLE_MEMBER[s.role];
  if (!mid) return null;
  return s.members.find((m) => m.id === mid && m.partnerId === s.partnerId) || s.members.find((m) => m.partnerId === s.partnerId && m.role === s.role && m.status === 'active') || null;
};
// A member tied to one branch cannot switch; owners and managers can see all branches or pick one.
export const lockedBranch = (s) => {
  if (s.role === 'owner' || s.impersonating) return null;
  const m = memberFor(s);
  return m && m.branchId ? m.branchId : null;
};
export const activeBranch = (s) => {
  const lock = lockedBranch(s);
  if (lock) return lock;
  const b = s.branchId && (s.branches || []).find((x) => x.id === s.branchId && x.partnerId === s.partnerId);
  return b ? b.id : 'all';
};
// True when a record belongs to the current business and, if a branch is picked, to that branch.
export const inScope = (s, rec) => {
  if (!rec || rec.partnerId !== s.partnerId) return false;
  const b = activeBranch(s);
  return b === 'all' || !rec.branchId || rec.branchId === b;
};
// Branch for a new record: the picked branch, or the main branch when viewing all.
export const newRecordBranch = (s) => {
  const b = activeBranch(s);
  return b !== 'all' ? b : (mainBranch(s) || {}).id || null;
};
