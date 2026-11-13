// Seed data for the category packs (Venue, Catering, Photography).
// Merged into the base seed in store.js.

// Category attributes per listing (used by filters, profile sections and compare).
export const PACK_ATTRS = {
  // Venues
  l4: {
    seating: 800, dining: 400, rooms: 30, parking: 120, ac: true, vegOnly: true, outsideCatering: false, decorAllowed: true,
    sessions: ['Morning (6am - 2pm)', 'Evening (4pm - 11pm)', 'Full day', '2 days'],
    halls: [
      { id: 'h1', name: 'Main Hall', seating: 800, dining: 400, floor: 'Ground floor', ac: true },
      { id: 'h2', name: 'Mini Hall', seating: 250, dining: 120, floor: 'First floor', ac: true },
    ],
    rules: ['No outside caterers', 'Music till 10:30 pm', 'Refundable damage deposit of ₹25,000', 'Check-in from 2 pm the day before'],
  },
  l16: {
    seating: 1200, dining: 500, rooms: 12, parking: 250, ac: true, vegOnly: false, outsideCatering: true, decorAllowed: true,
    sessions: ['Evening (4pm - 11pm)', 'Full day'],
    halls: [
      { id: 'h3', name: 'Beach Lawn', seating: 1200, dining: 500, floor: 'Open air', ac: false },
      { id: 'h4', name: 'Pearl Banquet', seating: 500, dining: 250, floor: 'Ground floor', ac: true },
    ],
    rules: ['Outside caterers allowed with a ₹15,000 kitchen fee', 'Lawn events end by 11 pm', 'Refundable damage deposit of ₹50,000'],
  },
  // Caterers
  l2: { vegOnly: true, cuisines: ['South Indian', 'Chettinad'], servingStyles: ['Banana leaf', 'Buffet'], minPlates: 100, maxPlates: 2000, liveCounters: true, tasting: true, staffPer100: 6 },
  l15: { vegOnly: false, cuisines: ['South Indian', 'Chettinad', 'North Indian'], servingStyles: ['Buffet'], minPlates: 50, maxPlates: 1000, liveCounters: false, tasting: false, staffPer100: 5 },
  // Photographers
  l1: { styles: ['Candid', 'Traditional', 'Cinematic'], crewSize: 12, drone: true, video: true, deliveryDays: 45, sameDayEdit: true, album: true },
  l14: { styles: ['Candid', 'Documentary'], crewSize: 5, drone: false, video: true, deliveryDays: 30, sameDayEdit: false, album: false },
};

export const MENUS = [
  { id: 'mn1', listingId: 'l2', name: 'Classic Sappadu', foodType: 'Veg', meal: 'Lunch', pricePerPlate: 450, items: ['Welcome drink', 'Sweet pongal', 'Vada', 'Sambar', 'Rasam', 'Vatha kuzhambu', 'Kootu', 'Poriyal (2)', 'Avial', 'Appalam', 'Curd rice', 'Payasam (2)', 'Banana', 'Beeda'] },
  { id: 'mn2', listingId: 'l2', name: 'Grand Kalyana Virundhu', foodType: 'Veg', meal: 'Lunch', pricePerPlate: 750, items: ['Badam milk', 'Jangiri', 'Mysore pak', 'Masala vada', 'Bisibele bath', 'Sambar', 'Mor kuzhambu', 'Rasam', 'Poriyal (3)', 'Kootu (2)', 'Avial', 'Puli inji', 'Curd rice', 'Ada pradhaman', 'Paal payasam', 'Ice cream', 'Paan'] },
  { id: 'mn3', listingId: 'l2', name: 'Breakfast Tiffin', foodType: 'Veg', meal: 'Breakfast', pricePerPlate: 220, items: ['Idli', 'Ven pongal', 'Medhu vada', 'Kesari', 'Sambar', 'Chutney (3)', 'Filter coffee'] },
  { id: 'mn4', listingId: 'l2', name: 'Reception Dinner', foodType: 'Veg', meal: 'Dinner', pricePerPlate: 580, items: ['Soup', 'Paneer starter', 'Live dosa counter', 'Chapathi', 'Paneer butter masala', 'Veg biryani', 'Raita', 'Gulab jamun', 'Ice cream'] },
  { id: 'mn5', listingId: 'l15', name: 'Buffet Veg', foodType: 'Veg', meal: 'Lunch', pricePerPlate: 380, items: ['Soup', 'Veg biryani', 'Paneer curry', 'Dal', 'Rice', 'Rasam', 'Poriyal', 'Curd rice', 'Gulab jamun'] },
  { id: 'mn6', listingId: 'l15', name: 'Buffet Non-Veg', foodType: 'Non-veg', meal: 'Dinner', pricePerPlate: 520, items: ['Chicken 65', 'Mutton biryani', 'Chicken chettinad', 'Fish fry', 'Rice', 'Rasam', 'Raita', 'Ice cream'] },
];

