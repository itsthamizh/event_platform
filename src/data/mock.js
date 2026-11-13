// Seed data for the demo. Shapes follow the data model doc (tables -> arrays).
// IDs: u* users, p* partners, l* listings, e* events, ld* leads, q* quotes,
// b* bookings, inv* invoices, t* chat threads, m* team members.

export const CATEGORIES = [
  { id: 'venue', name: 'Venues', icon: 'building' },
  { id: 'photography', name: 'Photography', icon: 'camera' },
  { id: 'catering', name: 'Catering', icon: 'utensils' },
  { id: 'decoration', name: 'Decoration', icon: 'sparkles' },
  { id: 'makeup', name: 'Makeup', icon: 'brush' },
  { id: 'pandit', name: 'Pandit', icon: 'flame' },
  { id: 'melam', name: 'Melam', icon: 'drum' },
  { id: 'return_gifts', name: 'Return Gifts', icon: 'gift' },
  { id: 'invitation', name: 'Invitations', icon: 'mail' },
  { id: 'mehendi', name: 'Mehendi', icon: 'leaf' },
  { id: 'music_dj', name: 'Music & DJ', icon: 'music' },
  { id: 'event_management', name: 'Event Management', icon: 'clipboard' },
  { id: 'wedding_planner', name: 'Wedding Planners', icon: 'heart' },
];

export const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Reception',
  'Birthday',
  'Pooja',
  'Housewarming',
  'Baby Shower',
  'Corporate',
];

