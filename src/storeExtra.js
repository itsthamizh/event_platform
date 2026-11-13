// Actions for the flows added from the data model: quote / contract / booking-change
// lifecycles, crew check-in, subscriptions, event planning and the whole B2B side
// (RFQs, purchase orders, approvals, planner projects, preferred vendors).
// Each action mirrors an API endpoint, like the ones in store.js.
import { addDays, inr, nowISO, todayISO, uid } from './config';
import { initBookingDetails } from './categories/logic';
import { buildChecklist } from './data/planning';
import { levelsFor, quoteStatus, scheduleFor } from './lifecycle';
import { nextDocNumber } from './ops';

export const CORP_ROLES = { corp: 'cu1', corp_approver: 'cu2', corp_director: 'cu3' };
export const isCorpRole = (r) => !!CORP_ROLES[r];

// Who is buying in the current demo session: a corporate user, or a planner business.
export function currentBuyer(state) {
  if (isCorpRole(state.role)) {
    const u = state.corpUsers.find((x) => x.id === CORP_ROLES[state.role]);
    const org = state.orgs.find((o) => o.id === u.orgId);
    return { kind: 'corporate', id: org.id, name: org.name, gstin: org.gstin, creditDays: org.creditDays, user: u, org };
  }
  const p = state.partners.find((x) => x.id === state.partnerId);
  return { kind: 'planner', id: p.id, name: p.name, gstin: p.gstin, creditDays: 15, user: null, partner: p };
}

const qTotal = (q) => {
  const sub = q.items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.unitPrice || 0), 0) - Number(q.discount || 0);
  return sub + (q.gst ? Math.round(sub * 0.18) : 0);
};
const code = (name) => name.split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const poPrefix = (s, buyerId) => {
  const o = s.orgs.find((x) => x.id === buyerId);
  if (o) return o.poPrefix;
  return code((s.partners.find((p) => p.id === buyerId) || { name: 'PO' }).name);
};

