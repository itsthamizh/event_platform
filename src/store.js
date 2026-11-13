// Client-side store that simulates the backend for the demo.
// Every action mirrors an API endpoint from the design doc, so replacing an action body
// with a fetch() call is the path to a real backend.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as seed from './data/mock';
import * as pack from './data/packData';
import { initBookingDetails } from './categories/logic';
import { generateWorld } from './data/generate';
import { CORE_PRODUCTS, addDays, daysBetween, GST_RATE, inr, nowISO, todayISO, uid } from './config';
import { EVENT_EXTRAS, buildChecklist } from './data/planning';
import * as b2b from './data/b2b';
import { quoteStatus, schedPaid, scheduleFor } from './lifecycle';
import { extraActions, isCorpRole } from './storeExtra';
import { opsActions } from './storeOps';
import { buildPhase2 } from './data/phase2';
import { availabilityDetail, nextDocNumber } from './ops';
import { p3Actions } from './storeP3';
import { buildPhase3 } from './data/phase3';
import * as masters from './data/masters';
import { buildAccounts, mainBranch, newRecordBranch } from './accounts';
import { newDeal, seedDeals } from './deals';
import { buildStudio } from './data/studio';
import { studioActions } from './storeStudio';
import { accountActions } from './storeAccounts';

const STORAGE_KEY = 'vizha-demo';
// Bump this whenever the seed data changes. Saved demo data from another version is thrown away,
// so the app can never show an older, half-empty data set.
export const SEED_VERSION = 16;
const OLD_KEYS = ['vizha-demo-v1', 'vizha-demo-v2', 'vizha-demo-v3', 'vizha-demo-v4'];

// ---------- Roles and permissions ----------
export const ALL_PERMS = [
  'dashboard', 'leads.view', 'leads.edit', 'quotes.send', 'chat', 'bookings.view', 'calendar.view', 'calendar.manage',
  'invoices.view', 'payments.record', 'finance.view', 'crew.assign', 'tasks.view_own', 'listing.edit', 'reviews.reply',
  'team.manage', 'billing.manage',
];

export const PERM_LABELS = {
  dashboard: 'View dashboard',
  'leads.view': 'View leads',
  'leads.edit': 'Edit leads',
  'quotes.send': 'Create and send quotes',
  chat: 'Chat with customers',
  'bookings.view': 'View bookings',
  'calendar.view': 'View calendar',
  'calendar.manage': 'Block dates',
  'invoices.view': 'Invoices',
  'payments.record': 'Record payments',
  'finance.view': 'Expenses and profit',
  'crew.assign': 'Assign crew',
  'tasks.view_own': 'See own jobs',
  'listing.edit': 'Edit listing',
  'reviews.reply': 'Reply to reviews',
  'team.manage': 'Manage team',
  'billing.manage': 'Subscription and billing',
};

export const ROLE_PERMS = {
  owner: ALL_PERMS,
  manager: ALL_PERMS.filter((p) => p !== 'billing.manage'),
  sales: ['dashboard', 'leads.view', 'leads.edit', 'quotes.send', 'chat', 'bookings.view', 'calendar.view'],
  accounts: ['dashboard', 'bookings.view', 'invoices.view', 'payments.record', 'finance.view'],
  crew: ['tasks.view_own'],
};

export const ROLES = [
  { id: 'guest', label: 'Guest (visitor)', group: 'B2C marketplace', home: '/' },
  { id: 'customer', label: 'Guest logged in - Priya', group: 'B2C marketplace', home: '/' },
  { id: 'owner', label: 'Business owner', group: 'B2B customer (business)', home: '/partner', memberId: 'm1' },
  { id: 'manager', label: 'Team: Manager', group: 'B2B customer (business)', home: '/partner', memberId: 'm6' },
  { id: 'sales', label: 'Team: Sales', group: 'B2B customer (business)', home: '/partner', memberId: 'm2' },
  { id: 'accounts', label: 'Team: Accounts', group: 'B2B customer (business)', home: '/partner', memberId: 'm3' },
  { id: 'crew', label: 'Team: Crew', group: 'B2B customer (business)', home: '/partner/jobs', memberId: 'm4' },
  { id: 'reseller', label: 'Partner (reseller) - FrameWorks', group: 'Partner (reseller)', home: '/reseller' },
  { id: 'corp', label: 'Corporate: Ramya (HR, raises RFQs)', group: 'Business buyer', home: '/corp' },
  { id: 'corp_approver', label: 'Corporate: Venkat (Finance approver)', group: 'Business buyer', home: '/corp/approvals' },
  { id: 'corp_director', label: 'Corporate: Meera (Director, level 2)', group: 'Business buyer', home: '/corp/approvals' },
  { id: 'admin', label: 'Super Admin', group: 'Platform owner', home: '/admin' },
];
export { isCorpRole };

export const isPartnerRole = (r) => ['owner', 'manager', 'sales', 'accounts', 'crew'].includes(r);

