// Status rules from the data model's "Status Flows" sheet, kept in one place so the
// customer app, Partner CRM, corporate console and admin all agree.
import { CORE_PRODUCTS, daysBetween, todayISO } from './config';

// ---------- Quotes: draft -> sent -> viewed -> revision_requested -> revised -> accepted | rejected | expired | withdrawn ----------
export const QUOTE_STATUS_LABEL = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', changes_requested: 'Revision requested', superseded: 'Revised',
  accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired', withdrawn: 'Withdrawn',
};
export const QUOTE_FLOW = ['draft', 'sent', 'viewed', 'changes_requested', 'accepted'];
// Stored status plus what time has done to it: a sent quote past its validity is expired.
export const quoteStatus = (q, today = todayISO()) => {
  if (!q) return null;
  if (['sent', 'viewed'].includes(q.status) && q.validUntil && q.validUntil < today) return 'expired';
  if (q.status === 'sent' && q.viewedAt) return 'viewed';
  return q.status;
};
export const quoteIsOpen = (q) => ['sent', 'viewed'].includes(quoteStatus(q));

// ---------- Contracts: draft -> sent -> partially_signed -> signed | void ----------
export const CONTRACT_LABEL = { draft: 'Draft', sent: 'Awaiting customer', partially_signed: 'Awaiting partner countersign', signed: 'Signed by both', void: 'Void' };
export const contractStatus = (b) => {
  if (!b) return 'draft';
  if (b.status === 'cancelled') return 'void';
  if (b.poId && !b.contractSigned) return 'signed'; // B2B: the accepted purchase order is the contract
  if (b.contractSigned && b.partnerSignedAt) return 'signed';
  if (b.contractSigned) return 'partially_signed';
  return 'sent';
};

// ---------- Bookings: requested -> confirmed -> in_progress -> completed; cancelled / disputed / rescheduled / no_show ----------
// Stored statuses stay the product's (accepted, booked, completed, reviewed, cancelled);
// the extra states from the model are worked out here.
export const BOOKING_LABEL = {
  accepted: 'Accepted', booked: 'Confirmed', in_progress: 'In progress', completed: 'Completed', reviewed: 'Reviewed',
  cancelled: 'Cancelled', no_show: 'No-show', disputed: 'Disputed', rescheduled: 'Rescheduled',
};
export const bookingStatus = (b, today = todayISO()) => {
  if (!b) return null;
  if (b.noShow) return 'no_show';
  if (b.status === 'booked' && b.eventDate === today) return 'in_progress';
  return b.status;
};
// Extra flags shown next to the main status.
export const bookingFlags = (b, state) => {
  const f = [];
  if (b.rescheduledFrom) f.push('rescheduled');
  if (state && state.disputes.some((d) => d.bookingNumber === b.number && d.status !== 'decided')) f.push('disputed');
  if (state && state.bookingChanges.some((c) => c.bookingId === b.id && c.status === 'requested')) f.push('change_requested');
  return f;
};

// ---------- Payment schedule: upcoming -> due -> overdue -> partially_paid -> paid | waived ----------
export const schedPaid = (s) => (s.paidAt ? s.amount : (s.parts || []).reduce((a, p) => a + p.amount, 0));
export const schedStatus = (s, today = todayISO()) => {
  if (s.waived) return 'waived';
  if (s.paidAt) return 'paid';
  if (schedPaid(s) > 0) return 'partially_paid';
  if (s.due < today) return 'overdue';
  if (daysBetween(today, s.due) <= 7) return 'due';
  return 'upcoming';
};
// Every money receipt on an invoice, including part payments.
export const receiptsOf = (inv) =>
  inv.schedule.flatMap((s) => [
    ...(s.parts || []).map((p, i) => ({ id: inv.id + s.id + 'p' + i, label: s.label + ' (part)', amount: p.amount, at: p.at, method: p.method, channel: p.channel, sched: s })),
    ...(s.paidAt ? [{ id: inv.id + s.id, label: s.label, amount: s.amount - (s.parts || []).reduce((a, p) => a + p.amount, 0), at: s.paidAt, method: s.method, channel: s.channel, sched: s }] : []),
  ]).filter((r) => r.amount > 0);

// ---------- Partner subscription: trial -> active -> past_due -> grace -> expired; active -> cancelled ----------
export const SUB_FLOW = ['trial', 'active', 'past_due', 'grace', 'expired'];
export const SUB_LABEL = { trial: 'Trial', active: 'Active', past_due: 'Past due', grace: 'Grace period', expired: 'Expired', cancelled: 'Cancelled' };
export const SUB_NOTE = {
  trial: 'Free 14-day trial. Listing goes live once verified.',
  active: 'Listing is live and the CRM is fully available.',
  past_due: 'Renewal payment failed. Retrying daily; listing stays live for now.',
  grace: 'Listing stays live for 7 more days. New leads still arrive. Pay to avoid losing it.',
  expired: 'Listing hidden from the customer app. CRM is read-only until you renew.',
  cancelled: 'Cancelled. Listing hidden at the end of the paid period.',
};
const LIVE_SUBS = ['trial', 'active', 'past_due', 'grace'];
// Listing visibility: live only if verified AND subscription is not lapsed.
export const listingStatus = (partner) => {
  if (!partner) return 'hidden';
  if (partner.blocked) return 'blocked';
  if (partner.productStatus === 'disabled' || partner.orgSuspended) return 'hidden';
  if (partner.verification !== 'verified') return 'draft';
  return LIVE_SUBS.includes(partner.subscription) ? 'live' : 'hidden';
};
export const isListed = (state, listing) => CORE_PRODUCTS.includes(listing.category) && listingStatus(state.partners.find((p) => p.id === listing.partnerId)) === 'live';