// Enquiry answers captured on existing seed leads.
export const LEAD_DETAILS = {
  ld1: { functions: ['Muhurtham', 'Reception'], coverage: 'Photo + Video', drone: true, album: true, hoursPerFunction: 6 },
  ld3: { functions: ['Engagement'], coverage: 'Photo only', drone: false, album: false, hoursPerFunction: 4 },
  ld4: { functions: ['Mehendi', 'Muhurtham', 'Reception'], coverage: 'Photo + Video', drone: true, album: true, hoursPerFunction: 6 },
  ld5: { functions: ['Muhurtham'], coverage: 'Photo + Video', drone: false, album: true, hoursPerFunction: 6 },
  ld7: { functions: ['Muhurtham'], coverage: 'Photo only', drone: false, album: true, hoursPerFunction: 4 },
  ld2: { functions: ['Birthday party'], coverage: 'Photo only', drone: false, album: false, hoursPerFunction: 3 },
  ld6: { functions: ['Reception'], coverage: 'Photo only', drone: false, album: false, hoursPerFunction: 4 },
  ld8: { session: '2 days', hallId: 'h1', rooms: 20, dining: 400, ownCaterer: false },
  ld9: { meals: ['Breakfast', 'Lunch', 'Dinner'], foodType: 'Veg', servingStyle: 'Banana leaf', liveCounters: true, cuisine: 'South Indian' },
};

// Extra members so the Venue and Catering businesses can be used in the demo.
export const EXTRA_MEMBERS = [
  { id: 'm20', partnerId: 'p4', name: 'Ramesh Iyer', phone: '+91 98402 00001', role: 'owner', status: 'active', title: 'Owner' },
  { id: 'm21', partnerId: 'p4', name: 'Kavya Ramesh', phone: '+91 98402 00002', role: 'manager', status: 'active', title: 'Venue Manager' },
  { id: 'm22', partnerId: 'p4', name: 'Prakash M', phone: '+91 98402 00003', role: 'sales', status: 'active', title: 'Bookings Executive' },
  { id: 'm23', partnerId: 'p4', name: 'Lalitha S', phone: '+91 98402 00004', role: 'accounts', status: 'active', title: 'Accounts' },
  { id: 'm24', partnerId: 'p4', name: 'Muthu K', phone: '+91 98402 00005', role: 'crew', status: 'active', title: 'Housekeeping Lead' },
  { id: 'm30', partnerId: 'p2', name: 'Murugan S', phone: '+91 98403 00001', role: 'owner', status: 'active', title: 'Owner' },
  { id: 'm31', partnerId: 'p2', name: 'Selvi M', phone: '+91 98403 00002', role: 'manager', status: 'active', title: 'Operations Manager' },
  { id: 'm32', partnerId: 'p2', name: 'Hari Prasad', phone: '+91 98403 00003', role: 'sales', status: 'active', title: 'Sales' },
  { id: 'm33', partnerId: 'p2', name: 'Geetha R', phone: '+91 98403 00004', role: 'accounts', status: 'active', title: 'Accounts' },
  { id: 'm34', partnerId: 'p2', name: 'Raju Chef', phone: '+91 98403 00005', role: 'crew', status: 'active', title: 'Head Cook' },
];

