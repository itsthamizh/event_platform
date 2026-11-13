// Phase 2 business rules from the data model: availability models and holds,
// muhurtham / weekend / season pricing, add-ons and travel charges, document
// numbering per financial year, GST place of supply, payouts and the ledger.
import { addDays, daysBetween, todayISO } from './config';
import { MUHURTHAM_DATES } from './data/masters';
import { receiptsOf } from './lifecycle';

// ---------- Availability ----------
// slot = date (+ session / hall) blocking, capacity = N bookings a day, delivery = lead time only.
export const AVAIL_MODEL = {
  venue: 'slot', photography: 'capacity', catering: 'capacity', decoration: 'capacity', pandit: 'capacity', melam: 'capacity', makeup: 'capacity',
  mehendi: 'capacity', music_dj: 'capacity', return_gifts: 'delivery', invitation: 'delivery', event_management: 'capacity', wedding_planner: 'capacity',
};
export const AVAIL_LABEL = { slot: 'Date and session slots', capacity: 'Bookings per day', delivery: 'Lead time (delivery)' };
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// A tentative hold from an accepted quote lapses when its 48-hour window passes without the advance.
export const holdExpired = (state, block) => {
  if (block.status !== 'tentative' || !block.bookingId) return false;
  const b = state.bookings.find((x) => x.id === block.bookingId);
  return !!(b && b.status === 'accepted' && b.holdUntil && b.holdUntil < todayISO());
};
export const liveBlocks = (state, partnerId, date) => state.blocks.filter((b) => b.partnerId === partnerId && b.date === date && !holdExpired(state, b));

export function availabilityDetail(state, listing, date) {
  if (!listing || !date) return { status: 'available' };
  const model = AVAIL_MODEL[listing.category] || 'capacity';
  const rules = listing.availability || {};
  const today = todayISO();
  const muhurtham = isMuhurtham(date);
  if (date < today) return { status: 'taken', reason: 'Date has passed', model };
  if (model === 'delivery') {
    const lead = rules.leadDays || 10;
    const days = daysBetween(today, date);
    if (days < lead) return { status: 'too_soon', reason: `Needs ${lead} days to produce and deliver`, model, muhurtham };
    const orders = liveBlocks(state, listing.partnerId, date).length;
    return { status: orders >= (rules.dailyOrders || 6) ? 'limited' : 'available', reason: `Delivery by ${addDays(date, -1)}`, model, muhurtham };
  }
  const wd = new Date(date + 'T00:00:00').getDay();
  if ((rules.closedWeekdays || []).includes(wd)) return { status: 'closed', reason: `Closed on ${WEEKDAYS[wd]}`, model, muhurtham };
  const cap = rules.capacity || listing.capacity || 1;
  const used = liveBlocks(state, listing.partnerId, date).length;
  if (used >= cap) return { status: 'taken', used, cap, model, muhurtham, reason: model === 'slot' ? 'All halls / sessions booked' : `All ${cap} teams booked` };
  if (used > 0) return { status: 'limited', used, cap, model, muhurtham, reason: `${cap - used} of ${cap} left` };
  return { status: 'available', used, cap, model, muhurtham };
}

// ---------- Pricing rules ----------
export const isMuhurtham = (date) => MUHURTHAM_DATES.some((m) => m.date === date);
export const muhurthamOf = (date) => MUHURTHAM_DATES.find((m) => m.date === date);
const isWeekend = (date) => [0, 6].includes(new Date(date + 'T00:00:00').getDay());

// Rules that apply on a date: [{ name, pct }]
export function surchargesFor(listing, date) {
  if (!date) return [];
  return (listing.pricingRules || [])
    .filter((r) => r.active !== false)
    .filter((r) => (r.type === 'muhurtham' ? isMuhurtham(date) : r.type === 'weekend' ? isWeekend(date) : r.type === 'season' ? date.slice(5) >= r.from && date.slice(5) <= r.to : false))
    .map((r) => ({ name: r.name, pct: r.pct, type: r.type }));
}

