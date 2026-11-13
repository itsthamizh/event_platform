// Category packs: each event-service category is its own "product" inside the bundle.
// A pack defines what is specific to that category:
//   enquiry   - extra questions the customer answers when sending a booking request
//   filters   - extra filters on the Explore page when this category is selected
//   profile   - extra sections on the vendor profile
//   compare   - extra rows on the compare page
//   quote     - how a quote is pre-filled from the enquiry (category pricing logic)
//   initBooking - category details created when a quote is accepted
//   module    - the category's own CRM module for the partner
//   CustomerPanel / PartnerPanel / ModulePage - category UI
// Categories without a pack yet fall back to GENERIC.
import { inr } from '../config';
import { CONFIG_INIT, INIT_BOOKING, QUOTE } from './logic';
import { makeCustomerPanel, makeModule, makePartnerPanel } from './ConfigPack';
import { VenueCustomerPanel, VenueModule, VenuePartnerPanel } from './VenuePack';
import { CateringCustomerPanel, CateringModule, CateringPartnerPanel } from './CateringPack';
import { PhotoCustomerPanel, PhotoModule, PhotoPartnerPanel } from './PhotographyPack';

const yes = (v) => (v ? 'Yes' : 'No');

const VENUE = {
  id: 'venue',
  label: 'Venue',
  pricingNote: 'package for the session + extra guest rooms',
  module: { to: '/partner/venue', label: 'Halls & Sessions', icon: 'building' },
  enquiry: [
    { key: 'session', label: 'Session', type: 'select', options: ['Morning (6am - 2pm)', 'Evening (4pm - 11pm)', 'Full day', '2 days'], def: 'Full day' },
    { key: 'hallId', label: 'Preferred hall', type: 'hall', def: '' },
    { key: 'rooms', label: 'Guest rooms needed', type: 'number', def: 10 },
    { key: 'dining', label: 'Dining at a time', type: 'number', def: 200 },
    { key: 'ownCaterer', label: 'Bringing your own caterer', type: 'toggle', def: false },
  ],
  filters: [
    { key: 'seating', label: 'Seating capacity', type: 'select', options: [['250', '250+ guests'], ['500', '500+ guests'], ['800', '800+ guests'], ['1000', '1000+ guests']], test: (l, v) => (l.attributes.seating || 0) >= Number(v) },
    { key: 'ac', label: 'Air-conditioned hall', type: 'toggle', test: (l) => !!l.attributes.ac },
    { key: 'rooms', label: 'Guest rooms available', type: 'toggle', test: (l) => (l.attributes.rooms || 0) > 0 },
    { key: 'outside', label: 'Outside caterers allowed', type: 'toggle', test: (l) => !!l.attributes.outsideCatering },
    { key: 'nonveg', label: 'Non-veg allowed', type: 'toggle', test: (l) => !l.attributes.vegOnly },
  ],
  profile: (l) => [
    {
      title: 'Halls',
      table: { cols: ['Hall', 'Seating', 'Dining', 'Floor', 'AC'], rows: (l.attributes.halls || []).map((h) => [h.name, h.seating, h.dining, h.floor, yes(h.ac)]) },
    },
    {
      title: 'Venue facts',
      fields: [
        ['Total seating', l.attributes.seating + ' guests'],
        ['Guest rooms', l.attributes.rooms],
        ['Parking', l.attributes.parking + ' cars'],
        ['Food', l.attributes.vegOnly ? 'Veg only' : 'Veg and non-veg'],
        ['Outside caterers', yes(l.attributes.outsideCatering)],
        ['Sessions', (l.attributes.sessions || []).join(', ')],
      ],
    },
    { title: 'House rules', list: l.attributes.rules || [] },
  ],
  compare: [
    ['Seating', (l) => (l.attributes.seating || '-') + ' guests'],
    ['Halls', (l) => (l.attributes.halls || []).map((h) => `${h.name} (${h.seating})`).join(', ')],
    ['Guest rooms', (l) => l.attributes.rooms],
    ['Parking', (l) => l.attributes.parking + ' cars'],
    ['Outside caterers', (l) => yes(l.attributes.outsideCatering)],
    ['Food', (l) => (l.attributes.vegOnly ? 'Veg only' : 'Veg and non-veg')],
  ],
  // Price = package for the session + extra rooms beyond those included.
  quote: QUOTE.venue,
  quoteNote: 'A refundable damage deposit of \u20B925,000 is collected at check-in.',
  initBooking: INIT_BOOKING.venue,
  CustomerPanel: VenueCustomerPanel,
  PartnerPanel: VenuePartnerPanel,
  ModulePage: VenueModule,
};

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Hi-tea', 'Dinner'];