export function extraActions({ update, notify, log, actorName, toast }) {
  // Notification to the buyer side (corporate users or the planner's CRM).
  const notifyBuyer = (s, kind, buyerId, text, link) =>
    kind === 'corporate'
      ? [{ id: uid('n'), to: 'corp', orgId: buyerId, text, link, at: nowISO(), read: false }, ...s.notifications]
      : [{ id: uid('n'), to: 'partner', partnerId: buyerId, text, link, at: nowISO(), read: false }, ...s.notifications];
  const notifyVendor = (s, partnerId, text, link) => [{ id: uid('n'), to: 'partner', partnerId, text, link, at: nowISO(), read: false }, ...s.notifications];

  // A B2B enquiry lands in the vendor's CRM as a lead.
  const b2bLead = (s, { partnerId, buyer, contact, title, eventDate, guests, requirements, details, rfqId, inviteId, source, poId, channel, projectId, parentBookingId }) => {
    const listing = s.listings.find((l) => l.partnerId === partnerId);
    return {
      id: uid('ld'), partnerId, listingId: listing ? listing.id : null, customerId: null, eventId: null, contactName: contact.name, contactPhone: contact.phone, source,
      eventType: 'Corporate', eventDate, guests: Number(guests) || 0, budget: 0, requirements: `${title} for ${buyer.name}. ${requirements || ''}`.trim(), status: 'new', assignedTo: null,
      nextFollowUp: addDays(todayISO(), 1), createdAt: nowISO(), bookingId: null, details: details || {}, priority: 'high', buyerType: buyer.kind === 'corporate' ? 'corporate' : 'vendor',
      buyer: { type: buyer.kind === 'corporate' ? 'corporate' : 'vendor', orgId: buyer.id, orgName: buyer.name, gstin: buyer.gstin, creditDays: buyer.creditDays, contact, rfqId: rfqId || null, poId: poId || null, channel, projectId: projectId || null, parentBookingId: parentBookingId || null },
      rfqId: rfqId || null, rfqInviteId: inviteId || null,
    };
  };

  // Booking + invoice + calendar hold from an accepted quote. Used by B2B PO acceptance.
  const makeBooking = (s, { quote, lead, status, po }) => {
    const listing = s.listings.find((l) => l.id === lead.listingId);
    const partner = s.partners.find((p) => p.id === quote.partnerId);
    const total = qTotal(quote);
    const bookingId = uid('b');
    const invId = uid('inv');
    const today = todayISO();
    const buyerType = lead.buyerType || 'individual';
    const invoice = {
      id: invId, number: nextDocNumber(s, partner, 'INV', today), partnerId: partner.id, bookingId,
      type: quote.gst ? 'gst' : 'regular', billTo: lead.buyer ? lead.buyer.orgName : lead.contactName, billToGstin: lead.buyer ? lead.buyer.gstin : '', buyerType, poNumber: po ? po.number : null,
      subtotal: total - (quote.gst ? Math.round((total / 1.18) * 0.18) : 0), gst: quote.gst, issuedAt: today, schedule: scheduleFor(buyerType, total, today, lead.eventDate, addDays, lead.buyer && lead.buyer.creditDays),
    };
    const booking = {
      id: bookingId, number: 'BK-' + (5000 + s.bookings.length), leadId: lead.id, quoteId: quote.id, partnerId: partner.id, listingId: lead.listingId, customerId: lead.customerId,
      eventDate: lead.eventDate, total, status, contractSigned: false, invoiceId: invId, createdAt: nowISO(), details: listing ? initBookingDetails(listing.category, lead, listing, s) : {},
      buyerType, channel: lead.buyer ? lead.buyer.channel : 'app_request', buyerOrgId: lead.buyer ? lead.buyer.orgId : null, buyerOrgName: lead.buyer ? lead.buyer.orgName : null,
      poId: po ? po.id : null, parentBookingId: lead.buyer ? lead.buyer.parentBookingId : null, projectId: lead.buyer ? lead.buyer.projectId : null,
    };
    return { booking, invoice, block: { id: uid('ab'), partnerId: partner.id, date: lead.eventDate, status: status === 'booked' ? 'blocked' : 'tentative', source: 'booking', bookingId } };
  };

  // Creates a PO for an accepted quote and routes it through approvals.
  const raisePo = (s, { buyer, partnerId, quote, lead, rfq, title, eventRef, eventDate, costCenterId, projectId, raisedBy }) => {
    const amount = qTotal(quote);
    const poId = uid('po');
    const seq = s.pos.filter((p) => p.buyerId === buyer.id).length + 100;
    const number = `PO/${poPrefix(s, buyer.id)}/26-27/${String(seq).padStart(4, '0')}`;
    const rules = s.approvalRules.filter((r) => r.orgId === buyer.id);
    const levels = levelsFor(rules, amount);
    let approval = null;
    if (levels.length) {
      const owner = s.members.find((m) => m.partnerId === buyer.id && m.role === 'owner');
      approval = {
        id: uid('ap'), orgId: buyer.id, buyerKind: buyer.kind, entity: 'po', entityId: poId, title: `${number} - ${(s.partners.find((p) => p.id === partnerId) || {}).name} (${title})`, amount,
        levels: levels.map((l, i) => ({ ...l, approverName: l.approverId === 'owner' && owner ? owner.name : l.approverName, status: i === 0 ? 'pending' : 'waiting', at: null, note: '' })),
        status: 'pending', requestedBy: raisedBy, requestedAt: nowISO(),
      };
    }
    const po = {
      id: poId, number, buyerKind: buyer.kind, buyerId: buyer.id, buyerName: buyer.name, partnerId, rfqId: rfq ? rfq.id : null, quoteId: quote.id, leadId: lead.id, bookingId: null,
      costCenterId: costCenterId || null, projectId: projectId || null, eventRef, title, items: quote.items.map((x) => ({ ...x })), discount: quote.discount || 0, gst: quote.gst, amount,
      paymentTerms: buyer.kind === 'corporate' ? `Net ${buyer.creditDays} after event` : '50% advance, balance in 15 days', eventDate, status: approval ? 'pending_approval' : 'issued',
      createdAt: nowISO(), issuedAt: approval ? null : nowISO(), acceptedAt: null, raisedBy, approvalId: approval ? approval.id : null,
    };
    return { po, approval };
  };

  return {
    // ---------- Quote lifecycle ----------
    // GET /v1/quotes/{id} by the customer marks it viewed.
    markQuoteViewed: (quoteId) =>
      update((s) => {
        const q = s.quotes.find((x) => x.id === quoteId);
        if (!q || q.viewedAt || q.status !== 'sent') return {};
        return { quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, viewedAt: nowISO() } : x)) };
      }),
    // POST /v1/quotes/{id}/withdraw (partner)
    withdrawQuote: (quoteId, reason) => {
      update((s) => {
        const q = s.quotes.find((x) => x.id === quoteId);
        return {
          quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'withdrawn', withdrawReason: reason } : x)),
          leadActivities: [{ id: uid('a'), leadId: q.leadId, type: 'status', body: `Quote ${q.number} v${q.version} withdrawn: ${reason}`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
          notifications: notify(s, 'customer', `${q.number} was withdrawn by the partner`, `/bookings/${q.leadId}`),
        };
      });
      toast('Quote withdrawn', 'warning');
    },
    // POST /v1/quotes/{id}/extend (partner): push validity out.
    extendQuote: (quoteId, days = 7) => {
      update((s) => ({ quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, status: ['expired'].includes(x.status) ? 'sent' : x.status, validUntil: addDays(todayISO(), days) } : x)) }));
      toast(`Quote valid for ${days} more days`);
    },
    // POST /v1/quotes/{id}/reject (customer)
    declineQuote: (quoteId, reason) => {
      update((s) => {
        const q = s.quotes.find((x) => x.id === quoteId);
        return {
          quotes: s.quotes.map((x) => (x.id === quoteId ? { ...x, status: 'rejected', rejectReason: reason } : x)),
          leads: s.leads.map((l) => (l.id === q.leadId ? { ...l, status: 'lost', lostReason: reason, lostReasonCode: reason === 'Price too high' ? 'price_high' : 'other' } : l)),
          leadActivities: [{ id: uid('a'), leadId: q.leadId, type: 'status', body: `Customer declined ${q.number} v${q.version}: ${reason}`, by: 'Customer', at: nowISO() }, ...s.leadActivities],
          notifications: notify(s, 'partner', `Quote ${q.number} declined: ${reason}`, `/partner/leads/${q.leadId}`),
        };
      });
      toast('Quote declined. The partner has been told.');
    },
    // POST /v1/quotes/{id}/renew-request (customer, after expiry)
    askToRenew: (quoteId) => {
      update((s) => {
        const q = s.quotes.find((x) => x.id === quoteId);
        return { notifications: notify(s, 'partner', `Customer asked to renew expired quote ${q.number}`, `/partner/quotes/${q.id}`) };
      });
      toast('Asked the partner to renew the quote');
    },

    // ---------- Contract: partner countersign ----------
    countersignContract: (bookingId) => {
      update((s) => ({
        bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, partnerSignedAt: nowISO() } : b)),
        activity: log(s, actorName(s), `countersigned the contract for ${s.bookings.find((b) => b.id === bookingId).number}`),
        notifications: notify(s, 'customer', 'Contract signed by both sides', `/bookings/${s.bookings.find((b) => b.id === bookingId).leadId}`),
      }));
      toast('Contract countersigned');
    },

    // ---------- Booking changes (reschedule / guest count / scope) ----------
    requestBookingChange: ({ bookingId, type, to, note, by }) => {
      update((s) => {
        const b = s.bookings.find((x) => x.id === bookingId);
        const lead = s.leads.find((l) => l.id === b.leadId);
        const from = type === 'reschedule' ? b.eventDate : type === 'guest_count' ? String(lead.guests) : '';
        const change = { id: uid('bc'), bookingId, partnerId: b.partnerId, type, from, to, note, requestedBy: by, status: 'requested', at: nowISO() };
        return {
          bookingChanges: [change, ...s.bookingChanges],
          notifications: by === 'customer' ? notify(s, 'partner', `${lead.contactName} requested a change on ${b.number}`, `/partner/bookings/${b.id}`) : notify(s, 'customer', `${b.number}: the partner proposed a change`, `/bookings/${b.leadId}`),
        };
      });
      toast('Change request sent');
    },
    decideBookingChange: (changeId, decision, reply) => {
      update((s) => {
        const c = s.bookingChanges.find((x) => x.id === changeId);
        const b = s.bookings.find((x) => x.id === c.bookingId);
        let { bookings, leads, blocks, invoices } = s;
        if (decision === 'approved' && c.type === 'reschedule') {
          bookings = bookings.map((x) => (x.id === b.id ? { ...x, eventDate: c.to, rescheduledFrom: b.eventDate } : x));
          leads = leads.map((l) => (l.id === b.leadId ? { ...l, eventDate: c.to } : l));
          blocks = blocks.map((bl) => (bl.bookingId === b.id ? { ...bl, date: c.to } : bl));
          invoices = invoices.map((i) => (i.id === b.invoiceId ? { ...i, schedule: i.schedule.map((x) => (!x.paidAt && x.due >= b.eventDate ? { ...x, due: c.to } : x)) } : i));
        }
        if (decision === 'approved' && c.type === 'guest_count') leads = leads.map((l) => (l.id === b.leadId ? { ...l, guests: Number(c.to) || l.guests } : l));
        const by = c.requestedBy === 'customer' ? 'partner' : 'customer';
        return {
          bookingChanges: s.bookingChanges.map((x) => (x.id === changeId ? { ...x, status: decision, reply, decidedAt: nowISO() } : x)),
          bookings, leads, blocks, invoices,
          activity: by === 'partner' ? log(s, actorName(s), `${decision} a ${c.type.replace('_', ' ')} change on ${b.number}`) : s.activity,
          notifications: by === 'partner' ? notify(s, 'customer', `${b.number}: your change request was ${decision}`, `/bookings/${b.leadId}`) : notify(s, 'partner', `${b.number}: customer ${decision} your proposed change`, `/partner/bookings/${b.id}`),
        };
      });
      toast(decision === 'approved' ? 'Change approved and booking updated' : 'Change declined', decision === 'approved' ? 'success' : 'warning');
    },
    // Marks a no-show (customer or partner side) on an event that has passed.
    markNoShow: (bookingId, who) => {
      update((s) => ({
        bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, noShow: who } : b)),
        activity: log(s, actorName(s), `marked ${s.bookings.find((b) => b.id === bookingId).number} as ${who} no-show`),
      }));
      toast('Marked as no-show', 'warning');
    },

    // ---------- Crew ----------
    setCrewStatus: (crewId, status) => {
      update((s) => {
        const c = s.crew.find((x) => x.id === crewId);
        const b = s.bookings.find((x) => x.id === c.bookingId);
        const patch = { status, ...(status === 'checked_in' ? { checkInAt: nowISO() } : {}), ...(status === 'checked_out' ? { checkOutAt: nowISO() } : {}) };
        return {
          crew: s.crew.map((x) => (x.id === crewId ? { ...x, ...patch } : x)),
          activity: log(s, (s.members.find((m) => m.id === c.memberId) || {}).name || actorName(s), `${status.replace('_', ' ')} for ${b.number}`),
          notifications: status === 'declined' ? notify(s, 'partner', `${(s.members.find((m) => m.id === c.memberId) || {}).name} declined ${b.number}`, `/partner/bookings/${b.id}`) : s.notifications,
        };
      });
      toast({ accepted: 'Job accepted', declined: 'Job declined. Your manager has been told.', checked_in: 'Checked in', checked_out: 'Checked out', no_show: 'Marked as no-show' }[status] || 'Updated');
    },

    // ---------- Subscriptions ----------
    paySubscription: (partnerId) => {
      update((s) => {
        const sub = s.subscriptions[partnerId];
        const start = ['expired', 'cancelled'].includes(sub.status) ? todayISO() : sub.periodEnd;
        return {
          subscriptions: { ...s.subscriptions, [partnerId]: { ...sub, status: 'active', periodStart: start, periodEnd: addDays(start, 30), history: [{ id: uid('sp'), date: todayISO(), amount: 199, gst: 36, status: 'paid', invoice: `VZ/SUB/26-27/${Math.floor(Math.random() * 9000) + 1000}` }, ...sub.history], events: [{ at: nowISO(), text: 'Payment received. Renewed for 30 days.' }, ...sub.events] } },
          partners: s.partners.map((p) => (p.id === partnerId ? { ...p, subscription: 'active' } : p)),
        };
      });
      toast('Subscription renewed for 30 days. Listing is live.');
    },
    cancelSubscription: (partnerId) => {
      update((s) => ({
        subscriptions: { ...s.subscriptions, [partnerId]: { ...s.subscriptions[partnerId], status: 'cancelled', autoRenew: false, events: [{ at: nowISO(), text: 'Subscription cancelled by owner.' }, ...s.subscriptions[partnerId].events] } },
        partners: s.partners.map((p) => (p.id === partnerId ? { ...p, subscription: 'cancelled' } : p)),
      }));
      toast('Subscription cancelled', 'warning');
    },
    // Demo control: move the subscription along its lifecycle to see the effect on the listing.
    simulateSubscription: (partnerId, status) => {
      const text = { past_due: 'Renewal payment failed (card declined).', grace: 'Entered 7-day grace period.', expired: 'Subscription expired. Listing hidden.' }[status] || status;
      update((s) => ({
        subscriptions: { ...s.subscriptions, [partnerId]: { ...s.subscriptions[partnerId], status, events: [{ at: nowISO(), text }, ...s.subscriptions[partnerId].events] } },
        partners: s.partners.map((p) => (p.id === partnerId ? { ...p, subscription: status } : p)),
      }));
    },
    toggleAutoRenewFor: (partnerId) => update((s) => ({ subscriptions: { ...s.subscriptions, [partnerId]: { ...s.subscriptions[partnerId], autoRenew: !s.subscriptions[partnerId].autoRenew } } })),

    // ---------- Event planning ----------
    // Add / update / remove one row in an event's list (functions, guestList, budgetItems, checklist, collaborators).
    eventItem: (eventId, key, op, item) =>
      update((s) => ({
        events: s.events.map((e) => {
          if (e.id !== eventId) return e;
          const list = e[key] || [];
          if (op === 'add') return { ...e, [key]: [...list, { id: uid(key.slice(0, 2)), ...item }] };
          if (op === 'update') return { ...e, [key]: list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) };
          return { ...e, [key]: list.filter((x) => x.id !== item.id) };
        }),
      })),
    resetChecklist: (eventId) => {
      update((s) => ({ events: s.events.map((e) => (e.id === eventId ? { ...e, checklist: buildChecklist(e.type, e.date, addDays) } : e)) }));
      toast('Checklist rebuilt from the template');
    },
    inviteCollaborator: (eventId, c) => {
      update((s) => ({ events: s.events.map((e) => (e.id === eventId ? { ...e, collaborators: [...(e.collaborators || []), { id: uid('cb'), status: 'invited', ...c }] } : e)) }));
      toast(`Invite sent to ${c.name} by SMS`);
    },
    sendGuestInvites: (eventId) => {
      update((s) => ({ events: s.events.map((e) => (e.id === eventId ? { ...e, guestList: (e.guestList || []).map((g) => ({ ...g, invited: true })) } : e)) }));
      toast('Invitation and RSVP link sent on WhatsApp');
    },

    // ---------- B2B: RFQs ----------
    // POST /v1/rfqs (+ /send): one RFQ, one lead per invited vendor.
    createRfq: (spec, send = true) => {
      const rid = uid('rfq');
      update((s) => {
        const buyer = currentBuyer(s);
        const contact = buyer.user ? { name: buyer.user.name, phone: buyer.user.phone } : { name: actorName(s), phone: (s.members.find((m) => m.partnerId === buyer.id && m.role === 'owner') || {}).phone || '' };
        const number = `RFQ-${poPrefix(s, buyer.id)}-${String(s.rfqs.length + 41).padStart(3, '0')}`;
        const invites = [];
        const leads = [];
        let notifications = s.notifications;
        if (send) {
          spec.vendorIds.forEach((pid) => {
            const inviteId = uid('ri');
            const lead = b2bLead(s, { partnerId: pid, buyer, contact, title: spec.title, eventDate: spec.eventDate, guests: spec.guests, requirements: `${spec.requirements} RFQ ${number}, quotes due ${spec.dueDate}.`, details: spec.details, rfqId: rid, inviteId, source: 'rfq', channel: buyer.kind === 'corporate' ? 'corporate_rfq' : 'planner', projectId: spec.projectId, parentBookingId: spec.parentBookingId });
            leads.push(lead);
            invites.push({ id: inviteId, partnerId: pid, leadId: lead.id, quoteId: null, status: 'invited', invitedAt: nowISO(), respondedAt: null });
            notifications = notifyVendor({ notifications }, pid, `New RFQ from ${buyer.name}: ${spec.title}`, `/partner/leads/${lead.id}`);
          });
        }
        const rfq = {
          id: rid, number, buyerKind: buyer.kind, buyerId: buyer.id, buyerName: buyer.name, eventRef: spec.eventRef, title: spec.title, category: spec.category, requirements: spec.requirements,
          eventDate: spec.eventDate, guests: Number(spec.guests) || 0, dueDate: spec.dueDate, budget: Number(spec.budget) || 0, costCenterId: spec.costCenterId || null, projectId: spec.projectId || null, parentBookingId: spec.parentBookingId || null, details: spec.details || {},
          status: send ? 'open' : 'draft', createdBy: contact.name, createdAt: nowISO(), sentAt: send ? nowISO() : null, invites, awardedInviteId: null, poId: null, draftVendorIds: send ? [] : spec.vendorIds,
        };
        return { rfqs: [rfq, ...s.rfqs], leads: [...leads, ...s.leads], notifications };
      });
      toast(send ? `RFQ sent to ${spec.vendorIds.length} vendors` : 'RFQ saved as draft');
      return rid;
    },
    sendRfq: (rfqId, vendorIds) => {
      update((s) => {
        const rfq = s.rfqs.find((r) => r.id === rfqId);
        const buyer = currentBuyer(s);
        const contact = buyer.user ? { name: buyer.user.name, phone: buyer.user.phone } : { name: actorName(s), phone: '' };
        const leads = [];
        const invites = [];
        let notifications = s.notifications;
        vendorIds.filter((pid) => !rfq.invites.some((i) => i.partnerId === pid)).forEach((pid) => {
          const inviteId = uid('ri');
          const lead = b2bLead(s, { partnerId: pid, buyer, contact, title: rfq.title, eventDate: rfq.eventDate, guests: rfq.guests, requirements: `${rfq.requirements} RFQ ${rfq.number}, quotes due ${rfq.dueDate}.`, details: rfq.details, rfqId, inviteId, source: 'rfq', channel: buyer.kind === 'corporate' ? 'corporate_rfq' : 'planner', projectId: rfq.projectId, parentBookingId: rfq.parentBookingId });
          leads.push(lead);
          invites.push({ id: inviteId, partnerId: pid, leadId: lead.id, quoteId: null, status: 'invited', invitedAt: nowISO(), respondedAt: null });
          notifications = notifyVendor({ notifications }, pid, `New RFQ from ${buyer.name}: ${rfq.title}`, `/partner/leads/${lead.id}`);
        });
        return {
          rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'open', sentAt: r.sentAt || nowISO(), invites: [...r.invites, ...invites], draftVendorIds: [] } : r)),
          leads: [...leads, ...s.leads],
          notifications,
        };
      });
      toast('RFQ sent');
    },
    closeRfq: (rfqId) => {
      update((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'closed', closedAt: nowISO() } : r)) }));
      toast('RFQ closed. No more quotes will be accepted.');
    },
    cancelRfq: (rfqId) => {
      update((s) => {
        const rfq = s.rfqs.find((r) => r.id === rfqId);
        const leadIds = rfq.invites.map((i) => i.leadId);
        return {
          rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'cancelled' } : r)),
          leads: s.leads.map((l) => (leadIds.includes(l.id) && !['won', 'lost'].includes(l.status) ? { ...l, status: 'lost', lostReason: 'Event cancelled', lostReasonCode: 'event_cancelled' } : l)),
        };
      });
      toast('RFQ cancelled and vendors informed', 'warning');
    },
    // Vendor opened the RFQ in their CRM.
    markRfqViewed: (leadId) =>
      update((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        if (!lead || !lead.rfqId) return {};
        const rfq = s.rfqs.find((r) => r.id === lead.rfqId);
        if (!rfq) return {};
        const inv = rfq.invites.find((i) => i.id === lead.rfqInviteId);
        if (!inv || inv.status !== 'invited') return {};
        return { rfqs: s.rfqs.map((r) => (r.id === rfq.id ? { ...r, invites: r.invites.map((i) => (i.id === inv.id ? { ...i, status: 'viewed', viewedAt: nowISO() } : i)) } : r)) };
      }),
    declineRfq: (leadId, reason) => {
      update((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        const rfq = s.rfqs.find((r) => r.id === lead.rfqId);
        return {
          rfqs: s.rfqs.map((r) => (r.id === rfq.id ? { ...r, invites: r.invites.map((i) => (i.id === lead.rfqInviteId ? { ...i, status: 'declined', respondedAt: nowISO(), note: reason } : i)) } : r)),
          leads: s.leads.map((l) => (l.id === leadId ? { ...l, status: 'lost', lostReason: reason, lostReasonCode: 'date_unavailable' } : l)),
          notifications: notifyBuyer(s, rfq.buyerKind, rfq.buyerId, `${(s.partners.find((p) => p.id === lead.partnerId) || {}).name} declined ${rfq.number}`, rfq.buyerKind === 'corporate' ? `/corp/rfqs/${rfq.id}` : `/partner/rfqs/${rfq.id}`),
        };
      });
      toast('RFQ declined', 'warning');
    },
    // POST /v1/rfqs/{id}/award: winner's quote accepted, others told, PO raised.
    awardRfq: (rfqId, inviteId) => {
      let poId = null;
      update((s) => {
        const rfq = s.rfqs.find((r) => r.id === rfqId);
        const inv = rfq.invites.find((i) => i.id === inviteId);
        const quote = s.quotes.find((q) => q.id === inv.quoteId);
        const lead = s.leads.find((l) => l.id === inv.leadId);
        const buyer = currentBuyer(s);
        const raisedBy = buyer.user ? buyer.user.name : actorName(s);
        const { po, approval } = raisePo(s, { buyer, partnerId: inv.partnerId, quote, lead, rfq, title: rfq.title, eventRef: rfq.eventRef, eventDate: rfq.eventDate, costCenterId: rfq.costCenterId, projectId: rfq.projectId, raisedBy });
        poId = po.id;
        const losers = rfq.invites.filter((i) => i.id !== inviteId && ['responded', 'viewed', 'invited'].includes(i.status));
        let notifications = s.notifications;
        losers.forEach((l) => {
          notifications = notifyVendor({ notifications }, l.partnerId, `${rfq.number}: ${buyer.name} chose another vendor`, `/partner/leads/${l.leadId}`);
        });
        notifications = notifyVendor({ notifications }, inv.partnerId, po.status === 'issued' ? `You won ${rfq.number}! PO ${po.number} issued` : `You won ${rfq.number}. PO ${po.number} is in approval.`, `/partner/purchase-orders/${po.id}`);
        if (approval) notifications = notifyBuyer({ notifications }, buyer.kind, buyer.id, `Approval needed: ${po.number} (${inr(po.amount)})`, buyer.kind === 'corporate' ? '/corp/approvals' : '/partner/approvals');
        const loserLeadIds = losers.map((l) => l.leadId);
        return {
          rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'awarded', awardedInviteId: inviteId, poId: po.id, awardedAt: nowISO(), invites: r.invites.map((i) => (i.id === inviteId ? { ...i, status: 'awarded' } : losers.some((l) => l.id === i.id) ? { ...i, status: 'not_awarded' } : i)) } : r)),
          quotes: s.quotes.map((q) => (q.id === quote.id ? { ...q, status: 'accepted' } : loserLeadIds.includes(q.leadId) && ['sent', 'changes_requested'].includes(q.status) ? { ...q, status: 'rejected' } : q)),
          leads: s.leads.map((l) => (l.id === lead.id ? { ...l, status: 'negotiation', buyer: { ...l.buyer, poId: po.id } } : loserLeadIds.includes(l.id) ? { ...l, status: 'lost', lostReason: 'Chose another vendor', lostReasonCode: 'chose_competitor' } : l)),
          pos: [po, ...s.pos],
          approvals: approval ? [approval, ...s.approvals] : s.approvals,
          notifications,
          projects: rfq.projectId ? s.projects.map((p) => (p.id === rfq.projectId ? { ...p, budgetLines: p.budgetLines.map((bl) => (bl.rfqId === rfqId ? { ...bl, poId: po.id } : bl)) } : p)) : s.projects,
        };
      });
      toast('Awarded. Purchase order raised.');
      return poId;
    },

    // ---------- B2B: direct PO to a vendor (preferred vendor, agreed rate) ----------
    createDirectPo: (spec) => {
      let poId = null;
      update((s) => {
        const buyer = currentBuyer(s);
        const contact = buyer.user ? { name: buyer.user.name, phone: buyer.user.phone } : { name: actorName(s), phone: '' };
        const lead = { ...b2bLead(s, { partnerId: spec.partnerId, buyer, contact, title: spec.title, eventDate: spec.eventDate, guests: spec.guests, requirements: spec.notes, details: spec.details, source: buyer.kind === 'corporate' ? 'corporate' : 'planner', channel: buyer.kind === 'corporate' ? 'corporate_po' : 'planner', projectId: spec.projectId, parentBookingId: spec.parentBookingId }), status: 'negotiation' };
        const partner = s.partners.find((p) => p.id === spec.partnerId);
        const quote = { id: uid('q'), number: `${code(partner.name)}-PO${s.quotes.length}`, leadId: lead.id, partnerId: spec.partnerId, version: 1, items: spec.items.map((x, i) => ({ id: 'qi' + i, ...x, qty: Number(x.qty), unitPrice: Number(x.unitPrice) })), discount: 0, gst: !!partner.gstin, validUntil: addDays(todayISO(), 30), notes: 'Agreed rate as per preferred vendor terms.', status: 'accepted', sentAt: nowISO() };
        const { po, approval } = raisePo(s, { buyer, partnerId: spec.partnerId, quote, lead, rfq: null, title: spec.title, eventRef: spec.eventRef, eventDate: spec.eventDate, costCenterId: spec.costCenterId, projectId: spec.projectId, raisedBy: contact.name });
        poId = po.id;
        lead.buyer = { ...lead.buyer, poId: po.id };
        let notifications = s.notifications;
        if (po.status === 'issued') notifications = notifyVendor({ notifications }, spec.partnerId, `New PO ${po.number} from ${buyer.name} (${inr(po.amount)})`, `/partner/purchase-orders/${po.id}`);
        if (approval) notifications = notifyBuyer({ notifications }, buyer.kind, buyer.id, `Approval needed: ${po.number} (${inr(po.amount)})`, buyer.kind === 'corporate' ? '/corp/approvals' : '/partner/approvals');
        return {
          leads: [lead, ...s.leads], quotes: [quote, ...s.quotes], pos: [po, ...s.pos], approvals: approval ? [approval, ...s.approvals] : s.approvals, notifications,
          projects: spec.projectId && spec.lineId ? s.projects.map((p) => (p.id === spec.projectId ? { ...p, budgetLines: p.budgetLines.map((bl) => (bl.id === spec.lineId ? { ...bl, poId: po.id } : bl)) } : p)) : s.projects,
        };
      });
      toast('Purchase order raised');
      return poId;
    },

    // ---------- B2B: approvals ----------
    decideApproval: (approvalId, decision, note) => {
      update((s) => {
        const ap = s.approvals.find((a) => a.id === approvalId);
        const idx = ap.levels.findIndex((l) => l.status === 'pending');
        const levels = ap.levels.map((l, i) => (i === idx ? { ...l, status: decision, at: nowISO(), note } : i === idx + 1 && decision === 'approved' ? { ...l, status: 'pending' } : l));
        const status = decision === 'rejected' ? 'rejected' : levels.every((l) => l.status === 'approved') ? 'approved' : 'pending';
        const po = s.pos.find((p) => p.id === ap.entityId);
        let pos = s.pos;
        let notifications = s.notifications;
        let leads = s.leads;
        if (po && status === 'approved') {
          pos = pos.map((p) => (p.id === po.id ? { ...p, status: 'issued', issuedAt: nowISO() } : p));
          notifications = notifyVendor({ notifications }, po.partnerId, `New PO ${po.number} from ${po.buyerName} (${inr(po.amount)})`, `/partner/purchase-orders/${po.id}`);
        }
        if (po && status === 'rejected') {
          pos = pos.map((p) => (p.id === po.id ? { ...p, status: 'rejected', rejectNote: note } : p));
          leads = leads.map((l) => (l.id === po.leadId ? { ...l, status: 'lost', lostReason: 'Buyer approval rejected', lostReasonCode: 'other' } : l));
        }
        notifications = notifyBuyer({ notifications }, ap.buyerKind, ap.orgId, `${ap.title}: ${status === 'pending' ? 'level ' + (idx + 1) + ' approved, next approver notified' : status}`, ap.buyerKind === 'corporate' ? '/corp/approvals' : '/partner/approvals');
        return { approvals: s.approvals.map((a) => (a.id === approvalId ? { ...a, levels, status } : a)), pos, leads, notifications };
      });
      toast(decision === 'approved' ? 'Approved' : 'Rejected', decision === 'approved' ? 'success' : 'warning');
    },

    // ---------- B2B: vendor side of a PO ----------
    // POST /v1/partner/purchase-orders/{id}/accept: becomes a confirmed booking with credit-term invoice.
    acceptPo: (poId) => {
      let bookingId = null;
      update((s) => {
        const po = s.pos.find((p) => p.id === poId);
        const quote = s.quotes.find((q) => q.id === po.quoteId);
        const lead = s.leads.find((l) => l.id === po.leadId);
        const { booking, invoice, block } = makeBooking(s, { quote, lead, status: 'booked', po });
        bookingId = booking.id;
        return {
          pos: s.pos.map((p) => (p.id === poId ? { ...p, status: 'accepted', acceptedAt: nowISO(), bookingId: booking.id } : p)),
          bookings: [booking, ...s.bookings], invoices: [invoice, ...s.invoices], blocks: [...s.blocks, block],
          leads: s.leads.map((l) => (l.id === lead.id ? { ...l, status: 'won', bookingId: booking.id } : l)),
          quotes: s.quotes.map((q) => (q.id === quote.id ? { ...q, status: 'accepted' } : q)),
          leadActivities: [{ id: uid('a'), leadId: lead.id, type: 'status', body: `PO ${po.number} accepted. Booking ${booking.number} confirmed.`, by: actorName(s), at: nowISO() }, ...s.leadActivities],
          activity: log(s, actorName(s), `accepted PO ${po.number} from ${po.buyerName}`),
          notifications: notifyBuyer(s, po.buyerKind, po.buyerId, `${(s.partners.find((p) => p.id === po.partnerId) || {}).name} accepted ${po.number}`, po.buyerKind === 'corporate' ? `/corp/pos/${po.id}` : `/partner/purchase-orders/${po.id}`),
          projects: po.projectId ? s.projects.map((p) => (p.id === po.projectId ? { ...p, budgetLines: p.budgetLines.map((bl) => (bl.poId === po.id ? { ...bl, subBookingId: booking.id } : bl)) } : p)) : s.projects,
        };
      });
      toast('PO accepted. Booking confirmed and date blocked.');
      return bookingId;
    },
    declinePo: (poId, reason) => {
      update((s) => {
        const po = s.pos.find((p) => p.id === poId);
        return {
          pos: s.pos.map((p) => (p.id === poId ? { ...p, status: 'cancelled', declineReason: reason } : p)),
          leads: s.leads.map((l) => (l.id === po.leadId ? { ...l, status: 'lost', lostReason: reason, lostReasonCode: 'date_unavailable' } : l)),
          notifications: notifyBuyer(s, po.buyerKind, po.buyerId, `${(s.partners.find((p) => p.id === po.partnerId) || {}).name} declined ${po.number}: ${reason}`, po.buyerKind === 'corporate' ? `/corp/pos/${po.id}` : `/partner/purchase-orders/${po.id}`),
        };
      });
      toast('PO declined', 'warning');
    },
    cancelPo: (poId) => {
      update((s) => ({ pos: s.pos.map((p) => (p.id === poId ? { ...p, status: 'cancelled' } : p)) }));
      toast('PO cancelled', 'warning');
    },

    // ---------- B2B: vendor network ----------
    addPreferredVendor: (partnerId, terms) => {
      update((s) => {
        const buyer = currentBuyer(s);
        if (s.preferredVendors.some((v) => v.buyerId === buyer.id && v.partnerId === partnerId)) return {};
        return { preferredVendors: [{ id: uid('pv'), buyerId: buyer.id, partnerId, terms: terms || 'Standard listed rates', since: todayISO(), contract: '', rating: 0 }, ...s.preferredVendors] };
      });
      toast('Added to your vendor network');
    },
    removePreferredVendor: (id) => update((s) => ({ preferredVendors: s.preferredVendors.filter((v) => v.id !== id) })),

    // ---------- Planner projects ----------
    createProject: (spec) => {
      const pid = uid('pj');
      update((s) => {
        const b = s.bookings.find((x) => x.id === spec.clientBookingId);
        const lead = b && s.leads.find((l) => l.id === b.leadId);
        return {
          projects: [{
            id: pid, partnerId: s.partnerId, title: spec.title, clientName: lead ? lead.buyer ? lead.buyer.orgName : lead.contactName : spec.clientName, clientPhone: lead ? lead.contactPhone : '', clientBookingId: spec.clientBookingId || null,
            eventDate: b ? b.eventDate : spec.eventDate, guests: lead ? lead.guests : Number(spec.guests) || 0, clientBudget: Number(spec.clientBudget) || 0, status: 'planning', manager: actorName(s), area: spec.area || '',
            budgetLines: spec.categories.map((c, i) => ({ id: 'bl' + i, category: c, budget: 0 })),
          }, ...s.projects],
        };
      });
      toast('Project created');
      return pid;
    },
    updateBudgetLine: (projectId, lineId, patch) => update((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, budgetLines: p.budgetLines.map((bl) => (bl.id === lineId ? { ...bl, ...patch } : bl)) } : p)) })),
    addBudgetLine: (projectId, category) => update((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, budgetLines: [...p.budgetLines, { id: uid('bl'), category, budget: 0 }] } : p)) })),
    setProjectStatus: (projectId, status) => update((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, status } : p)) })),

    // Hook for sendQuote: a quote on an RFQ lead marks the invite as responded.
    rfqQuoteSent: (leadId, quoteId) =>
      update((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        if (!lead || !lead.rfqId) return {};
        const rfq = s.rfqs.find((r) => r.id === lead.rfqId);
        if (!rfq) return {};
        return {
          rfqs: s.rfqs.map((r) => (r.id === rfq.id ? { ...r, invites: r.invites.map((i) => (i.id === lead.rfqInviteId ? { ...i, status: 'responded', quoteId, respondedAt: nowISO() } : i)) } : r)),
          notifications: notifyBuyer(s, rfq.buyerKind, rfq.buyerId, `New quote on ${rfq.number} from ${(s.partners.find((p) => p.id === lead.partnerId) || {}).name}`, rfq.buyerKind === 'corporate' ? `/corp/rfqs/${rfq.id}` : `/partner/rfqs/${rfq.id}`),
        };
      }),
  };
}

// Helpers shared by pages
export const quoteTotalOf = qTotal;
export const quoteOpen = (q) => ['sent', 'viewed'].includes(quoteStatus(q));