// ---------- Initial state ----------
function initialState() {
  const listings = seed.LISTINGS.map((l) => ({ ...l, attributes: { ...(l.attributes || {}), ...(pack.PACK_ATTRS[l.id] || {}) } }));
  const leads = [...seed.LEADS.map((l) => ({ ...l, details: pack.LEAD_DETAILS[l.id] || {} })), ...pack.EXTRA_LEADS];
  // Category details for each booking: hand-written seed where we have it, otherwise generated from the enquiry.
  const bookings = [...seed.BOOKINGS, ...pack.EXTRA_BOOKINGS].map((b) => {
    const lead = leads.find((l) => l.id === b.leadId);
    const listing = listings.find((l) => l.id === b.listingId);
    return { ...b, details: pack.BOOKING_DETAILS[b.id] || (lead && listing ? initBookingDetails(listing.category, lead, listing, { menus: pack.MENUS }) : {}) };
  });
  // Realistic pipeline for every demo business + more vendors in every category.
  const baseMembers = [...seed.MEMBERS, ...pack.EXTRA_MEMBERS, ...b2b.PLANNER_MEMBERS];
  const g = generateWorld({ listings, partners: seed.PARTNERS, users: seed.USERS, members: baseMembers, menus: pack.MENUS });
  const partners = [...seed.PARTNERS, ...g.partners];
  // Events: each one gets its functions, guests, budget tracker, checklist and co-planners.
  const events = seed.EVENTS.map((e) => {
    const x = EVENT_EXTRAS[e.id] || {};
    const checklist = buildChecklist(e.type, e.date, addDays).map((c) => ({ ...c, done: c.due < todayISO() || (c.category && ['venue', 'photography', 'pandit', 'catering', 'invitation', 'melam'].includes(c.category) && c.due < addDays(todayISO(), 60)) }));
    return { ...e, functions: [], guestList: [], budgetItems: [], collaborators: [], ...x, checklist };
  });
  // One subscription record per partner (lifecycle: trial -> active -> past_due -> grace -> expired).
  const subscriptions = {};
  partners.forEach((p, i) => {
    const st = p.subscription || 'active';
    const end = st === 'expired' ? addDays(todayISO(), -9) : st === 'grace' ? addDays(todayISO(), -3) : st === 'past_due' ? addDays(todayISO(), -1) : addDays(todayISO(), 5 + (i % 24));
    const paid = (n) => ({ id: 'sp' + p.id + n, date: addDays(end, -30 * (n + 1)), amount: 199, gst: 36, status: 'paid', invoice: `VZ/SUB/26-27/${String(2000 + i * 7 + n).padStart(4, '0')}` });
    const history = p.id === 'p1' ? seed.SUBSCRIPTION.history.map((h, n) => ({ ...h, invoice: `VZ/SUB/26-27/${1801 + n}` })) : st === 'trial' ? [] : [0, 1, 2].map(paid);
    if (['past_due', 'grace', 'expired'].includes(st)) history.unshift({ id: 'spf' + p.id, date: end, amount: 199, gst: 36, status: 'failed', invoice: '' });
    subscriptions[p.id] = {
      partnerId: p.id, plan: 'Partner Basic', price: 199, status: st, periodStart: p.id === 'p1' ? seed.SUBSCRIPTION.periodStart : addDays(end, -30), periodEnd: p.id === 'p1' ? seed.SUBSCRIPTION.periodEnd : end,
      autoRenew: st !== 'cancelled', trialEnds: st === 'trial' ? addDays(p.joined || todayISO(), 14) : null, history,
      events: [
        ...(st === 'past_due' ? [{ at: end + 'T09:00:00', text: 'Renewal payment failed (UPI autopay declined). Retrying daily.' }] : []),
        ...(st === 'grace' ? [{ at: end + 'T09:00:00', text: 'Renewal failed 3 times. 7-day grace period started.' }] : []),
        ...(st === 'expired' ? [{ at: end + 'T09:00:00', text: 'Grace period ended. Listing hidden from the app.' }] : []),
        ...(st === 'trial' ? [{ at: (p.joined || todayISO()) + 'T10:00:00', text: '14-day free trial started.' }] : [{ at: addDays(end, -30) + 'T09:00:00', text: 'Renewed for 30 days (auto-renew).' }]),
      ],
    };
  });
  const allBookings = [...bookings, ...g.bookings];
  const allLeads = [...leads, ...g.leads];
  const allInvoices = [...seed.INVOICES, ...pack.EXTRA_INVOICES, ...g.invoices];
  const p2 = buildPhase2({ listings: [...listings, ...g.listings], partners, bookings: allBookings, leads: allLeads, members: [...baseMembers, ...g.members], invoices: allInvoices });
  const p3 = buildPhase3({ listings: p2.listings, leads: allLeads, users: [...seed.USERS, ...g.users] });
  // Every business gets inventory and event-day run sheets like its product's demo business.
  const tmplPartner = {};
  p2.inventory.forEach((it) => {
    const p = partners.find((x) => x.id === it.partnerId);
    if (p && !tmplPartner[p.category]) tmplPartner[p.category] = p.id;
  });
  partners.forEach((p) => {
    const t = tmplPartner[p.category];
    if (!t || t === p.id || p2.inventory.some((it) => it.partnerId === p.id)) return;
    p2.inventory.filter((it) => it.partnerId === t).forEach((it, k) => p2.inventory.push({ ...it, id: 'it' + p.id + k, partnerId: p.id, qty: Math.max(1, Math.round(it.qty * (0.6 + (k % 3) * 0.2))) }));
  });
  const sheetFor = {};
  allBookings.forEach((b) => {
    const p = partners.find((x) => x.id === b.partnerId);
    if (p && p2.runSheets[b.id] && !sheetFor[p.category]) sheetFor[p.category] = p2.runSheets[b.id];
  });
  allBookings.forEach((b) => {
    const p = partners.find((x) => x.id === b.partnerId);
    if (p && !p2.runSheets[b.id] && sheetFor[p.category] && ['accepted', 'booked'].includes(b.status)) p2.runSheets[b.id] = sheetFor[p.category].map((r) => ({ ...r, done: false }));
  });
  // B2B accounts: every business belongs to an owner's account and runs one or more branches.
  const ac = buildAccounts({
    partners, listings: p2.listings, leads: allLeads, quotes: [...seed.QUOTES, ...pack.EXTRA_QUOTES, ...g.quotes], bookings: allBookings, invoices: allInvoices,
    blocks: [...seed.AVAILABILITY_BLOCKS, ...pack.EXTRA_BLOCKS, ...g.blocks], expenses: [...seed.EXPENSES.map((x) => ({ partnerId: 'p1', ...x })), ...g.expenses], inventory: p2.inventory,
    members: [...baseMembers, ...g.members], users: [...seed.USERS, ...g.users],
  });
  const studio = buildStudio({ partners: ac.partners, inventory: ac.inventory, members: ac.members, bookings: ac.bookings, leads: ac.leads, today: todayISO() });
  const seedRefunds = seed.REFUNDS.map((r) => ({ ...r, partnerId: (partners.find((p) => p.name === r.partner) || {}).id, to: 'original', processedAt: r.status === 'processed' ? r.requestedAt : null }));
  return {
    seedVersion: SEED_VERSION,
    role: 'guest',
    partnerId: seed.CURRENT_PARTNER_ID,
    customerId: seed.CURRENT_CUSTOMER_ID,
    categories: seed.CATEGORIES.filter((c) => CORE_PRODUCTS.includes(c.id)),
    accounts: ac.accounts,
    branches: ac.branches,
    branchId: 'all',
    productRequests: [
      { id: 'pr2', accountId: 'ac-u23', category: 'invitation', status: 'pending', at: '2026-11-11T11:05:00', by: 'Suresh Kannan', to: 'reseller' },
    ],
    resellerId: 'ac-res1',
    managedBy: null,
    partners: ac.partners,
    listings: p2.listings,
    users: [...seed.USERS, ...g.users],
    events,
    favourites: seed.FAVOURITES,
    leads: seedDeals(ac.leads, ac.quotes, quoteTotals),
    leadActivities: [...seed.LEAD_ACTIVITIES, ...g.leadActivities],
    quotes: ac.quotes,
    bookings: ac.bookings,
    invoices: ac.invoices,
    threads: [...seed.THREADS, ...g.threads],
    messages: [...seed.MESSAGES, ...g.messages],
    reviews: [...seed.REVIEWS, ...g.reviews],
    members: studio.members,
    vendors: studio.vendors,
    vendorPos: studio.vendorPos,
    menus: [...pack.MENUS, ...g.menus],
    rolePerms: ROLE_PERMS,
    crew: [...seed.CREW_ASSIGNMENTS, ...g.crew],
    tasks: [...seed.TASKS, ...g.tasks],
    expenses: ac.expenses,
    blocks: ac.blocks,
    activity: [...seed.ACTIVITY_LOG, ...g.activity],
    subscription: seed.SUBSCRIPTION,
    subscriptions,
    // B2B
    orgs: b2b.ORGS,
    corpUsers: b2b.CORP_USERS,
    costCenters: b2b.COST_CENTERS,
    approvalRules: b2b.APPROVAL_RULES,
    corpEvents: b2b.CORP_EVENTS,
    preferredVendors: b2b.PREFERRED_VENDORS,
    rfqs: g.rfqs,
    pos: g.pos,
    approvals: g.approvals,
    projects: g.projects,
    bookingChanges: g.bookingChanges,
    documents: seed.PARTNER_DOCUMENTS,
    disputes: seed.DISPUTES,
    refunds: [...p2.refunds, ...seedRefunds],
    creditNotes: p2.creditNotes,
    payoutStatus: {},
    inventory: studio.inventory,
    reservations: p2.reservations,
    runSheets: p2.runSheets,
    shipments: p2.shipments,
    trials: p2.trials,
    leaves: p2.leaves,
    coupons: p2.coupons,
    redemptions: p2.redemptions,
    wallets: p2.wallets,
    referrals: p2.referrals,
    ...p3,
    cities: masters.CITIES,
    featureFlags: masters.FEATURE_FLAGS,
    taxRates: masters.TAX_RATES,
    docSeries: masters.DOC_SERIES,
    impersonating: false,
    payouts: seed.PAYOUTS,
    articles: seed.ARTICLES,
    banners: seed.BANNERS,
    settings: seed.SETTINGS,
    notifications: [
      ...g.notifications,
      { id: 'nc1', to: 'corp', orgId: 'org1', text: '2 new quotes on RFQ-ZEN-042 (Annual Day catering)', at: '2026-11-10T16:20:00', read: false, link: '/corp/rfqs/rfq42' },
      { id: 'nc2', to: 'corp', orgId: 'org1', text: 'Approval needed: PO/ZEN/26-27/0114 (Lens & Light Studio)', at: '2026-11-09T11:00:00', read: false, link: '/corp/approvals' },
      { id: 'n1', to: 'partner', text: 'New WhatsApp lead: Ramesh K (Birthday, 20 Dec)', at: '2026-11-10T19:05:00', read: false, link: '/partner/leads/ld2' },
      { id: 'n2', to: 'customer', text: 'Lens & Light Studio sent you a quote of ₹96,760', at: '2026-11-05T11:00:00', read: false, link: '/bookings/ld1' },
      { id: 'n3', to: 'admin', text: '3 new partners waiting for verification', at: '2026-11-10T09:00:00', read: false, link: '/admin/verification' },
    ],
    application: null, // partner onboarding draft (new vendor sign-up)
  };
}

