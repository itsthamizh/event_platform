// Phase 2 seed: availability rules, pricing rules, add-ons, service areas, hours
// and FAQs on every listing; inventory and reservations, run sheets, shipments,
// tastings / trials, crew leave; coupons, wallets, referrals, refunds and credit notes.
// Built deterministically from the generated world so every business looks lived-in.
import { addDays } from '../config';
import { AREAS } from './mock';

const TODAY = '2026-11-11';

const FAQS = {
  photography: [['How soon do we get the photos?', 'A sneak peek of 50 photos in 48 hours, the full edited set in 30 days and albums in 45 days.'], ['Do you travel outside Chennai?', 'Yes. Travel and stay are charged at actuals for events beyond 60 km.'], ['Can we get the raw files?', 'Yes, all raw files are shared on a hard disk you provide, on request.']],
  catering: [['Is there a minimum order?', 'Minimum 100 plates for weddings and 50 plates for home functions.'], ['Do you provide servers?', 'Yes, one server per 25 guests is included. Banana leaf service by trained staff.'], ['Can we taste before booking?', 'Yes, tasting for up to 6 people is free once you have a quote.']],
  venue: [['Is outside catering allowed?', 'Only from our panel of approved caterers, or with a ₹25,000 kitchen fee.'], ['What time can decorators start?', 'Decorators can start 8 hours before the function. Earlier access costs ₹5,000 an hour.'], ['Is there a damage deposit?', 'Yes, ₹50,000 refundable deposit, returned within 7 days after the event.']],
  decoration: [['Do you use fresh flowers?', 'Yes, sourced from Koyambedu on the morning of the event. Artificial is available at a lower price.'], ['How long does setup take?', 'A full mandapam takes 6 to 8 hours; stage-only setups take 3 hours.'], ['Can we see a mock-up?', 'We share a 3D mood board for approval before ordering flowers.']],
  pandit: [['Do you bring the samagri?', 'We can arrange all samagri at cost, or share a list for the family to arrange.'], ['Which rituals do you perform?', 'Weddings, griha pravesam, seemantham, ayush homam and all poojas in Tamil and Sanskrit.'], ['Will you help fix the muhurtham?', 'Yes, we check the panchangam with the family before confirming.']],
  melam: [['How many artists come?', '4 to 6 artists: nadaswaram, thavil and ottu as per the package.'], ['How long do you play?', 'Packages cover 2 to 4 hours. Extra hours are ₹5,000 each.'], ['Do you play for the baraat?', 'Yes, we walk with the janavasam procession.']],
  makeup: [['Do you offer a trial?', 'Yes, a paid trial 3 to 4 weeks before the wedding, adjusted in the final bill.'], ['Which products do you use?', 'MAC, Huda Beauty, Bobbi Brown and Kryolan for airbrush.'], ['Do you do saree draping?', 'Yes, saree draping and hair with fresh flowers are included in bridal packages.']],
  invitation: [['How long does printing take?', '7 to 10 days after the final proof is approved.'], ['Can you print in Tamil and English?', 'Yes, bilingual designs are our speciality.'], ['Do you make video invites?', 'Yes, 30 to 60 second WhatsApp video invites.']],
  mehendi: [['Is the henna natural?', 'Yes, 100% organic henna with no chemicals. Colour develops in 24 to 48 hours.'], ['How many guests can you cover?', 'One artist covers about 10 guests an hour with simple designs.'], ['How long does bridal mehendi take?', '4 to 6 hours for hands and feet.']],
  music_dj: [['Do you bring your own sound system?', 'Yes, line array speakers, mixer, mics and lights are included.'], ['Can we request songs?', 'Yes, share a playlist in the app and request songs live.'], ['Is there a noise cut-off?', 'We follow the 10 pm cut-off for outdoor venues unless the venue has a permit.']],
  return_gifts: [['What is the minimum quantity?', '50 pieces for printed items, 25 for others.'], ['Do you deliver?', 'Free delivery within Chennai for orders above ₹20,000.'], ['Can you print names?', 'Yes, names or a short message on tags and boxes.']],
  event_management: [['What does coordination include?', 'Vendor sourcing, contracts, run of show and an on-day team of 6.'], ['Do you take a commission from vendors?', 'No. You pay vendors at the rates we negotiate; our fee is fixed.'], ['Can you manage guest travel?', 'Yes, airport pickups and hotel blocks for out-station guests.']],
  wedding_planner: [['When should we hire a planner?', 'Ideally 6 months before the wedding to get the best venues and dates.'], ['Do you do destination weddings?', 'Yes, in ECR, Mahabalipuram and Pondicherry.'], ['How do you manage the budget?', 'A shared budget sheet with every quote and payment, updated weekly.']],
};