// ---------- Partner onboarding: profile -> portfolio -> packages -> documents -> subscription -> bank -> done ----------
export const ONBOARDING_STEPS = ['Business profile', 'Portfolio', 'Packages', 'Documents', 'Subscription', 'Bank account', 'Done'];

// ---------- Crew: assigned -> accepted | declined -> checked_in -> checked_out; no_show ----------
export const CREW_LABEL = { assigned: 'Assigned', accepted: 'Accepted', declined: 'Declined', checked_in: 'Checked in', checked_out: 'Checked out', no_show: 'No-show' };
export const crewStatus = (c) => c.status || 'accepted';

// ---------- Reviews: pending_moderation -> published -> hidden / removed ----------
export const REVIEW_LABEL = { pending_moderation: 'Awaiting moderation', published: 'Published', hidden: 'Hidden', removed: 'Removed', reported: 'Reported' };

// ---------- Leads ----------
export const LEAD_PRIORITY = ['low', 'medium', 'high', 'hot'];
export const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', hot: 'Hot' };
export const LOST_REASONS = [
  { id: 'price_high', label: 'Price too high' },
  { id: 'date_unavailable', label: 'Date not available' },
  { id: 'chose_competitor', label: 'Chose another vendor' },
  { id: 'no_response', label: 'No response' },
  { id: 'event_cancelled', label: 'Event cancelled' },
  { id: 'other', label: 'Other' },
];

// ---------- Refunds and payouts ----------
export const REFUND_FLOW = ['requested', 'approved', 'processing', 'processed'];
export const PAYOUT_FLOW = ['scheduled', 'processing', 'paid'];

// ---------- B2B ----------
export const BUYER_LABEL = { individual: 'Individual', corporate: 'Corporate', vendor: 'Planner / vendor' };
export const CHANNEL_LABEL = { app_request: 'App request', app_instant: 'Instant booking', crm_manual: 'Added in CRM', planner: 'Planner', corporate_rfq: 'Corporate RFQ', corporate_po: 'Corporate PO' };
export const RFQ_FLOW = ['draft', 'open', 'closed', 'awarded'];
export const RFQ_LABEL = { draft: 'Draft', open: 'Open', closed: 'Closed', awarded: 'Awarded', cancelled: 'Cancelled' };
export const INVITE_LABEL = { invited: 'Invited', viewed: 'Viewed', responded: 'Quoted', declined: 'Declined', awarded: 'Awarded', not_awarded: 'Not awarded' };
export const PO_FLOW = ['draft', 'pending_approval', 'issued', 'accepted', 'fulfilled'];
export const PO_LABEL = { draft: 'Draft', pending_approval: 'Pending approval', issued: 'Issued', accepted: 'Accepted', fulfilled: 'Fulfilled', cancelled: 'Cancelled', rejected: 'Rejected' };
export const APPROVAL_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', waiting: 'Waiting for earlier level' };
export const PLANNER_CATEGORIES = ['event_management', 'wedding_planner'];
export const isPlanner = (partner) => !!partner && PLANNER_CATEGORIES.includes(partner.category);

// Which approval levels a spend needs, from the buyer's rules (highest matching rule wins).
export const levelsFor = (rules, amount) => {
  const r = [...(rules || [])].sort((a, b) => b.above - a.above).find((x) => amount > x.above);
  return r ? r.levels : [];
};

// Invoice schedule by buyer type: individuals pay 30/50/20, corporates on credit terms, planners 50/50.
export const scheduleFor = (buyerType, total, createdDate, eventDate, addDays, creditDays = 30) => {
  if (buyerType === 'corporate') return [{ id: 's0', label: `Net ${creditDays} after event`, amount: total, due: addDays(eventDate, creditDays), paidAt: null }];
  if (buyerType === 'vendor') {
    const adv = Math.round(total * 0.5);
    return [
      { id: 's0', label: 'Advance (50%)', amount: adv, due: addDays(createdDate, 3), paidAt: null },
      { id: 's1', label: 'Balance within 15 days of event', amount: total - adv, due: addDays(eventDate, 15), paidAt: null },
    ];
  }
  const adv = Math.round(total * 0.3);
  const mil = Math.round(total * 0.5);
  const milDue = addDays(eventDate, -7) > createdDate ? addDays(eventDate, -7) : eventDate;
  return [
    { id: 's0', label: 'Advance', amount: adv, due: addDays(createdDate, 3), paidAt: null },
    { id: 's1', label: 'Milestone', amount: mil, due: milDue, paidAt: null },
    { id: 's2', label: 'Final', amount: total - adv - mil, due: eventDate, paidAt: null },
  ];
};
