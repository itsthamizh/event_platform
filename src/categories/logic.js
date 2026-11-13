// Pure category logic shared by the store and the UI (no React imports here, to avoid import cycles).
export const addDaysISO = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Category details created on a booking when the customer accepts a quote.
export const INIT_BOOKING = {
  venue: (lead) => {
    const d = lead.details || {};
    return { hallId: d.hallId || 'h1', session: d.session || 'Full day', rooms: d.rooms || 0, checkIn: addDaysISO(lead.eventDate, -1) + ' 14:00', checkOut: lead.eventDate + ' 22:00', deposit: 25000, depositStatus: 'pending', notes: '' };
  },
  catering: (lead, listing, state) => {
    const d = lead.details || {};
    const menus = state.menus.filter((m) => m.listingId === listing.id);
    const pick = (meal) => (menus.find((m) => m.meal === meal) || menus[0] || {}).id;
    const times = { Breakfast: '07:00', Lunch: '12:30', 'Hi-tea': '16:30', Dinner: '19:30' };
    return {
      meals: (d.meals || ['Lunch']).map((meal, i) => ({ id: 'ml' + i, meal, time: times[meal], menuId: pick(meal), guests: lead.guests })),
      servingStyle: d.servingStyle || 'Buffet',
      tastingDate: '',
      headcountLockDate: addDaysISO(lead.eventDate, -3),
      headcountLocked: false,
      staff: Math.ceil((lead.guests / 100) * ((listing.attributes && listing.attributes.staffPer100) || 6)),
    };
  },
  photography: (lead) => {
    const d = lead.details || {};
    const fns = d.functions && d.functions.length ? d.functions : ['Event'];
    const video = d.coverage === 'Photo + Video';
    const deliverables = [{ id: 'd1', label: 'Edited photos', target: 300 * fns.length, done: 0, status: 'not_started' }];
    if (video) deliverables.push({ id: 'd2', label: 'Highlight film', target: 1, done: 0, status: 'not_started' });
    if (d.album) {
      deliverables.push({ id: 'd3', label: 'Album design', target: 1, done: 0, status: 'not_started' });
      deliverables.push({ id: 'd4', label: 'Printed album', target: 1, done: 0, status: 'not_started' });
    }
    return {
      functions: fns.map((f, i) => ({ id: 'f' + i, name: f, date: lead.eventDate, time: '09:00', venue: '', photographers: video ? 2 : 1, videographers: video ? 1 : 0 })),
      deliverables,
      shotList: '',
    };
  },
};


// ---------------------------------------------------------------------------
// Config-driven packs (Return Gifts, Decoration, Pandit, Melam, Makeup,
// Invitation, Mehendi, Music & DJ). Their booking details share one shape:
//   { fields: { key: value }, sections: [{ id, type, title, items }] }
// section types: schedule (timed steps), checklist (things to do / arrange),
// approvals (customer signs off), requests (customer adds wishes).
// ---------------------------------------------------------------------------
let n = 0;
const iid = (p) => p + (n++).toString(36);
const sec = (id, type, title, items, opts = {}) => ({ id, type, title, items: items.map((it) => ({ id: iid(id), ...it })), ...opts });
const steps = (date, rows) => rows.map(([label, offsetDays, time, who]) => ({ label, date: addDaysISO(date, offsetDays), time, who: who || '' }));
const todo = (labels, extra = {}) => labels.map((l) => (Array.isArray(l) ? { label: l[0], qty: l[1], done: false, ...extra } : { label: l, done: false, ...extra }));
const approvals = (labels) => labels.map((label) => ({ label, status: 'not_started', note: '' }));

const RITUAL_STEPS = {
  Wedding: ['Vratham', 'Kashi Yatra', 'Oonjal', 'Kanyadanam', 'Mangalya Dharanam', 'Saptapadi', 'Ashirvadam'],
  'Griha Pravesam': ['Ganapathi Pooja', 'Punyahavachanam', 'Vastu Shanti', 'Gho Pooja', 'Griha Pravesam', 'Ashirvadam'],
  'Ganapathi Homam': ['Sankalpam', 'Kalasa Sthapanam', 'Homam', 'Poornahuti', 'Prasadam'],
  Seemantham: ['Ganapathi Pooja', 'Seemantham', 'Valaikaapu', 'Ashirvadam'],
  'Satyanarayana Pooja': ['Sankalpam', 'Pooja', 'Katha', 'Aarti', 'Prasadam'],
  Upanayanam: ['Udakashanti', 'Upanayanam', 'Brahmopadesam', 'Bhiksha', 'Ashirvadam'],
};
const SAMAGRI = [['Turmeric powder', '100 g'], ['Kumkum', '100 g'], ['Betel leaves', '50'], ['Betel nuts', '50'], ['Bananas', '2 dozen'], ['Coconuts', '6'], ['Flower garlands', '4'], ['Loose flowers', '1 kg'], ['Ghee', '1 kg'], ['Camphor', '1 pack'], ['Navadhanyam', '1 set'], ['Homam bricks and samithu', '1 set'], ['New dhoti and saree', '1 each']];