const ADDONS = {
  catering: [['Live jalebi counter', 15000], ['Filter coffee counter', 8000], ['Paan counter', 6000]],
  decoration: [['Car decoration', 6000], ['Photo booth with props', 18000], ['Nalangu setup', 12000]],
  venue: [['Extra 4 hours hall time', 40000], ['Generator backup', 15000], ['Valet parking team', 12000]],
  pandit: [['Pooja samagri kit', 4500], ['Extra vadhyar', 3500]],
  melam: [['Extra hour', 5000], ['Kerala chenda (4 artists)', 18000]],
  makeup: [['Family makeup (per person)', 4000], ['Hairdo with fresh flowers', 3000]],
  invitation: [['Video invite (60 sec)', 6000], ['Custom envelope printing', 4000]],
  mehendi: [['Bride feet (to ankle)', 3000], ['Extra artist', 4000]],
  music_dj: [['LED dance floor', 25000], ['Cold pyro (4 shots)', 12000], ['Extra hour', 6000]],
  return_gifts: [['Gift wrapping', 15], ['Name tag printing', 8]],
  photography: [['Drone coverage', 12000], ['Pre-wedding shoot', 25000], ['Extra album (40 pages)', 15000]],
};

const RULES = {
  venue: [{ id: 'pr1', name: 'Muhurtham day', type: 'muhurtham', pct: 20 }, { id: 'pr2', name: 'Weekend', type: 'weekend', pct: 10 }],
  photography: [{ id: 'pr1', name: 'Muhurtham day', type: 'muhurtham', pct: 15 }],
  catering: [{ id: 'pr1', name: 'Thai wedding season', type: 'season', from: '01-14', to: '02-28', pct: 5 }],
  decoration: [{ id: 'pr1', name: 'Muhurtham day (flower prices)', type: 'muhurtham', pct: 12 }],
  melam: [{ id: 'pr1', name: 'Muhurtham day', type: 'muhurtham', pct: 25 }],
  makeup: [{ id: 'pr1', name: 'Muhurtham day', type: 'muhurtham', pct: 10 }],
  music_dj: [{ id: 'pr1', name: 'Weekend', type: 'weekend', pct: 10 }, { id: 'pr2', name: 'Year-end party season', type: 'season', from: '12-15', to: '12-31', pct: 15 }],
  mehendi: [{ id: 'pr1', name: 'Muhurtham eve', type: 'muhurtham', pct: 10 }],
};

const INVENTORY = {
  photography: [['Sony A7 IV body', 4, 'Camera'], ['24-70mm f/2.8 lens', 3, 'Lens'], ['DJI Mavic 3 drone', 1, 'Drone'], ['Godox AD600 flash', 4, 'Lighting'], ['Gimbal (DJI RS3)', 2, 'Video']],
  decoration: [['Brass uruli (large)', 12, 'Props'], ['Wooden mandapam frame', 2, 'Structure'], ['Fairy light strings (50 m)', 30, 'Lighting'], ['Velvet drapes (set)', 8, 'Fabric'], ['Photo booth frame', 2, 'Props']],
  catering: [['Chafing dish', 60, 'Serving'], ['Banana leaf stand', 400, 'Serving'], ['Steel drums (200 L)', 10, 'Kitchen'], ['Dosa tawa (live counter)', 4, 'Kitchen']],
  music_dj: [['Line array speakers (pair)', 3, 'Sound'], ['Pioneer DJ console', 2, 'DJ'], ['Moving head lights', 16, 'Lighting'], ['LED dance floor (16x16)', 1, 'Floor'], ['Wireless mics', 8, 'Sound']],
  venue: [['Banquet chairs', 900, 'Furniture'], ['Round tables', 60, 'Furniture'], ['Generator 125 kVA', 2, 'Power'], ['Mattress (guest rooms)', 60, 'Rooms']],
  makeup: [['Airbrush kit', 2, 'Kit'], ['Ring light', 3, 'Lighting'], ['Portable vanity', 2, 'Kit']],
  melam: [['Nadaswaram', 4, 'Instrument'], ['Thavil', 4, 'Instrument'], ['Ottu', 2, 'Instrument']],
  mehendi: [['Organic henna cones (box of 50)', 20, 'Consumable']],
  return_gifts: [['Brass kumkum set', 600, 'Stock'], ['Jute thamboolam bag', 1500, 'Stock'], ['Steel bottle (750 ml)', 900, 'Stock'], ['Gift box (medium)', 1200, 'Packing']],
  invitation: [['Handmade paper (A4 sheets)', 5000, 'Paper'], ['Laser-cut card blanks', 1800, 'Paper'], ['Envelopes (premium)', 2500, 'Paper']],
  pandit: [['Homam kundam (copper)', 3, 'Ritual'], ['Brass kalasam', 10, 'Ritual']],
};