function load() {
  try {
    OLD_KEYS.forEach((k) => window.localStorage.removeItem(k));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.seedVersion === SEED_VERSION) return { ...initialState(), ...saved };
    }
  } catch (e) {
    /* storage unavailable */
  }
  return initialState();
}

// ---------- Pure selectors / calculators ----------
export const quoteTotals = (q) => {
  const subtotal = q.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
  const discount = Number(q.discount || 0);
  const taxable = Math.max(0, subtotal - discount);
  const gst = q.gst ? Math.round((taxable * GST_RATE) / 100) : 0;
  return { subtotal, discount, taxable, gst, total: taxable + gst };
};

export const invoiceTotals = (inv) => {
  const total = inv.schedule.filter((s) => !s.waived).reduce((a, s) => a + s.amount, 0);
  const paid = inv.schedule.reduce((a, s) => a + schedPaid(s), 0);
  const today = todayISO();
  const overdue = inv.schedule.filter((s) => !s.paidAt && !s.waived && s.due < today).reduce((a, s) => a + s.amount - schedPaid(s), 0);
  let status = 'issued';
  if (paid >= total && total > 0) status = 'paid';
  else if (paid > 0) status = 'partially_paid';
  if (overdue > 0) status = 'overdue';
  return { total, paid, due: total - paid, overdue, status };
};

export const quotesForLead = (s, leadId) =>
  s.quotes.filter((q) => q.leadId === leadId).sort((a, b) => b.version - a.version);

export const latestQuote = (s, leadId) => quotesForLead(s, leadId)[0] || null;

// available | limited | taken | closed | too_soon (see ops.availabilityDetail for the reason)
export const availabilityFor = (s, listing, date) => availabilityDetail(s, listing, date).status;

// What the customer sees in their Booking tab.
export const customerStage = (lead, booking) => {
  if (booking) {
    if (booking.status === 'accepted') return 'Accepted';
    if (booking.status === 'booked') return 'Booked';
    if (booking.status === 'completed') return 'Completed';
    if (booking.status === 'reviewed') return 'Reviewed';
    if (booking.status === 'cancelled') return 'Cancelled';
  }
  if (lead.status === 'lost') return 'Cancelled';
  if (lead.status === 'quoted' || lead.status === 'negotiation') return 'Quoted';
  return 'Enquiry';
};

export const CUSTOMER_STAGES = ['Enquiry', 'Quoted', 'Accepted', 'Booked', 'Completed', 'Reviewed'];
export const LEAD_STAGES = ['new', 'contacted', 'quoted', 'negotiation', 'won', 'lost'];
export const LEAD_STAGE_LABEL = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };

export const refundPreview = (s, booking, by) => {
  const inv = s.invoices.find((i) => i.id === booking.invoiceId);
  const paid = inv ? invoiceTotals(inv).paid : 0;
  const days = daysBetween(todayISO(), booking.eventDate);
  if (by === 'partner') return { paid, pct: 100, refund: paid, days, rule: 'Partner cancelled: full refund' };
  const rule = days > 30 ? s.settings.policy[0] : days >= 7 ? s.settings.policy[1] : s.settings.policy[2];
  return { paid, pct: rule.refund, refund: Math.round((paid * rule.refund) / 100), days, rule: `${rule.window}: ${rule.refund}% refund` };
};