export const EXTRA_LEADS = [
  { id: 'ld11', partnerId: 'p4', listingId: 'l4', customerId: null, eventId: null, contactName: 'Karthik Subramanian', contactPhone: '+91 98765 11111', source: 'whatsapp', eventType: 'Wedding', eventDate: '2027-02-07', guests: 600, budget: 300000, requirements: 'Wedding on 7 Feb, need main hall and 15 rooms.', status: 'new', assignedTo: 'm22', nextFollowUp: '2026-11-12', createdAt: '2026-11-10T11:00:00', bookingId: null, details: { session: 'Full day', hallId: 'h1', rooms: 15, dining: 300, ownCaterer: false } },
  { id: 'ld12', partnerId: 'p4', listingId: 'l4', customerId: 'u6', eventId: null, contactName: 'Sneha Iyer', contactPhone: '+91 98840 66778', source: 'app', eventType: 'Engagement', eventDate: '2027-02-08', guests: 200, budget: 120000, requirements: 'Evening engagement, Mini Hall is enough.', status: 'contacted', assignedTo: 'm22', nextFollowUp: '2026-11-11', createdAt: '2026-11-08T15:00:00', bookingId: null, details: { session: 'Evening (4pm - 11pm)', hallId: 'h2', rooms: 4, dining: 120, ownCaterer: false } },
  { id: 'ld13', partnerId: 'p2', listingId: 'l2', customerId: 'u3', eventId: null, contactName: 'Meena Sundar', contactPhone: '+91 99620 33445', source: 'app', eventType: 'Housewarming', eventDate: '2026-12-03', guests: 150, budget: 80000, requirements: 'Griha pravesam breakfast and lunch at home in Anna Nagar.', status: 'won', assignedTo: 'm32', nextFollowUp: null, createdAt: '2026-10-20T10:00:00', bookingId: 'b5', details: { meals: ['Breakfast', 'Lunch'], foodType: 'Veg', servingStyle: 'Banana leaf', liveCounters: false, cuisine: 'South Indian' } },
  { id: 'ld14', partnerId: 'p2', listingId: 'l2', customerId: null, eventId: null, contactName: 'Divya Rajan', contactPhone: '+91 90000 22222', source: 'manual', eventType: 'Birthday', eventDate: '2026-12-19', guests: 120, budget: 60000, requirements: '60th birthday lunch, buffet.', status: 'new', assignedTo: null, nextFollowUp: '2026-11-12', createdAt: '2026-11-10T17:20:00', bookingId: null, details: { meals: ['Lunch'], foodType: 'Veg', servingStyle: 'Buffet', liveCounters: true, cuisine: 'South Indian' } },
];

const items = (...rows) => rows.map(([description, qty, unitPrice], i) => ({ id: 'qi' + i, description, qty, unitPrice }));

export const EXTRA_QUOTES = [
  { id: 'q8', number: 'SM-204', leadId: 'ld13', partnerId: 'p2', version: 1, items: items(['Breakfast Tiffin - 150 plates', 150, 220], ['Classic Sappadu lunch - 150 plates', 150, 450]), discount: 0, gst: true, validUntil: '2026-10-30', notes: 'Includes serving staff and banana leaves.', status: 'accepted', sentAt: '2026-10-21T12:00:00' },
];

export const EXTRA_BOOKINGS = [
  { id: 'b5', number: 'BK-2190', leadId: 'ld13', quoteId: 'q8', partnerId: 'p2', listingId: 'l2', customerId: 'u3', eventDate: '2026-12-03', total: 118590, status: 'booked', contractSigned: true, invoiceId: 'inv5', createdAt: '2026-10-22T10:00:00' },
];

export const EXTRA_INVOICES = [
  { id: 'inv5', number: 'SM/26-27/0311', partnerId: 'p2', bookingId: 'b5', type: 'gst', billTo: 'Meena Sundar', subtotal: 100500, gst: true, issuedAt: '2026-10-22', schedule: [
    { id: 's0', label: 'Advance', amount: 35577, due: '2026-10-25', paidAt: '2026-10-23T10:00:00', method: 'UPI', channel: 'online' },
    { id: 's1', label: 'Milestone', amount: 59295, due: '2026-11-26', paidAt: null },
    { id: 's2', label: 'Final', amount: 23718, due: '2026-12-03', paidAt: null },
  ] },
];

export const EXTRA_BLOCKS = [{ id: 'ab20', partnerId: 'p2', date: '2026-12-03', status: 'blocked', source: 'booking', bookingId: 'b5' }];

