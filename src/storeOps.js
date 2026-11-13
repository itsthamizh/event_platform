// Phase 2 actions: holds, inventory and reservations, run sheets, shipments,
// tastings / trials, crew leave, coupons, wallet payments, refunds with credit
// notes, payout decisions and coupon admin. Each mirrors an API endpoint.
import { addDays, inr, nowISO, todayISO, uid } from './config';
import { checkCoupon, nextDocNumber } from './ops';
import { schedPaid } from './lifecycle';
import { newRecordBranch } from './accounts';

export function opsActions({ update, notify, log, actorName, toast }) {
  return {
    // Quiet listing update for Setup forms (saves as you type).
    saveListing: (listingId, patch) => update((s) => ({ listings: s.listings.map((l) => (l.id === listingId ? { ...l, ...patch } : l)) })),

    // ---------- Holds ----------
    extendHold: (bookingId, days = 2) => {
      update((s) => ({ bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, holdUntil: addDays(todayISO(), days) } : b)), activity: log(s, actorName(s), `extended the date hold on ${s.bookings.find((b) => b.id === bookingId).number}`) }));
      toast(`Date held for ${days} more days`);
    },

    // ---------- Inventory ----------
    saveInventoryItem: (item) => {
      update((s) => ({ inventory: item.id ? s.inventory.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [...s.inventory, { id: uid('it'), partnerId: s.partnerId, branchId: newRecordBranch(s), condition: 'Good', ...item, qty: Number(item.qty) || 0 }] }));
      toast('Inventory saved');
    },
    reserveItem: (bookingId, itemId, qty) => {
      update((s) => {
        const b = s.bookings.find((x) => x.id === bookingId);
        const existing = s.reservations.find((r) => r.bookingId === bookingId && r.itemId === itemId);
        return {
          reservations: existing ? s.reservations.map((r) => (r.id === existing.id ? { ...r, qty: Number(qty) } : r)) : [...s.reservations, { id: uid('rs'), itemId, bookingId, date: b.eventDate, qty: Number(qty) }],
        };
      });
      toast('Reserved for this booking');
    },
    releaseReservation: (id) => update((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),

    // ---------- Run sheet ----------
    runSheetItem: (bookingId, op, item) =>
      update((s) => {
        const list = s.runSheets[bookingId] || [];
        const next = op === 'add' ? [...list, { id: uid('rn'), done: false, shared: true, ...item }].sort((a, b) => a.time.localeCompare(b.time)) : op === 'update' ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : list.filter((x) => x.id !== item.id);
        return { runSheets: { ...s.runSheets, [bookingId]: next } };
      }),

    // ---------- Shipments ----------
    addShipment: (bookingId, item, courier) => {
      update((s) => {
        const b = s.bookings.find((x) => x.id === bookingId);
        const lead = s.leads.find((l) => l.id === b.leadId) || {};
        return { shipments: [...s.shipments, { id: uid('sh'), bookingId, partnerId: b.partnerId, item, courier, awb: '', status: 'packed', shippedAt: null, eta: addDays(b.eventDate, -2), deliveredAt: null, address: `${lead.contactName}, ${lead.area || 'Chennai'}` }] };
      });
      toast('Shipment created');
    },
    setShipmentStatus: (id, status) => {
      update((s) => {
        const sh = s.shipments.find((x) => x.id === id);
        const b = s.bookings.find((x) => x.id === sh.bookingId);
        const patch = { status, ...(status === 'shipped' ? { shippedAt: todayISO(), awb: sh.awb || 'CH' + Math.floor(100000 + Math.random() * 899999) } : {}), ...(status === 'delivered' ? { deliveredAt: todayISO() } : {}) };
        return {
          shipments: s.shipments.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          notifications: b.customerId ? notify(s, 'customer', `${sh.item}: ${status.replace('_', ' ')}`, `/bookings/${b.leadId}`) : s.notifications,
        };
      });
      toast('Shipment ' + status.replace('_', ' '));
    },

    // ---------- Tastings, trials, site visits (before or after booking) ----------
    scheduleTrial: (leadId, t, by = 'partner') => {
      update((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        return {
          trials: [...s.trials, { id: uid('tr'), leadId, bookingId: lead.bookingId || null, partnerId: lead.partnerId, status: 'scheduled', people: 4, notes: '', ...t }],
          notifications: by === 'partner' ? (lead.customerId ? notify(s, 'customer', `${t.type} scheduled on ${t.date} at ${t.time}`, `/bookings/${leadId}`) : s.notifications) : notify(s, 'partner', `${lead.contactName} booked a ${t.type.toLowerCase()} on ${t.date}`, `/partner/leads/${leadId}`),
        };
      });
      toast(`${t.type} scheduled`);
    },
    setTrialStatus: (id, status, notes) => update((s) => ({ trials: s.trials.map((t) => (t.id === id ? { ...t, status, notes: notes != null ? notes : t.notes } : t)) })),

    // ---------- Crew leave ----------
    addLeave: (memberId, date, reason) => {
      update((s) => ({ leaves: [...s.leaves, { id: uid('lv'), memberId, partnerId: s.partnerId, date, reason }] }));
      toast('Leave added. This member cannot be assigned that day.');
    },
    removeLeave: (id) => update((s) => ({ leaves: s.leaves.filter((l) => l.id !== id) })),

    // ---------- Coupons ----------
    // POST /v1/bookings/{id}/apply-coupon. Platform-funded: Vizha pays it as a part payment on the advance.
    // Partner-funded: the partner's price drops.
    applyCoupon: (bookingId, code) => {
      update((s) => {
        const b = s.bookings.find((x) => x.id === bookingId);
        const chk = checkCoupon(s, b, code);
        if (!chk.ok) return {};
        const { coupon: c, amount } = chk;
        const redemption = { id: uid('rd'), couponId: c.id, code: c.code, bookingId, userId: s.customerId, amount, at: nowISO() };
        const invoices = s.invoices.map((i) => {
          if (i.id !== b.invoiceId) return i;
          const first = i.schedule.find((x) => !x.paidAt && !x.waived);
          return {
            ...i,
            schedule: i.schedule.map((x) =>
              x.id !== first.id ? x : c.funded === 'platform' ? { ...x, parts: [...(x.parts || []), { amount: Math.min(amount, x.amount - schedPaid(x)), at: nowISO(), method: 'Coupon ' + c.code, channel: 'coupon' }] } : { ...x, amount: x.amount - amount }
            ),
          };
        });
        return {
          redemptions: [redemption, ...s.redemptions], invoices,
          bookings: c.funded === 'partner' ? s.bookings.map((x) => (x.id === bookingId ? { ...x, total: x.total - amount } : x)) : s.bookings,
          coupons: s.coupons.map((x) => (x.id === c.id ? { ...x, used: x.used + 1 } : x)),
          notifications: notify(s, 'partner', `Coupon ${c.code} applied on ${b.number} (${inr(amount)}${c.funded === 'platform' ? ', paid by Zoho for Vizhaa' : ''})`, `/partner/bookings/${b.id}`),
        };
      });
      toast('Coupon applied');
    },
    saveCoupon: (c) => {
      update((s) => ({ coupons: c.id ? s.coupons.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [{ id: uid('cp'), used: 0, active: true, ...c, value: Number(c.value), minAmount: Number(c.minAmount), maxDiscount: Number(c.maxDiscount || c.value), maxUses: Number(c.maxUses || 1000) }, ...s.coupons] }));
      toast('Coupon saved');
    },
    toggleCoupon: (id) => update((s) => ({ coupons: s.coupons.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) })),

    // ---------- Wallet ----------
    payFromWallet: (invoiceId, schedId) => {
      update((s) => {
        const inv = s.invoices.find((i) => i.id === invoiceId);
        const item = inv.schedule.find((x) => x.id === schedId);
        const w = s.wallets[s.customerId] || { balance: 0, txns: [] };
        const use = Math.min(w.balance, item.amount - schedPaid(item));
        if (use <= 0) return {};
        const full = use >= item.amount - schedPaid(item);
        return {
          wallets: { ...s.wallets, [s.customerId]: { balance: w.balance - use, txns: [{ id: uid('w'), at: nowISO(), type: 'debit', amount: use, note: `Paid towards ${item.label} (${inv.number})` }, ...w.txns] } },
          invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, schedule: i.schedule.map((x) => (x.id !== schedId ? x : full ? { ...x, paidAt: nowISO(), method: 'Zoho for Vizhaa wallet', channel: 'wallet' } : { ...x, parts: [...(x.parts || []), { amount: use, at: nowISO(), method: 'Zoho for Vizhaa wallet', channel: 'wallet' }] })) } : i)),
          notifications: notify(s, 'partner', `${inr(use)} paid from the customer's Zoho for Vizhaa wallet`, `/partner/invoices/${invoiceId}`),
        };
      });
      toast('Paid from wallet');
    },

    // ---------- Refunds: requested -> approved -> processing -> processed | rejected ----------
    refundStep: (id, step, to) => {
      update((s) => {
        const r = s.refunds.find((x) => x.id === id);
        const today = todayISO();
        let patch = {};
        let creditNotes = s.creditNotes;
        let wallets = s.wallets;
        if (step === 'approve') patch = { status: 'approved', approvedAt: today, to: to || r.to || 'original' };
        if (step === 'reject') patch = { status: 'rejected', rejectedAt: today };
        if (step === 'process') patch = { status: 'processing' };
        if (step === 'complete') {
          const partner = s.partners.find((p) => p.id === r.partnerId) || { name: r.partner || 'Partner', id: r.partnerId };
          const b = s.bookings.find((x) => x.id === r.bookingId || x.number === r.bookingNumber);
          const inv = b && s.invoices.find((i) => i.id === b.invoiceId);
          const number = nextDocNumber(s, partner, 'CN', today);
          creditNotes = [{ id: uid('cn'), number, partnerId: r.partnerId, invoiceId: inv ? inv.id : null, invoiceNumber: inv ? inv.number : '-', refundId: r.id, amount: r.amount, gst: inv && inv.gst ? Math.round((r.amount / 1.18) * 0.18) : 0, issuedAt: today, reason: r.reason, customer: r.customer }, ...s.creditNotes];
          patch = { status: 'processed', processedAt: today, creditNote: number };
          if ((r.to || 'original') === 'wallet' && b && b.customerId) {
            const w = s.wallets[b.customerId] || { balance: 0, txns: [] };
            wallets = { ...s.wallets, [b.customerId]: { balance: w.balance + r.amount, txns: [{ id: uid('w'), at: nowISO(), type: 'credit', amount: r.amount, note: `Refund for ${r.bookingNumber}` }, ...w.txns] } };
          }
        }
        return {
          refunds: s.refunds.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          creditNotes, wallets,
          notifications: step === 'complete' ? notify(s, 'customer', `Refund of ${inr(r.amount)} for ${r.bookingNumber} ${(patch.to || r.to) === 'wallet' ? 'added to your wallet' : 'sent to your original payment method'}`, '/wallet') : s.notifications,
        };
      });
      toast({ approve: 'Refund approved', reject: 'Refund rejected', process: 'Sent to the payment gateway', complete: 'Refund completed and credit note issued' }[step], step === 'reject' ? 'warning' : 'success');
    },

    // ---------- Payouts: scheduled -> processing -> paid; on_hold; failed ----------
    setPayoutState: (payoutId, partnerId, week, status, note) => {
      update((s) => ({ payoutStatus: { ...s.payoutStatus, [partnerId + '|' + week]: { status, note: note || '', at: todayISO() } } }));
      toast({ paid: 'Payout released', on_hold: 'Payout put on hold', failed: 'Marked as failed. Partner asked to re-check bank details.', processing: 'Payout sent to bank' }[status] || 'Updated', status === 'paid' || status === 'processing' ? 'success' : 'warning');
    },
  };
}