export const CONFIG_INIT = {
  return_gifts: (lead) => {
    const d = lead.details || {};
    const qty = d.quantity || lead.guests || 100;
    return {
      fields: { item: d.itemType || 'Thamboolam bag', quantity: qty, namePrinting: d.namePrinting ? 'Yes' : 'No', deliveryDate: addDaysISO(lead.eventDate, -2), deliveryAddress: '' },
      sections: [
        sec('approve', 'approvals', 'Approvals', approvals(['Sample piece', d.namePrinting ? 'Name print proof' : 'Packaging design'])),
        sec('dates', 'schedule', 'Key dates', steps(lead.eventDate, [['Sample ready for approval', -25, '11:00'], ['Bulk production starts', -15, '10:00'], ['Delivery to customer', -2, '15:00']])),
        sec('prod', 'checklist', 'Production and packing', todo(['Order materials', d.namePrinting ? 'Print names / tags' : 'Prepare tags', ['Pack pieces', qty], 'Quality check', 'Dispatch'])),
      ],
    };
  },
  decoration: (lead) => {
    const d = lead.details || {};
    const areas = d.areas && d.areas.length ? d.areas : ['Stage'];
    return {
      fields: { theme: d.theme || 'Traditional temple', flowers: d.flowers || 'Fresh', venue: d.venueName || '', setupStart: addDaysISO(lead.eventDate, -1) + ' 18:00', teardown: lead.eventDate + ' 23:00' },
      sections: [
        sec('approve', 'approvals', 'Design approvals', approvals(['Mood board', 'Final layout and colours'])),
        sec('setup', 'schedule', 'Setup plan', steps(lead.eventDate, [['Material pickup', -1, '14:00'], ['Setup starts', -1, '18:00'], ['Setup complete, walkthrough with family', 0, '04:00'], ['Teardown', 0, '23:00']])),
        sec('materials', 'checklist', 'Materials by area', todo(areas.map((a) => `${a}: flowers, drapes, lights, props`))),
      ],
    };
  },
  pandit: (lead) => {
    const d = lead.details || {};
    const ritual = d.ritual || 'Wedding';
    return {
      fields: { ritual, language: d.language || 'Tamil', muhurtham: d.muhurtham || '09:00 - 10:30', reporting: '1 hour before muhurtham', vadhyars: d.vadhyars || 2, samagriBy: d.samagriByPandit ? 'Pandit' : 'Family' },
      sections: [
        sec('sequence', 'schedule', 'Ritual sequence', (RITUAL_STEPS[ritual] || RITUAL_STEPS.Wedding).map((label) => ({ label, date: lead.eventDate, time: '', who: '' }))),
        sec('samagri', 'checklist', 'Samagri - things to arrange', todo(SAMAGRI, { by: d.samagriByPandit ? 'partner' : 'family' }), { customerTicks: true }),
      ],
    };
  },
  melam: (lead) => {
    const d = lead.details || {};
    const occ = d.occasions && d.occasions.length ? d.occasions : ['Muhurtham'];
    const artists = d.artists || 4;
    return {
      fields: { ensemble: d.ensemble || 'Nadaswaram + Thavil', artists, hours: d.hours || 3, reporting: '1 hour before', travel: 'By troupe van' },
      sections: [
        sec('plan', 'schedule', 'Performance plan', occ.map((o, i) => ({ label: o, date: lead.eventDate, time: ['06:00', '08:30', '18:30', '19:30'][i] || '', who: '' }))),
        sec('troupe', 'checklist', 'Troupe confirmation', todo(Array.from({ length: artists }, (_, i) => `Artist ${i + 1} confirmed`))),
      ],
    };
  },
  makeup: (lead) => {
    const d = lead.details || {};
    const looks = d.looks && d.looks.length ? d.looks : ['Muhurtham'];
    const fam = d.familyCount || 0;
    return {
      fields: { style: d.style || 'HD', trialDate: d.trial ? addDaysISO(lead.eventDate, -20) : 'No trial', hair: d.hairStyling ? 'Yes' : 'No', draping: d.drape ? 'Yes' : 'No', skinNotes: '' },
      sections: [
        sec('approve', 'approvals', 'Approvals', approvals(d.trial ? ['Trial look'] : ['Look reference'])),
        sec('slots', 'schedule', 'Getting-ready slots', [
          ...looks.map((l) => ({ label: `Bride - ${l} look`, date: lead.eventDate, time: '04:30', who: 'Lead artist' })),
          ...Array.from({ length: fam }, (_, i) => ({ label: `Family member ${i + 1}`, date: lead.eventDate, time: '06:30', who: 'Assistant' })),
        ]),
        sec('kit', 'checklist', 'Kit and products', todo(['Base and foundation matched', 'Lashes and lens', 'Hair accessories and flowers', 'Saree pins and draping kit', 'Touch-up kit'])),
      ],
    };
  },
  invitation: (lead) => {
    const d = lead.details || {};
    return {
      fields: { format: d.format || 'Printed', quantity: d.quantity || 300, language: d.language || 'Bilingual', style: d.style || 'Traditional', deliverBy: addDaysISO(lead.eventDate, -30) },
      sections: [
        sec('approve', 'approvals', 'Proofs', approvals(['Design proof', 'Final print proof', ...(d.videoInvite ? ['Video e-invite'] : [])])),
        sec('dates', 'schedule', 'Key dates', steps(lead.eventDate, [['First design proof', -50, '18:00'], ['Final proof sign-off', -42, '18:00'], ['Printing', -38, '10:00'], ['Delivery', -30, '15:00']])),
        sec('prod', 'checklist', 'Production', todo(['Names and event details received', 'Design ready', ['Printing', d.quantity || 300], 'Envelopes and packing', 'Delivered'])),
      ],
    };
  },
  mehendi: (lead) => {
    const d = lead.details || {};
    const guests = d.guests || 0;
    return {
      fields: { coverage: d.brideCoverage || 'Both hands to elbow', style: d.style || 'Arabic', guests, artists: Math.max(1, Math.ceil(guests / 10)) + 1, henna: d.organic ? 'Organic' : 'Regular', care: 'Keep it on 6-8 hours, avoid water, apply lemon-sugar mix.' },
      sections: [
        sec('approve', 'approvals', 'Approvals', approvals(['Bride design selection'])),
        sec('sessions', 'schedule', 'Session plan', steps(lead.eventDate, [['Bride mehendi', -1, '16:00', 'Lead artist'], ...(guests ? [['Guest mehendi', -1, '17:00', 'Guest artists']] : [])])),
      ],
    };
  },
  music_dj: (lead) => {
    const d = lead.details || {};
    const services = d.services && d.services.length ? d.services : ['DJ', 'Sound system'];
    return {
      fields: { services: services.join(', '), hours: d.hours || 4, genres: (d.genres || []).join(', '), setting: d.setting || 'Indoor', power: '15 kVA generator / 3-phase', soundCheck: lead.eventDate + ' 16:00' },
      sections: [
        sec('approve', 'approvals', 'Approvals', approvals(['Playlist sign-off'])),
        sec('show', 'schedule', 'Run of show', steps(lead.eventDate, [['Setup and sound check', 0, '16:00'], ['Couple entry', 0, '19:00'], ['Couple dance', 0, '19:30'], ['Open dance floor', 0, '20:00'], ['Closing song', 0, '23:00']])),
        sec('gear', 'checklist', 'Equipment', todo(services.map((s) => s + ' - packed and tested').concat(['Wireless mics (2)', 'Backup laptop'])) ),
        sec('requests', 'requests', 'Song requests', []),
      ],
    };
  },
};