// Category-specific details on existing bookings (what the pack panels edit).
export const BOOKING_DETAILS = {
  b1: { hallId: 'h1', session: '2 days', rooms: 20, checkIn: '2027-01-23 14:00', checkOut: '2027-01-24 22:00', deposit: 25000, depositStatus: 'pending', notes: 'Bride side arrives 23rd evening.' },
  b2: {
    functions: [
      { id: 'f1', name: 'Muhurtham', date: '2026-12-06', time: '05:30', venue: 'Kalyana Mandapam, Porur', photographers: 2, videographers: 1 },
    ],
    deliverables: [
      { id: 'd1', label: 'Edited photos', target: 600, done: 0, status: 'not_started' },
      { id: 'd2', label: 'Highlight film (5 min)', target: 1, done: 0, status: 'not_started' },
      { id: 'd3', label: 'Album design (40 pages)', target: 1, done: 0, status: 'not_started' },
      { id: 'd4', label: 'Printed album', target: 1, done: 0, status: 'not_started' },
    ],
    shotList: 'Couple portraits after thaali, family group with grandparents, close-ups of rituals.',
  },
  b3: {
    functions: [{ id: 'f1', name: 'Valaikaapu', date: '2026-10-25', time: '09:00', venue: 'Home, Anna Nagar', photographers: 1, videographers: 0 }],
    deliverables: [
      { id: 'd1', label: 'Edited photos', target: 300, done: 300, status: 'delivered' },
      { id: 'd2', label: 'Album design (20 pages)', target: 1, done: 1, status: 'awaiting_approval' },
      { id: 'd3', label: 'Printed album', target: 1, done: 0, status: 'not_started' },
    ],
    shotList: '',
  },
  b5: {
    meals: [
      { id: 'ml1', meal: 'Breakfast', time: '07:00', menuId: 'mn3', guests: 150 },
      { id: 'ml2', meal: 'Lunch', time: '12:30', menuId: 'mn1', guests: 150 },
    ],
    servingStyle: 'Banana leaf',
    tastingDate: '2026-11-20',
    headcountLockDate: '2026-11-30',
    headcountLocked: false,
    staff: 9,
  },
};

