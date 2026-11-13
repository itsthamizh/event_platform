// Phase 3 seed (data model M01, M09, M17, M19-M22): support tickets, reports, fraud
// flags, blocklist, partner strikes, featured placements, campaigns, WhatsApp
// Business inbox, search logs, daily stats, admin users and action log, commission
// rules, saved searches, recently viewed, consents, sessions and addresses.
import { addDays } from '../config';

const TODAY = '2026-11-11';

export function buildPhase3(base) {
  const { listings, leads, users } = base;
  let n = 0;
  const id = (p) => p + 'z' + (n++).toString(36);
  const demo = ['p1', 'p8', 'p4', 'p2', 'p3', 'p6', 'p7', 'p5', 'p9', 'p10', 'p11', 'p12', 'p13'];

  // ---------- Support tickets ----------
  const T = (who, raisedBy, subject, category, priority, status, days, msgs, extra = {}) => ({
    id: id('tk'), number: 'VZ-T' + (4100 + n), raisedBy: who, raisedById: raisedBy, subject, category, priority, status, createdAt: addDays(TODAY, -days) + 'T10:' + String(10 + (n % 40)) + ':00',
    assignedTo: status === 'open' && days < 1 ? null : ['Kavitha (Support)', 'Ravi (Support)', 'Anand (Payments)'][n % 3], slaHours: priority === 'urgent' ? 4 : priority === 'high' ? 12 : 24,
    messages: msgs.map(([side, body, d], k) => ({ id: 'm' + k, side, body, at: addDays(TODAY, -(d != null ? d : days)) + 'T1' + k + ':05:00' })), ...extra,
  });
  const tickets = [
    T('customer', 'u1', 'Paid advance twice for Henna by Ayesha', 'Payments', 'high', 'pending', 2, [['customer', 'My UPI was debited twice for the same advance (₹3,240). Please refund one.'], ['agent', 'Sorry about that, Priya. We can see two captures from Razorpay; one is marked for auto-reversal within 3 working days.', 1]], { bookingRef: 'BK-3279' }),
    T('customer', 'u1', 'How do I add my mother as a co-planner?', 'Account', 'low', 'resolved', 9, [['customer', 'Can my mother also approve the menu?'], ['agent', 'Yes. Open the event, go to Family, and invite her as a Co-planner. She can then approve items and chat with vendors.', 8]]),
    T('customer', 'u104', 'Decorator has not shared the mood board', 'Booking', 'medium', 'open', 0, [['customer', 'Event is in 12 days and Mandapam Decor has not sent the design yet.']]),
    T('partner', 'p1', 'Payout for last week not received', 'Payouts', 'high', 'pending', 3, [['partner', 'Payout for 26 Oct - 1 Nov shows processing for 3 days.'], ['agent', 'The bank returned it once due to a name mismatch. Please confirm the account holder name in Setup > Bank.', 2]]),
    T('partner', 'p9', 'Card declined for subscription renewal', 'Subscription', 'urgent', 'open', 0, [['partner', 'My listing will be hidden. Autopay failed twice. Can I pay by UPI?']]),
    T('partner', 'p4', 'Customer is asking for an invoice change after payment', 'Invoices', 'medium', 'resolved', 14, [['partner', 'Customer wants the GSTIN added to an issued invoice.'], ['agent', 'Issue a credit note for the old invoice and raise a fresh one with the GSTIN. Steps are in the help article "Correcting an invoice".', 13]]),
    T('partner', 'p11', 'Fake 1-star review from someone who never booked', 'Reviews', 'high', 'open', 1, [['partner', 'This reviewer never booked us. Please remove it.']]),
    T('customer', 'u110', 'Refund for cancelled booking still pending', 'Refunds', 'high', 'pending', 5, [['customer', 'I cancelled 35 days before; policy says full refund.'], ['agent', 'Approved today. It will reach your account in 5-7 working days.', 0]]),
    T('partner', 'p12', 'Need GST invoice from Zoho for Vizhaa for our subscription', 'Subscription', 'low', 'closed', 20, [['partner', 'Please send the tax invoice for October.'], ['agent', 'It is in Setup > Subscription > Billing history.', 19]]),
    T('customer', 'u2', 'Cannot log in, OTP not coming', 'Account', 'medium', 'resolved', 6, [['customer', 'OTP is not received on my Jio number.'], ['agent', 'Your number was on a DND list for promotional SMS; we have moved OTPs to the transactional route. Please try again.', 5]]),
  ];

  // ---------- Trust & safety ----------
  const reports = [
    { id: id('ur'), type: 'partner', reportedPartnerId: 'p211', reportedBy: 'Sowmya Iyer', reason: 'Asked for full payment in cash, outside the app', details: 'Owner told me to cancel in the app and pay cash for a 10% discount.', at: addDays(TODAY, -2) + 'T18:00:00', status: 'open' },
    { id: id('ur'), type: 'customer', reportedUserId: 'u5', reportedBy: 'Beatbox DJs', reason: 'Abusive language on chat', details: 'Customer used abusive language after quote revision.', at: addDays(TODAY, -15) + 'T21:30:00', status: 'actioned', action: 'User blocked' },
    { id: id('ur'), type: 'review', reportedPartnerId: 'p11', reportedBy: 'Beatbox DJs', reason: 'Review from someone who never booked', details: 'No booking found with this customer.', at: addDays(TODAY, -1) + 'T12:00:00', status: 'open' },
    { id: id('ur'), type: 'partner', reportedPartnerId: 'p17', reportedBy: 'Ananya Krishnan', reason: 'Photos copied from another vendor', details: 'The portfolio photos are from Mallipoo Decors Instagram.', at: addDays(TODAY, -4) + 'T09:40:00', status: 'open' },
  ];
  const fraudFlags = [
    { id: id('ff'), signal: 'Same UPI ID used by 4 new customer accounts', entity: 'UPI fastpay9@ybl', score: 88, at: addDays(TODAY, -1) + 'T03:12:00', status: 'open', detail: 'Accounts created within 2 hours from one device. All applied VIZHA1000.' },
    { id: id('ff'), signal: 'Partner cancels after advance (3 in 30 days)', entity: 'Chettinad Virundhu', score: 72, at: addDays(TODAY, -3) + 'T09:00:00', status: 'open', detail: 'Pattern of cancelling close to the date after taking advance.' },
    { id: id('ff'), signal: 'Payment from card flagged by gateway', entity: 'Booking BK-3102', score: 64, at: addDays(TODAY, -6) + 'T14:20:00', status: 'cleared', detail: 'Cleared after customer verified with OTP.' },
    { id: id('ff'), signal: 'Review burst: 9 five-star reviews in 1 day', entity: 'Kolam Decor House', score: 81, at: addDays(TODAY, -2) + 'T11:00:00', status: 'open', detail: 'All reviews from accounts with no bookings (blocked by verified-review rule).' },
  ];
  const blocklist = [
    { id: id('bl'), type: 'phone', value: '+91 97890 55667', reason: 'Abusive behaviour (Rahul Menon)', by: 'Kavitha (Support)', at: addDays(TODAY, -15) },
    { id: id('bl'), type: 'upi', value: 'fastpay9@ybl', reason: 'Coupon abuse ring', by: 'Anand (Payments)', at: addDays(TODAY, -1) },
    { id: id('bl'), type: 'device', value: 'android-7f3a9c21', reason: 'Multiple fake accounts', by: 'Anand (Payments)', at: addDays(TODAY, -1) },
  ];
  const strikes = [
    { id: id('st'), partnerId: 'p3', reason: 'Used artificial flowers instead of fresh as quoted (dispute d1)', severity: 'warning', disputeId: 'd1', at: addDays(TODAY, -6), by: 'Trust & Safety', expiresAt: addDays(TODAY, 84) },
    { id: id('st'), partnerId: 'p11', reason: 'Arrived 2 hours late (dispute d2)', severity: 'warning', disputeId: 'd2', at: addDays(TODAY, -1), by: 'Trust & Safety', expiresAt: addDays(TODAY, 89) },
    { id: id('st'), partnerId: 'p210', reason: 'Cancelled a confirmed booking 5 days before the event', severity: 'strike', at: addDays(TODAY, -20), by: 'System', expiresAt: addDays(TODAY, 70) },
  ];

  // ---------- Content & marketing ----------
  const placements = [
    { id: id('fp'), listingId: 'l1', slot: 'Photography - top of results', city: 'Chennai', category: 'photography', from: addDays(TODAY, -10), to: addDays(TODAY, 20), price: 4999, impressions: 18420, clicks: 1211, enquiries: 38, status: 'live' },
    { id: id('fp'), listingId: 'l4', slot: 'Home - featured venues', city: 'Chennai', category: 'venue', from: addDays(TODAY, -3), to: addDays(TODAY, 27), price: 7999, impressions: 9210, clicks: 640, enquiries: 21, status: 'live' },
    { id: id('fp'), listingId: 'l2', slot: 'Catering - top of results', city: 'Chennai', category: 'catering', from: addDays(TODAY, 5), to: addDays(TODAY, 35), price: 4999, impressions: 0, clicks: 0, enquiries: 0, status: 'scheduled' },
    { id: id('fp'), listingId: 'l11', slot: 'Music & DJ - top of results', city: 'Chennai', category: 'music_dj', from: addDays(TODAY, -40), to: addDays(TODAY, -10), price: 2999, impressions: 22100, clicks: 1580, enquiries: 44, status: 'ended' },
  ];
  const campaigns = [
    { id: id('cg'), name: 'Thai month wedding planner', channel: 'WhatsApp', audience: 'Customers with a wedding event in Jan-Feb 2027', size: 4820, status: 'sent', sentAt: addDays(TODAY, -4) + 'T10:00:00', delivered: 4610, opened: 3920, clicked: 1104, conversions: 86 },
    { id: id('cg'), name: 'Renew before your listing is hidden', channel: 'SMS + Email', audience: 'Partners in past due or grace', size: 46, status: 'sent', sentAt: addDays(TODAY, -2) + 'T09:00:00', delivered: 46, opened: 39, clicked: 28, conversions: 17 },
    { id: id('cg'), name: 'Diwali offer DIWALI26', channel: 'Push', audience: 'All active customers in Chennai', size: 38200, status: 'sent', sentAt: addDays(TODAY, -20) + 'T18:00:00', delivered: 35110, opened: 9800, clicked: 2210, conversions: 412 },
    { id: id('cg'), name: 'Year-end parties: book a DJ', channel: 'Push', audience: 'Customers who searched Music & DJ in last 60 days', size: 6100, status: 'scheduled', sentAt: addDays(TODAY, 3) + 'T19:00:00', delivered: 0, opened: 0, clicked: 0, conversions: 0 },
    { id: id('cg'), name: 'New: corporate RFQs on Zoho for Vizhaa Business', channel: 'Email', audience: 'HR and admin contacts (B2B leads)', size: 900, status: 'draft', sentAt: null, delivered: 0, opened: 0, clicked: 0, conversions: 0 },
  ];

  // ---------- WhatsApp Business inbox (per demo partner) ----------
  const WA = [
    ['Hi, saw your page on Instagram. Do you do engagement shoots?', 'Yes! Engagement shoots start at ₹25,000 for 3 hours. When is the event?', 'Feb 5th, around 100 guests.'],
    ['Vanakkam, rate for 300 plates veg lunch?', 'Vanakkam! Our Classic Sappadu is ₹450 per plate with 21 items. Which date?', '14 Dec. Can you send menu?'],
    ['Is your hall free on 23 Jan?', 'Let me check. Morning or evening session?', 'Evening reception, 500 people.'],
    ['Need 200 return gifts under ₹150', 'We have jute bags and brass kumkum sets in that range. Sharing photos.', 'The jute ones look good. Name printing possible?'],
  ];
  const WA_CAT = {
    photography: WA[0], catering: WA[1], venue: WA[2], return_gifts: WA[3],
    decoration: ['Hi, do you do stage decor for engagements?', 'Yes, stage + entrance starts at ₹60,000. Which venue?', 'Ocean Pearl, ECR. Pastel theme please.'],
    pandit: ['Namaskaram, need a vadhyar for griha pravesam', 'Namaskaram. Which date and area?', '6 Dec, Velachery. Morning muhurtham.'],
    melam: ['Is your troupe free for a muhurtham on 24 Jan?', 'Let me confirm with the artists. Which time?', '7:30 am, Mylapore.'],
    makeup: ['Hi, bridal makeup trial availability?', 'Trials on weekdays this month. Which date is the wedding?', '20 Feb. Airbrush please.'],
    invitation: ['Rate for 300 bilingual cards?', 'Starts at ₹45 per card with envelope. Want samples?', 'Yes, share laser-cut options.'],
    mehendi: ['Bridal mehendi on 23 Jan evening?', 'Available. Hands and feet?', 'Yes, plus 15 guests.'],
    music_dj: ['DJ for a terrace party, 80 people?', 'Sure, 4 hours with lights is ₹55,000. Date?', '31 Dec, Adyar.'],
    event_management: ['Can you manage our 3-day wedding?', 'Yes! Share the dates and rough guest count.', '9-11 Feb, about 600 guests.'],
    wedding_planner: ['Looking for a planner for a beach wedding', 'Lovely. ECR or Mahabalipuram? Budget?', 'Mahabalipuram, around 25 lakhs.'],
  };
  const catOf = (pid) => (listings.find((l) => l.partnerId === pid) || {}).category;
  const waThreads = [];
  demo.forEach((pid, i) => {
    [0, 1, 2].forEach((k) => {
      const conv = k === 0 ? WA_CAT[catOf(pid)] || WA[0] : k === 1 ? ['Hi, what are your prices?', 'Hi! Sharing our packages. Which date and how many guests?', 'March, around 200 guests. Will confirm the date.'] : WA_CAT[catOf(pid)] || WA[1];
      const name = (users[(i * 3 + k + 6) % users.length] || {}).name || 'Customer';
      const t = { id: id('wa'), partnerId: pid, name, phone: '+91 9' + String(8410 + i * 13 + k).padStart(4, '0') + ' ' + String(30000 + i * 977 + k * 131).slice(0, 5), unread: k === 0 ? 1 : 0, leadId: k === 2 ? (leads.find((l) => l.partnerId === pid && l.source === 'whatsapp') || {}).id || null : null, lastAt: addDays(TODAY, -k) + 'T1' + (2 + k) + ':2' + i % 6 + ':00', messages: [] };
      conv.forEach((body, j) => t.messages.push({ id: 'w' + j, side: j % 2 ? 'partner' : 'customer', body, at: addDays(TODAY, -k) + 'T1' + (1 + k) + ':' + String(10 + j * 7).slice(0, 2) + ':00', status: j % 2 ? 'read' : null }));
      if (k === 0) t.messages = t.messages.slice(0, 1);
      waThreads.push(t);
    });
  });
  const waTemplates = [
    { id: 'wt1', name: 'quote_shared', language: 'English', body: 'Hi {{1}}, your quote {{2}} for {{3}} is ready: {{4}}. View and accept: {{5}}', status: 'approved', category: 'Utility' },
    { id: 'wt2', name: 'payment_reminder_ta', language: 'Tamil', body: 'வணக்கம் {{1}}, {{2}} தேதிக்குள் ₹{{3}} செலுத்த வேண்டும். லிங்க்: {{4}}', status: 'approved', category: 'Utility' },
    { id: 'wt3', name: 'thank_you_review', language: 'English', body: 'Thank you for celebrating with us, {{1}}! Could you rate us? {{2}}', status: 'approved', category: 'Marketing' },
    { id: 'wt4', name: 'festive_offer', language: 'English', body: 'Pongal special: {{1}} off on bookings made this week!', status: 'pending', category: 'Marketing' },
  ];

  // ---------- Analytics ----------
  const searchLogs = [
    ['photographer mylapore', 'photography', 1840, 42.1], ['wedding hall 500 guests', 'venue', 1622, 38.4], ['veg catering per plate', 'catering', 1410, 35.9], ['nadaswaram', 'melam', 890, 51.2],
    ['bridal makeup airbrush', 'makeup', 860, 44.0], ['return gifts under 150', 'return_gifts', 702, 47.8], ['dj for birthday', 'music_dj', 655, 31.5], ['griha pravesam pandit', 'pandit', 610, 55.0],
    ['mehendi artist home', 'mehendi', 540, 40.2], ['bilingual wedding invitation', 'invitation', 388, 36.6],
  ].map(([q, category, count, ctr]) => ({ id: id('sq'), q, category, count, ctr, zero: false }))
    .concat([['baby shower decor ecr', 'decoration', 214], ['kerala chenda melam', 'melam', 176], ['jain catering', 'catering', 141], ['sangeet choreographer', null, 133], ['tent house chairs rental', null, 98], ['photo booth rental', 'decoration', 71]].map(([q, category, count]) => ({ id: id('sq'), q, category, count, ctr: 0, zero: true })));
  const partnerStats = {};
  demo.forEach((pid, i) => {
    partnerStats[pid] = Array.from({ length: 30 }, (_, d) => {
      const date = addDays(TODAY, d - 29);
      const wave = Math.sin((d + i) / 4) * 0.3 + 1;
      const views = Math.round((60 + (i % 5) * 18) * wave + ((d * 7 + i) % 11));
      const enquiries = Math.max(0, Math.round(views * (0.035 + (i % 3) * 0.006)) - (d % 4 === 0 ? 1 : 0));
      return { date, views, enquiries, dateChecks: Math.round(views * 0.22), chats: Math.round(enquiries * 1.4), quotes: Math.max(0, enquiries - (d % 3 === 0 ? 1 : 0)), bookings: d % 5 === 0 ? 1 : 0, responseMins: 38 + ((d * 13 + i * 7) % 70) };
    });
  });
  const platformStats = Array.from({ length: 30 }, (_, d) => {
    const date = addDays(TODAY, d - 29);
    const w = Math.sin(d / 5) * 0.2 + 1 + d / 120;
    return { date, signups: Math.round(118 * w), searches: Math.round(5200 * w), enquiries: Math.round(410 * w), bookings: Math.round(58 * w), gmv: Math.round(5800000 * w), newPartners: d % 3 === 0 ? 2 : 1 };
  });

  // ---------- Admin console ----------
  const adminUsers = [
    { id: 'ad1', name: 'Platform Admin', email: 'admin@vizha.example', role: 'Super admin', lastActive: TODAY + 'T09:20:00', twoFactor: true },
    { id: 'ad2', name: 'Kavitha', email: 'kavitha@vizha.example', role: 'Support', lastActive: TODAY + 'T10:05:00', twoFactor: true },
    { id: 'ad3', name: 'Ravi', email: 'ravi@vizha.example', role: 'Support', lastActive: addDays(TODAY, -1) + 'T19:40:00', twoFactor: true },
    { id: 'ad4', name: 'Anand', email: 'anand@vizha.example', role: 'Payments & Risk', lastActive: TODAY + 'T08:55:00', twoFactor: true },
    { id: 'ad5', name: 'Shreya', email: 'shreya@vizha.example', role: 'Content & Marketing', lastActive: addDays(TODAY, -2) + 'T16:10:00', twoFactor: false },
  ];
  const adminActions = [
    ['Anand', 'Blocked UPI fastpay9@ybl (coupon abuse)', 1], ['Anand', 'Put payout for Mandapam Decor on hold (dispute d1)', 6], ['Kavitha', 'Issued warning to Beatbox DJs (dispute d2)', 1],
    ['Platform Admin', 'Approved partner Henna by Ayesha', 39], ['Kavitha', 'Hid review on Silver Bells Banquets (no booking)', 8], ['Platform Admin', 'Impersonated Lens & Light Studio to check payout issue', 3],
    ['Shreya', 'Published article "Thai month wedding checklist"', 12], ['Anand', 'Released refund ₹48,000 for BK-2041', 2], ['Platform Admin', 'Changed TDS rate from 1% to 1% (no change, audit)', 30],
  ].map(([by, action, d], k) => ({ id: id('aa'), by, action, at: addDays(TODAY, -d) + 'T1' + (k % 9) + ':15:00', ip: '49.207.' + (40 + k) + '.' + (10 + k * 3) }));
  const commissionRules = [
    { id: 'cr1', name: 'Default (launch offer)', category: null, city: null, plan: 'Partner Basic', pct: 0, from: '2025-01-01', active: true },
    { id: 'cr2', name: 'Venues - planned', category: 'venue', city: 'Chennai', plan: 'Partner Basic', pct: 2, from: '2027-04-01', active: false },
    { id: 'cr3', name: 'Corporate RFQ bookings - planned', category: null, city: null, plan: 'All', pct: 1.5, from: '2027-04-01', active: false },
  ];
  const exports = [
    { id: id('ex'), by: 'Suresh Babu (Lens & Light)', partnerId: 'p1', what: 'Invoices Oct 2026 (CSV)', rows: 34, at: addDays(TODAY, -9) + 'T17:20:00' },
    { id: id('ex'), by: 'Platform Admin', partnerId: null, what: 'Partners with GSTIN (CSV)', rows: 412, at: addDays(TODAY, -5) + 'T11:00:00' },
  ];

  // ---------- Customer account ----------
  const savedSearches = [
    { id: 'ss1', userId: 'u1', label: 'Photographers in Mylapore under ₹1 lakh', query: '?cat=photography&area=Mylapore&max=100000', alerts: true, newMatches: 2 },
    { id: 'ss2', userId: 'u1', label: 'Venues for 400+ guests on 24 Jan', query: '?cat=venue&date=2027-01-24', alerts: true, newMatches: 0 },
    { id: 'ss3', userId: 'u1', label: 'Return gifts', query: '?cat=return_gifts', alerts: false, newMatches: 0 },
  ];
  const recentlyViewed = { u1: ['l4', 'l1', 'l14', 'l5', 'l9', 'l2'].filter((x) => listings.some((l) => l.id === x)) };
  const consents = {
    u1: [
      { key: 'terms', label: 'Terms of use and privacy policy', required: true, on: true, at: '2026-09-02T10:00:00' },
      { key: 'marketing_whatsapp', label: 'Offers and event ideas on WhatsApp', on: true, at: '2026-09-02T10:00:00' },
      { key: 'marketing_email', label: 'Newsletter by email', on: false, at: '2026-09-02T10:00:00' },
      { key: 'share_with_partners', label: 'Share my phone number with partners I enquire with', on: true, at: '2026-09-02T10:00:00' },
      { key: 'analytics', label: 'Use my activity to improve recommendations', on: true, at: '2026-09-02T10:00:00' },
    ],
  };
  const sessions = { u1: [
    { id: 'se1', device: 'iPhone 14 - Zoho for Vizhaa app', place: 'Chennai', lastActive: TODAY + 'T09:12:00', current: true },
    { id: 'se2', device: 'Chrome on Windows', place: 'Chennai', lastActive: addDays(TODAY, -2) + 'T22:40:00' },
    { id: 'se3', device: "Amma's Android - Zoho for Vizhaa app", place: 'Chennai', lastActive: addDays(TODAY, -6) + 'T11:00:00' },
  ] };
  const addresses = { u1: [
    { id: 'ad1', label: 'Home', line: '12, Luz Church Road, Mylapore', city: 'Chennai', pin: '600004', isDefault: true },
    { id: 'ad2', label: 'Wedding venue', line: 'Grand Lotus Mahal, R.K. Mutt Road, Mylapore', city: 'Chennai', pin: '600004' },
    { id: 'ad3', label: "Arjun's home", line: '4B, Kalakshetra Colony, Besant Nagar', city: 'Chennai', pin: '600090' },
  ] };
  const notifPrefs = {
    customer: [['Quotes and booking updates', true, true, true], ['Payment reminders', true, true, false], ['Chat messages', true, false, false], ['Offers and ideas', false, true, false]],
    partner: [['New leads and RFQs', true, true, true], ['Payments received', true, false, true], ['Reviews', true, false, false], ['Payout updates', false, false, true], ['Subscription reminders', true, true, true]],
  };

  return {
    tickets, reports, fraudFlags, blocklist, strikes, placements, campaigns, waThreads, waTemplates, searchLogs, partnerStats, platformStats,
    adminUsers, adminActions, commissionRules, exports, savedSearches, recentlyViewed, consents, sessions, addresses, notifPrefs,
  };
}