// Quote lines from the enquiry + chosen add-ons + travel + date surcharges.
export function enrichQuote(rows, lead, listing) {
  const out = [...rows];
  (lead.addons || []).forEach((aid) => {
    const a = (listing.addons || []).find((x) => x.id === aid);
    if (a) out.push({ description: `Add-on: ${a.name}`, qty: 1, unitPrice: a.price });
  });
  const area = lead.area && (listing.serviceAreas || []).find((s) => s.area === lead.area);
  if (area && area.travelCharge) out.push({ description: `Travel to ${area.area}`, qty: 1, unitPrice: area.travelCharge });
  const base = out.reduce((a, r) => a + r.qty * r.unitPrice, 0);
  surchargesFor(listing, lead.eventDate).forEach((s) => out.push({ description: `${s.name} (+${s.pct}%)`, qty: 1, unitPrice: Math.round((base * s.pct) / 100 / 10) * 10 }));
  return out;
}

// ---------- Document numbering (per org, per doc type, per financial year) ----------
export const financialYear = (date = todayISO()) => {
  const y = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
};
export const prefixOf = (name) => name.split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export function nextDocNumber(state, partner, type = 'INV', date = todayISO()) {
  const fy = financialYear(date);
  const pre = type === 'INV' ? `${prefixOf(partner.name)}/${fy}/` : `${prefixOf(partner.name)}/${type}/${fy}/`;
  const list = type === 'INV' ? state.invoices.filter((i) => i.partnerId === partner.id) : (state.creditNotes || []).filter((c) => c.partnerId === partner.id);
  const max = list.map((x) => x.number).filter((n) => n && n.startsWith(pre)).map((n) => Number(n.slice(pre.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  return pre + String(max + 1).padStart(4, '0');
}

// ---------- GST place of supply ----------
export const GST_STATES = { '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh', '27': 'Maharashtra', '07': 'Delhi' };
export function gstSplit(partner, invoice) {
  const from = (partner.gstin || '33').slice(0, 2);
  const to = (invoice.billToGstin || '').slice(0, 2) || from;
  const amt = invoice.gst ? Math.round((invoice.subtotal * 18) / 100) : 0;
  const inter = to !== from;
  return { inter, place: GST_STATES[to] || 'Tamil Nadu', igst: inter ? amt : 0, cgst: inter ? 0 : Math.round(amt / 2), sgst: inter ? 0 : amt - Math.round(amt / 2), total: amt };
}

// ---------- Payouts ----------
// In-app (online) collections are settled weekly to the partner's bank, minus TDS and commission,
// held while a dispute is open, and released after the payout hold period.
const weekStart = (iso) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};
export function buildPayouts(state) {
  const today = todayISO();
  const tdsPct = (state.settings && state.settings.tdsPct) || 1;
  const commissionPct = (state.settings && state.settings.commissionPct) || 0;
  const map = {};
  state.invoices.forEach((inv) => {
    receiptsOf(inv)
      .filter((r) => r.channel === 'online' || r.channel === 'coupon')
      .forEach((r) => {
        const wk = weekStart(r.at);
        const key = inv.partnerId + '|' + wk;
        map[key] = map[key] || { partnerId: inv.partnerId, week: wk, items: [] };
        map[key].items.push({ ...r, invoiceId: inv.id, invoiceNumber: inv.number, bookingId: inv.bookingId });
      });
  });
  const refundsByPartner = {};
  (state.refunds || []).filter((r) => r.status === 'processed' && r.partnerId).forEach((r) => {
    const wk = weekStart(r.processedAt || r.requestedAt);
    const key = r.partnerId + '|' + wk;
    refundsByPartner[key] = (refundsByPartner[key] || 0) + r.amount;
  });
  return Object.values(map)
    .map((p) => {
      const gross = p.items.reduce((a, i) => a + i.amount, 0);
      const refunds = refundsByPartner[p.partnerId + '|' + p.week] || 0;
      const commission = Math.round((gross * commissionPct) / 100);
      const tds = Math.round(((gross - refunds) * tdsPct) / 100);
      const partner = state.partners.find((x) => x.id === p.partnerId) || {};
      const disputed = state.disputes.some((d) => d.partner === partner.name && d.status !== 'decided');
      const end = addDays(p.week, 6);
      const payDate = addDays(end, (state.settings && state.settings.payoutHoldDays) || 3);
      const override = (state.payoutStatus || {})[p.partnerId + '|' + p.week];
      const status = override ? override.status : disputed ? 'on_hold' : payDate < addDays(today, -1) ? 'paid' : payDate <= addDays(today, 2) ? 'processing' : 'scheduled';
      return {
        id: 'po' + p.partnerId + p.week, partnerId: p.partnerId, partner: partner.name, week: p.week, period: `${p.week.slice(8)} ${new Date(p.week).toLocaleString('en-IN', { month: 'short' })} - ${end.slice(8)} ${new Date(end).toLocaleString('en-IN', { month: 'short' })}`,
        items: p.items, gross, refunds, commission, tds, net: gross - refunds - commission - tds, payDate, status, utr: status === 'paid' ? 'UTR' + p.week.replace(/-/g, '') + p.partnerId.toUpperCase() : null,
        note: override ? override.note : disputed ? 'Held: open dispute' : '', paidAt: status === 'paid' ? (override && override.at) || payDate : null,
      };
    })
    .sort((a, b) => b.week.localeCompare(a.week));
}

// ---------- Ledger (double entry, derived from every money movement) ----------
export function buildLedger(state) {
  const rows = [];
  const add = (at, ref, memo, dr, cr, amount, partnerId) => amount > 0 && rows.push({ id: ref + rows.length, at, ref, memo, dr, cr, amount, partnerId });
  state.invoices.forEach((inv) =>
    receiptsOf(inv).forEach((r) => {
      if (r.channel === 'online') add(r.at, inv.number, `${r.label} received in app (${r.method})`, 'Payment gateway clearing', 'Partner payable', r.amount, inv.partnerId);
      if (r.channel === 'coupon') add(r.at, inv.number, `Platform coupon ${r.method}`, 'Marketing - coupons', 'Partner payable', r.amount, inv.partnerId);
      if (r.channel === 'wallet') add(r.at, inv.number, 'Paid from customer wallet', 'Customer wallet liability', 'Partner payable', r.amount, inv.partnerId);
    })
  );
  buildPayouts(state).filter((p) => p.status === 'paid').forEach((p) => {
    add(p.paidAt + 'T10:00:00', p.utr, `Payout to ${p.partner} (${p.period})`, 'Partner payable', 'Bank - settlement account', p.net, p.partnerId);
    add(p.paidAt + 'T10:00:00', p.utr, `TDS u/s 194-O on ${p.partner}`, 'Partner payable', 'TDS payable', p.tds, p.partnerId);
  });
  (state.refunds || []).filter((r) => r.status === 'processed').forEach((r) => add((r.processedAt || r.requestedAt) + 'T12:00:00', r.creditNote || r.bookingNumber, `Refund to ${r.customer} (${r.to === 'wallet' ? 'wallet' : 'original method'})`, 'Partner payable', r.to === 'wallet' ? 'Customer wallet liability' : 'Payment gateway clearing', r.amount, r.partnerId));
  Object.values(state.subscriptions || {}).forEach((s) =>
    s.history.filter((h) => h.status === 'paid').forEach((h) => {
      add(h.date + 'T09:00:00', h.invoice || 'SUB', `Subscription ${(state.partners.find((p) => p.id === s.partnerId) || {}).name}`, 'Payment gateway clearing', 'Subscription revenue', h.amount, s.partnerId);
      add(h.date + 'T09:00:00', h.invoice || 'SUB', 'GST on subscription', 'Payment gateway clearing', 'GST output payable', h.gst, s.partnerId);
    })
  );
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

// ---------- Coupons ----------
// Returns { ok, error, coupon, amount } for a code on a booking (checked on the page before applying).
export function checkCoupon(state, booking, code) {
  const c = state.coupons.find((x) => x.code.toUpperCase() === String(code || '').trim().toUpperCase());
  if (!c) return { ok: false, error: 'That code does not exist.' };
  if (!c.active || c.validTill < todayISO()) return { ok: false, error: 'This coupon has expired.' };
  if (c.used >= c.maxUses) return { ok: false, error: 'This coupon has been fully used.' };
  if (c.partnerId && c.partnerId !== booking.partnerId) return { ok: false, error: 'This coupon is for a different partner.' };
  if (booking.total < c.minAmount) return { ok: false, error: `Valid on bookings above ₹${c.minAmount.toLocaleString('en-IN')}.` };
  if (state.redemptions.some((r) => r.bookingId === booking.id)) return { ok: false, error: 'A coupon is already applied to this booking.' };
  const amount = Math.min(c.maxDiscount || Infinity, c.type === 'percent' ? Math.round((booking.total * c.value) / 100) : c.value);
  return { ok: true, coupon: c, amount };
}