export const AREAS = ['Mylapore', 'T. Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'OMR', 'Tambaram', 'Porur', 'ECR'];

export const PARTNERS = [
  { id: 'p1', name: 'Lens & Light Studio', ownerId: 'u10', category: 'photography', gstin: '33ABCDE1234F1Z5', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-06-12' },
  { id: 'p2', name: 'Sri Murugan Caterers', ownerId: 'u11', category: 'catering', gstin: '33AAKCS2211K1Z2', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-03-02' },
  { id: 'p3', name: 'Mandapam Decor', ownerId: 'u12', category: 'decoration', gstin: '33AAPFM7781L1Z9', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-08-20' },
  { id: 'p4', name: 'Grand Lotus Mahal', ownerId: 'u13', category: 'venue', gstin: '33AACCG4410B1Z1', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-01-15' },
  { id: 'p5', name: 'Glow by Divya', ownerId: 'u14', category: 'makeup', gstin: '', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-09-01' },
  { id: 'p6', name: 'Vedic Rituals Chennai', ownerId: 'u15', category: 'pandit', gstin: '', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-04-11' },
  { id: 'p7', name: 'Thiruvarur Melam Troupe', ownerId: 'u16', category: 'melam', gstin: '', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-05-23' },
  { id: 'p8', name: 'Thamboolam Gifts', ownerId: 'u17', category: 'return_gifts', gstin: '33AAQFT9012M1Z3', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-07-07' },
  { id: 'p9', name: 'Inkpress Invites', ownerId: 'u18', category: 'invitation', gstin: '33AAHFI3344N1Z8', verification: 'verified', subscription: 'past_due', city: 'Chennai', joined: '2025-02-19' },
  { id: 'p10', name: 'Henna by Ayesha', ownerId: 'u19', category: 'mehendi', gstin: '', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-10-03' },
  { id: 'p11', name: 'Beatbox DJs', ownerId: 'u20', category: 'music_dj', gstin: '33AAJFB5566P1Z4', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-06-30' },
  { id: 'p12', name: 'Royal Events Co.', ownerId: 'u21', category: 'event_management', gstin: '33AAKCR7788Q1Z6', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2024-12-01' },
  { id: 'p13', name: 'Shubh Wedding Planners', ownerId: 'u22', category: 'wedding_planner', gstin: '33AALFS9900R1Z7', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-01-28' },
  { id: 'p14', name: 'Candid Frames', ownerId: 'u23', category: 'photography', gstin: '33AAMFC1122S1Z0', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-04-04' },
  { id: 'p15', name: 'Annapoorna Caterers', ownerId: 'u24', category: 'catering', gstin: '33AANFA3344T1Z2', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-02-10' },
  { id: 'p16', name: 'Ocean Pearl Convention', ownerId: 'u25', category: 'venue', gstin: '33AAOCO5566U1Z5', verification: 'verified', subscription: 'active', city: 'Chennai', joined: '2025-03-18' },
  { id: 'p17', name: 'Kolam Decor House', ownerId: 'u26', category: 'decoration', gstin: '33AAPFK7788V1Z9', verification: 'pending', subscription: 'trial', city: 'Chennai', joined: '2026-11-08' },
  { id: 'p18', name: 'Nadaswaram Naadham', ownerId: 'u27', category: 'melam', gstin: '', verification: 'pending', subscription: 'trial', city: 'Chennai', joined: '2026-11-09' },
  { id: 'p19', name: 'Silver Bells Banquets', ownerId: 'u28', category: 'venue', gstin: '33AAQCS9900W1Z1', verification: 'pending', subscription: 'trial', city: 'Chennai', joined: '2026-11-10' },
];

const pkg = (id, name, price, unit, features, maxGuests) => ({ id, name, price, unit, features, maxGuests });

export const LISTINGS = [
  {
    id: 'l1', partnerId: 'p1', category: 'photography', title: 'Lens & Light Studio', area: 'Adyar', distanceKm: 4.2,
    priceFrom: 45000, priceUnit: 'per event', rating: 4.8, ratingCount: 126, featured: true, verified: true, years: 9, responseTime: 'within 1 hour', capacity: 3,
    eventTypes: ['Wedding', 'Engagement', 'Reception', 'Birthday'],
    about: 'Candid and traditional wedding photography with a team of 12. Known for natural light portraits and same-day edit teasers.',
    highlights: ['Candid + traditional', 'Drone coverage', 'Same-day teaser', '4K video'],
    packages: [
      pkg('pk1', 'Silver', 45000, 'per event', ['1 photographer', '1 videographer', '300 edited photos', 'Online album'], null),
      pkg('pk2', 'Gold', 85000, 'per event', ['2 photographers', '1 cinematographer', '600 edited photos', '5-min highlight film', 'Printed album (40 pages)'], null),
      pkg('pk3', 'Platinum', 150000, 'per event', ['3 photographers', '2 cinematographers', 'Drone', 'Same-day teaser', 'Premium album x2'], null),
    ],
    addons: [{ id: 'ad1', name: 'Drone coverage', price: 12000 }, { id: 'ad2', name: 'Pre-wedding shoot', price: 25000 }],
  },
  {
    id: 'l2', partnerId: 'p2', category: 'catering', title: 'Sri Murugan Caterers', area: 'T. Nagar', distanceKm: 6.1,
    priceFrom: 450, priceUnit: 'per plate', rating: 4.6, ratingCount: 342, featured: true, verified: true, years: 22, responseTime: 'within 3 hours', capacity: 4,
    eventTypes: ['Wedding', 'Reception', 'Pooja', 'Housewarming', 'Birthday'],
    about: 'Traditional South Indian vegetarian catering served on banana leaf. Live counters and Chettinad menus available.',
    highlights: ['Pure veg', 'Banana leaf service', 'Live dosa counter', 'Serves up to 2000'],
    packages: [
      pkg('pk4', 'Classic Sappadu', 450, 'per plate', ['21 items', 'Banana leaf', 'Payasam x2'], 2000),
      pkg('pk5', 'Grand Kalyana Virundhu', 750, 'per plate', ['32 items', 'Live counters', 'Welcome drink', 'Paan'], 2000),
      pkg('pk6', 'Breakfast Tiffin', 220, 'per plate', ['Idli, pongal, vada', 'Filter coffee'], 1500),
    ],
    addons: [{ id: 'ad3', name: 'Live jalebi counter', price: 15000 }],
  },
  {
    id: 'l3', partnerId: 'p3', category: 'decoration', title: 'Mandapam Decor', area: 'Anna Nagar', distanceKm: 9.4,
    priceFrom: 60000, priceUnit: 'per event', rating: 4.5, ratingCount: 88, featured: false, verified: true, years: 7, responseTime: 'within 2 hours', capacity: 2,
    eventTypes: ['Wedding', 'Reception', 'Engagement', 'Baby Shower'],
    about: 'Fresh flower mandapams, stage backdrops and entrance decor. Themes from temple-traditional to modern pastel.',
    highlights: ['Fresh flowers', 'Custom themes', 'Lighting included'],
    packages: [
      pkg('pk7', 'Stage Basic', 60000, 'per event', ['Stage backdrop', 'Entrance arch', 'Flower garlands'], null),
      pkg('pk8', 'Mandapam Royal', 180000, 'per event', ['Full mandapam', 'Ceiling drapes', 'Fairy lighting', 'Photo booth'], null),
    ],
    addons: [],
  },
  {
    id: 'l4', partnerId: 'p4', category: 'venue', title: 'Grand Lotus Mahal', area: 'Mylapore', distanceKm: 2.3,
    priceFrom: 250000, priceUnit: 'per day', rating: 4.7, ratingCount: 211, featured: true, verified: true, years: 18, responseTime: 'within 4 hours', capacity: 1,
    eventTypes: ['Wedding', 'Reception', 'Engagement'],
    about: 'Air-conditioned kalyana mandapam with 800-seat hall, 400-seat dining and 30 rooms for guests. Valet parking for 120 cars.',
    highlights: ['800 seating', 'AC hall', '30 rooms', 'Parking 120 cars'],
    attributes: { seating: 800, dining: 400, rooms: 30, parking: 120, ac: true, vegOnly: true },
    packages: [
      pkg('pk9', 'Muhurtham Day', 250000, 'per day', ['Hall 6am-4pm', 'Dining hall', '10 rooms'], 800),
      pkg('pk10', 'Wedding + Reception', 450000, 'per 2 days', ['Hall 2 days', 'Dining hall', '30 rooms', 'Generator backup'], 800),
    ],
    addons: [],
  },
  {
    id: 'l5', partnerId: 'p5', category: 'makeup', title: 'Glow by Divya', area: 'Velachery', distanceKm: 8.8,
    priceFrom: 18000, priceUnit: 'per look', rating: 4.9, ratingCount: 64, featured: true, verified: true, years: 6, responseTime: 'within 1 hour', capacity: 2,
    eventTypes: ['Wedding', 'Engagement', 'Reception'],
    about: 'Bridal HD and airbrush makeup with hair styling and saree draping. Trial session available.',
    highlights: ['HD & airbrush', 'Saree draping', 'Trial available'],
    packages: [
      pkg('pk11', 'Engagement Look', 18000, 'per look', ['HD makeup', 'Hair styling'], null),
      pkg('pk12', 'Bridal Muhurtham', 35000, 'per look', ['Airbrush makeup', 'Hair + flowers', 'Saree draping', 'Touch-ups'], null),
    ],
    addons: [{ id: 'ad4', name: 'Family makeup (per person)', price: 4000 }],
  },
  {
    id: 'l6', partnerId: 'p6', category: 'pandit', title: 'Vedic Rituals Chennai', area: 'Mylapore', distanceKm: 1.9,
    priceFrom: 7500, priceUnit: 'per ritual', rating: 4.8, ratingCount: 97, featured: false, verified: true, years: 25, responseTime: 'within 2 hours', capacity: 3,
    eventTypes: ['Wedding', 'Pooja', 'Housewarming', 'Baby Shower'],
    about: 'Experienced vadhyars for weddings, griha pravesam, ganapathi homam and seemantham. Samagri can be arranged.',
    highlights: ['Tamil & Sanskrit', 'Samagri arranged', 'Muhurtham guidance'],
    packages: [
      pkg('pk13', 'Griha Pravesam', 7500, 'per ritual', ['2 vadhyars', 'Ganapathi homam'], null),
      pkg('pk14', 'Full Wedding Rituals', 35000, 'per wedding', ['4 vadhyars', 'Nichayathartham to Muhurtham', 'Samagri list'], null),
    ],
    addons: [{ id: 'ad5', name: 'Pooja samagri kit', price: 4500 }],
  },
  {
    id: 'l7', partnerId: 'p7', category: 'melam', title: 'Thiruvarur Melam Troupe', area: 'Tambaram', distanceKm: 18.5,
    priceFrom: 25000, priceUnit: 'per event', rating: 4.7, ratingCount: 51, featured: false, verified: true, years: 30, responseTime: 'within 6 hours', capacity: 2,
    eventTypes: ['Wedding', 'Pooja', 'Housewarming'],
    about: 'Nadaswaram and thavil ensemble for muhurtham, baraat and temple functions.',
    highlights: ['Nadaswaram + thavil', '6-member troupe'],
    packages: [
      pkg('pk15', 'Muhurtham Melam', 25000, 'per event', ['4 artists', '3 hours'], null),
      pkg('pk16', 'Full Day Melam', 45000, 'per day', ['6 artists', 'Janavasam + muhurtham'], null),
    ],
    addons: [],
  },
  {
    id: 'l8', partnerId: 'p8', category: 'return_gifts', title: 'Thamboolam Gifts', area: 'T. Nagar', distanceKm: 5.6,
    priceFrom: 80, priceUnit: 'per piece', rating: 4.4, ratingCount: 140, featured: false, verified: true, years: 11, responseTime: 'within 3 hours', capacity: 6,
    eventTypes: ['Wedding', 'Birthday', 'Pooja', 'Baby Shower', 'Housewarming'],
    about: 'Thamboolam bags, brass items, German silver gifts and eco-friendly return gifts with name printing.',
    highlights: ['Name printing', 'Bulk discounts', 'Doorstep delivery'],
    packages: [
      pkg('pk17', 'Jute Thamboolam Bag', 80, 'per piece', ['Printed jute bag', 'Coconut + betel pack'], null),
      pkg('pk18', 'Brass Kumkum Box', 260, 'per piece', ['Gift box', 'Name card'], null),
    ],
    addons: [],
  },
  {
    id: 'l9', partnerId: 'p9', category: 'invitation', title: 'Inkpress Invites', area: 'Porur', distanceKm: 12.0,
    priceFrom: 35, priceUnit: 'per card', rating: 4.3, ratingCount: 76, featured: false, verified: true, years: 14, responseTime: 'within 1 day', capacity: 8,
    eventTypes: ['Wedding', 'Birthday', 'Corporate'],
    about: 'Printed and digital invitations, bilingual Tamil-English designs, video e-invites.',
    highlights: ['Bilingual designs', 'Video e-invites'],
    packages: [
      pkg('pk19', 'Classic Card', 35, 'per card', ['Single fold', 'Envelope'], null),
      pkg('pk20', 'Video E-Invite', 4500, 'per design', ['60-sec video', '2 revisions'], null),
    ],
    addons: [],
  },
  {
    id: 'l10', partnerId: 'p10', category: 'mehendi', title: 'Henna by Ayesha', area: 'Anna Nagar', distanceKm: 10.1,
    priceFrom: 6000, priceUnit: 'per bride', rating: 4.9, ratingCount: 58, featured: true, verified: true, years: 5, responseTime: 'within 1 hour', capacity: 2,
    eventTypes: ['Wedding', 'Engagement', 'Baby Shower'],
    about: 'Bridal Arabic and Rajasthani mehendi with organic henna. Guest mehendi artists for large events.',
    highlights: ['Organic henna', 'Portrait mehendi'],
    packages: [
      pkg('pk21', 'Bridal Full Hands', 6000, 'per bride', ['Both hands to elbow', 'Organic cone'], null),
      pkg('pk22', 'Bridal + 20 Guests', 14000, 'per event', ['Bride full', '20 guests simple'], null),
    ],
    addons: [],
  },
  {
    id: 'l11', partnerId: 'p11', category: 'music_dj', title: 'Beatbox DJs', area: 'OMR', distanceKm: 14.7,
    priceFrom: 30000, priceUnit: 'per night', rating: 4.5, ratingCount: 45, featured: false, verified: true, years: 8, responseTime: 'within 2 hours', capacity: 3,
    eventTypes: ['Reception', 'Birthday', 'Corporate', 'Engagement'],
    about: 'DJ, sound and lighting for sangeet, reception and corporate nights. Tamil, Bollywood and EDM sets.',
    highlights: ['JBL line array', 'LED dance floor'],
    packages: [
      pkg('pk23', 'DJ Night', 30000, 'per night', ['DJ 4 hours', 'Sound 2kW', 'Basic lights'], 300),
      pkg('pk24', 'Sangeet Premium', 65000, 'per night', ['DJ + anchor', 'LED floor', 'Cold pyro'], 600),
    ],
    addons: [],
  },
  {
    id: 'l12', partnerId: 'p12', category: 'event_management', title: 'Royal Events Co.', area: 'Anna Nagar', distanceKm: 9.0,
    priceFrom: 150000, priceUnit: 'per event', rating: 4.6, ratingCount: 39, featured: false, verified: true, years: 12, responseTime: 'within 4 hours', capacity: 2,
    eventTypes: ['Wedding', 'Corporate', 'Birthday', 'Reception'],
    about: 'End-to-end event management: venue sourcing, vendor coordination, guest hospitality and on-day execution.',
    highlights: ['Single point of contact', 'Guest hospitality'],
    packages: [pkg('pk25', 'Coordination Only', 150000, 'per event', ['Vendor coordination', 'On-day team of 6'], null)],
    addons: [],
  },
  {
    id: 'l13', partnerId: 'p13', category: 'wedding_planner', title: 'Shubh Wedding Planners', area: 'Adyar', distanceKm: 3.7,
    priceFrom: 250000, priceUnit: 'per wedding', rating: 4.7, ratingCount: 33, featured: true, verified: true, years: 10, responseTime: 'within 3 hours', capacity: 2,
    eventTypes: ['Wedding', 'Reception', 'Engagement'],
    about: 'Full wedding planning with budget management, design, and destination weddings in ECR and Mahabalipuram.',
    highlights: ['Budget planning', 'Destination weddings'],
    packages: [pkg('pk26', 'Full Planning', 250000, 'per wedding', ['6 months planning', 'Design + vendors', 'Guest RSVP'], null)],
    addons: [],
  },
  {
    id: 'l14', partnerId: 'p14', category: 'photography', title: 'Candid Frames', area: 'Velachery', distanceKm: 8.1,
    priceFrom: 35000, priceUnit: 'per event', rating: 4.4, ratingCount: 72, featured: false, verified: true, years: 5, responseTime: 'within 2 hours', capacity: 2,
    eventTypes: ['Wedding', 'Birthday', 'Engagement', 'Baby Shower'],
    about: 'Young candid team focused on storytelling, reels and documentary-style coverage.',
    highlights: ['Instagram reels', 'Documentary style'],
    packages: [
      pkg('pk27', 'Starter', 35000, 'per event', ['1 candid photographer', '250 photos', '1 reel'], null),
      pkg('pk28', 'Story', 70000, 'per event', ['2 photographers', '1 videographer', '3 reels', 'Teaser'], null),
    ],
    addons: [],
  },
  {
    id: 'l15', partnerId: 'p15', category: 'catering', title: 'Annapoorna Caterers', area: 'Velachery', distanceKm: 7.9,
    priceFrom: 380, priceUnit: 'per plate', rating: 4.3, ratingCount: 190, featured: false, verified: true, years: 16, responseTime: 'within 3 hours', capacity: 3,
    eventTypes: ['Wedding', 'Birthday', 'Pooja', 'Corporate', 'Housewarming'],
    about: 'Veg and non-veg buffets, Chettinad and North Indian menus. Popular for birthdays and corporate lunches.',
    highlights: ['Veg & non-veg', 'Buffet service'],
    packages: [
      pkg('pk29', 'Buffet Veg', 380, 'per plate', ['14 items', 'Buffet setup'], 1000),
      pkg('pk30', 'Buffet Non-Veg', 520, 'per plate', ['16 items', 'Biryani counter'], 1000),
    ],
    addons: [],
  },
  {
    id: 'l16', partnerId: 'p16', category: 'venue', title: 'Ocean Pearl Convention', area: 'ECR', distanceKm: 21.4,
    priceFrom: 320000, priceUnit: 'per day', rating: 4.5, ratingCount: 120, featured: false, verified: true, years: 9, responseTime: 'within 4 hours', capacity: 1,
    eventTypes: ['Wedding', 'Reception', 'Corporate'],
    about: 'Beach-side convention hall with lawn for 1200 guests, banquet hall for 500 and sea-view stage.',
    highlights: ['Beach lawn', '1200 guests', 'Sea-view stage'],
    attributes: { seating: 1200, dining: 500, rooms: 12, parking: 250, ac: true, vegOnly: false },
    packages: [pkg('pk31', 'Lawn + Banquet', 320000, 'per day', ['Lawn 4pm-11pm', 'Banquet hall', 'Bridal suite'], 1200)],
    addons: [],
  },
];

export const USERS = [
  { id: 'u1', name: 'Priya Raman', phone: '+91 98400 11223', email: 'priya.r@example.com', city: 'Chennai', joined: '2026-09-02', status: 'active', bookings: 3 },
  { id: 'u2', name: 'Lakshmi Narayanan', phone: '+91 98410 22334', email: '', city: 'Chennai', joined: '2026-08-14', status: 'active', bookings: 1 },
  { id: 'u3', name: 'Meena Sundar', phone: '+91 99620 33445', email: 'meena.s@example.com', city: 'Chennai', joined: '2026-06-20', status: 'active', bookings: 2 },
  { id: 'u4', name: 'Vikram Shah', phone: '+91 90030 44556', email: 'vikram@example.com', city: 'Chennai', joined: '2026-10-01', status: 'active', bookings: 0 },
  { id: 'u5', name: 'Rahul Menon', phone: '+91 97890 55667', email: '', city: 'Chennai', joined: '2026-07-11', status: 'blocked', bookings: 0 },
  { id: 'u6', name: 'Sneha Iyer', phone: '+91 98840 66778', email: 'sneha.i@example.com', city: 'Chennai', joined: '2026-10-21', status: 'active', bookings: 0 },
];

export const CURRENT_CUSTOMER_ID = 'u1';
export const CURRENT_PARTNER_ID = 'p1';

export const EVENTS = [
  { id: 'e1', customerId: 'u1', type: 'Wedding', title: 'Priya & Arjun Wedding', date: '2027-01-24', area: 'Mylapore', budget: 1500000, guests: 400, needs: ['venue', 'photography', 'catering', 'decoration', 'makeup', 'pandit', 'melam', 'return_gifts', 'invitation', 'mehendi'] },
  { id: 'e2', customerId: 'u1', type: 'Birthday', title: "Aadhya's 1st Birthday", date: '2026-12-14', area: 'Adyar', budget: 150000, guests: 80, needs: ['decoration', 'photography', 'catering', 'return_gifts'] },
  { id: 'e3', customerId: 'u1', type: 'Engagement', title: 'Priya & Arjun Engagement', date: '2026-10-05', area: 'Mylapore', budget: 200000, guests: 120, needs: ['mehendi', 'makeup'] },
];

export const FAVOURITES = [
  { listingId: 'l3', eventId: 'e1' },
  { listingId: 'l5', eventId: 'e1' },
  { listingId: 'l7', eventId: 'e1' },
  { listingId: 'l14', eventId: 'e2' },
];

// Lead statuses: new, contacted, quoted, negotiation, won, lost
export const LEADS = [
  { id: 'ld1', partnerId: 'p1', listingId: 'l1', customerId: 'u1', eventId: 'e1', contactName: 'Priya Raman', contactPhone: '+91 98400 11223', source: 'app', eventType: 'Wedding', eventDate: '2027-01-24', guests: 400, budget: 100000, requirements: 'Candid + traditional for muhurtham and reception. Need drone for the reception.', status: 'quoted', assignedTo: 'm2', nextFollowUp: '2026-11-13', createdAt: '2026-11-04T10:20:00', bookingId: null },
  { id: 'ld2', partnerId: 'p1', listingId: 'l1', customerId: null, eventId: null, contactName: 'Ramesh K', contactPhone: '+91 90031 87654', source: 'whatsapp', eventType: 'Birthday', eventDate: '2026-12-20', guests: 100, budget: 30000, requirements: "Daughter's 5th birthday at home, 3 hours coverage.", status: 'new', assignedTo: null, nextFollowUp: '2026-11-12', createdAt: '2026-11-10T19:05:00', bookingId: null },
  { id: 'ld3', partnerId: 'p1', listingId: 'l1', customerId: 'u6', eventId: null, contactName: 'Sneha Iyer', contactPhone: '+91 98840 66778', source: 'app', eventType: 'Engagement', eventDate: '2027-02-08', guests: 150, budget: 50000, requirements: 'Evening engagement at a hotel in OMR.', status: 'contacted', assignedTo: 'm2', nextFollowUp: '2026-11-11', createdAt: '2026-11-08T12:40:00', bookingId: null },
  { id: 'ld4', partnerId: 'p1', listingId: 'l1', customerId: 'u4', eventId: null, contactName: 'Vikram Shah', contactPhone: '+91 90030 44556', source: 'app', eventType: 'Wedding', eventDate: '2027-02-14', guests: 600, budget: 140000, requirements: 'North + South Indian wedding, 2 days. Wants Platinum but at Gold price.', status: 'negotiation', assignedTo: 'm6', nextFollowUp: '2026-11-12', createdAt: '2026-10-28T09:15:00', bookingId: null },
  { id: 'ld5', partnerId: 'p1', listingId: 'l1', customerId: 'u2', eventId: null, contactName: 'Lakshmi Narayanan', contactPhone: '+91 98410 22334', source: 'app', eventType: 'Wedding', eventDate: '2026-12-06', guests: 350, budget: 90000, requirements: 'Muhurtham coverage + album.', status: 'won', assignedTo: 'm2', nextFollowUp: null, createdAt: '2026-09-18T16:00:00', bookingId: 'b2' },
  { id: 'ld6', partnerId: 'p1', listingId: 'l1', customerId: null, eventId: null, contactName: 'Farhan Ali', contactPhone: '+91 99400 12121', source: 'manual', eventType: 'Reception', eventDate: '2026-11-30', guests: 250, budget: 25000, requirements: 'Reception only, 4 hours.', status: 'lost', lostReason: 'Budget too low', assignedTo: 'm2', nextFollowUp: null, createdAt: '2026-10-15T11:30:00', bookingId: null },
  { id: 'ld7', partnerId: 'p1', listingId: 'l1', customerId: 'u3', eventId: null, contactName: 'Meena Sundar', contactPhone: '+91 99620 33445', source: 'app', eventType: 'Baby Shower', eventDate: '2026-10-25', guests: 120, budget: 45000, requirements: 'Valaikaapu ceremony coverage.', status: 'won', assignedTo: 'm2', nextFollowUp: null, createdAt: '2026-09-02T10:00:00', bookingId: 'b3' },
  // Priya's enquiries with other partners (shown in the customer booking tab)
  { id: 'ld8', partnerId: 'p4', listingId: 'l4', customerId: 'u1', eventId: 'e1', contactName: 'Priya Raman', contactPhone: '+91 98400 11223', source: 'app', eventType: 'Wedding', eventDate: '2027-01-24', guests: 400, budget: 500000, requirements: 'Wedding + reception, 2 days, need 20 rooms.', status: 'won', assignedTo: null, nextFollowUp: null, createdAt: '2026-09-20T10:00:00', bookingId: 'b1' },
  { id: 'ld9', partnerId: 'p2', listingId: 'l2', customerId: 'u1', eventId: 'e1', contactName: 'Priya Raman', contactPhone: '+91 98400 11223', source: 'app', eventType: 'Wedding', eventDate: '2027-01-24', guests: 400, budget: 300000, requirements: 'Breakfast + lunch on muhurtham day, dinner at reception.', status: 'contacted', assignedTo: null, nextFollowUp: null, createdAt: '2026-11-06T18:30:00', bookingId: null },
  { id: 'ld10', partnerId: 'p10', listingId: 'l10', customerId: 'u1', eventId: 'e3', contactName: 'Priya Raman', contactPhone: '+91 98400 11223', source: 'app', eventType: 'Engagement', eventDate: '2026-10-05', guests: 120, budget: 8000, requirements: 'Bridal mehendi for engagement.', status: 'won', assignedTo: null, nextFollowUp: null, createdAt: '2026-09-10T09:00:00', bookingId: 'b4' },
];

export const LEAD_ACTIVITIES = [
  { id: 'a1', leadId: 'ld1', type: 'status', body: 'Enquiry received from the app', by: 'System', at: '2026-11-04T10:20:00' },
  { id: 'a2', leadId: 'ld1', type: 'call', body: 'Called Priya. Wants candid focus, reception has drone requirement.', by: 'Divya', at: '2026-11-04T15:10:00' },
  { id: 'a3', leadId: 'ld1', type: 'status', body: 'Quote Q-1042 v1 sent in app', by: 'Divya', at: '2026-11-05T11:00:00' },
  { id: 'a4', leadId: 'ld4', type: 'note', body: 'Asked for 15% discount on Platinum. Sent v2 with 10% off.', by: 'Nisha', at: '2026-11-07T17:45:00' },
  { id: 'a5', leadId: 'ld3', type: 'call', body: 'Shared portfolio link on WhatsApp.', by: 'Divya', at: '2026-11-09T10:30:00' },
];

const items = (...rows) => rows.map(([description, qty, unitPrice], i) => ({ id: 'qi' + i, description, qty, unitPrice }));

export const QUOTES = [
  { id: 'q1', number: 'Q-1042', leadId: 'ld1', partnerId: 'p1', version: 1, items: items(['Gold package - muhurtham day', 1, 85000], ['Drone coverage - reception', 1, 12000]), discount: 5000, gst: true, validUntil: '2026-11-20', notes: 'Includes travel within Chennai. Album delivery in 45 days.', status: 'sent', sentAt: '2026-11-05T11:00:00' },
  { id: 'q2', number: 'Q-1038', leadId: 'ld4', partnerId: 'p1', version: 1, items: items(['Platinum package - 2 days', 1, 150000]), discount: 0, gst: true, validUntil: '2026-11-15', notes: '', status: 'superseded', sentAt: '2026-10-30T12:00:00' },
  { id: 'q3', number: 'Q-1038', leadId: 'ld4', partnerId: 'p1', version: 2, items: items(['Platinum package - 2 days', 1, 150000]), discount: 15000, gst: true, validUntil: '2026-11-18', notes: '10% loyalty discount applied.', status: 'sent', sentAt: '2026-11-07T17:40:00' },
  { id: 'q4', number: 'Q-1021', leadId: 'ld5', partnerId: 'p1', version: 1, items: items(['Gold package - muhurtham', 1, 85000]), discount: 0, gst: false, validUntil: '2026-10-01', notes: '', status: 'accepted', sentAt: '2026-09-20T12:00:00' },
  { id: 'q5', number: 'Q-1009', leadId: 'ld7', partnerId: 'p1', version: 1, items: items(['Silver package - valaikaapu', 1, 45000]), discount: 0, gst: false, validUntil: '2026-09-15', notes: '', status: 'accepted', sentAt: '2026-09-03T12:00:00' },
  { id: 'q6', number: 'GL-311', leadId: 'ld8', partnerId: 'p4', version: 1, items: items(['Wedding + Reception (2 days)', 1, 450000]), discount: 0, gst: false, validUntil: '2026-10-01', notes: '', status: 'accepted', sentAt: '2026-09-21T12:00:00' },
  { id: 'q7', number: 'HA-88', leadId: 'ld10', partnerId: 'p10', version: 1, items: items(['Bridal Full Hands', 1, 6000]), discount: 0, gst: false, validUntil: '2026-09-20', notes: '', status: 'accepted', sentAt: '2026-09-11T12:00:00' },
];

// Booking statuses: accepted (advance due), booked, completed, reviewed, cancelled
export const BOOKINGS = [
  { id: 'b1', number: 'BK-2207', leadId: 'ld8', quoteId: 'q6', partnerId: 'p4', listingId: 'l4', customerId: 'u1', eventDate: '2027-01-24', total: 450000, status: 'booked', contractSigned: true, invoiceId: 'inv1', createdAt: '2026-09-22T10:00:00' },
  { id: 'b2', number: 'BK-2155', leadId: 'ld5', quoteId: 'q4', partnerId: 'p1', listingId: 'l1', customerId: 'u2', eventDate: '2026-12-06', total: 85000, status: 'booked', contractSigned: true, invoiceId: 'inv2', createdAt: '2026-09-21T10:00:00' },
  { id: 'b3', number: 'BK-2098', leadId: 'ld7', quoteId: 'q5', partnerId: 'p1', listingId: 'l1', customerId: 'u3', eventDate: '2026-10-25', total: 45000, status: 'completed', contractSigned: true, invoiceId: 'inv3', createdAt: '2026-09-04T10:00:00', completedAt: '2026-10-26T09:00:00' },
  { id: 'b4', number: 'BK-2110', leadId: 'ld10', quoteId: 'q7', partnerId: 'p10', listingId: 'l10', customerId: 'u1', eventDate: '2026-10-05', total: 6000, status: 'completed', contractSigned: true, invoiceId: 'inv4', createdAt: '2026-09-12T10:00:00', completedAt: '2026-10-06T09:00:00' },
];

const sched = (rows) => rows.map(([label, amount, due, paidAt, method], i) => ({ id: 's' + i, label, amount, due, paidAt: paidAt || null, method: method || null }));

export const INVOICES = [
  { id: 'inv1', number: 'GL/26-27/0141', partnerId: 'p4', bookingId: 'b1', type: 'regular', billTo: 'Priya Raman', subtotal: 450000, gst: false, issuedAt: '2026-09-22', schedule: sched([['Advance', 135000, '2026-09-25', '2026-09-23T12:00:00', 'Online'], ['Milestone', 225000, '2027-01-10'], ['Final', 90000, '2027-01-24']]) },
  { id: 'inv2', number: 'LL/26-27/0067', partnerId: 'p1', bookingId: 'b2', type: 'regular', billTo: 'Lakshmi Narayanan', subtotal: 85000, gst: false, issuedAt: '2026-09-21', schedule: sched([['Advance', 25500, '2026-09-25', '2026-09-22T12:00:00', 'UPI'], ['Milestone', 42500, '2026-11-29'], ['Final', 17000, '2026-12-06']]) },
  { id: 'inv3', number: 'LL/26-27/0052', partnerId: 'p1', bookingId: 'b3', type: 'regular', billTo: 'Meena Sundar', subtotal: 45000, gst: false, issuedAt: '2026-09-04', schedule: sched([['Advance', 13500, '2026-09-06', '2026-09-05T12:00:00', 'Online'], ['Final', 31500, '2026-10-25', '2026-10-25T18:00:00', 'Cash']]) },
  { id: 'inv4', number: 'HA/26-27/0019', partnerId: 'p10', bookingId: 'b4', type: 'regular', billTo: 'Priya Raman', subtotal: 6000, gst: false, issuedAt: '2026-09-12', schedule: sched([['Full payment', 6000, '2026-10-05', '2026-10-05T10:00:00', 'Online']]) },
];

export const THREADS = [
  { id: 't1', customerId: 'u1', partnerId: 'p1', listingId: 'l1', leadId: 'ld1' },
  { id: 't2', customerId: 'u1', partnerId: 'p4', listingId: 'l4', leadId: 'ld8' },
  { id: 't3', customerId: 'u1', partnerId: 'p2', listingId: 'l2', leadId: 'ld9' },
  { id: 't4', customerId: 'u6', partnerId: 'p1', listingId: 'l1', leadId: 'ld3' },
  { id: 't5', customerId: 'u4', partnerId: 'p1', listingId: 'l1', leadId: 'ld4' },
];

export const MESSAGES = [
  { id: 'msg1', threadId: 't1', side: 'customer', type: 'text', body: 'Hi! We are getting married on 24 Jan at Grand Lotus Mahal. Do you have the date free?', at: '2026-11-04T10:20:00' },
  { id: 'msg2', threadId: 't1', side: 'partner', type: 'text', body: 'Congratulations Priya! Yes, 24 Jan is open. Can I call you this afternoon to understand the requirements?', at: '2026-11-04T10:48:00' },
  { id: 'msg3', threadId: 't1', side: 'customer', type: 'text', body: 'Sure, after 3 pm works.', at: '2026-11-04T10:52:00' },
  { id: 'msg4', threadId: 't1', side: 'partner', type: 'quote', refId: 'q1', body: 'Quote Q-1042 v1', at: '2026-11-05T11:00:00' },
  { id: 'msg5', threadId: 't2', side: 'customer', type: 'text', body: 'Can we get early check-in for the rooms on 23rd?', at: '2026-10-12T09:00:00' },
  { id: 'msg6', threadId: 't2', side: 'partner', type: 'text', body: 'Yes, rooms will be available from 2 pm on the 23rd.', at: '2026-10-12T11:20:00' },
  { id: 'msg7', threadId: 't3', side: 'customer', type: 'text', body: 'Looking for breakfast and lunch for 400 on 24 Jan, plus dinner for 300 at the reception.', at: '2026-11-06T18:30:00' },
  { id: 'msg8', threadId: 't3', side: 'partner', type: 'text', body: 'Vanakkam! We will share 2 menu options by tomorrow evening.', at: '2026-11-06T19:10:00' },
  { id: 'msg9', threadId: 't4', side: 'customer', type: 'text', body: 'Hi, do you cover engagements in OMR?', at: '2026-11-08T12:40:00' },
  { id: 'msg10', threadId: 't4', side: 'partner', type: 'text', body: 'Yes we do! Sharing our portfolio link.', at: '2026-11-08T13:05:00' },
  { id: 'msg11', threadId: 't5', side: 'customer', type: 'text', body: 'Can you do Platinum at 1.2L?', at: '2026-11-07T16:00:00' },
  { id: 'msg12', threadId: 't5', side: 'partner', type: 'quote', refId: 'q3', body: 'Quote Q-1038 v2', at: '2026-11-07T17:40:00' },
];

export const REVIEWS = [
  { id: 'r1', listingId: 'l1', bookingId: null, customerName: 'Anitha S', rating: 5, title: 'Captured every emotion', body: 'The candid shots were beautiful and the team was so polite with our elders. Album came on time.', at: '2026-08-14', reply: 'Thank you Anitha! It was a joy to shoot your wedding.', status: 'published' },
  { id: 'r2', listingId: 'l1', bookingId: null, customerName: 'Karthik R', rating: 4, title: 'Great photos, slight delay', body: 'Loved the highlight film. Album took 2 weeks longer than promised.', at: '2026-07-30', reply: '', status: 'published' },
  { id: 'r3', listingId: 'l1', bookingId: 'b3', customerName: 'Meena Sundar', rating: 5, title: 'Lovely valaikaapu coverage', body: 'Arun and team were on time and covered every ritual.', at: '2026-10-28', reply: '', status: 'published' },
  { id: 'r4', listingId: 'l4', bookingId: null, customerName: 'Deepa M', rating: 5, title: 'Spacious and clean', body: 'Rooms were clean, staff helpful, parking was easy.', at: '2026-06-02', reply: '', status: 'published' },
  { id: 'r5', listingId: 'l2', bookingId: null, customerName: 'Senthil K', rating: 5, title: 'Authentic taste', body: 'Guests still talk about the payasam. Service was quick.', at: '2026-09-09', reply: 'Nandri Senthil sir!', status: 'published' },
  { id: 'r6', listingId: 'l2', bookingId: null, customerName: 'Unknown user', rating: 1, title: 'Worst ever', body: 'Do not book. Visit my page for better caterers.', at: '2026-11-02', reply: '', status: 'reported', reportReason: 'Spam / competitor promotion' },
  { id: 'r7', listingId: 'l5', bookingId: null, customerName: 'Harini V', rating: 5, title: 'Looked like a dream', body: 'Divya is so talented. Makeup lasted the whole day.', at: '2026-09-22', reply: '', status: 'published' },
  { id: 'r8', listingId: 'l10', bookingId: null, customerName: 'Fathima N', rating: 5, title: 'Dark stain, intricate design', body: 'Ayesha is very patient and the colour came out deep maroon.', at: '2026-08-18', reply: '', status: 'published' },
  { id: 'r9', listingId: 'l14', bookingId: null, customerName: 'Gautham P', rating: 4, title: 'Fun reels', body: 'Reels were trending in our family group!', at: '2026-09-01', reply: '', status: 'published' },
  { id: 'r10', listingId: 'l3', bookingId: null, customerName: 'Revathi K', rating: 3, title: 'Good but rushed setup', body: 'Decor was nice but setup finished just 10 minutes before muhurtham.', at: '2026-08-25', reply: '', status: 'reported', reportReason: 'Partner says review is inaccurate' },
];

export const MEMBERS = [
  { id: 'm1', partnerId: 'p1', name: 'Karthik Raja', phone: '+91 98401 00001', role: 'owner', status: 'active', title: 'Owner' },
  { id: 'm6', partnerId: 'p1', name: 'Nisha Paul', phone: '+91 98401 00006', role: 'manager', status: 'active', title: 'Studio Manager' },
  { id: 'm2', partnerId: 'p1', name: 'Divya Krishnan', phone: '+91 98401 00002', role: 'sales', status: 'active', title: 'Sales' },
  { id: 'm3', partnerId: 'p1', name: 'Suresh Babu', phone: '+91 98401 00003', role: 'accounts', status: 'active', title: 'Accounts' },
  { id: 'm4', partnerId: 'p1', name: 'Arun Kumar', phone: '+91 98401 00004', role: 'crew', status: 'active', title: 'Lead Photographer' },
  { id: 'm5', partnerId: 'p1', name: 'Bala Murugan', phone: '+91 98401 00005', role: 'crew', status: 'active', title: 'Cinematographer' },
  { id: 'm7', partnerId: 'p1', name: 'Gokul S', phone: '+91 98401 00007', role: 'crew', status: 'invited', title: 'Drone Operator' },
];

export const CREW_ASSIGNMENTS = [
  { id: 'c1', bookingId: 'b2', memberId: 'm4', role: 'Lead photographer', callTime: '05:30' },
  { id: 'c2', bookingId: 'b2', memberId: 'm5', role: 'Cinematographer', callTime: '05:30' },
  { id: 'c3', bookingId: 'b3', memberId: 'm4', role: 'Lead photographer', callTime: '09:00' },
];

export const TASKS = [
  { id: 'tk1', bookingId: 'b2', memberId: 'm4', title: 'Charge batteries and format cards', due: '2026-12-05', done: false },
  { id: 'tk2', bookingId: 'b2', memberId: 'm5', title: 'Recce at venue (Kalyana Mandapam, Porur)', due: '2026-12-02', done: false },
  { id: 'tk3', bookingId: 'b2', memberId: 'm4', title: 'Shot list from couple', due: '2026-11-28', done: true },
  { id: 'tk4', bookingId: 'b3', memberId: 'm4', title: 'Deliver edited photos', due: '2026-11-15', done: false },
];

export const EXPENSES = [
  { id: 'x1', bookingId: 'b3', category: 'Crew', amount: 8000, paidTo: 'Freelance second shooter', date: '2026-10-25' },
  { id: 'x2', bookingId: 'b3', category: 'Travel', amount: 1800, paidTo: 'Cab', date: '2026-10-25' },
  { id: 'x3', bookingId: 'b3', category: 'Material', amount: 6500, paidTo: 'Album printing', date: '2026-11-05' },
  { id: 'x4', bookingId: 'b2', category: 'Material', amount: 3200, paidTo: 'Memory cards', date: '2026-11-02' },
  { id: 'x5', bookingId: null, category: 'Rent', amount: 22000, paidTo: 'Studio rent - Nov', date: '2026-11-01' },
];

export const AVAILABILITY_BLOCKS = [
  { id: 'ab1', partnerId: 'p1', date: '2026-12-06', status: 'blocked', source: 'booking', bookingId: 'b2' },
  { id: 'ab2', partnerId: 'p1', date: '2026-12-25', status: 'blocked', source: 'manual', note: 'Studio holiday' },
  { id: 'ab3', partnerId: 'p1', date: '2026-11-22', status: 'blocked', source: 'manual', note: 'Offline booking (WhatsApp)' },
  { id: 'ab4', partnerId: 'p1', date: '2026-11-22', status: 'blocked', source: 'manual', note: 'Offline booking (WhatsApp)' },
  { id: 'ab5', partnerId: 'p1', date: '2026-11-22', status: 'blocked', source: 'manual', note: 'Offline booking (WhatsApp)' },
  { id: 'ab6', partnerId: 'p1', date: '2026-11-29', status: 'blocked', source: 'manual', note: 'Corporate shoot' },
  { id: 'ab7', partnerId: 'p4', date: '2027-01-24', status: 'blocked', source: 'booking', bookingId: 'b1' },
  { id: 'ab8', partnerId: 'p4', date: '2027-01-23', status: 'blocked', source: 'booking', bookingId: 'b1' },
  { id: 'ab9', partnerId: 'p4', date: '2026-12-13', status: 'blocked', source: 'manual' },
  { id: 'ab10', partnerId: 'p2', date: '2027-01-24', status: 'blocked', source: 'manual' },
];

export const ACTIVITY_LOG = [
  { id: 'al1', partnerId: 'p1', actor: 'Divya Krishnan', action: 'sent quote Q-1042 v1 to Priya Raman', at: '2026-11-05T11:00:00' },
  { id: 'al2', partnerId: 'p1', actor: 'Nisha Paul', action: 'sent quote Q-1038 v2 to Vikram Shah', at: '2026-11-07T17:40:00' },
  { id: 'al3', partnerId: 'p1', actor: 'Suresh Babu', action: 'recorded cash payment of ₹31,500 on LL/26-27/0052', at: '2026-10-25T18:10:00' },
  { id: 'al4', partnerId: 'p1', actor: 'Karthik Raja', action: 'invited Gokul S as Crew', at: '2026-11-09T09:30:00' },
  { id: 'al5', partnerId: 'p1', actor: 'Arun Kumar', action: 'completed task "Shot list from couple"', at: '2026-11-08T20:00:00' },
];

export const SUBSCRIPTION = {
  partnerId: 'p1',
  plan: 'Partner Basic',
  price: 199,
  status: 'active',
  periodStart: '2026-11-03',
  periodEnd: '2026-12-03',
  autoRenew: true,
  history: [
    { id: 'sp1', date: '2026-11-03', amount: 199, gst: 36, status: 'paid' },
    { id: 'sp2', date: '2026-10-04', amount: 199, gst: 36, status: 'paid' },
    { id: 'sp3', date: '2026-09-04', amount: 199, gst: 36, status: 'paid' },
  ],
};

export const PARTNER_DOCUMENTS = [
  { partnerId: 'p17', type: 'GST certificate', file: 'gst_kolam.pdf', status: 'pending' },
  { partnerId: 'p17', type: 'Owner ID (Aadhaar)', file: 'aadhaar_front.jpg', status: 'pending' },
  { partnerId: 'p17', type: 'Business proof', file: 'shop_licence.pdf', status: 'pending' },
  { partnerId: 'p18', type: 'Owner ID (Aadhaar)', file: 'id_card.jpg', status: 'pending' },
  { partnerId: 'p18', type: 'Business proof', file: 'troupe_letter.pdf', status: 'pending' },
  { partnerId: 'p19', type: 'GST certificate', file: 'gst_silverbells.pdf', status: 'pending' },
  { partnerId: 'p19', type: 'Owner ID (PAN)', file: 'pan.jpg', status: 'pending' },
  { partnerId: 'p19', type: 'Business proof', file: 'trade_licence.pdf', status: 'pending' },
];

export const DISPUTES = [
  { id: 'd1', bookingNumber: 'BK-2034', customer: 'Rahul Menon', partner: 'Mandapam Decor', reason: 'Service not as promised', description: 'Decor used artificial flowers instead of fresh flowers as per quote.', amountClaimed: 40000, status: 'evidence', openedAt: '2026-11-03', evidence: [{ side: 'customer', note: 'Photos of artificial flowers on stage', file: 'stage_photos.zip' }, { side: 'partner', note: 'Customer approved substitution on WhatsApp due to rain', file: 'whatsapp_chat.png' }] },
  { id: 'd2', bookingNumber: 'BK-2079', customer: 'Sneha Iyer', partner: 'Beatbox DJs', reason: 'No-show', description: 'DJ arrived 2 hours late, event started without music.', amountClaimed: 15000, status: 'open', openedAt: '2026-11-09', evidence: [{ side: 'customer', note: 'Event timeline and guest messages', file: 'timeline.pdf' }] },
  { id: 'd3', bookingNumber: 'BK-1988', customer: 'Meena Sundar', partner: 'Annapoorna Caterers', reason: 'Food quality', description: 'Biryani was undercooked for the second batch.', amountClaimed: 10000, status: 'decided', decision: 'Partial refund ₹5,000', openedAt: '2026-10-12', evidence: [] },
];

export const REFUNDS = [
  { id: 'rf1', bookingNumber: 'BK-2041', customer: 'Vikram Shah', partner: 'Ocean Pearl Convention', amount: 48000, reason: 'Cancelled 21 days before (50% policy)', status: 'requested', requestedAt: '2026-11-08' },
  { id: 'rf2', bookingNumber: 'BK-2003', customer: 'Lakshmi Narayanan', partner: 'Inkpress Invites', amount: 2250, reason: 'Partner cancelled', status: 'processed', requestedAt: '2026-10-20' },
];

export const PAYOUTS = [
  { id: 'po1', partner: 'Henna by Ayesha', period: '1-7 Oct 2026', gross: 6000, commission: 0, tds: 60, status: 'paid', paidAt: '2026-10-09' },
  { id: 'po2', partner: 'Lens & Light Studio', period: '22-28 Oct 2026', gross: 13500, commission: 0, tds: 135, status: 'pending' },
  { id: 'po3', partner: 'Grand Lotus Mahal', period: '22-28 Sep 2026', gross: 135000, commission: 0, tds: 1350, status: 'on_hold', note: 'Held until event completes' },
  { id: 'po4', partner: 'Mandapam Decor', period: '27 Oct - 2 Nov 2026', gross: 90000, commission: 0, tds: 900, status: 'on_hold', note: 'Open dispute d1' },
];

export const ARTICLES = [
  { id: 'ar1', title: '12 South Indian wedding rituals and what each one means', category: 'Wedding', read: 8, excerpt: 'From Nichayathartham to Kanyadanam, a guide for first-time hosts.', status: 'published' },
  { id: 'ar2', title: 'How to plan a wedding budget in Chennai (2026 prices)', category: 'Planning', read: 6, excerpt: 'Typical splits between venue, catering, decor and photography.', status: 'published' },
  { id: 'ar3', title: '25 return gift ideas under ₹150', category: 'Return Gifts', read: 4, excerpt: 'Eco-friendly, useful and memorable picks for every function.', status: 'published' },
  { id: 'ar4', title: 'Mehendi designs that photograph beautifully', category: 'Mehendi', read: 5, excerpt: 'Tips from bridal artists on stain, placement and timing.', status: 'published' },
  { id: 'ar5', title: 'First birthday party checklist', category: 'Birthday', read: 5, excerpt: 'Everything from cake smash to return gifts in one list.', status: 'published' },
  { id: 'ar6', title: 'Griha pravesam: muhurtham, rituals and what to arrange', category: 'Pooja', read: 7, excerpt: 'A simple guide to planning a housewarming pooja.', status: 'draft' },
];

export const BANNERS = [
  { id: 'bn1', title: 'Wedding season: verified partners near you', placement: 'Home hero', status: 'live', ends: '2027-02-28' },
  { id: 'bn2', title: 'Pongal pooja specials', placement: 'Home strip', status: 'scheduled', ends: '2027-01-16' },
];

export const ANALYTICS = {
  kpis: { customers: 18420, partners: 1264, bookings30d: 642, gmv30d: 38400000, mrr: 251536, churn: 3.8 },
  bookingsByMonth: [
    { m: 'Jun', v: 212 }, { m: 'Jul', v: 268 }, { m: 'Aug', v: 344 }, { m: 'Sep', v: 401 }, { m: 'Oct', v: 528 }, { m: 'Nov', v: 642 },
  ],
  byCategory: [
    { k: 'Photography', v: 168 }, { k: 'Catering', v: 141 }, { k: 'Decoration', v: 96 }, { k: 'Venues', v: 74 }, { k: 'Makeup', v: 63 }, { k: 'Pandit', v: 41 }, { k: 'Others', v: 59 },
  ],
  byCity: [
    { k: 'Chennai', v: 412 }, { k: 'Coimbatore', v: 118 }, { k: 'Madurai', v: 64 }, { k: 'Trichy', v: 48 },
  ],
};

export const SETTINGS = {
  cities: [
    { name: 'Chennai', active: true },
    { name: 'Coimbatore', active: true },
    { name: 'Madurai', active: true },
    { name: 'Trichy', active: true },
    { name: 'Bengaluru', active: false },
  ],
  plans: [
    { code: 'partner_basic', name: 'Partner Basic', price: 199, days: 30, seats: 5, active: true },
    { code: 'partner_pro', name: 'Partner Pro', price: 799, days: 30, seats: 15, active: false },
  ],
  policy: [
    { window: 'More than 30 days before', refund: 100 },
    { window: '7 to 30 days before', refund: 50 },
    { window: 'Less than 7 days before', refund: 0 },
  ],
  commissionPct: 0,
  gstPct: 18,
  tdsPct: 1,
  payoutHoldDays: 3,
  templates: [
    { key: 'lead.new', channel: 'Push + WhatsApp', text: 'New enquiry from {{customer}} for {{date}}.' },
    { key: 'quote.sent', channel: 'Push + SMS', text: '{{partner}} sent you a quote of {{amount}}.' },
    { key: 'payment.due', channel: 'WhatsApp', text: 'Reminder: {{amount}} due on {{due}} for {{booking}}.' },
    { key: 'review.request', channel: 'Push', text: 'How was {{partner}}? Rate your experience.' },
  ],
};

export const HOW_IT_WORKS = [
  { title: 'Discover partners near you', body: 'Share your location and see trusted event partners around you in seconds.' },
  { title: 'Pick what you need', body: 'Start with a category - venue, catering, decoration, photography and more - or just search.' },
  { title: 'Compare trusted partners', body: 'See featured and nearby partners, their photos, services and ratings side by side.' },
  { title: 'Preview every detail', body: 'Open a service to see its price, features, guest capacity and real photos before you decide.' },
  { title: 'Check availability', body: 'Pick your event date and see which days are available, limited or already taken.' },
  { title: 'Book and celebrate', body: 'Send your booking request in a tap. The partner confirms it and you track everything from the Booking tab.' },
];