const CATERING = {
  id: 'catering',
  label: 'Catering',
  pricingNote: 'menu rate per plate x guests for each meal, plus live counters',
  module: { to: '/partner/menus', label: 'Menus & Headcount', icon: 'utensils' },
  enquiry: [
    { key: 'meals', label: 'Meals', type: 'multi', options: MEAL_OPTIONS, def: ['Lunch'] },
    { key: 'foodType', label: 'Food', type: 'select', options: ['Veg', 'Non-veg', 'Both'], def: 'Veg' },
    { key: 'servingStyle', label: 'Serving style', type: 'select', options: ['Banana leaf', 'Buffet', 'Table service'], def: 'Banana leaf' },
    { key: 'cuisine', label: 'Cuisine', type: 'select', options: ['South Indian', 'Chettinad', 'North Indian', 'Mixed'], def: 'South Indian' },
    { key: 'liveCounters', label: 'Live counters', type: 'toggle', def: false },
  ],
  filters: [
    { key: 'food', label: 'Food type', type: 'select', options: [['veg', 'Pure veg'], ['nonveg', 'Non-veg available']], test: (l, v) => (v === 'veg' ? !!l.attributes.vegOnly : !l.attributes.vegOnly) },
    { key: 'cuisine', label: 'Cuisine', type: 'select', options: [['South Indian', 'South Indian'], ['Chettinad', 'Chettinad'], ['North Indian', 'North Indian']], test: (l, v) => (l.attributes.cuisines || []).includes(v) },
    { key: 'style', label: 'Serving style', type: 'select', options: [['Banana leaf', 'Banana leaf'], ['Buffet', 'Buffet']], test: (l, v) => (l.attributes.servingStyles || []).includes(v) },
    { key: 'guests', label: 'Can serve my guests', type: 'number', placeholder: 'No. of guests', test: (l, v) => !v || (Number(v) >= (l.attributes.minPlates || 0) && Number(v) <= (l.attributes.maxPlates || 99999)) },
    { key: 'tasting', label: 'Food tasting available', type: 'toggle', test: (l) => !!l.attributes.tasting },
  ],
  profile: (l, state) => [
    {
      title: 'Menus',
      menus: state.menus.filter((m) => m.listingId === l.id),
    },
    {
      title: 'Catering facts',
      fields: [
        ['Food', l.attributes.vegOnly ? 'Pure veg' : 'Veg and non-veg'],
        ['Cuisines', (l.attributes.cuisines || []).join(', ')],
        ['Serving styles', (l.attributes.servingStyles || []).join(', ')],
        ['Guests served', `${l.attributes.minPlates} to ${l.attributes.maxPlates}`],
        ['Live counters', yes(l.attributes.liveCounters)],
        ['Food tasting', yes(l.attributes.tasting)],
      ],
    },
  ],
  compare: [
    ['Food', (l) => (l.attributes.vegOnly ? 'Pure veg' : 'Veg and non-veg')],
    ['Cuisines', (l) => (l.attributes.cuisines || []).join(', ')],
    ['Serving', (l) => (l.attributes.servingStyles || []).join(', ')],
    ['Guests', (l) => `${l.attributes.minPlates} - ${l.attributes.maxPlates}`],
    ['Tasting', (l) => yes(l.attributes.tasting)],
  ],
  // Price = per-plate rate of the menu for each meal x guests, plus live counters.
  quote: QUOTE.catering,
  quoteNote: 'Final headcount locks 3 days before the event. Extra plates are billed at the same rate.',
  initBooking: INIT_BOOKING.catering,
  CustomerPanel: CateringCustomerPanel,
  PartnerPanel: CateringPartnerPanel,
  ModulePage: CateringModule,
};

const FUNCTION_OPTIONS = ['Pre-wedding', 'Engagement', 'Mehendi', 'Nalangu / Haldi', 'Muhurtham', 'Reception', 'Birthday party', 'Valaikaapu'];