// ---------- Context ----------
const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }, [state]);

  const toast = useCallback((text, tone = 'success') => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const actions = useMemo(() => {
    const update = (fn) => setState((s) => ({ ...s, ...fn(s) }));
    const notify = (s, to, text, link) => [{ id: uid('n'), to, text, link, at: nowISO(), read: false }, ...s.notifications];
    const log = (s, actor, action) => [{ id: uid('al'), partnerId: s.partnerId, actor, action, at: nowISO() }, ...s.activity];
    const actorName = (s) => {
      const r = ROLES.find((x) => x.id === s.role);
      if (s.managedBy) return ((s.accounts || []).find((a) => a.id === s.managedBy) || {}).name || 'Partner';
      if (!r || !r.memberId) return 'Owner';
      const m = s.members.find((mm) => mm.id === r.memberId && mm.partnerId === s.partnerId) || s.members.find((mm) => mm.partnerId === s.partnerId && mm.role === s.role);
      return m ? m.name : 'Owner';
    };

    // After any payment: promote an accepted booking to booked once the advance is in and the contract is signed.
    const settleBooking = (s, bookings, invoices, leads, blocks, bookingId) => {
      const b = bookings.find((x) => x.id === bookingId);
      if (!b || b.status !== 'accepted') return { bookings, leads, blocks };
      const inv = invoices.find((i) => i.id === b.invoiceId);
      const advancePaid = inv && inv.schedule[0] && inv.schedule[0].paidAt;
      if (!advancePaid || !b.contractSigned) return { bookings, leads, blocks };
      return {
        bookings: bookings.map((x) => (x.id === bookingId ? { ...x, status: 'booked' } : x)),
        leads: leads.map((l) => (l.id === b.leadId ? { ...l, status: 'won' } : l)),
        blocks: blocks.map((bl) => (bl.bookingId === bookingId ? { ...bl, status: 'blocked' } : bl)),
      };
    };

    return {
      ...extraActions({ update, notify, log, actorName, toast }),
      ...opsActions({ update, notify, log, actorName, toast }),
      ...accountActions({ update, notify, log, actorName, toast }),
      ...studioActions({ update, notify, log, actorName, toast }),
      ...p3Actions({ update, notify, log, actorName, toast }),
      reset: () => {
        setState(initialState());
        toast('Demo data reset');
      },
      setRole: (role) => update(() => ({ role, impersonating: false, managedBy: null })),
      markNotificationsRead: (to) =>
        update((s) => ({ notifications: s.notifications.map((n) => (n.to === to ? { ...n, read: true } : n)) })),

      // ----- Customer -----
      toggleFavourite: (listingId, eventId = null) =>
        update((s) => {
          const exists = s.favourites.some((f) => f.listingId === listingId);
          return {
            favourites: exists ? s.favourites.filter((f) => f.listingId !== listingId) : [...s.favourites, { listingId, eventId }],
          };
        }),

      createEvent: (ev) => {
        const id = uid('e');
        update((s) => ({ events: [...s.events, { id, customerId: s.customerId, needs: [], ...ev }] }));
        toast('Event created');
        return id;
      },
      updateEvent: (id, patch) => update((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      // POST /v1/enquiries
      sendEnquiry: ({ listingId, eventId, eventType, date, guests, budget, message, packageId, details, addons, area, branchId, company }) => {
        const leadId = uid('ld');
        update((s) => {
          const listing = s.listings.find((l) => l.id === listingId);
          const me = s.users.find((u) => u.id === s.customerId);
          const pk = listing.packages.find((p) => p.id === packageId);
          const lead = {
            id: leadId, partnerId: listing.partnerId, branchId: branchId || (mainBranch(s, listing.partnerId) || {}).id || null, listingId, customerId: s.customerId, eventId: eventId || null,
            contactName: me.name, contactPhone: me.phone, source: 'app', eventType, eventDate: date, guests: Number(guests) || 0,
            budget: Number(budget) || 0, requirements: (pk ? `Interested in ${pk.name} package. ` : '') + (message || ''),
            status: 'new', assignedTo: null, nextFollowUp: addDays(todayISO(), 1), createdAt: nowISO(), bookingId: null, details: details || {},
            addons: addons || [], area: area || (s.events.find((e) => e.id === eventId) || {}).area || null, priority: company ? 'high' : 'medium', buyerType: company ? 'corporate' : 'individual',
            ...(company ? { buyer: { type: 'corporate', orgName: company.name, gstin: company.gstin || '', channel: 'app_request', contact: me.name } } : {}),
          };
          let thread = s.threads.find((t) => t.customerId === s.customerId && t.listingId === listingId);
          let threads = s.threads;
          if (!thread) {
            thread = { id: uid('t'), customerId: s.customerId, partnerId: listing.partnerId, listingId, leadId };
            threads = [...threads, thread];
          } else {
            threads = threads.map((t) => (t.id === thread.id ? { ...t, leadId } : t));
          }
          const msg = { id: uid('msg'), threadId: thread.id, side: 'customer', type: 'booking_request', body: lead.requirements || 'Booking request', meta: { date, guests, eventType }, at: nowISO() };
          return {
            leads: [lead, ...s.leads],
            threads,
            messages: [...s.messages, msg],
            leadActivities: [{ id: uid('a'), leadId, type: 'status', body: 'Booking request received from the app', by: 'System', at: nowISO() }, ...s.leadActivities],
            notifications: notify(s, 'partner', `New enquiry from ${me.name} for ${date}`, `/partner/leads/${leadId}`),
          };
        });
        toast('Booking request sent. The partner usually replies soon.');
        return leadId;
      },

      // Callers check for an existing thread first; this always creates one with a known id.
      startChat: (listingId) => {
        const threadId = uid('t');
        update((s) => {
          if (s.threads.some((t) => t.customerId === s.customerId && t.listingId === listingId)) return {};
          const listing = s.listings.find((l) => l.id === listingId);
          return { threads: [...s.threads, { id: threadId, customerId: s.customerId, partnerId: listing.partnerId, listingId, leadId: null }] };
        });
        return threadId;
      },

      sendMessage: (threadId, side, body) =>
        update((s) => {
          const t = s.threads.find((x) => x.id === threadId);
          return {
            messages: [...s.messages, { id: uid('msg'), threadId, side, type: 'text', body, at: nowISO() }],
            notifications: notify(s, side === 'customer' ? 'partner' : 'customer', 'New message', side === 'customer' ? `/partner/inbox/${threadId}` : `/chat/${threadId}`),
            leads: side === 'partner' && t && t.leadId ? s.leads.map((l) => (l.id === t.leadId && l.status === 'new' ? { ...l, status: 'contacted' } : l)) : s.leads,
          };
        }),

      // POST /v1/quotes/{id}/request-changes
      requestChanges: (quoteId, note) => {
        update((s) => {
          const q = s.quotes.find((x) => x.id === quoteId);
          const thread = s.threads.find((t) => t.leadId === q.leadId);
          return {
            quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'changes_requested', changeNote: note } : x)),
            leads: s.leads.map((l) => (l.id === q.leadId ? { ...l, status: 'negotiation' } : l)),
            messages: thread ? [...s.messages, { id: uid('msg'), threadId: thread.id, side: 'customer', type: 'text', body: `Requested changes to ${q.number} v${q.version}: ${note}`, at: nowISO() }] : s.messages,
            leadActivities: [{ id: uid('a'), leadId: q.leadId, type: 'note', body: `Customer asked for changes: ${note}`, by: 'Customer', at: nowISO() }, ...s.leadActivities],
            notifications: notify(s, 'partner', `Customer asked for changes on ${q.number}`, `/partner/leads/${q.leadId}`),
          };
        });
        toast('Change request sent to the partner');
      },

      // POST /v1/quotes/{id}/accept -> booking (accepted) + contract + invoice + tentative block
      acceptQuote: (quoteId) => {
        let bookingId = uid('b');
        update((s) => {
          const q = s.quotes.find((x) => x.id === quoteId);
          if (quoteStatus(q) === 'expired') return {};
          const lead = s.leads.find((l) => l.id === q.leadId);
          const listing = s.listings.find((l) => l.id === lead.listingId);
          // Re-check the date: another customer may have booked it since the quote was sent.
          const av = availabilityDetail(s, listing, lead.eventDate);
          if (['taken', 'closed'].includes(av.status)) return {}; // the page checks first and explains
          const partner = s.partners.find((p) => p.id === q.partnerId);
          const t = quoteTotals(q);
          const invId = uid('inv');
          const today = todayISO();
          const invoice = {
            id: invId, number: nextDocNumber(s, partner, 'INV', today), partnerId: q.partnerId, branchId: lead.branchId || null, bookingId,
            type: q.gst ? 'gst' : 'regular', billTo: lead.buyer ? lead.buyer.orgName : lead.contactName, billToGstin: lead.buyer ? lead.buyer.gstin || '' : '', subtotal: t.taxable, gst: q.gst, issuedAt: today,
            buyerType: 'individual',
            schedule: scheduleFor('individual', t.total, today, lead.eventDate, addDays),
          };
          const booking = {
            id: bookingId, number: 'BK-' + (2300 + s.bookings.length), leadId: lead.id, quoteId, partnerId: q.partnerId, branchId: lead.branchId || null, listingId: listing.id,
            customerId: lead.customerId, eventDate: lead.eventDate, total: t.total, status: 'accepted', contractSigned: false, invoiceId: invId, createdAt: nowISO(), buyerType: lead.buyer ? 'corporate' : 'individual', buyerOrgName: lead.buyer ? lead.buyer.orgName : null, channel: 'app_request', holdUntil: addDays(today, 2),
            details: initBookingDetails(listing.category, lead, listing, s),
          };
          return {
            quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'accepted' } : x.leadId === q.leadId && x.status === 'sent' ? { ...x, status: 'superseded' } : x)),
            leads: s.leads.map((l) => (l.id === lead.id ? { ...l, bookingId } : l)),
            bookings: [booking, ...s.bookings],
            invoices: [invoice, ...s.invoices],
            blocks: [...s.blocks, { id: uid('ab'), partnerId: q.partnerId, branchId: lead.branchId || null, date: lead.eventDate, status: 'tentative', source: 'booking', bookingId }],
            leadActivities: [{ id: uid('a'), leadId: lead.id, type: 'status', body: `Quote ${q.number} v${q.version} accepted. Contract and advance pending.`, by: 'Customer', at: nowISO() }, ...s.leadActivities],
            notifications: notify(s, 'partner', `${lead.contactName} accepted ${q.number} (${inr(t.total)})`, `/partner/bookings/${bookingId}`),
          };
        });
        toast('Quote accepted. Your date is held for 48 hours. Sign the contract and pay the advance to confirm.');
        return bookingId;
      },

      // POST /v1/contracts/{id}/sign
      signContract: (bookingId) => {
        update((s) => {
          const bookings = s.bookings.map((b) => (b.id === bookingId ? { ...b, contractSigned: true, signedAt: nowISO() } : b));
          const r = settleBooking(s, bookings, s.invoices, s.leads, s.blocks, bookingId);
          return { ...r, notifications: notify(s, 'partner', 'Contract signed by customer', `/partner/bookings/${bookingId}`) };
        });
        toast('Contract signed');
      },

      // Online payment (customer) or offline record (partner)
      // amount < remaining records a part payment (schedule item becomes partially_paid).
      payInstallment: (invoiceId, schedId, method = 'UPI', channel = 'online', amount) => {
        let part = false;
        update((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          const item0 = inv.schedule.find((x) => x.id === schedId);
          const remaining = item0.amount - schedPaid(item0);
          const pay = amount ? Math.min(Number(amount), remaining) : remaining;
          part = pay < remaining;
          const item = { ...item0, amount: pay };
          const invoices = s.invoices.map((i) =>
            i.id === invoiceId
              ? { ...i, schedule: i.schedule.map((x) => (x.id === schedId ? (part ? { ...x, parts: [...(x.parts || []), { amount: pay, at: nowISO(), method, channel }] } : { ...x, paidAt: nowISO(), method, channel }) : x)) }
              : i
          );
          const r = settleBooking(s, s.bookings, invoices, s.leads, s.blocks, inv.bookingId);
          return {
            invoices,
            ...r,
            activity: channel === 'offline' ? log(s, actorName(s), `recorded ${method} payment of ${inr(item.amount)} on ${inv.number}`) : s.activity,
            notifications: channel === 'online' ? notify(s, 'partner', `Payment received: ${inr(item.amount)} (${item.label})`, `/partner/invoices/${invoiceId}`) : notify(s, 'customer', `${inr(item.amount)} payment recorded by the partner`, '/bookings'),
          };
        });
        toast(part ? 'Part payment recorded' : channel === 'online' ? 'Payment successful' : 'Payment recorded');
      },

      // POST /bookings/{id}/cancel
      cancelBooking: (bookingId, by, reason) => {
        update((s) => {
          const b = s.bookings.find((x) => x.id === bookingId);
          const prev = refundPreview(s, b, by);
          const lead = s.leads.find((l) => l.id === b.leadId);
          const partner = s.partners.find((p) => p.id === b.partnerId);
          return {
            bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'cancelled', cancelledBy: by, cancelReason: reason, cancelledAt: nowISO() } : x)),
            leads: s.leads.map((l) => (l.id === b.leadId ? { ...l, status: 'lost', lostReason: 'Cancelled: ' + reason } : l)),
            blocks: s.blocks.filter((bl) => bl.bookingId !== bookingId),
            pos: s.pos.map((p) => (p.bookingId === bookingId ? { ...p, status: 'cancelled' } : p)),
            // A partner cancelling a confirmed booking gets an automatic strike (3 strikes = review of the listing).
            strikes: by === 'partner' && b.status === 'booked' ? [{ id: uid('st'), partnerId: b.partnerId, reason: `Cancelled confirmed booking ${b.number} ${prev.days} days before the event`, severity: 'strike', at: todayISO(), by: 'System', expiresAt: addDays(todayISO(), 90) }, ...s.strikes] : s.strikes,
            invoices: s.invoices.map((i) => (i.id === b.invoiceId ? { ...i, schedule: i.schedule.map((x) => (x.paidAt ? x : { ...x, waived: true })) } : i)),
            refunds: prev.refund > 0 ? [{ id: uid('rf'), bookingNumber: b.number, customer: lead.contactName, partner: partner.name, amount: prev.refund, reason: prev.rule, status: 'requested', requestedAt: todayISO() }, ...s.refunds] : s.refunds,
            notifications: notify(s, by === 'customer' ? 'partner' : 'customer', `Booking ${b.number} was cancelled`, by === 'customer' ? `/partner/bookings/${bookingId}` : `/bookings/${b.leadId}`),
          };
        });
        toast('Booking cancelled. Calendar date released.', 'warning');
      },

      submitReview: (bookingId, rating, title, body) => {
        update((s) => {
          const b = s.bookings.find((x) => x.id === bookingId);
          const me = s.users.find((u) => u.id === s.customerId);
          const listing = s.listings.find((l) => l.id === b.listingId);
          // Verified review goes to moderation first; rating counts once it is published.
          return {
            reviews: [{ id: uid('r'), listingId: b.listingId, bookingId, customerName: me.name, rating, title, body, at: todayISO(), reply: '', status: 'pending_moderation' }, ...s.reviews],
            bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'reviewed' } : x)),
            notifications: notify(s, 'admin', `New ${rating}-star review for ${listing.title} awaiting moderation`, '/admin/reviews'),
          };
        });
        toast('Thanks! Your review will appear after a quick check (usually within a few hours).');
      },

      // POST /v1/disputes
      raiseDispute: ({ bookingId, reason, description, amount }) => {
        update((s) => {
          const b = s.bookings.find((x) => x.id === bookingId);
          const lead = s.leads.find((l) => l.id === b.leadId);
          const partner = s.partners.find((p) => p.id === b.partnerId);
          return {
            disputes: [{ id: uid('d'), bookingId, bookingNumber: b.number, customer: lead.contactName, partner: partner.name, reason, description, amountClaimed: Number(amount) || 0, status: 'open', openedAt: todayISO(), evidence: [{ side: 'customer', note: description, file: 'attachment.jpg' }] }, ...s.disputes],
            payouts: s.payouts.map((p) => (p.partner === partner.name && p.status === 'pending' ? { ...p, status: 'on_hold', note: 'Open dispute' } : p)),
            notifications: notify(s, 'admin', `New dispute on ${b.number}: ${reason}`, '/admin/disputes'),
          };
        });
        toast('Complaint raised. Our team will contact both sides within 24 hours.');
      },

      // ----- Partner -----
      addLead: (data) => {
        const id = uid('ld');
        update((s) => ({
          leads: [{ id, partnerId: s.partnerId, branchId: newRecordBranch(s), listingId: (s.listings.find((l) => l.partnerId === s.partnerId) || {}).id || 'l1', customerId: null, eventId: null, status: 'new', assignedTo: null, createdAt: nowISO(), bookingId: null, ...data }, ...s.leads],
          leadActivities: [{ id: uid('a'), leadId: id, type: 'status', body: `Lead added manually (source: ${data.source})`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
          activity: log(s, actorName(s), `added lead ${data.contactName}`),
        }));
        toast('Lead added');
        return id;
      },
      updateLead: (id, patch) => update((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      // POST /v1/partner/leads/:id/convert - a qualified enquiry becomes a deal.
      convertToDeal: (id, { name, amount, closingDate, ownerId }) => {
        update((s) => {
          const lead = s.leads.find((l) => l.id === id);
          return {
            leads: s.leads.map((l) => (l.id === id ? { ...l, isDeal: true, status: l.status === 'new' ? 'contacted' : l.status, assignedTo: ownerId || l.assignedTo, deal: newDeal(l, { name, amount: Number(amount) || 0, closingDate }, todayISO(), actorName(s)) } : l)),
            leadActivities: [{ id: uid('a'), leadId: id, type: 'status', body: `Enquiry converted to deal "${name}"`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
            activity: [{ id: uid('al'), partnerId: s.partnerId, actor: actorName(s), action: `Converted enquiry ${lead.contactName} to a deal`, at: nowISO() }, ...s.activity],
          };
        });
        toast('Converted to a deal');
      },
      updateDeal: (id, patch) => update((s) => ({ leads: s.leads.map((l) => (l.id === id && l.deal ? { ...l, deal: { ...l.deal, ...patch } } : l)) })),
      setLeadStatus: (id, status, reason) =>
        update((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, status, lostReason: status === 'lost' ? reason || l.lostReason : l.lostReason } : l)),
          leadActivities: [{ id: uid('a'), leadId: id, type: 'status', body: `Status changed to ${LEAD_STAGE_LABEL[status]}${reason ? ' - ' + reason : ''}`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
        })),
      addLeadActivity: (leadId, type, body, due) =>
        update((s) => ({
          leadActivities: [{ id: uid('a'), leadId, type, body, due, by: actorName(s), at: nowISO() }, ...s.leadActivities],
          leads: due ? s.leads.map((l) => (l.id === leadId ? { ...l, nextFollowUp: due } : l)) : s.leads,
        })),

      // POST /v1/partner/quotes + /send
      sendQuote: ({ leadId, items, discount, gst, validUntil, notes }) => {
        let quoteId = uid('q');
        update((s) => {
          const lead = s.leads.find((l) => l.id === leadId);
          const prev = quotesForLead(s, leadId);
          const version = prev.length ? prev[0].version + 1 : 1;
          const number = prev.length ? prev[0].number : 'Q-' + (1050 + s.quotes.length);
          const quote = { id: quoteId, number, leadId, partnerId: s.partnerId, branchId: (s.leads.find((l) => l.id === leadId) || {}).branchId || null, version, items, discount: Number(discount) || 0, gst, validUntil, notes, status: 'sent', sentAt: nowISO() };
          let threads = s.threads;
          let thread = s.threads.find((t) => t.leadId === leadId);
          if (!thread && lead.customerId) {
            thread = { id: uid('t'), customerId: lead.customerId, partnerId: s.partnerId, listingId: lead.listingId, leadId };
            threads = [...threads, thread];
          }
          const t = quoteTotals(quote);
          const rfq = lead.rfqId && s.rfqs.find((r) => r.id === lead.rfqId);
          return {
            rfqs: rfq ? s.rfqs.map((r) => (r.id === rfq.id ? { ...r, invites: r.invites.map((i) => (i.id === lead.rfqInviteId ? { ...i, status: 'responded', quoteId, respondedAt: nowISO() } : i)) } : r)) : s.rfqs,
            quotes: [quote, ...s.quotes.map((q) => (q.leadId === leadId && (q.status === 'sent' || q.status === 'changes_requested') ? { ...q, status: 'superseded' } : q))],
            // Sending a quote on an enquiry converts it into a deal.
            leads: s.leads.map((l) => (l.id === leadId ? { ...l, status: prev.length ? 'negotiation' : 'quoted', isDeal: true, deal: l.deal ? { ...l.deal, amount: quoteTotals(quote).total } : newDeal(l, { amount: quoteTotals(quote).total }, todayISO(), actorName(s)) } : l)),
            threads,
            messages: thread ? [...s.messages, { id: uid('msg'), threadId: thread.id, side: 'partner', type: 'quote', refId: quoteId, body: `Quote ${number} v${version}`, at: nowISO() }] : s.messages,
            leadActivities: [{ id: uid('a'), leadId, type: 'status', body: `Quote ${number} v${version} sent (${inr(t.total)})`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
            activity: log(s, actorName(s), `sent quote ${number} v${version} to ${lead.contactName}`),
            notifications: rfq
              ? [{ id: uid('n'), to: rfq.buyerKind === 'corporate' ? 'corp' : 'partner', orgId: rfq.buyerId, partnerId: rfq.buyerKind === 'corporate' ? undefined : rfq.buyerId, text: `New quote on ${rfq.number} from ${s.partners.find((p) => p.id === s.partnerId).name}`, link: rfq.buyerKind === 'corporate' ? `/corp/rfqs/${rfq.id}` : `/partner/rfqs/${rfq.id}`, at: nowISO(), read: false }, ...s.notifications]
              : lead.customerId ? notify(s, 'customer', `New quote ${number} v${version}: ${inr(t.total)}`, `/bookings/${leadId}`) : s.notifications,
          };
        });
        toast('Quote sent');
        return quoteId;
      },

      completeBooking: (bookingId) => {
        update((s) => ({
          bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'completed', completedAt: nowISO() } : b)),
          pos: s.pos.map((p) => (p.bookingId === bookingId ? { ...p, status: 'fulfilled' } : p)),
          notifications: notify(s, 'customer', 'Your event is marked complete. Please rate your experience.', `/bookings/${s.bookings.find((b) => b.id === bookingId).leadId}`),
          activity: log(s, actorName(s), `marked ${s.bookings.find((b) => b.id === bookingId).number} as completed`),
        }));
        toast('Marked as completed. Review request sent.');
      },

      sendReminder: (invoiceId) => {
        update((s) => {
          const inv = s.invoices.find((i) => i.id === invoiceId);
          return { activity: log(s, actorName(s), `sent payment reminder for ${inv.number}`), notifications: notify(s, 'customer', `Payment reminder for invoice ${inv.number}`, '/bookings') };
        });
        toast('Reminder sent on WhatsApp and in the app');
      },

      toggleBlock: (date, note = 'Blocked manually') =>
        update((s) => {
          const manual = s.blocks.find((b) => b.partnerId === s.partnerId && b.date === date && b.source === 'manual');
          if (manual) return { blocks: s.blocks.filter((b) => b.id !== manual.id) };
          return { blocks: [...s.blocks, { id: uid('ab'), partnerId: s.partnerId, date, status: 'blocked', source: 'manual', note }] };
        }),

      addExpense: (exp) => {
        update((s) => ({ expenses: [{ id: uid('x'), partnerId: s.partnerId, branchId: exp.bookingId ? (s.bookings.find((b) => b.id === exp.bookingId) || {}).branchId || null : newRecordBranch(s), ...exp, amount: Number(exp.amount) || 0 }, ...s.expenses] }));
        toast('Expense added');
      },
      removeExpense: (id) => update((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),

      assignCrew: (bookingId, memberId, role, callTime) => {
        update((s) => ({
          crew: [...s.crew, { id: uid('c'), bookingId, memberId, role, callTime, status: 'assigned' }],
          activity: log(s, actorName(s), `assigned ${s.members.find((m) => m.id === memberId).name} to ${s.bookings.find((b) => b.id === bookingId).number}`),
        }));
        toast('Crew assigned');
      },
      removeCrew: (id) => update((s) => ({ crew: s.crew.filter((c) => c.id !== id) })),
      addTask: (task) => update((s) => ({ tasks: [...s.tasks, { id: uid('tk'), done: false, ...task }] })),
      toggleTask: (id) =>
        update((s) => {
          const t = s.tasks.find((x) => x.id === id);
          return {
            tasks: s.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
            activity: !t.done ? log(s, actorName(s), `completed task "${t.title}"`) : s.activity,
          };
        }),

      inviteMember: ({ name, phone, role, title, branchId }) => {
        update((s) => ({
          members: [...s.members, { id: uid('m'), partnerId: s.partnerId, name, phone, role, title, status: 'invited', branchId: branchId || null }],
          activity: log(s, actorName(s), `invited ${name} as ${role}`),
        }));
        toast('Invite sent by SMS');
      },
      setMemberRole: (id, role) => update((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, role } : m)) })),
      removeMember: (id) => {
        update((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, status: 'removed' } : m)) }));
        toast('Member removed', 'warning');
      },
      toggleRolePerm: (role, perm) =>
        update((s) => {
          const cur = s.rolePerms[role] || [];
          return { rolePerms: { ...s.rolePerms, [role]: cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm] } };
        }),

      updateListing: (listingId, patch) => {
        update((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, ...patch } : l)) }));
        toast('Listing updated');
      },

      replyReview: (id, reply) => {
        update((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) }));
        toast('Reply posted');
      },
      reportReview: (id, reason) => {
        update((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, status: 'reported', reportReason: reason } : r)) }));
        toast('Reported to the platform team');
      },

      renewSubscription: () => {
        update((s) => ({
          subscription: {
            ...s.subscription,
            status: 'active',
            periodStart: s.subscription.periodEnd,
            periodEnd: addDays(s.subscription.periodEnd, 30),
            history: [{ id: uid('sp'), date: todayISO(), amount: 199, gst: 36, status: 'paid' }, ...s.subscription.history],
          },
        }));
        toast('Subscription renewed for 30 days');
      },
      toggleAutoRenew: () => update((s) => ({ subscription: { ...s.subscription, autoRenew: !s.subscription.autoRenew } })),

      saveApplication: (app) => update(() => ({ application: app })),
      submitApplication: (app) => {
        update((s) => {
          const pid = uid('p');
          return {
            application: { ...app, partnerId: pid, submittedAt: nowISO(), status: 'pending' },
            partners: [...s.partners, { id: pid, name: app.businessName, ownerId: 'new', accountId: 'ac-' + pid, category: app.category, gstin: app.gstin, verification: 'pending', subscription: 'active', city: 'Chennai', joined: todayISO(), productAddedAt: nowISO() }],
            accounts: [...(s.accounts || []), { id: 'ac-' + pid, ownerId: 'new', ownerName: app.ownerName || '', name: app.businessName, gstin: app.gstin, city: 'Chennai', createdAt: todayISO() }],
            branches: [...(s.branches || []), { id: 'br-' + pid + '-0', partnerId: pid, name: app.area || 'Main branch', area: app.area || '', city: 'Chennai', phone: '', address: '', isMain: true, status: 'active', createdAt: todayISO() }],
            documents: [...s.documents, ...app.documents.map((d) => ({ partnerId: pid, type: d, file: d.toLowerCase().replace(/\W+/g, '_') + '.pdf', status: 'pending' }))],
            notifications: notify(s, 'admin', `New partner application: ${app.businessName}`, '/admin/verification'),
          };
        });
        toast('Application submitted for verification');
      },

      // ----- Category packs -----
      setPartner: (partnerId) => update(() => ({ partnerId, branchId: 'all' })),
      updateLeadDetails: (leadId, patch) => update((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, details: { ...(l.details || {}), ...patch } } : l)) })),
      // Changes a booking's category details; optionally tells the other side.
      updateBookingDetails: (bookingId, patch, message, to) =>
        update((s) => {
          const b = s.bookings.find((x) => x.id === bookingId);
          return {
            bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, details: { ...(x.details || {}), ...patch } } : x)),
            notifications: message ? notify(s, to, message, to === 'customer' ? `/bookings/${b.leadId}` : `/partner/bookings/${bookingId}`) : s.notifications,
            activity: message && to === 'customer' ? log(s, actorName(s), message.charAt(0).toLowerCase() + message.slice(1) + ` (${b.number})`) : s.activity,
          };
        }),
      saveMenu: (menu) => {
        update((s) => ({ menus: s.menus.some((m) => m.id === menu.id) ? s.menus.map((m) => (m.id === menu.id ? menu : m)) : [...s.menus, menu] }));
        toast('Menu saved');
      },
      removeMenu: (id) => update((s) => ({ menus: s.menus.filter((m) => m.id !== id) })),

      // ----- Admin -----
      verifyPartner: (partnerId, decision, reason) => {
        update((s) => ({
          partners: s.partners.map((p) => (p.id === partnerId ? { ...p, verification: decision, rejectReason: reason } : p)),
          documents: s.documents.map((d) => (d.partnerId === partnerId ? { ...d, status: decision === 'verified' ? 'approved' : 'rejected' } : d)),
          application: s.application && s.application.partnerId === partnerId ? { ...s.application, status: decision } : s.application,
        }));
        toast(decision === 'verified' ? 'Partner approved. Listing is live.' : 'Partner ' + decision, decision === 'verified' ? 'success' : 'warning');
      },
      toggleFeatured: (listingId) => update((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, featured: !l.featured } : l)) })),
      decideDispute: (id, decision) => {
        update((s) => ({ disputes: s.disputes.map((d) => (d.id === id ? { ...d, status: 'decided', decision } : d)) }));
        toast('Decision recorded and both sides notified');
      },
      advanceDispute: (id) => update((s) => ({ disputes: s.disputes.map((d) => (d.id === id ? { ...d, status: 'evidence' } : d)) })),
      setRefundStatus: (id, status) => {
        update((s) => ({ refunds: s.refunds.map((r) => (r.id === id ? { ...r, status } : r)) }));
        toast('Refund ' + status);
      },
      setPayoutStatus: (id, status) => {
        update((s) => ({ payouts: s.payouts.map((p) => (p.id === id ? { ...p, status, paidAt: status === 'paid' ? todayISO() : p.paidAt } : p)) }));
        toast(status === 'paid' ? 'Payout released' : 'Payout put on hold', status === 'paid' ? 'success' : 'warning');
      },
      moderateReview: (id, status) => {
        update((s) => {
          const r = s.reviews.find((x) => x.id === id);
          const goingLive = status === 'published' && r.status === 'pending_moderation';
          const listing = s.listings.find((l) => l.id === r.listingId);
          const count = listing ? listing.ratingCount + 1 : 0;
          return {
            reviews: s.reviews.map((x) => (x.id === id ? { ...x, status, moderatedAt: nowISO() } : x)),
            listings: goingLive && listing ? s.listings.map((l) => (l.id === listing.id ? { ...l, rating: Math.round(((l.rating * l.ratingCount + r.rating) / count) * 10) / 10, ratingCount: count } : l)) : s.listings,
            notifications: goingLive ? notify(s, 'partner', `New ${r.rating}-star review from ${r.customerName}`, '/partner/reviews') : s.notifications,
          };
        });
        toast({ hidden: 'Review hidden', published: 'Review published', removed: 'Review removed' }[status] || 'Updated');
      },
      toggleUserBlock: (id) => update((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' } : u)) })),
      toggleArticle: (id) => update((s) => ({ articles: s.articles.map((a) => (a.id === id ? { ...a, status: a.status === 'published' ? 'draft' : 'published' } : a)) })),
      updateSettings: (patch) => {
        update((s) => ({ settings: { ...s.settings, ...patch } }));
      },
    };
  }, [toast]);

  const value = useMemo(() => ({ state, actions, toasts, toast }), [state, actions, toasts, toast]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

export function usePerms() {
  const { state } = useStore();
  const perms = isPartnerRole(state.role) ? state.rolePerms[state.role] || [] : [];
  return { can: (p) => perms.includes(p), perms };
}

// The logged-in team member for the current business and demo role.
export function useCurrentMember() {
  const { state } = useStore();
  const r = ROLES.find((x) => x.id === state.role);
  if (!r || !r.memberId) return null;
  const direct = state.members.find((m) => m.id === r.memberId && m.partnerId === state.partnerId);
  return direct || state.members.find((m) => m.partnerId === state.partnerId && m.role === state.role && m.status === 'active') || null;
}