// ---------------------------------------------------------------------------
// The other 8 categories: attributes, catalog/price lists and demo businesses.
// ---------------------------------------------------------------------------
Object.assign(PACK_ATTRS, {
  l8: {
    itemTypes: ['Thamboolam bag', 'Brass items', 'German silver', 'Eco-friendly'], minPrice: 80, minOrder: 50, namePrinting: true, deliveryDays: 7,
    prices: { printing: 10, delivery: 1500 },
    catalog: [
      { name: 'Jute thamboolam bag with coconut pack', price: 80, extra: '1,200', type: 'Thamboolam bag' },
      { name: 'Brass kumkum box', price: 260, extra: '450', type: 'Brass items' },
      { name: 'German silver plate', price: 450, extra: '300', type: 'German silver' },
      { name: 'Seed paper card + sapling kit', price: 120, extra: '800', type: 'Eco-friendly' },
    ],
  },
  l3: {
    themes: ['Traditional temple', 'Pastel floral', 'Royal'], freshFlowers: true, lighting: true, setupHours: 6,
    catalog: [
      { name: 'Stage', price: 60000, extra: 'Backdrop, sofa, lighting' },
      { name: 'Mandapam', price: 120000, extra: 'Pillars, canopy, fresh flowers' },
      { name: 'Entrance', price: 15000, extra: 'Arch and welcome board' },
      { name: 'Ceiling drapes', price: 25000, extra: 'Fabric drapes and fairy lights' },
      { name: 'Photo booth', price: 12000, extra: 'Backdrop and props' },
      { name: 'Car decoration', price: 8000, extra: 'Fresh flowers' },
    ],
  },
  l6: {
    rituals: ['Wedding', 'Griha Pravesam', 'Ganapathi Homam', 'Seemantham', 'Satyanarayana Pooja', 'Upanayanam'], languages: ['Tamil', 'Sanskrit'], samagri: true, vadhyars: 6,
    prices: { vadhyar: 2000, samagri: 4500 },
    catalog: [
      { name: 'Wedding', price: 35000, extra: 'Full day' },
      { name: 'Griha Pravesam', price: 7500, extra: '3 hours' },
      { name: 'Ganapathi Homam', price: 5500, extra: '2 hours' },
      { name: 'Seemantham', price: 9000, extra: '3 hours' },
      { name: 'Satyanarayana Pooja', price: 6000, extra: '2 hours' },
      { name: 'Upanayanam', price: 25000, extra: 'Half day' },
    ],
  },
  l7: {
    ensembles: ['Nadaswaram + Thavil', 'Nadaswaram + Thavil + Ottu'], maxArtists: 8, travels: true,
    prices: { artist: 4000, hour: 5000, travel: 3000 },
    catalog: [
      { name: 'Vidwan T. Selvaraj', price: 8000, extra: 'Nadaswaram' },
      { name: 'K. Murugesan', price: 6000, extra: 'Nadaswaram' },
      { name: 'R. Balu', price: 6000, extra: 'Thavil' },
      { name: 'S. Kannan', price: 5000, extra: 'Thavil' },
      { name: 'M. Raja', price: 3000, extra: 'Ottu' },
    ],
  },
  l5: {
    styles: ['HD', 'Airbrush'], trial: true, travels: true, drape: true,
    prices: { family: 4000, trial: 3000 },
    catalog: [
      { name: 'Bridal muhurtham look', price: 35000, extra: 'Airbrush, hair, draping, touch-ups' },
      { name: 'Engagement / reception look', price: 18000, extra: 'HD makeup and hair' },
      { name: 'Family makeup', price: 4000, extra: 'Per person' },
      { name: 'Trial session', price: 3000, extra: 'Adjusted if booked' },
    ],
  },
  l9: {
    formats: ['Printed', 'Digital', 'Both'], bilingual: true, video: true, minOrder: 100, turnaroundDays: 10,
    prices: { design: 2000, ecard: 1500, video: 4500 },
    catalog: [
      { name: 'Classic single-fold', price: 35, extra: '5x7 in, 300 gsm', style: 'Traditional' },
      { name: 'Modern minimal', price: 45, extra: '5x7 in, textured', style: 'Modern' },
      { name: 'Laser-cut gate fold', price: 85, extra: '6x8 in, shimmer', style: 'Laser cut' },
      { name: 'Scroll box invite', price: 180, extra: 'Box with scroll', style: 'Scroll' },
    ],
  },
  l10: {
    styles: ['Arabic', 'Rajasthani', 'Portrait'], organic: true, maxArtists: 4,
    prices: { guest: 300 },
    catalog: [
      { name: 'Bridal full hands', price: 6000, extra: 'Arabic' },
      { name: 'Bridal hands and feet', price: 9000, extra: 'Rajasthani' },
      { name: 'Portrait couple design', price: 12000, extra: 'Portrait' },
      { name: 'Guest simple design', price: 300, extra: 'Per person' },
    ],
  },
  l11: {
    genres: ['Tamil', 'Bollywood', 'EDM', 'Retro'], anchor: true, ledFloor: true, outdoor: true, maxGuests: 600,
    prices: { hour: 5000 },
    catalog: [
      { name: 'Lighting', price: 10000, extra: '12 par lights, 2 moving heads' },
      { name: 'Anchor / MC', price: 8000, extra: 'Tamil and English' },
      { name: 'LED dance floor', price: 20000, extra: '16 x 16 ft' },
      { name: 'Cold pyro', price: 6000, extra: '4 units' },
    ],
  },
});

const it = (rows) => rows.map(([description, qty, unitPrice], i) => ({ id: 'qi' + i, description, qty, unitPrice }));
const sum = (rows) => rows.reduce((a, r) => a + r[1] * r[2], 0);