const PHOTOGRAPHY = {
  id: 'photography',
  label: 'Photography',
  pricingNote: 'package per function by coverage, plus drone and album',
  module: { to: '/partner/deliverables', label: 'Shoots & Deliverables', icon: 'camera' },
  enquiry: [
    { key: 'functions', label: 'Functions to cover', type: 'multi', options: FUNCTION_OPTIONS, def: ['Muhurtham'] },
    { key: 'coverage', label: 'Coverage', type: 'select', options: ['Photo only', 'Photo + Video'], def: 'Photo + Video' },
    { key: 'hoursPerFunction', label: 'Hours per function', type: 'number', def: 5 },
    { key: 'drone', label: 'Drone shots', type: 'toggle', def: false },
    { key: 'album', label: 'Printed album', type: 'toggle', def: true },
  ],
  filters: [
    { key: 'style', label: 'Style', type: 'select', options: [['Candid', 'Candid'], ['Traditional', 'Traditional'], ['Cinematic', 'Cinematic'], ['Documentary', 'Documentary']], test: (l, v) => (l.attributes.styles || []).includes(v) },
    { key: 'video', label: 'Video / cinematography', type: 'toggle', test: (l) => !!l.attributes.video },
    { key: 'drone', label: 'Drone coverage', type: 'toggle', test: (l) => !!l.attributes.drone },
    { key: 'delivery', label: 'Delivery within', type: 'select', options: [['30', '30 days'], ['45', '45 days'], ['60', '60 days']], test: (l, v) => (l.attributes.deliveryDays || 99) <= Number(v) },
  ],
  profile: (l) => [
    {
      title: 'Photography details',
      fields: [
        ['Styles', (l.attributes.styles || []).join(', ')],
        ['Team size', l.attributes.crewSize + ' people'],
        ['Video', yes(l.attributes.video)],
        ['Drone', yes(l.attributes.drone)],
        ['Same-day teaser', yes(l.attributes.sameDayEdit)],
        ['Delivery', 'Within ' + l.attributes.deliveryDays + ' days'],
      ],
    },
  ],
  compare: [
    ['Styles', (l) => (l.attributes.styles || []).join(', ')],
    ['Team size', (l) => l.attributes.crewSize],
    ['Video / drone', (l) => `${yes(l.attributes.video)} / ${yes(l.attributes.drone)}`],
    ['Delivery', (l) => l.attributes.deliveryDays + ' days'],
  ],
  // Price = package per function (Gold for photo + video, Silver for photo only) + add-ons.
  quote: QUOTE.photography,
  quoteNote: 'Edited photos within 45 days. Album design is shared for your approval before printing.',
  initBooking: INIT_BOOKING.photography,
  CustomerPanel: PhotoCustomerPanel,
  PartnerPanel: PhotoPartnerPanel,
  ModulePage: PhotoModule,
};

const GENERIC = {
  id: 'generic',
  label: 'Service',
  generic: true,
  module: null,
  enquiry: [{ key: 'hours', label: 'Hours needed', type: 'number', def: 4 }],
  filters: [],
  profile: () => [],
  compare: [],
  quote: (lead, listing) => [{ description: `${listing.packages[0].name} package`, qty: 1, unitPrice: listing.packages[0].price }],
  initBooking: () => ({}),
};


// ---------------------------------------------------------------------------
// The other 8 categories use the config-driven engine (ConfigPack.js).
// ---------------------------------------------------------------------------
const price = (l, key, fallback) => ((l.attributes && l.attributes.prices) || {})[key] || fallback;
const sel = (key, label, opts) => ({ key, label, type: 'select', options: opts.map((o) => [o, o]), test: (l, v) => (l.attributes[key] || []).includes(v) });
const tog = (key, label, fn) => ({ key, label, type: 'toggle', test: fn });

function configPack(cfg) {
  return {
    ...cfg,
    cfg,
    initBooking: CONFIG_INIT[cfg.id],
    CustomerPanel: makeCustomerPanel(cfg),
    PartnerPanel: makePartnerPanel(cfg),
    ModulePage: makeModule(cfg),
  };
}

