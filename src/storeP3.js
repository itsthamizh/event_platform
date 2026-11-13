// Phase 3 actions: support tickets, trust & safety (reports, fraud flags, blocklist,
// strikes), featured placements and campaigns, WhatsApp Business inbox, saved
// searches and recently viewed, account settings (consents, sessions, addresses,
// notification preferences), admin tools (impersonation, commission, flags, exports).
import { nowISO, todayISO, uid } from './config';
import { newRecordBranch } from './accounts';

export function p3Actions({ update, notify, log, actorName, toast }) {
  const adminLog = (s, action) => [{ id: uid('aa'), by: 'Platform Admin', action, at: nowISO(), ip: '49.207.44.18' }, ...s.adminActions];
  return {
    // ---------- Support ----------
    createTicket: ({ subject, category, body, bookingRef }, side) => {
      const tid = uid('tk');
      update((s) => ({
        tickets: [{ id: tid, number: 'VZ-T' + (4200 + s.tickets.length), raisedBy: side, raisedById: side === 'customer' ? s.customerId : s.partnerId, subject, category, priority: ['Payments', 'Refunds', 'Payouts'].includes(category) ? 'high' : 'medium', status: 'open', createdAt: nowISO(), assignedTo: null, slaHours: 12, bookingRef: bookingRef || null, messages: [{ id: 'm0', side, body, at: nowISO() }] }, ...s.tickets],
        notifications: notify(s, 'admin', `New ${category.toLowerCase()} ticket: ${subject}`, '/admin/support'),
      }));
      toast('Ticket raised. Our team replies within 12 hours.');
      return tid;
    },
    replyTicket: (id, side, body) => {
      update((s) => {
        const t = s.tickets.find((x) => x.id === id);
        return {
          tickets: s.tickets.map((x) => (x.id === id ? { ...x, status: side === 'agent' ? 'pending' : 'open', assignedTo: x.assignedTo || (side === 'agent' ? 'Kavitha (Support)' : null), messages: [...x.messages, { id: uid('m'), side, body, at: nowISO() }] } : x)),
          notifications: side === 'agent' ? notify(s, t.raisedBy === 'customer' ? 'customer' : 'partner', `Support replied on ${t.number}`, t.raisedBy === 'customer' ? '/help' : '/partner/help') : notify(s, 'admin', `Reply on ${t.number}`, '/admin/support'),
        };
      });
      toast('Reply sent');
    },
    setTicket: (id, patch) => update((s) => ({ tickets: s.tickets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

    // ---------- Trust & safety ----------
    reportEntity: (r) => {
      update((s) => ({ reports: [{ id: uid('ur'), at: nowISO(), status: 'open', reportedBy: (s.users.find((u) => u.id === s.customerId) || {}).name || 'User', ...r }, ...s.reports], notifications: notify(s, 'admin', `New report: ${r.reason}`, '/admin/trust') }));
      toast('Thanks. Our Trust & Safety team will look into it within 24 hours.');
    },
    resolveReport: (id, action) => {
      update((s) => ({ reports: s.reports.map((x) => (x.id === id ? { ...x, status: action === 'Dismissed' ? 'dismissed' : 'actioned', action } : x)), adminActions: adminLog(s, `Report ${action.toLowerCase()}`) }));
      toast('Report ' + action.toLowerCase());
    },
    setFlag: (id, status) => update((s) => ({ fraudFlags: s.fraudFlags.map((x) => (x.id === id ? { ...x, status } : x)), adminActions: adminLog(s, `Fraud flag ${status}: ${(s.fraudFlags.find((x) => x.id === id) || {}).signal}`) })),
    blockEntity: (b) => {
      update((s) => ({ blocklist: [{ id: uid('bl'), by: 'Platform Admin', at: todayISO(), ...b }, ...s.blocklist], adminActions: adminLog(s, `Blocked ${b.type} ${b.value}`) }));
      toast('Added to blocklist', 'warning');
    },
    unblockEntity: (id) => update((s) => ({ blocklist: s.blocklist.filter((x) => x.id !== id), adminActions: adminLog(s, 'Removed a blocklist entry') })),
    issueStrike: (partnerId, reason, severity = 'warning') => {
      update((s) => ({
        strikes: [{ id: uid('st'), partnerId, reason, severity, at: todayISO(), by: 'Trust & Safety', expiresAt: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10) }, ...s.strikes],
        notifications: [{ id: uid('n'), to: 'partner', partnerId, text: `${severity === 'strike' ? 'Strike' : 'Warning'} issued: ${reason}`, link: '/partner/health', at: nowISO(), read: false }, ...s.notifications],
        adminActions: adminLog(s, `Issued ${severity} to ${(s.partners.find((p) => p.id === partnerId) || {}).name}`),
      }));
      toast(`${severity === 'strike' ? 'Strike' : 'Warning'} issued`, 'warning');
    },

    // ---------- Marketing ----------
    savePlacement: (p) => {
      update((s) => ({ placements: [{ id: uid('fp'), impressions: 0, clicks: 0, enquiries: 0, status: p.from > todayISO() ? 'scheduled' : 'live', ...p, price: Number(p.price) }, ...s.placements], adminActions: adminLog(s, `Booked featured slot for ${(s.listings.find((l) => l.id === p.listingId) || {}).title}`) }));
      toast('Featured placement booked');
    },
    endPlacement: (id) => update((s) => ({ placements: s.placements.map((x) => (x.id === id ? { ...x, status: 'ended', to: todayISO() } : x)) })),
    saveCampaign: (c) => {
      update((s) => ({ campaigns: [{ id: uid('cg'), status: 'draft', sentAt: null, delivered: 0, opened: 0, clicked: 0, conversions: 0, ...c, size: Number(c.size) || 0 }, ...s.campaigns] }));
      toast('Campaign saved as draft');
    },
    sendCampaign: (id) => {
      update((s) => ({
        campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, status: 'sent', sentAt: nowISO(), delivered: Math.round(x.size * 0.95), opened: Math.round(x.size * 0.55), clicked: Math.round(x.size * 0.14), conversions: Math.round(x.size * 0.012) } : x)),
        adminActions: adminLog(s, `Sent campaign "${(s.campaigns.find((x) => x.id === id) || {}).name}"`),
      }));
      toast('Campaign sent');
    },

    // ---------- WhatsApp Business inbox ----------
    sendWa: (threadId, body) =>
      update((s) => ({ waThreads: s.waThreads.map((t) => (t.id === threadId ? { ...t, unread: 0, lastAt: nowISO(), messages: [...t.messages, { id: uid('w'), side: 'partner', body, at: nowISO(), status: 'sent' }] } : t)) })),
    readWa: (threadId) => update((s) => ({ waThreads: s.waThreads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)) })),
    waToLead: (threadId) => {
      const leadId = uid('ld');
      update((s) => {
        const t = s.waThreads.find((x) => x.id === threadId);
        const listing = s.listings.find((l) => l.partnerId === s.partnerId);
        const lead = { id: leadId, partnerId: s.partnerId, branchId: newRecordBranch(s), listingId: listing.id, customerId: null, eventId: null, contactName: t.name, contactPhone: t.phone, source: 'whatsapp', eventType: 'Wedding', eventDate: todayISO(), guests: 100, budget: 0, requirements: t.messages.filter((m) => m.side === 'customer').map((m) => m.body).join(' '), status: 'contacted', assignedTo: null, nextFollowUp: todayISO(), createdAt: nowISO(), bookingId: null, details: {}, priority: 'medium', buyerType: 'individual' };
        return {
          leads: [lead, ...s.leads],
          waThreads: s.waThreads.map((x) => (x.id === threadId ? { ...x, leadId } : x)),
          leadActivities: [{ id: uid('a'), leadId, type: 'status', body: 'Lead created from WhatsApp chat', by: actorName(s), at: nowISO() }, ...s.leadActivities],
          activity: log(s, actorName(s), `created a lead from WhatsApp (${t.name})`),
        };
      });
      toast('Lead created. Fill in the event date and guests.');
      return leadId;
    },

    // ---------- Discovery ----------
    trackView: (listingId) =>
      update((s) => {
        if (s.role !== 'customer') return {};
        const cur = (s.recentlyViewed[s.customerId] || []).filter((x) => x !== listingId);
        if ((s.recentlyViewed[s.customerId] || [])[0] === listingId) return {};
        return { recentlyViewed: { ...s.recentlyViewed, [s.customerId]: [listingId, ...cur].slice(0, 10) } };
      }),
    saveSearch: (label, query) => {
      update((s) => ({ savedSearches: [{ id: uid('ss'), userId: s.customerId, label, query, alerts: true, newMatches: 0 }, ...s.savedSearches] }));
      toast('Search saved. We will alert you when new partners match.');
    },
    toggleSearchAlert: (id) => update((s) => ({ savedSearches: s.savedSearches.map((x) => (x.id === id ? { ...x, alerts: !x.alerts } : x)) })),
    removeSearch: (id) => update((s) => ({ savedSearches: s.savedSearches.filter((x) => x.id !== id) })),

    // ---------- Account settings ----------
    toggleConsent: (key) => update((s) => ({ consents: { ...s.consents, [s.customerId]: (s.consents[s.customerId] || []).map((c) => (c.key === key && !c.required ? { ...c, on: !c.on, at: nowISO() } : c)) } })),
    endSession: (id) => {
      update((s) => ({ sessions: { ...s.sessions, [s.customerId]: (s.sessions[s.customerId] || []).filter((x) => x.id !== id || x.current) } }));
      toast('Logged out of that device');
    },
    endOtherSessions: () => {
      update((s) => ({ sessions: { ...s.sessions, [s.customerId]: (s.sessions[s.customerId] || []).filter((x) => x.current) } }));
      toast('Logged out of all other devices');
    },
    saveAddress: (a) => update((s) => ({ addresses: { ...s.addresses, [s.customerId]: [...(s.addresses[s.customerId] || []), { id: uid('ad'), ...a }] } })),
    removeAddress: (id) => update((s) => ({ addresses: { ...s.addresses, [s.customerId]: (s.addresses[s.customerId] || []).filter((x) => x.id !== id) } })),
    toggleNotifPref: (who, row, col) => update((s) => ({ notifPrefs: { ...s.notifPrefs, [who]: s.notifPrefs[who].map((r, i) => (i === row ? r.map((v, j) => (j === col ? !v : v)) : r)) } })),
    requestPrivacy: (kind) => {
      update((s) => ({ tickets: [{ id: uid('tk'), number: 'VZ-T' + (4200 + s.tickets.length), raisedBy: 'customer', raisedById: s.customerId, subject: kind === 'export' ? 'Data export request (DPDP Act)' : 'Account deletion request (DPDP Act)', category: 'Privacy', priority: 'high', status: 'open', createdAt: nowISO(), assignedTo: null, slaHours: 72, messages: [{ id: 'm0', side: 'customer', body: kind === 'export' ? 'Please send me a copy of my data.' : 'Please delete my account and data.', at: nowISO() }] }, ...s.tickets] }));
      toast(kind === 'export' ? 'We will email your data within 72 hours.' : 'Deletion request received. Active bookings must be completed or cancelled first.');
    },

    // ---------- Admin tools ----------
    impersonate: (partnerId) => {
      update((s) => ({ role: 'owner', partnerId, impersonating: true, adminActions: adminLog(s, `Impersonated ${(s.partners.find((p) => p.id === partnerId) || {}).name}`) }));
      toast('Viewing the CRM as this partner. Every action is logged.', 'warning');
    },
    stopImpersonating: () => update(() => ({ role: 'admin', impersonating: false })),
    toggleCommission: (id) => update((s) => ({ commissionRules: s.commissionRules.map((x) => (x.id === id ? { ...x, active: !x.active } : x)), adminActions: adminLog(s, `Toggled commission rule ${id}`) })),
    toggleFlag: (key) => update((s) => ({ featureFlags: s.featureFlags.map((f) => (f.key === key ? { ...f, on: !f.on } : f)), adminActions: adminLog(s, `Toggled feature flag ${key}`) })),
    toggleCity: (cid) => update((s) => ({ cities: s.cities.map((c) => (c.id === cid ? { ...c, active: !c.active } : c)), adminActions: adminLog(s, `Toggled city ${cid}`) })),
    setAdminRole: (id, role) => update((s) => ({ adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, role } : u)), adminActions: adminLog(s, `Changed admin role to ${role}`) })),
    logExport: (what, rows, by) => update((s) => ({ exports: [{ id: uid('ex'), by: by || actorName(s), partnerId: s.role === 'admin' ? null : s.partnerId, what, rows, at: nowISO() }, ...s.exports] })),
  };
}

// CSV download for exports (audited through logExport).
export function downloadCsv(name, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