// One demo business per remaining category: team, one booked job and one fresh lead.
const DEMO = [
  { pid: 'p8', lid: 'l8', code: 'TG', owner: 'Saravanan P', crew: 'Packing team - Ravi', booked: { customerId: 'u2', name: 'Lakshmi Narayanan', phone: '+91 98410 22334', type: 'Wedding', date: '2026-12-06', guests: 350, details: { itemType: 'Thamboolam bag', quantity: 350, budgetPerPiece: 100, namePrinting: true }, items: [['Jute thamboolam bag with coconut pack', 350, 80], ['Name printing / tags', 350, 10], ['Packing and delivery', 1, 1500]] }, open: { name: 'Anand Kumar', phone: '+91 99000 10001', type: 'Housewarming', date: '2027-01-18', guests: 120, details: { itemType: 'Eco-friendly', quantity: 120, budgetPerPiece: 120, namePrinting: false } } },
  { pid: 'p3', lid: 'l3', code: 'MD', owner: 'Bharath Raj', crew: 'Setup lead - Joseph', booked: { customerId: 'u3', name: 'Meena Sundar', phone: '+91 99620 33445', type: 'Housewarming', date: '2026-12-03', guests: 150, details: { areas: ['Entrance', 'Stage'], theme: 'Traditional temple', flowers: 'Fresh', venueName: 'Home, Anna Nagar' }, items: [['Entrance decoration - Traditional temple', 1, 15000], ['Stage decoration - Traditional temple', 1, 60000], ['Fresh flower premium (15%)', 1, 11250]] }, open: { name: 'Rohit Varma', phone: '+91 99000 10002', type: 'Reception', date: '2027-02-12', guests: 500, details: { areas: ['Stage', 'Ceiling drapes', 'Photo booth'], theme: 'Royal', flowers: 'Mixed', venueName: 'Ocean Pearl Convention' } } },
  { pid: 'p6', lid: 'l6', code: 'VR', owner: 'Sri Raghavan Sastrigal', crew: 'Vadhyar - Sundaresan', booked: { customerId: 'u1', name: 'Priya Raman', phone: '+91 98400 11223', type: 'Wedding', date: '2027-01-24', guests: 400, eventId: 'e1', details: { ritual: 'Wedding', language: 'Tamil', muhurtham: '09:15 - 10:30', vadhyars: 4, samagriByPandit: false }, items: [['Wedding - dakshina', 1, 35000], ['Additional vadhyars', 2, 2000]] }, open: { name: 'Gopal Krishnan', phone: '+91 99000 10003', type: 'Housewarming', date: '2026-12-11', guests: 60, details: { ritual: 'Griha Pravesam', language: 'Tamil', muhurtham: '06:00 - 07:30', vadhyars: 2, samagriByPandit: true } } },
  { pid: 'p7', lid: 'l7', code: 'TM', owner: 'Vidwan T. Selvaraj', crew: 'Thavil - R. Balu', booked: { customerId: 'u2', name: 'Lakshmi Narayanan', phone: '+91 98410 22334', type: 'Wedding', date: '2026-12-06', guests: 350, details: { ensemble: 'Nadaswaram + Thavil', artists: 4, hours: 3, occasions: ['Janavasam / Baraat', 'Muhurtham'] }, items: [['Nadaswaram + Thavil - 4 artists, 3 hours', 1, 25000], ['Troupe travel', 1, 3000]] }, open: { name: 'Sneha Iyer', phone: '+91 98840 66778', customerId: 'u6', type: 'Engagement', date: '2027-02-08', guests: 200, details: { ensemble: 'Nadaswaram + Thavil', artists: 4, hours: 2, occasions: ['Reception entry'] } } },
  { pid: 'p5', lid: 'l5', code: 'GD', owner: 'Divya Menon', crew: 'Assistant - Revathi', booked: { customerId: 'u2', name: 'Lakshmi Narayanan', phone: '+91 98410 22334', type: 'Wedding', date: '2026-12-06', guests: 350, details: { looks: ['Muhurtham'], style: 'Airbrush', familyCount: 3, trial: true, hairStyling: true, drape: true }, items: [['Muhurtham look - Airbrush', 1, 35000], ['Family makeup', 3, 4000], ['Trial session', 1, 3000]] }, open: { name: 'Priya Raman', phone: '+91 98400 11223', customerId: 'u1', eventId: 'e1', type: 'Wedding', date: '2027-01-24', guests: 400, quoted: true, details: { looks: ['Muhurtham', 'Reception'], style: 'HD', familyCount: 2, trial: true, hairStyling: true, drape: true }, items: [['Muhurtham look - HD', 1, 35000], ['Reception look - HD', 1, 35000], ['Family makeup', 2, 4000], ['Trial session', 1, 3000]] } },
  { pid: 'p9', lid: 'l9', code: 'IP', owner: 'Faizal Ahmed', crew: 'Designer - Kavin', booked: { customerId: 'u4', name: 'Vikram Shah', phone: '+91 90030 44556', type: 'Wedding', date: '2027-02-14', guests: 600, details: { format: 'Both', quantity: 500, language: 'Bilingual', style: 'Laser cut', videoInvite: true }, items: [['Laser-cut gate fold - printed', 500, 85], ['Design and typesetting', 1, 2000], ['Digital e-card (image)', 1, 1500], ['Video e-invite (60 sec)', 1, 4500]] }, open: { name: 'Harini V', phone: '+91 99000 10004', type: 'Birthday', date: '2027-01-10', guests: 100, details: { format: 'Digital', quantity: 0, language: 'English', style: 'Modern', videoInvite: true } } },
  { pid: 'p10', lid: 'l10', code: 'HA', owner: 'Ayesha Khan', crew: 'Artist - Nazreen', booked: { customerId: 'u4', name: 'Vikram Shah', phone: '+91 90030 44556', type: 'Wedding', date: '2027-02-14', guests: 600, details: { brideCoverage: 'Hands and feet', style: 'Rajasthani', guests: 30, organic: true }, items: [['Bridal mehendi - Hands and feet (Rajasthani)', 1, 9000], ['Guest mehendi (simple)', 30, 300]] }, open: { name: 'Fathima N', phone: '+91 99000 10005', type: 'Engagement', date: '2027-01-30', guests: 80, details: { brideCoverage: 'Both hands to elbow', style: 'Arabic', guests: 10, organic: true } } },
  { pid: 'p11', lid: 'l11', code: 'BD', owner: 'DJ Arjun', crew: 'Sound engineer - Vimal', booked: { customerId: 'u4', name: 'Vikram Shah', phone: '+91 90030 44556', type: 'Reception', date: '2027-02-15', guests: 500, details: { services: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC'], hours: 5, genres: ['Tamil', 'Bollywood'], setting: 'Outdoor' }, items: [['DJ night - 4 hours with sound', 1, 30000], ['Additional hours', 1, 5000], ['Lighting', 1, 10000], ['Anchor / MC', 1, 8000]] }, open: { name: 'Karthik R', phone: '+91 99000 10006', type: 'Birthday', date: '2026-12-27', guests: 150, details: { services: ['DJ', 'Sound system', 'LED dance floor'], hours: 4, genres: ['EDM', 'Retro'], setting: 'Indoor' } } },
];

const TEAMS = {"p8": [["Kalaivani S", "Store Manager"], ["Naveen R", "Sales"], ["Uma Devi", "Accounts"], ["Ravi Kumar", "Packing Lead"]], "p3": [["Shalini Bharath", "Design Manager"], ["Arvind P", "Sales"], ["Kamala T", "Accounts"], ["Joseph Raj", "Setup Lead"]], "p6": [["Ramanathan G", "Office Manager"], ["Venkatesh S", "Bookings"], ["Padma R", "Accounts"], ["Sundaresan V", "Vadhyar"]], "p7": [["Ilango T", "Troupe Manager"], ["Senthil K", "Bookings"], ["Mala S", "Accounts"], ["R. Balu", "Thavil Artist"]], "p5": [["Keerthana M", "Studio Manager"], ["Pooja R", "Bookings"], ["Sathya L", "Accounts"], ["Revathi K", "Assistant Artist"]], "p9": [["Sameera F", "Studio Manager"], ["Dinesh K", "Sales"], ["Jaya P", "Accounts"], ["Kavin A", "Designer"]], "p10": [["Rukhsar K", "Manager"], ["Nisha B", "Bookings"], ["Imran S", "Accounts"], ["Nazreen M", "Mehendi Artist"]], "p11": [["Rohan D", "Events Manager"], ["Ashwin V", "Sales"], ["Bhuvana S", "Accounts"], ["Vimal R", "Sound Engineer"]]};

const NOW = '2026-11-0';
DEMO.forEach((d, i) => {
  const n = 40 + i * 2;
  const ownerId = 'm' + (100 + i * 10);
  const team = TEAMS[d.pid];
  EXTRA_MEMBERS.push(
    { id: ownerId, partnerId: d.pid, name: d.owner, phone: '+91 98500 ' + (11000 + i * 10), role: 'owner', status: 'active', title: 'Owner' },
    ...['manager', 'sales', 'accounts', 'crew'].map((role, j) => ({ id: 'm' + (101 + j + i * 10), partnerId: d.pid, name: team[j][0], phone: '+91 98500 ' + (11001 + j + i * 10), role, status: 'active', title: team[j][1] }))
  );
  const bk = d.booked;
  const total = Math.round(sum(bk.items) * 1.18);
  const adv = Math.round(total * 0.3);
  const mil = Math.round(total * 0.5);
  const leadId = 'ld' + n;
  const bookingId = 'b' + n;
  const invId = 'inv' + n;
  const qId = 'q' + n;
  EXTRA_LEADS.push({ id: leadId, partnerId: d.pid, listingId: d.lid, customerId: bk.customerId || null, eventId: bk.eventId || null, contactName: bk.name, contactPhone: bk.phone, source: 'app', eventType: bk.type, eventDate: bk.date, guests: bk.guests, budget: total, requirements: '', status: 'won', assignedTo: 'm' + (102 + i * 10), nextFollowUp: null, createdAt: NOW + (1 + (i % 8)) + 'T10:00:00', bookingId, details: bk.details });
  EXTRA_QUOTES.push({ id: qId, number: d.code + '-' + (300 + i), leadId, partnerId: d.pid, version: 1, items: it(bk.items), discount: 0, gst: true, validUntil: '2026-11-20', notes: '', status: 'accepted', sentAt: NOW + (1 + (i % 8)) + 'T12:00:00' });
  EXTRA_BOOKINGS.push({ id: bookingId, number: 'BK-' + (2400 + i), leadId, quoteId: qId, partnerId: d.pid, listingId: d.lid, customerId: bk.customerId || null, eventDate: bk.date, total, status: 'booked', contractSigned: true, invoiceId: invId, createdAt: NOW + (2 + (i % 7)) + 'T10:00:00' });
  EXTRA_INVOICES.push({ id: invId, number: `${d.code}/26-27/0${100 + i}`, partnerId: d.pid, bookingId, type: 'gst', billTo: bk.name, subtotal: sum(bk.items), gst: true, issuedAt: '2026-11-05', schedule: [
    { id: 's0', label: 'Advance', amount: adv, due: '2026-11-08', paidAt: '2026-11-06T10:00:00', method: 'UPI', channel: 'online' },
    { id: 's1', label: 'Milestone', amount: mil, due: bk.date > '2026-12-15' ? '2027-01-05' : '2026-11-29', paidAt: null },
    { id: 's2', label: 'Final', amount: total - adv - mil, due: bk.date, paidAt: null },
  ] });
  EXTRA_BLOCKS.push({ id: 'ab' + n, partnerId: d.pid, date: bk.date, status: 'blocked', source: 'booking', bookingId });
  const op = d.open;
  const openId = 'ld' + (n + 1);
  EXTRA_LEADS.push({ id: openId, partnerId: d.pid, listingId: d.lid, customerId: op.customerId || null, eventId: op.eventId || null, contactName: op.name, contactPhone: op.phone, source: op.customerId ? 'app' : 'whatsapp', eventType: op.type, eventDate: op.date, guests: op.guests, budget: 0, requirements: '', status: op.quoted ? 'quoted' : 'new', assignedTo: null, nextFollowUp: '2026-11-12', createdAt: '2026-11-10T' + (10 + i) + ':00:00', bookingId: null, details: op.details });
  if (op.quoted) EXTRA_QUOTES.push({ id: 'q' + (n + 1), number: d.code + '-' + (320 + i), leadId: openId, partnerId: d.pid, version: 1, items: it(op.items), discount: 0, gst: true, validUntil: '2026-11-25', notes: 'Trial is done about 3 weeks before the event.', status: 'sent', sentAt: '2026-11-10T16:00:00' });
});

// Priya's completed mehendi booking (b4) gets its category details too.
LEAD_DETAILS.ld10 = { brideCoverage: 'Both hands to elbow', style: 'Arabic', guests: 0, organic: true };

export const DEMO_BUSINESS_IDS = ['p1', 'p8', 'p4', 'p2', 'p3', 'p6', 'p7', 'p5', 'p9', 'p10', 'p11'];