const RUNSHEET = {
  photography: [['05:30', 'Crew reports at bride home', 'Lead photographer'], ['06:30', 'Getting ready shots', 'Candid photographer'], ['08:00', 'Baraat / janavasam coverage', 'Cinematographer'], ['09:15', 'Muhurtham - thaali tying (no flash)', 'Lead photographer'], ['11:00', 'Family group photos on stage', 'Lead photographer'], ['12:30', 'Lunch candids', 'Candid photographer']],
  catering: [['04:00', 'Cooks arrive, kitchen setup', 'Head cook'], ['06:30', 'Breakfast ready (idli, pongal, vada)', 'Head cook'], ['07:00', 'Breakfast service starts', 'Server captain'], ['11:30', 'Lunch first batch on banana leaf', 'Server captain'], ['14:30', 'Final batch and cleanup', 'Server captain']],
  decoration: [['22:00 (eve)', 'Load props and flowers into tempo', 'Setup crew'], ['23:00 (eve)', 'Mandapam structure up', 'Setup crew'], ['03:00', 'Fresh flower work', 'Florist'], ['05:30', 'Final walk-through with family', 'Owner'], ['15:00', 'Teardown after function', 'Setup crew']],
  music_dj: [['16:00', 'Sound and lights load-in', 'Lighting tech'], ['17:30', 'Sound check', 'DJ'], ['19:00', 'Couple entry track', 'DJ'], ['20:30', 'Dance floor opens', 'DJ'], ['22:00', 'Last song and pack-up', 'Lighting tech']],
  venue: [['05:00', 'Hall opened, AC on', 'Hall manager'], ['06:00', 'Rooms handed over to family', 'Housekeeping'], ['07:30', 'Generator check', 'Electrician'], ['16:00', 'Checkout and damage check', 'Hall manager']],
  makeup: [['04:30', 'Artist arrives, setup in bridal room', 'Lead artist'], ['05:00', 'Bridal makeup and hair', 'Lead artist'], ['07:00', 'Saree draping and jewellery', 'Assistant'], ['07:45', 'Family makeup (3 people)', 'Assistant'], ['09:00', 'Touch-up before muhurtham', 'Lead artist']],
  melam: [['06:30', 'Troupe arrives', 'Troupe leader'], ['07:00', 'Mangala isai at entrance', 'Troupe'], ['08:00', 'Janavasam procession', 'Troupe'], ['09:15', 'Gatti melam at thaali', 'Troupe leader']],
  pandit: [['05:30', 'Vadhyars arrive, homam setup', 'Sastrigal'], ['06:30', 'Vratham and kasi yatra', 'Sastrigal'], ['08:00', 'Oonjal and kanyadhanam', 'Sastrigal'], ['09:15', 'Mangalya dharanam', 'Sastrigal'], ['10:00', 'Saptapadi', 'Sastrigal']],
  mehendi: [['10:00', 'Bridal mehendi starts', 'Lead artist'], ['13:00', 'Guest mehendi (2 artists)', 'Artists'], ['16:00', 'Bridal finish and drying', 'Lead artist']],
};

const TRIALS = { catering: 'Food tasting', makeup: 'Makeup trial', venue: 'Venue site visit', decoration: 'Mood board meeting', mehendi: 'Design consultation', wedding_planner: 'Planning call', event_management: 'Planning call' };
const COURIERS = ['DTDC', 'Professional Couriers', 'Blue Dart', 'Own van'];