export const initBookingDetails = (category, lead, listing, state) => {
  if (INIT_BOOKING[category]) return INIT_BOOKING[category](lead, listing, state);
  if (CONFIG_INIT[category]) return CONFIG_INIT[category](lead, listing, state);
  return {};
};

// ---------------------------------------------------------------------------
// Quote pricing per category: builds line items from the customer's enquiry.
// ---------------------------------------------------------------------------
const price = (l, key, fallback) => ((l.attributes && l.attributes.prices) || {})[key] || fallback;

export const QUOTE = {
  venue: (lead, listing) => {
    const d = lead.details || {};
    const twoDays = d.session === '2 days';
    const pkg = listing.packages.find((p) => (twoDays ? p.unit.includes('2') : !p.unit.includes('2'))) || listing.packages[0];
    const included = twoDays ? 30 : 10;
    const rows = [{ description: `${pkg.name} - ${d.session || 'Full day'}`, qty: 1, unitPrice: pkg.price }];
    if ((d.rooms || 0) > included) rows.push({ description: `Extra guest rooms (beyond ${included})`, qty: d.rooms - included, unitPrice: 2500 });
    return rows;
  },
  catering: (lead, listing, state) => {
    const d = lead.details || {};
    const menus = state.menus.filter((m) => m.listingId === listing.id);
    const pick = (meal) => menus.find((m) => m.meal === meal) || menus.find((m) => m.meal === 'Lunch') || menus[0];
    const rows = (d.meals || ['Lunch']).map((meal) => {
      const m = pick(meal);
      return { description: `${meal}: ${m ? m.name : 'Menu'} - ${lead.guests} plates`, qty: lead.guests, unitPrice: m ? m.pricePerPlate : 400 };
    });
    if (d.liveCounters) rows.push({ description: 'Live counter (dosa / jalebi)', qty: 1, unitPrice: 15000 });
    return rows;
  },
  photography: (lead, listing) => {
    const d = lead.details || {};
    const fns = d.functions && d.functions.length ? d.functions : ['Event'];
    const pkg = listing.packages.find((p) => p.name === (d.coverage === 'Photo + Video' ? 'Gold' : 'Silver')) || listing.packages[0];
    const rows = fns.map((f, i) => ({ description: `${pkg.name} coverage - ${f}`, qty: 1, unitPrice: i === 0 ? pkg.price : Math.round(pkg.price * 0.6) }));
    const drone = listing.addons.find((a) => /drone/i.test(a.name));
    if (d.drone && drone) rows.push({ description: drone.name, qty: 1, unitPrice: drone.price });
    if (d.album) rows.push({ description: 'Printed album (40 pages)', qty: 1, unitPrice: 8000 });
    return rows;
  },
  return_gifts: (lead, listing) => {
    const d = lead.details || {};
    const qty = d.quantity || lead.guests || 100;
    const match = (listing.attributes.catalog || []).find((c) => c.type === d.itemType) || (listing.attributes.catalog || [])[0] || { name: 'Gift', price: listing.priceFrom };
    const rows = [{ description: `${match.name}`, qty, unitPrice: match.price }];
    if (d.namePrinting) rows.push({ description: 'Name printing / tags', qty, unitPrice: price(listing, 'printing', 10) });
    rows.push({ description: 'Packing and delivery', qty: 1, unitPrice: price(listing, 'delivery', 1500) });
    return rows;
  },
  decoration: (lead, listing) => {
    const d = lead.details || {};
    const cat = listing.attributes.catalog || [];
    const rows = (d.areas && d.areas.length ? d.areas : ['Stage']).map((a) => ({ description: `${a} decoration - ${d.theme || 'theme'}`, qty: 1, unitPrice: (cat.find((c) => c.name === a) || { price: 20000 }).price }));
    if (d.flowers === 'Fresh') rows.push({ description: 'Fresh flower premium (15%)', qty: 1, unitPrice: Math.round(rows.reduce((a, r) => a + r.unitPrice, 0) * 0.15) });
    return rows;
  },
  pandit: (lead, listing) => {
    const d = lead.details || {};
    const r = (listing.attributes.catalog || []).find((c) => c.name === (d.ritual || 'Wedding')) || { name: d.ritual || 'Ritual', price: listing.priceFrom };
    const rows = [{ description: `${r.name} - dakshina`, qty: 1, unitPrice: r.price }];
    if ((d.vadhyars || 2) > 2) rows.push({ description: 'Additional vadhyars', qty: d.vadhyars - 2, unitPrice: price(listing, 'vadhyar', 2000) });
    if (d.samagriByPandit) rows.push({ description: 'Pooja samagri kit', qty: 1, unitPrice: price(listing, 'samagri', 4500) });
    return rows;
  },
  melam: (lead, listing) => {
    const d = lead.details || {};
    const rows = [{ description: `${d.ensemble || 'Melam'} - 4 artists, 3 hours`, qty: 1, unitPrice: listing.priceFrom }];
    if ((d.artists || 4) > 4) rows.push({ description: 'Additional artists', qty: d.artists - 4, unitPrice: price(listing, 'artist', 4000) });
    if ((d.hours || 3) > 3) rows.push({ description: 'Additional hours', qty: d.hours - 3, unitPrice: price(listing, 'hour', 5000) });
    rows.push({ description: 'Troupe travel', qty: 1, unitPrice: price(listing, 'travel', 3000) });
    return rows;
  },
  makeup: (lead, listing) => {
    const d = lead.details || {};
    const bridal = listing.packages.find((p) => /Bridal/i.test(p.name)) || listing.packages[0];
    const light = listing.packages.find((p) => !/Bridal/i.test(p.name)) || bridal;
    const rows = (d.looks && d.looks.length ? d.looks : ['Muhurtham']).map((lk) => {
      const pk = ['Muhurtham', 'Reception'].includes(lk) ? bridal : light;
      return { description: `${lk} look - ${d.style || 'HD'}`, qty: 1, unitPrice: pk.price };
    });
    if (d.familyCount) rows.push({ description: 'Family makeup', qty: d.familyCount, unitPrice: price(listing, 'family', 4000) });
    if (d.trial) rows.push({ description: 'Trial session', qty: 1, unitPrice: price(listing, 'trial', 3000) });
    return rows;
  },
  invitation: (lead, listing) => {
    const d = lead.details || {};
    const cat = listing.attributes.catalog || [];
    const card = cat.find((c) => c.style === d.style) || cat[0] || { name: 'Card', price: listing.priceFrom };
    const rows = [];
    if (d.format !== 'Digital') rows.push({ description: `${card.name} - printed`, qty: d.quantity || 300, unitPrice: card.price });
    rows.push({ description: 'Design and typesetting', qty: 1, unitPrice: price(listing, 'design', 2000) });
    if (d.format !== 'Printed') rows.push({ description: 'Digital e-card (image)', qty: 1, unitPrice: price(listing, 'ecard', 1500) });
    if (d.videoInvite) rows.push({ description: 'Video e-invite (60 sec)', qty: 1, unitPrice: price(listing, 'video', 4500) });
    return rows;
  },
  mehendi: (lead, listing) => {
    const d = lead.details || {};
    const base = listing.packages[0];
    const bride = d.brideCoverage === 'Hands and feet' ? Math.round(base.price * 1.5) : d.brideCoverage === 'Simple' ? Math.round(base.price * 0.5) : base.price;
    const rows = [{ description: `Bridal mehendi - ${d.brideCoverage || 'Both hands'} (${d.style || 'Arabic'})`, qty: 1, unitPrice: bride }];
    if (d.guests) rows.push({ description: 'Guest mehendi (simple)', qty: d.guests, unitPrice: price(listing, 'guest', 300) });
    return rows;
  },
  music_dj: (lead, listing) => {
    const d = lead.details || {};
    const cat = listing.attributes.catalog || [];
    const rows = [{ description: 'DJ night - 4 hours with sound', qty: 1, unitPrice: listing.priceFrom }];
    if ((d.hours || 4) > 4) rows.push({ description: 'Additional hours', qty: d.hours - 4, unitPrice: price(listing, 'hour', 5000) });
    (d.services || []).filter((x) => !['DJ', 'Sound system'].includes(x)).forEach((x) => {
      const c = cat.find((i) => i.name === x);
      rows.push({ description: x, qty: 1, unitPrice: c ? c.price : 10000 });
    });
    return rows;
  },
  // Planners charge a planning fee plus on-day coordination; vendor costs are billed separately at actuals.
  event_management: (lead, listing) => {
    const d = lead.details || {};
    const fns = Math.max(1, (d.functions || []).length || 1);
    const rows = [{ description: `${listing.packages[0].name} - planning & vendor coordination`, qty: 1, unitPrice: listing.packages[0].price }];
    if (fns > 1) rows.push({ description: 'On-day coordination team - additional function', qty: fns - 1, unitPrice: 35000 });
    if (lead.guests > 300) rows.push({ description: 'Guest hospitality desk (per 100 guests above 300)', qty: Math.ceil((lead.guests - 300) / 100), unitPrice: 12000 });
    return rows;
  },
  wedding_planner: (lead, listing) => {
    const d = lead.details || {};
    const fns = Math.max(1, (d.functions || []).length || 1);
    const rows = [{ description: `${listing.packages[0].name} - design, budget and vendors`, qty: 1, unitPrice: listing.packages[0].price }];
    if (fns > 2) rows.push({ description: 'Additional function planning', qty: fns - 2, unitPrice: 40000 });
    if (d.rsvp) rows.push({ description: 'Guest RSVP and hospitality management', qty: 1, unitPrice: 30000 });
    return rows;
  },
};