const RETURN_GIFTS = configPack({
  id: 'return_gifts',
  label: 'Return Gifts',
  pricingNote: 'price per piece x quantity, plus name printing per piece and delivery',
  module: { to: '/partner/gift-orders', label: 'Orders & Stock', icon: 'gift' },
  moduleSubtitle: 'Every gift order with quantity and delivery date, and your product catalog with stock.',
  boardTitle: 'Upcoming orders',
  boardColumns: [{ key: 'item', label: 'Item' }, { key: 'quantity', label: 'Qty' }, { key: 'deliveryDate', label: 'Deliver By' }],
  scheduleTitle: 'Deliveries',
  catalog: { title: 'Product catalog', nameLabel: 'Product', priceLabel: 'Price / piece', extraLabel: 'In stock' },
  customerTitle: 'Your return gift order',
  customerSubtitle: 'Approve the sample, then we produce, pack and deliver.',
  partnerTitle: 'Order Details',
  fields: [
    { key: 'item', label: 'Item' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'namePrinting', label: 'Name printing' },
    { key: 'deliveryDate', label: 'Deliver by', type: 'date' },
    { key: 'deliveryAddress', label: 'Delivery address', wide: true },
  ],
  enquiry: [
    { key: 'itemType', label: 'Gift type', type: 'select', options: ['Thamboolam bag', 'Brass items', 'German silver', 'Eco-friendly', 'Sweets box'], def: 'Thamboolam bag' },
    { key: 'quantity', label: 'Quantity (pieces)', type: 'number', def: 200 },
    { key: 'budgetPerPiece', label: 'Budget per piece', type: 'number', def: 150 },
    { key: 'namePrinting', label: 'Print names on gifts', type: 'toggle', def: true },
  ],
  filters: [
    sel('itemTypes', 'Gift type', ['Thamboolam bag', 'Brass items', 'German silver', 'Eco-friendly']),
    { key: 'budget', label: 'Budget per piece up to', type: 'number', placeholder: 'e.g. 150', test: (l, v) => (l.attributes.minPrice || 0) <= Number(v) },
    tog('namePrinting', 'Name printing', (l) => !!l.attributes.namePrinting),
    { key: 'qty', label: 'My quantity', type: 'number', placeholder: 'Pieces', test: (l, v) => (l.attributes.minOrder || 0) <= Number(v) },
  ],
  profile: (l) => [
    { title: 'Gift catalog', table: { cols: ['Product', 'Price / piece', 'In stock'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Order facts', fields: [['Gift types', (l.attributes.itemTypes || []).join(', ')], ['Minimum order', l.attributes.minOrder + ' pieces'], ['Name printing', yes(l.attributes.namePrinting)], ['Delivery', 'Within ' + l.attributes.deliveryDays + ' days']] },
  ],
  compare: [
    ['Gift types', (l) => (l.attributes.itemTypes || []).join(', ')],
    ['From', (l) => inr(l.attributes.minPrice) + ' / piece'],
    ['Minimum order', (l) => l.attributes.minOrder],
    ['Name printing', (l) => yes(l.attributes.namePrinting)],
  ],
  quote: QUOTE.return_gifts,
  quoteNote: 'A sample piece is shared for approval before bulk production.',
});

const DECORATION = configPack({
  id: 'decoration',
  label: 'Decoration',
  pricingNote: 'price per decor area, plus a fresh-flower premium',
  module: { to: '/partner/setups', label: 'Designs & Setups', icon: 'sparkles' },
  moduleSubtitle: 'Upcoming setups with themes and timings, and your price list per decor area.',
  boardTitle: 'Upcoming setups',
  boardColumns: [{ key: 'theme', label: 'Theme' }, { key: 'flowers', label: 'Flowers' }, { key: 'setupStart', label: 'Setup Starts' }],
  scheduleTitle: 'Setup and teardown schedule',
  catalog: { title: 'Price list by area', nameLabel: 'Decor area', priceLabel: 'Price', extraLabel: 'Includes' },
  customerTitle: 'Your decoration plan',
  customerSubtitle: 'Approve the mood board and layout; see when setup starts.',
  partnerTitle: 'Design Details',
  fields: [
    { key: 'theme', label: 'Theme' },
    { key: 'flowers', label: 'Flowers' },
    { key: 'venue', label: 'Venue', wide: true },
    { key: 'setupStart', label: 'Setup starts' },
    { key: 'teardown', label: 'Teardown' },
  ],
  enquiry: [
    { key: 'areas', label: 'What to decorate', type: 'multi', options: ['Stage', 'Mandapam', 'Entrance', 'Ceiling drapes', 'Photo booth', 'Car decoration'], def: ['Stage', 'Entrance'] },
    { key: 'theme', label: 'Theme', type: 'select', options: ['Traditional temple', 'Pastel floral', 'Royal', 'Minimal modern'], def: 'Traditional temple' },
    { key: 'flowers', label: 'Flowers', type: 'select', options: ['Fresh', 'Artificial', 'Mixed'], def: 'Fresh' },
    { key: 'venueName', label: 'Venue name', type: 'text', def: '' },
  ],
  filters: [
    sel('themes', 'Theme', ['Traditional temple', 'Pastel floral', 'Royal', 'Minimal modern']),
    tog('fresh', 'Fresh flowers', (l) => !!l.attributes.freshFlowers),
    tog('lighting', 'Lighting included', (l) => !!l.attributes.lighting),
  ],
  profile: (l) => [
    { title: 'Price list by area', table: { cols: ['Area', 'Price', 'Includes'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Decor facts', fields: [['Themes', (l.attributes.themes || []).join(', ')], ['Fresh flowers', yes(l.attributes.freshFlowers)], ['Lighting', yes(l.attributes.lighting)], ['Setup time', l.attributes.setupHours + ' hours']] },
  ],
  compare: [
    ['Themes', (l) => (l.attributes.themes || []).join(', ')],
    ['Fresh flowers', (l) => yes(l.attributes.freshFlowers)],
    ['Lighting', (l) => yes(l.attributes.lighting)],
    ['Setup time', (l) => l.attributes.setupHours + ' h'],
  ],
  quote: QUOTE.decoration,
  quoteNote: 'Mood board and final layout are shared for your approval. Setup starts the evening before.',
});

const PANDIT = configPack({
  id: 'pandit',
  label: 'Pandit',
  pricingNote: 'dakshina for the ritual, plus samagri kit and extra vadhyars',
  module: { to: '/partner/rituals', label: 'Rituals & Muhurtham', icon: 'flame' },
  moduleSubtitle: 'Upcoming rituals with muhurtham times and vadhyars, and your ritual price list.',
  boardTitle: 'Upcoming rituals',
  boardColumns: [{ key: 'ritual', label: 'Ritual' }, { key: 'muhurtham', label: 'Muhurtham' }, { key: 'vadhyars', label: 'Vadhyars' }, { key: 'samagriBy', label: 'Samagri By' }],
  scheduleTitle: 'Ritual sequence - next steps',
  catalog: { title: 'Rituals offered', nameLabel: 'Ritual', priceLabel: 'Dakshina', extraLabel: 'Duration' },
  customerTitle: 'Your pooja plan',
  customerSubtitle: 'Muhurtham, ritual order and the things your family needs to arrange.',
  partnerTitle: 'Ritual Details',
  fields: [
    { key: 'ritual', label: 'Ritual' },
    { key: 'language', label: 'Language' },
    { key: 'muhurtham', label: 'Muhurtham' },
    { key: 'reporting', label: 'Pandit arrives' },
    { key: 'vadhyars', label: 'Vadhyars', type: 'number' },
    { key: 'samagriBy', label: 'Samagri by' },
  ],
  enquiry: [
    { key: 'ritual', label: 'Ritual', type: 'select', options: ['Wedding', 'Griha Pravesam', 'Ganapathi Homam', 'Seemantham', 'Satyanarayana Pooja', 'Upanayanam'], def: 'Wedding' },
    { key: 'language', label: 'Language', type: 'select', options: ['Tamil', 'Sanskrit', 'Telugu'], def: 'Tamil' },
    { key: 'muhurtham', label: 'Muhurtham time (if fixed)', type: 'text', def: '' },
    { key: 'vadhyars', label: 'Number of vadhyars', type: 'number', def: 2 },
    { key: 'samagriByPandit', label: 'Pandit to arrange samagri', type: 'toggle', def: false },
  ],
  filters: [
    sel('rituals', 'Ritual', ['Wedding', 'Griha Pravesam', 'Ganapathi Homam', 'Seemantham', 'Satyanarayana Pooja', 'Upanayanam']),
    sel('languages', 'Language', ['Tamil', 'Sanskrit', 'Telugu']),
    tog('samagri', 'Samagri can be arranged', (l) => !!l.attributes.samagri),
  ],
  profile: (l) => [
    { title: 'Rituals and dakshina', table: { cols: ['Ritual', 'Dakshina', 'Duration'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Pandit facts', fields: [['Languages', (l.attributes.languages || []).join(', ')], ['Samagri arranged', yes(l.attributes.samagri)], ['Vadhyars available', l.attributes.vadhyars], ['Muhurtham guidance', 'Yes']] },
  ],
  compare: [
    ['Rituals', (l) => (l.attributes.rituals || []).join(', ')],
    ['Languages', (l) => (l.attributes.languages || []).join(', ')],
    ['Samagri', (l) => yes(l.attributes.samagri)],
  ],
  quote: QUOTE.pandit,
  quoteNote: 'Samagri list is shared on your booking page so the family can tick off what they have arranged.',
});

const MELAM = configPack({
  id: 'melam',
  label: 'Melam',
  pricingNote: 'base troupe for 3 hours, plus extra artists, extra hours and travel',
  module: { to: '/partner/troupe', label: 'Troupe & Performances', icon: 'drum' },
  moduleSubtitle: 'Upcoming performances, and your artists roster.',
  boardTitle: 'Upcoming performances',
  boardColumns: [{ key: 'ensemble', label: 'Ensemble' }, { key: 'artists', label: 'Artists' }, { key: 'hours', label: 'Hours' }],
  scheduleTitle: 'Performance timings',
  catalog: { title: 'Artists roster', nameLabel: 'Artist', priceLabel: 'Rate / event', extraLabel: 'Instrument' },
  customerTitle: 'Your melam booking',
  customerSubtitle: 'Who plays, when they arrive and what they play for.',
  partnerTitle: 'Performance Details',
  fields: [
    { key: 'ensemble', label: 'Ensemble' },
    { key: 'artists', label: 'Artists', type: 'number' },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'reporting', label: 'Troupe arrives' },
    { key: 'travel', label: 'Travel' },
  ],
  enquiry: [
    { key: 'ensemble', label: 'Ensemble', type: 'select', options: ['Nadaswaram + Thavil', 'Nadaswaram + Thavil + Ottu', 'Chenda melam'], def: 'Nadaswaram + Thavil' },
    { key: 'artists', label: 'Number of artists', type: 'number', def: 4 },
    { key: 'hours', label: 'Hours', type: 'number', def: 3 },
    { key: 'occasions', label: 'Play for', type: 'multi', options: ['Janavasam / Baraat', 'Muhurtham', 'Reception entry', 'Temple procession'], def: ['Muhurtham'] },
  ],
  filters: [
    sel('ensembles', 'Ensemble', ['Nadaswaram + Thavil', 'Nadaswaram + Thavil + Ottu', 'Chenda melam']),
    { key: 'size', label: 'Troupe size needed', type: 'number', placeholder: 'Artists', test: (l, v) => (l.attributes.maxArtists || 0) >= Number(v) },
    tog('travels', 'Travels outside Chennai', (l) => !!l.attributes.travels),
  ],
  profile: (l) => [
    { title: 'Troupe', table: { cols: ['Artist', 'Instrument'], rows: (l.attributes.catalog || []).map((c) => [c.name, c.extra || '-']) } },
    { title: 'Melam facts', fields: [['Ensembles', (l.attributes.ensembles || []).join(', ')], ['Up to', l.attributes.maxArtists + ' artists'], ['Travels outside city', yes(l.attributes.travels)]] },
  ],
  compare: [
    ['Ensembles', (l) => (l.attributes.ensembles || []).join(', ')],
    ['Max artists', (l) => l.attributes.maxArtists],
    ['Travels', (l) => yes(l.attributes.travels)],
  ],
  quote: QUOTE.melam,
  quoteNote: 'The troupe reports one hour before the first performance.',
});

const MAKEUP = configPack({
  id: 'makeup',
  label: 'Makeup',
  pricingNote: 'bridal look per function, plus family makeup per person and trial',
  module: { to: '/partner/looks', label: 'Looks & Trials', icon: 'brush' },
  moduleSubtitle: 'Getting-ready slots for every booking, trials, and your services price list.',
  boardTitle: 'Upcoming brides',
  boardColumns: [{ key: 'style', label: 'Style' }, { key: 'trialDate', label: 'Trial' }, { key: 'hair', label: 'Hair' }],
  scheduleTitle: 'Getting-ready slots',
  catalog: { title: 'Services', nameLabel: 'Service', priceLabel: 'Price', extraLabel: 'Includes' },
  customerTitle: 'Your makeup plan',
  customerSubtitle: 'Your trial, the look approval and everyone’s getting-ready time.',
  partnerTitle: 'Look Details',
  fields: [
    { key: 'style', label: 'Style' },
    { key: 'trialDate', label: 'Trial date' },
    { key: 'hair', label: 'Hair styling' },
    { key: 'draping', label: 'Saree draping' },
    { key: 'skinNotes', label: 'Skin notes and allergies', wide: true, partnerOnly: false },
  ],
  enquiry: [
    { key: 'looks', label: 'Looks needed', type: 'multi', options: ['Engagement', 'Mehendi', 'Muhurtham', 'Reception'], def: ['Muhurtham'] },
    { key: 'style', label: 'Makeup style', type: 'select', options: ['HD', 'Airbrush', 'Natural'], def: 'HD' },
    { key: 'familyCount', label: 'Family members (makeup)', type: 'number', def: 2 },
    { key: 'trial', label: 'Trial session', type: 'toggle', def: true },
    { key: 'hairStyling', label: 'Hair styling', type: 'toggle', def: true },
    { key: 'drape', label: 'Saree draping', type: 'toggle', def: true },
  ],
  filters: [
    sel('styles', 'Style', ['HD', 'Airbrush', 'Natural']),
    tog('trial', 'Trial available', (l) => !!l.attributes.trial),
    tog('travels', 'Comes to the venue', (l) => !!l.attributes.travels),
    tog('drape', 'Saree draping', (l) => !!l.attributes.drape),
  ],
  profile: (l) => [
    { title: 'Services and prices', table: { cols: ['Service', 'Price', 'Includes'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Makeup facts', fields: [['Styles', (l.attributes.styles || []).join(', ')], ['Trial', yes(l.attributes.trial)], ['Comes to venue', yes(l.attributes.travels)], ['Saree draping', yes(l.attributes.drape)]] },
  ],
  compare: [
    ['Styles', (l) => (l.attributes.styles || []).join(', ')],
    ['Trial', (l) => yes(l.attributes.trial)],
    ['Draping', (l) => yes(l.attributes.drape)],
  ],
  quote: QUOTE.makeup,
  quoteNote: 'Trial is done about 3 weeks before the event. Touch-ups included through the function.',
});

const INVITATION = configPack({
  id: 'invitation',
  label: 'Invitations',
  pricingNote: 'price per card x quantity, plus design fee and video e-invite',
  module: { to: '/partner/print-orders', label: 'Proofs & Print Orders', icon: 'mail' },
  moduleSubtitle: 'Every order with its proof status and delivery date, and your card catalog.',
  boardTitle: 'Open orders',
  boardColumns: [{ key: 'format', label: 'Format' }, { key: 'quantity', label: 'Qty' }, { key: 'deliverBy', label: 'Deliver By' }],
  scheduleTitle: 'Upcoming deadlines',
  catalog: { title: 'Card catalog', nameLabel: 'Card design', priceLabel: 'Price / card', extraLabel: 'Size and paper' },
  customerTitle: 'Your invitation order',
  customerSubtitle: 'Approve each proof before it goes to print.',
  partnerTitle: 'Order Details',
  fields: [
    { key: 'format', label: 'Format' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'language', label: 'Language' },
    { key: 'style', label: 'Style' },
    { key: 'deliverBy', label: 'Deliver by', type: 'date' },
  ],
  enquiry: [
    { key: 'format', label: 'Format', type: 'select', options: ['Printed', 'Digital', 'Both'], def: 'Printed' },
    { key: 'quantity', label: 'Number of cards', type: 'number', def: 300 },
    { key: 'language', label: 'Language', type: 'select', options: ['Tamil', 'English', 'Bilingual'], def: 'Bilingual' },
    { key: 'style', label: 'Style', type: 'select', options: ['Traditional', 'Modern', 'Laser cut', 'Scroll'], def: 'Traditional' },
    { key: 'videoInvite', label: 'Video e-invite', type: 'toggle', def: false },
  ],
  filters: [
    sel('formats', 'Format', ['Printed', 'Digital', 'Both']),
    tog('bilingual', 'Tamil-English designs', (l) => !!l.attributes.bilingual),
    tog('video', 'Video e-invites', (l) => !!l.attributes.video),
    { key: 'qty', label: 'My quantity', type: 'number', placeholder: 'Cards', test: (l, v) => (l.attributes.minOrder || 0) <= Number(v) },
  ],
  profile: (l) => [
    { title: 'Card catalog', table: { cols: ['Design', 'Price / card', 'Size and paper'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Invitation facts', fields: [['Formats', (l.attributes.formats || []).join(', ')], ['Bilingual', yes(l.attributes.bilingual)], ['Video e-invite', yes(l.attributes.video)], ['Minimum order', l.attributes.minOrder + ' cards'], ['Turnaround', l.attributes.turnaroundDays + ' days']] },
  ],
  compare: [
    ['Formats', (l) => (l.attributes.formats || []).join(', ')],
    ['Minimum order', (l) => l.attributes.minOrder],
    ['Turnaround', (l) => l.attributes.turnaroundDays + ' days'],
  ],
  quote: QUOTE.invitation,
  quoteNote: 'Printing starts only after you approve the final proof. Two rounds of changes included.',
});

const MEHENDI = configPack({
  id: 'mehendi',
  label: 'Mehendi',
  pricingNote: 'bridal design by coverage, plus guests per person',
  module: { to: '/partner/mehendi-sessions', label: 'Designs & Sessions', icon: 'leaf' },
  moduleSubtitle: 'Upcoming sessions with artist counts, and your design catalog.',
  boardTitle: 'Upcoming brides',
  boardColumns: [{ key: 'coverage', label: 'Coverage' }, { key: 'guests', label: 'Guests' }, { key: 'artists', label: 'Artists' }],
  scheduleTitle: 'Sessions',
  catalog: { title: 'Design catalog', nameLabel: 'Design', priceLabel: 'Price', extraLabel: 'Style' },
  customerTitle: 'Your mehendi plan',
  customerSubtitle: 'Pick your design, see your session time and care tips.',
  partnerTitle: 'Mehendi Details',
  fields: [
    { key: 'coverage', label: 'Bride coverage' },
    { key: 'style', label: 'Style' },
    { key: 'guests', label: 'Guests', type: 'number' },
    { key: 'artists', label: 'Artists', type: 'number' },
    { key: 'henna', label: 'Henna' },
    { key: 'care', label: 'Care tips', wide: true },
  ],
  enquiry: [
    { key: 'brideCoverage', label: 'Bride coverage', type: 'select', options: ['Both hands to elbow', 'Hands and feet', 'Simple'], def: 'Both hands to elbow' },
    { key: 'style', label: 'Style', type: 'select', options: ['Arabic', 'Rajasthani', 'Indo-Arabic', 'Portrait'], def: 'Arabic' },
    { key: 'guests', label: 'Guests who want mehendi', type: 'number', def: 20 },
    { key: 'organic', label: 'Organic henna', type: 'toggle', def: true },
  ],
  filters: [
    sel('styles', 'Style', ['Arabic', 'Rajasthani', 'Indo-Arabic', 'Portrait']),
    tog('organic', 'Organic henna', (l) => !!l.attributes.organic),
    tog('guests', 'Guest artists available', (l) => (l.attributes.maxArtists || 1) > 1),
  ],
  profile: (l) => [
    { title: 'Designs', table: { cols: ['Design', 'Price', 'Style'], rows: (l.attributes.catalog || []).map((c) => [c.name, inr(c.price), c.extra || '-']) } },
    { title: 'Mehendi facts', fields: [['Styles', (l.attributes.styles || []).join(', ')], ['Organic henna', yes(l.attributes.organic)], ['Artists', 'Up to ' + l.attributes.maxArtists], ['Guests', inr(price(l, 'guest', 300)) + ' per person']] },
  ],
  compare: [
    ['Styles', (l) => (l.attributes.styles || []).join(', ')],
    ['Organic', (l) => yes(l.attributes.organic)],
    ['Artists', (l) => l.attributes.maxArtists],
  ],
  quote: QUOTE.mehendi,
  quoteNote: 'Bridal mehendi is usually done the evening before the wedding for the darkest stain.',
});

const MUSIC_DJ = configPack({
  id: 'music_dj',
  label: 'Music & DJ',
  pricingNote: 'DJ night for 4 hours, plus extra hours and each add-on service',
  module: { to: '/partner/gigs', label: 'Gigs & Equipment', icon: 'music' },
  moduleSubtitle: 'Upcoming gigs with run of show, and your equipment list.',
  boardTitle: 'Upcoming gigs',
  boardColumns: [{ key: 'services', label: 'Services' }, { key: 'hours', label: 'Hours' }, { key: 'setting', label: 'Setting' }],
  scheduleTitle: 'Run of show - next up',
  catalog: { title: 'Equipment and add-ons', nameLabel: 'Item', priceLabel: 'Price', extraLabel: 'Units owned' },
  customerTitle: 'Your music plan',
  customerSubtitle: 'Run of show, playlist approval and your song requests.',
  partnerTitle: 'Gig Details',
  fields: [
    { key: 'services', label: 'Services', wide: true },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'genres', label: 'Genres' },
    { key: 'setting', label: 'Setting' },
    { key: 'power', label: 'Power needed', partnerOnly: true },
    { key: 'soundCheck', label: 'Sound check' },
  ],
  enquiry: [
    { key: 'services', label: 'Services', type: 'multi', options: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC', 'LED dance floor'], def: ['DJ', 'Sound system'] },
    { key: 'hours', label: 'Hours', type: 'number', def: 4 },
    { key: 'genres', label: 'Music', type: 'multi', options: ['Tamil', 'Bollywood', 'English', 'EDM', 'Retro'], def: ['Tamil', 'Bollywood'] },
    { key: 'setting', label: 'Setting', type: 'select', options: ['Indoor', 'Outdoor'], def: 'Indoor' },
  ],
  filters: [
    tog('anchor', 'Anchor / MC available', (l) => !!l.attributes.anchor),
    tog('led', 'LED dance floor', (l) => !!l.attributes.ledFloor),
    tog('outdoor', 'Outdoor events', (l) => !!l.attributes.outdoor),
    { key: 'guests', label: 'Guests', type: 'number', placeholder: 'No. of guests', test: (l, v) => (l.attributes.maxGuests || 0) >= Number(v) },
  ],
  profile: (l) => [
    { title: 'Equipment and add-ons', table: { cols: ['Item', 'Price', 'Units'], rows: (l.attributes.catalog || []).map((c) => [c.name, c.price ? inr(c.price) : 'Included', c.extra || '-']) } },
    { title: 'DJ facts', fields: [['Genres', (l.attributes.genres || []).join(', ')], ['Anchor / MC', yes(l.attributes.anchor)], ['LED floor', yes(l.attributes.ledFloor)], ['Outdoor', yes(l.attributes.outdoor)], ['Crowd up to', l.attributes.maxGuests + ' guests']] },
  ],
  compare: [
    ['Genres', (l) => (l.attributes.genres || []).join(', ')],
    ['Anchor', (l) => yes(l.attributes.anchor)],
    ['LED floor', (l) => yes(l.attributes.ledFloor)],
    ['Crowd', (l) => l.attributes.maxGuests],
  ],
  quote: QUOTE.music_dj,
  quoteNote: 'Sound check is done 3 hours before the event. A 3-phase power point or generator is needed.',
});

export const PACKS = { photography: PHOTOGRAPHY, return_gifts: RETURN_GIFTS, venue: VENUE, catering: CATERING, decoration: DECORATION, pandit: PANDIT, melam: MELAM, makeup: MAKEUP, invitation: INVITATION, mehendi: MEHENDI, music_dj: MUSIC_DJ };
export const PACK_ORDER = ['photography', 'return_gifts', 'venue', 'catering', 'decoration', 'pandit', 'melam', 'makeup', 'invitation', 'mehendi', 'music_dj'];
export const packFor = (category) => PACKS[category] || { ...GENERIC, label: category };
export const hasPack = (category) => !!PACKS[category];

// Human-readable answers for the partner's lead page.
export const describeDetails = (category, details, listing) => {
  const pack = packFor(category);
  if (!details) return [];
  return pack.enquiry
    .filter((f) => details[f.key] !== undefined && details[f.key] !== '')
    .map((f) => {
      const v = details[f.key];
      let text = v;
      if (f.type === 'toggle') text = v ? 'Yes' : 'No';
      if (f.type === 'multi') text = (v || []).join(', ');
      if (f.type === 'hall') {
        const h = ((listing && listing.attributes && listing.attributes.halls) || []).find((x) => x.id === v);
        text = h ? h.name : 'Any';
      }
      return [f.label, String(text)];
    });
};

export const quoteTotalPreview = (rows) => inr(rows.reduce((a, r) => a + r.qty * r.unitPrice, 0));