export function buildPhase2(base) {
  const { listings, partners, bookings, leads, members, invoices } = base;
  let n = 0;
  const id = (p) => p + 'x' + (n++).toString(36);
  const out = { listings: [], inventory: [], reservations: [], runSheets: {}, shipments: [], trials: [], leaves: [], coupons: [], redemptions: [], wallets: {}, referrals: [], refunds: [], creditNotes: [] };

  // ---------- Listing extras ----------
  out.listings = listings.map((l, i) => {
    const cat = l.category;
    const baseArea = l.area;
    const serviceAreas = cat === 'venue' ? [] : AREAS.map((a, k) => ({ area: a, travelCharge: a === baseArea ? 0 : [0, 0, 1000, 1500, 2500, 3500][(k + i) % 6] }));
    const addons = (l.addons && l.addons.length ? l.addons : (ADDONS[cat] || []).map(([name, price], k) => ({ id: 'ad' + l.id + k, name, price }))).slice(0, 4);
    return {
      ...l,
      addons,
      faqs: (FAQS[cat] || []).map(([q, a], k) => ({ id: 'fq' + k, q, a })),
      serviceAreas,
      hours: i % 3 === 0 ? { weekdays: '9:00 am - 8:00 pm', saturday: '9:00 am - 8:00 pm', sunday: '10:00 am - 2:00 pm', chatReply: 'Within 1 hour in business hours' } : { weekdays: '10:00 am - 7:00 pm', saturday: '10:00 am - 6:00 pm', sunday: 'Closed (calls only for confirmed bookings)', chatReply: 'Same day' },
      availability: { capacity: l.capacity || 1, closedWeekdays: cat === 'mehendi' ? [2] : [], leadDays: cat === 'return_gifts' ? 10 : cat === 'invitation' ? 14 : null, dailyOrders: 6 },
      pricingRules: (RULES[cat] || []).map((r) => ({ ...r, active: true })),
      extraCategories: l.partnerId === 'p12' ? ['wedding_planner'] : [],
    };
  });
  const listingOf = (pid) => out.listings.find((l) => l.partnerId === pid);
  const demo = ['p1', 'p8', 'p4', 'p2', 'p3', 'p6', 'p7', 'p5', 'p9', 'p10', 'p11', 'p12', 'p13'];

  // ---------- Inventory + reservations ----------
  demo.forEach((pid) => {
    const cat = listingOf(pid).category;
    (INVENTORY[cat] || []).forEach(([name, qty, group]) => out.inventory.push({ id: id('it'), partnerId: pid, name, qty, group, condition: 'Good' }));
  });
  bookings.filter((b) => demo.includes(b.partnerId) && ['booked', 'accepted'].includes(b.status) && b.eventDate >= TODAY).forEach((b, k) => {
    const items = out.inventory.filter((it) => it.partnerId === b.partnerId);
    items.slice(0, 3).forEach((it, j) => out.reservations.push({ id: id('rs'), itemId: it.id, bookingId: b.id, date: b.eventDate, qty: Math.max(1, Math.round(it.qty * [0.5, 0.3, 0.25][j] * (k % 2 ? 0.8 : 1))) }));
  });

  // ---------- Run sheets for the next 45 days ----------
  bookings.filter((b) => demo.includes(b.partnerId) && b.status === 'booked' && b.eventDate >= TODAY && b.eventDate <= addDays(TODAY, 45)).forEach((b) => {
    const cat = listingOf(b.partnerId).category;
    const tmpl = RUNSHEET[cat];
    if (tmpl) out.runSheets[b.id] = tmpl.map(([time, item, owner], k) => ({ id: 'rn' + k, time, item, owner, done: false, shared: true }));
  });

  // ---------- Shipments (delivery categories + photo albums) ----------
  bookings.filter((b) => demo.includes(b.partnerId)).forEach((b, k) => {
    const cat = listingOf(b.partnerId).category;
    const lead = leads.find((l) => l.id === b.leadId) || {};
    const ship = (item, status, shippedAt, eta) => out.shipments.push({ id: id('sh'), bookingId: b.id, partnerId: b.partnerId, item, courier: COURIERS[k % 4], awb: status === 'packed' ? '' : 'CH' + (482100 + k * 37), status, shippedAt, eta, deliveredAt: status === 'delivered' ? eta : null, address: `${lead.contactName}, ${lead.area || 'Chennai'}` });
    if (cat === 'return_gifts' && ['booked', 'completed', 'reviewed'].includes(b.status)) {
      const past = b.eventDate < TODAY;
      const near = b.eventDate <= addDays(TODAY, 12);
      ship(`${(b.details && b.details.fields && b.details.fields.quantity) || lead.guests || 200} return gifts`, past ? 'delivered' : near ? 'in_transit' : 'packed', past || near ? addDays(b.eventDate, -4) : null, addDays(b.eventDate, -2));
    }
    if (cat === 'invitation' && ['booked', 'completed', 'reviewed'].includes(b.status)) {
      const past = addDays(b.eventDate, -30) < TODAY;
      ship('Printed invitations + envelopes', past ? 'delivered' : 'packed', past ? addDays(b.eventDate, -40) : null, addDays(b.eventDate, -35));
    }
    if (cat === 'photography' && ['completed', 'reviewed'].includes(b.status)) ship('Printed albums (2)', addDays(b.eventDate, 40) < TODAY ? 'delivered' : 'shipped', addDays(b.eventDate, 38), addDays(b.eventDate, 41));
  });

  // ---------- Tastings / trials / site visits ----------
  leads.filter((l) => demo.includes(l.partnerId) && TRIALS[listingOf(l.partnerId).category]).forEach((l, k) => {
    const type = TRIALS[listingOf(l.partnerId).category];
    const b = bookings.find((x) => x.id === l.bookingId);
    if (['quoted', 'negotiation'].includes(l.status) && k % 2 === 0) out.trials.push({ id: id('tr'), leadId: l.id, bookingId: null, partnerId: l.partnerId, type, date: addDays(TODAY, 1 + (k % 6)), time: ['11:00', '16:00', '12:30'][k % 3], status: 'scheduled', people: 4, notes: 'Customer coming with parents.' });
    if (b && b.status === 'booked' && k % 3 === 0) out.trials.push({ id: id('tr'), leadId: l.id, bookingId: b.id, partnerId: l.partnerId, type, date: addDays(b.eventDate, -14) < TODAY ? addDays(TODAY, 3) : addDays(b.eventDate, -14), time: '11:00', status: 'scheduled', people: 3, notes: '' });
    if (b && ['completed', 'reviewed'].includes(b.status) && k % 4 === 0) out.trials.push({ id: id('tr'), leadId: l.id, bookingId: b.id, partnerId: l.partnerId, type, date: addDays(b.eventDate, -20), time: '12:00', status: 'done', people: 4, notes: 'Liked the sambar; asked for less spice in kootu.' });
  });

  // ---------- Crew leave ----------
  members.filter((m) => demo.includes(m.partnerId) && m.role === 'crew').forEach((m, k) => {
    out.leaves.push({ id: id('lv'), memberId: m.id, partnerId: m.partnerId, date: addDays(TODAY, 3 + (k % 9)), reason: ['Family function', 'Sick leave', 'Native place visit'][k % 3] });
    if (k % 2 === 0) out.leaves.push({ id: id('lv'), memberId: m.id, partnerId: m.partnerId, date: addDays(TODAY, 20 + (k % 7)), reason: 'Planned leave' });
  });

  // ---------- Coupons, redemptions, wallets, referrals ----------
  out.coupons = [
    { id: 'cp1', code: 'VIZHA1000', title: '₹1,000 off your first booking', type: 'flat', value: 1000, minAmount: 25000, maxDiscount: 1000, funded: 'platform', partnerId: null, validTill: '2027-03-31', maxUses: 5000, used: 1284, active: true },
    { id: 'cp2', code: 'THAI5', title: '5% off for Thai-month weddings', type: 'percent', value: 5, minAmount: 50000, maxDiscount: 5000, funded: 'platform', partnerId: null, validTill: '2027-02-28', maxUses: 2000, used: 312, active: true },
    { id: 'cp3', code: 'LENS10', title: 'Lens & Light: 10% off Gold and Platinum', type: 'percent', value: 10, minAmount: 80000, maxDiscount: 15000, funded: 'partner', partnerId: 'p1', validTill: '2027-01-31', maxUses: 50, used: 9, active: true },
    { id: 'cp4', code: 'MURUGAN500', title: 'Sri Murugan: ₹5 off per plate (300+ plates)', type: 'flat', value: 1500, minAmount: 120000, maxDiscount: 1500, funded: 'partner', partnerId: 'p2', validTill: '2027-03-31', maxUses: 100, used: 14, active: true },
    { id: 'cp5', code: 'DIWALI26', title: 'Diwali offer', type: 'flat', value: 750, minAmount: 15000, maxDiscount: 750, funded: 'platform', partnerId: null, validTill: '2026-11-05', maxUses: 3000, used: 2210, active: false },
  ];
  bookings.filter((b) => b.buyerType === 'individual' && ['booked', 'completed', 'reviewed'].includes(b.status) && b.customerId).slice(0, 6).forEach((b, k) => {
    out.redemptions.push({ id: id('rd'), couponId: k % 2 ? 'cp2' : 'cp1', code: k % 2 ? 'THAI5' : 'VIZHA1000', bookingId: b.id, userId: b.customerId, amount: k % 2 ? Math.min(5000, Math.round(b.total * 0.05)) : 1000, at: b.createdAt });
  });
  out.wallets = {
    u1: { balance: 1500, txns: [
      { id: 'w1', at: '2026-10-12T10:00:00', type: 'credit', amount: 500, note: 'Referral reward: Sneha Iyer booked her first event' },
      { id: 'w2', at: '2026-10-28T18:20:00', type: 'credit', amount: 500, note: 'Referral reward: Vikram Shah booked his first event' },
      { id: 'w3', at: '2026-11-02T09:10:00', type: 'credit', amount: 750, note: 'Refund credited: Inkpress sample order cancelled' },
      { id: 'w4', at: '2026-11-04T20:45:00', type: 'debit', amount: 250, note: 'Paid towards Henna by Ayesha advance' },
    ] },
  };
  out.referrals = [
    { id: 'rf1', referrerId: 'u1', code: 'PRIYA26', name: 'Sneha Iyer', joinedAt: '2026-10-02', status: 'booked', reward: 500 },
    { id: 'rf2', referrerId: 'u1', code: 'PRIYA26', name: 'Vikram Shah', joinedAt: '2026-10-01', status: 'booked', reward: 500 },
    { id: 'rf3', referrerId: 'u1', code: 'PRIYA26', name: 'Deepa Natarajan', joinedAt: '2026-11-06', status: 'signed_up', reward: 0 },
    { id: 'rf4', referrerId: 'u1', code: 'PRIYA26', name: 'Harini Raghav', joinedAt: '2026-11-09', status: 'signed_up', reward: 0 },
  ];

  // ---------- Refunds + credit notes for cancelled bookings that had payments ----------
  let cn = 1;
  bookings.filter((b) => b.status === 'cancelled').forEach((b, k) => {
    const inv = invoices.find((i) => i.id === b.invoiceId);
    if (!inv) return;
    const paid = inv.schedule.filter((s) => s.paidAt).reduce((a, s) => a + s.amount, 0);
    if (!paid) return;
    const partner = partners.find((p) => p.id === b.partnerId) || {};
    const lead = leads.find((l) => l.id === b.leadId) || {};
    const days = Math.round((new Date(b.eventDate) - new Date((b.cancelledAt || b.createdAt).slice(0, 10))) / 86400000);
    const pct = b.cancelledBy === 'partner' ? 100 : days > 30 ? 100 : days >= 7 ? 50 : 0;
    const amount = Math.round((paid * pct) / 100);
    if (!amount) return;
    const status = ['processed', 'processed', 'processing', 'approved', 'requested'][k % 5];
    const req = (b.cancelledAt || b.createdAt).slice(0, 10);
    const r = { id: id('rf'), bookingId: b.id, bookingNumber: b.number, partnerId: b.partnerId, customer: lead.contactName, partner: partner.name, amount, paid, pct, reason: `Cancelled ${days} days before (${pct}% policy)`, status, to: k % 3 === 0 ? 'wallet' : 'original', requestedAt: req, approvedAt: status !== 'requested' ? addDays(req, 1) : null, processedAt: status === 'processed' ? addDays(req, 3) : null };
    if (status === 'processed') {
      const fy = '26-27';
      r.creditNote = `${partner.name.split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}/CN/${fy}/${String(cn++).padStart(4, '0')}`;
      out.creditNotes.push({ id: id('cn'), number: r.creditNote, partnerId: b.partnerId, invoiceId: inv.id, invoiceNumber: inv.number, refundId: r.id, amount, gst: inv.gst ? Math.round((amount / 1.18) * 0.18) : 0, issuedAt: r.processedAt, reason: r.reason, customer: lead.contactName });
    }
    out.refunds.push(r);
  });
  return out;
}
