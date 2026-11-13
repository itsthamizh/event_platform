// Generates a realistic, consistent demo world on top of the hand-written seed:
// every one of the 11 demo businesses gets a team, a full pipeline of leads,
// quotes, bookings, invoices, payments, category progress, crew, tasks,
// expenses, reviews, chats and activity. Each category also gets more vendors
// so Explore looks like a real marketplace. Deterministic (seeded), so the demo
// looks the same on every reset.
import { QUOTE, addDaysISO, initBookingDetails } from '../categories/logic';
import { levelsFor, scheduleFor } from '../lifecycle';
import { APPROVAL_RULES, ORGS } from './b2b';

const TODAY = '2026-11-11';

function makeRng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

// ---------- People ----------
const CUSTOMERS = [
  ['Ananya Krishnan', 'Adyar'], ['Rahul Venkatesh', 'Velachery'], ['Divya Subramaniam', 'Anna Nagar'], ['Karthik Raghavan', 'T. Nagar'],
  ['Sowmya Iyer', 'Mylapore'], ['Arjun Natarajan', 'OMR'], ['Pavithra Shankar', 'Tambaram'], ['Vignesh Kumar', 'Porur'],
  ['Nandhini Ravi', 'Adyar'], ['Sanjay Balasubramanian', 'Anna Nagar'], ['Keerthi Rajan', 'Velachery'], ['Harish Chandran', 'ECR'],
  ['Revathi Murali', 'Mylapore'], ['Prakash Gopal', 'T. Nagar'], ['Janani Srinivasan', 'OMR'], ['Manoj Sekar', 'Porur'],
  ['Aishwarya Mohan', 'Adyar'], ['Gautham Prasad', 'Anna Nagar'], ['Swathi Narayan', 'Tambaram'], ['Dinesh Pandian', 'Velachery'],
  ['Shruthi Vasudevan', 'Mylapore'], ['Balaji Ramesh', 'ECR'], ['Meera Jayaraman', 'T. Nagar'], ['Ashok Kannan', 'OMR'],
  ['Lavanya Selvam', 'Porur'], ['Naveen Sundar', 'Adyar'], ['Bhavana Raju', 'Anna Nagar'], ['Surya Elango', 'Velachery'],
  ['Ramya Govindan', 'Mylapore'], ['Vishnu Prabhu', 'Tambaram'], ['Deepika Anand', 'OMR'], ['Sathish Murugan', 'T. Nagar'],
];

const EXTRA_CREW = {
  photography: [['Santhosh V', 'Candid Photographer'], ['Mithun K', 'Drone Operator']],
  return_gifts: [['Selvi R', 'Packing Staff'], ['Murali D', 'Delivery']],
  venue: [['Ganesh P', 'Electrician'], ['Anbu S', 'Housekeeping']],
  catering: [['Kumar Chef', 'Second Cook'], ['Saravanan T', 'Server Captain']],
  decoration: [['Mani Florist', 'Florist'], ['Arul J', 'Setup Crew']],
  pandit: [['Srinivasan K', 'Vadhyar'], ['Gopalakrishnan R', 'Vadhyar']],
  melam: [['K. Murugesan', 'Nadaswaram Artist'], ['M. Raja', 'Ottu Artist']],
  makeup: [['Shabana N', 'Hair Stylist'], ['Divya S', 'Assistant Artist']],
  invitation: [['Prabhu M', 'Print Supervisor'], ['Lakshmi K', 'Designer']],
  mehendi: [['Farzana A', 'Mehendi Artist'], ['Sumaiya R', 'Mehendi Artist']],
  music_dj: [['Kevin J', 'Lighting Tech'], ['Ajay M', 'DJ']],
};

// ---------- More vendors per category (fictional names) ----------
const MORE_VENDORS = {
  photography: [['Moments by Madhan', 'Anna Nagar'], ['Pixel Tales Studio', 'OMR'], ['Kalyanam Clicks', 'Mylapore']],
  return_gifts: [['Kalpaka Gift House', 'Mylapore'], ['Green Favours Co.', 'Adyar'], ['Pooja Pette Gifts', 'Tambaram']],
  venue: [['Sri Lakshmi Kalyana Mandapam', 'T. Nagar'], ['Palm Grove Garden', 'ECR'], ['Saraswathi Hall', 'Porur']],
  catering: [['Mami Samayal Caterers', 'Mylapore'], ['Chettinad Virundhu', 'Velachery'], ['Spice Route Banquets', 'OMR']],
  decoration: [['Mallipoo Decors', 'T. Nagar'], ['Pastel Petals', 'Adyar'], ['Thoranam Events Decor', 'Porur']],
  pandit: [['Sastrigal Services Mylapore', 'Mylapore'], ['Vedapatasala Purohits', 'T. Nagar'], ['Sri Kanchi Vadhyars', 'Tambaram']],
  melam: [['Mangala Isai Melam', 'Mylapore'], ['Kumbakonam Nadaswaram Group', 'Porur'], ['Chenda Beats Kerala', 'OMR']],
  makeup: [['Bridal Glow Studio', 'Anna Nagar'], ['Makeover by Kavya', 'Adyar'], ['Shringar Bridal Artistry', 'T. Nagar']],
  invitation: [['Kalyana Patrikai Press', 'T. Nagar'], ['Paper Lotus Cards', 'Adyar'], ['E-Vite Studio', 'OMR']],
  mehendi: [['Mehendi by Sana', 'Velachery'], ['Rangoli Henna Art', 'Mylapore'], ['Heena Tales', 'Anna Nagar']],
  music_dj: [['DJ Vibe Chennai', 'OMR'], ['Rhythm Riders Sound', 'Porur'], ['Sangeet Nights DJ', 'Adyar']],
};

// A few vendors in each lifecycle state, so listing visibility rules show up in Explore and Admin.
const SUB_OVERRIDE = { 'Kalyanam Clicks': 'expired', 'Saraswathi Hall': 'grace', 'Chenda Beats Kerala': 'expired', 'Heena Tales': 'grace', 'E-Vite Studio': 'cancelled', 'Green Favours Co.': 'trial' };

const REVIEW_TEXT = {
  photography: [['Every moment captured', 'They caught the small emotional moments we did not even notice. The album came out beautiful.'], ['Great team, quick delivery', 'Photos were delivered before the promised date and the highlight film was lovely.'], ['Good but a little slow', 'Quality is excellent, album took a bit longer than we hoped.']],
  return_gifts: [['Guests loved the gifts', 'Neatly packed and delivered two days early. Name printing was perfect.'], ['Good quality, fair price', 'Brass items looked premium for the price.'], ['On time', 'Delivered exactly as promised for 300 guests.']],
  venue: [['Spacious and well maintained', 'Hall, dining and rooms were clean. Staff were very cooperative.'], ['Great location', 'Easy for guests to reach and parking was not an issue.'], ['AC could be better', 'Nice venue, but the dining hall got warm at lunch.']],
  catering: [['Food was the highlight', 'Everyone praised the sambar and payasam. Service on banana leaf was quick.'], ['Tasty and on time', 'Breakfast was served exactly at 7. Hot and fresh.'], ['Good menu options', 'Tasting helped us finalise. Portions were generous.']],
  decoration: [['Mandapam looked divine', 'Fresh flowers, lovely lighting, exactly like the mood board.'], ['Creative team', 'They adapted the design to our small hall very nicely.'], ['Setup was tight', 'Looked great, but setup finished just before the function.']],
  pandit: [['Rituals explained beautifully', 'Sastrigal explained every step to the family. Muhurtham was perfectly on time.'], ['Very organised', 'Samagri list was shared early so we were fully prepared.'], ['Punctual and patient', 'Arrived an hour early and guided everyone calmly.']],
  melam: [['Made the muhurtham special', 'The nadaswaram during thaali was goosebumps.'], ['Energetic troupe', 'The baraat with thavil got everyone dancing.'], ['Arrived on time', 'Professional and well dressed troupe.']],
  makeup: [['Looked natural and lasted all day', 'Makeup stayed perfect through the muhurtham and reception.'], ['Trial helped a lot', 'Loved that we tried the look three weeks before.'], ['Family makeup was great too', 'Mom and sister looked lovely and the timing was managed well.']],
  invitation: [['Beautiful bilingual cards', 'Tamil and English design came out elegant. Guests asked where we printed.'], ['Quick proofs', 'Got the first proof in two days and changes were done fast.'], ['Video invite was a hit', 'Shared on WhatsApp, everyone loved it.']],
  mehendi: [['Dark stain, intricate design', 'Colour came out deep maroon. Artist was very patient.'], ['Managed all guests', 'Three artists covered 30 guests smoothly.'], ['Lovely portrait mehendi', 'Our names and a couple portrait in the design - so special.']],
  event_management: [['Stress-free wedding', 'Royal Events handled 14 vendors and we did not get a single call on the day.'], ['Great hospitality desk', 'Out-station guests were picked up and settled without any confusion.'], ['Good, a bit pricey', 'Execution was excellent; coordination fee felt slightly high.']],
  wedding_planner: [['Budget stayed in control', 'Sneha tracked every rupee and suggested where to save. Loved the planning sheet.'], ['Beautiful design', 'The beach mandapam at ECR looked like a magazine shoot.'], ['Very responsive', 'Replied on WhatsApp within minutes, even late at night.']],
  music_dj: [['Dance floor was full all night', 'Great mix of Tamil and Bollywood. Took our requests too.'], ['Good sound and lights', 'Sound was clear even outdoors and the lighting looked great.'], ['Anchor was fun', 'Kept the crowd engaged during the reception.']],
};

const CHAT = {
  photography: ['Hi, do you have {date} free for our {event}?', 'Yes, we are available. How many functions should we cover?', 'Muhurtham and reception. Please include candid and a short film.', 'Sure, sharing the quote shortly.'],
  return_gifts: ['Need {guests} return gifts for our {event} on {date}.', 'Happy to help! Any preference - brass, eco-friendly or thamboolam bags?', 'Thamboolam bags with name printing please.', 'Noted. I will send a sample photo and quote.'],
  venue: ['Is the main hall available on {date}?', 'Yes, the main hall is free that day. Morning or evening session?', 'Full day, around {guests} guests, and we need rooms for out-station family.', 'We can block 15 rooms. Sending the quote.'],
  catering: ['Looking for catering for {guests} guests on {date}.', 'Vanakkam! Veg or non-veg, and which meals?', 'Pure veg, breakfast and lunch, banana leaf service.', 'Sure. Would you like to come for a tasting?'],
  decoration: ['Can you do stage and entrance decor for our {event}?', 'Yes. Do you have a theme or colour in mind?', 'Traditional with fresh flowers, maybe marigold and jasmine.', 'Lovely. I will share a mood board and estimate.'],
  pandit: ['We need a pandit for {event} on {date}.', 'Namaskaram. What time is the muhurtham fixed?', 'Around 9 am. Can you also arrange samagri?', 'Yes, we can. I will share the full list and quote.'],
  melam: ['Need nadaswaram and thavil for {event} on {date}.', 'Available. For janavasam, muhurtham or both?', 'Both please.', 'Okay, 4 artists for 3 hours. Sending quote.'],
  makeup: ['Hi! Bridal makeup needed for {date}.', 'Congratulations! HD or airbrush? Would you like a trial?', 'Airbrush with a trial please. Also 2 family members.', 'Perfect, sending the quote with trial date options.'],
  invitation: ['We want bilingual invitations, about {guests} cards.', 'Sure! Printed, digital or both?', 'Both, and a short video invite for WhatsApp.', 'Great, I will send design options.'],
  mehendi: ['Bridal mehendi for {date}, plus some guests.', 'Congratulations! Arabic or Rajasthani style?', 'Rajasthani for the bride, simple for 20 guests.', 'Noted, sharing the design catalog and quote.'],
  event_management: ['We need end-to-end management for our {event} on {date}.', 'Happy to help! How many functions and roughly how many guests?', 'About {guests} guests, three functions. We want one point of contact.', 'Perfect. I will share our coordination plan and fee.'],
  wedding_planner: ['Looking for a wedding planner for {date}.', 'Congratulations! Do you have a venue and budget in mind?', 'ECR or Mahabalipuram, budget around 30 lakhs, {guests} guests.', 'Lovely. Let us set up a planning call this week.'],
  music_dj: ['DJ needed for our {event} on {date}.', 'Sure! Indoor or outdoor, and how many guests?', 'Outdoor lawn, around {guests} people. Need lighting too.', 'Got it. Sending a package with lights and anchor.'],
};

const DEMO_BUSINESSES = [
  ['p1', 'l1'], ['p8', 'l8'], ['p4', 'l4'], ['p2', 'l2'], ['p3', 'l3'], ['p6', 'l6'], ['p7', 'l7'], ['p5', 'l5'], ['p9', 'l9'], ['p10', 'l10'], ['p11', 'l11'],
  ['p12', 'l12'], ['p13', 'l13'],
];

const EVENT_FOR = {
  venue: ['Wedding', 'Reception', 'Engagement'],
  catering: ['Wedding', 'Housewarming', 'Birthday', 'Pooja', 'Reception'],
  photography: ['Wedding', 'Engagement', 'Birthday', 'Reception', 'Baby Shower'],
  return_gifts: ['Wedding', 'Birthday', 'Housewarming', 'Baby Shower'],
  decoration: ['Wedding', 'Reception', 'Birthday', 'Baby Shower', 'Engagement'],
  pandit: ['Wedding', 'Housewarming', 'Pooja', 'Baby Shower'],
  melam: ['Wedding', 'Housewarming', 'Pooja'],
  makeup: ['Wedding', 'Engagement', 'Reception'],
  invitation: ['Wedding', 'Birthday', 'Reception'],
  mehendi: ['Wedding', 'Engagement', 'Baby Shower'],
  music_dj: ['Reception', 'Birthday', 'Engagement', 'Corporate'],
  event_management: ['Wedding', 'Corporate', 'Reception', 'Birthday'],
  wedding_planner: ['Wedding', 'Wedding', 'Reception', 'Engagement'],
};

const GUESTS = { Wedding: [300, 800], Reception: [250, 600], Engagement: [100, 250], Birthday: [50, 150], Pooja: [40, 120], Housewarming: [50, 150], 'Baby Shower': [60, 150], Corporate: [100, 300] };

// Random enquiry answers per category (mirrors each pack's enquiry questions).
function detailsFor(cat, r, eventType, guests, listing) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const some = (a, min = 1) => a.filter(() => r() > 0.5).concat(a.slice(0, min)).filter((v, i, arr) => arr.indexOf(v) === i);
  switch (cat) {
    case 'photography':
      return { functions: eventType === 'Wedding' ? some(['Muhurtham', 'Reception', 'Mehendi', 'Nalangu / Haldi'], 1) : [eventType === 'Baby Shower' ? 'Valaikaapu' : eventType === 'Birthday' ? 'Birthday party' : eventType], coverage: pick(['Photo + Video', 'Photo + Video', 'Photo only']), hoursPerFunction: pick([4, 5, 6]), drone: r() > 0.6, album: r() > 0.3 };
    case 'venue': {
      const halls = (listing.attributes.halls || []).map((h) => h.id);
      return { session: eventType === 'Wedding' ? pick(['Full day', '2 days']) : pick(['Evening (4pm - 11pm)', 'Morning (6am - 2pm)']), hallId: guests > 300 ? halls[0] : halls[1] || halls[0], rooms: eventType === 'Wedding' ? pick([10, 15, 20, 25]) : pick([0, 2, 4]), dining: Math.round(guests / 2), ownCaterer: false };
    }
    case 'catering':
      return { meals: eventType === 'Wedding' ? ['Breakfast', 'Lunch'] : eventType === 'Reception' ? ['Dinner'] : pick([['Lunch'], ['Breakfast', 'Lunch']]), foodType: 'Veg', servingStyle: pick(['Banana leaf', 'Buffet']), cuisine: 'South Indian', liveCounters: r() > 0.6 };
    case 'return_gifts':
      return { itemType: pick(['Thamboolam bag', 'Brass items', 'Eco-friendly', 'German silver']), quantity: Math.round(guests / 10) * 10, budgetPerPiece: pick([100, 150, 250]), namePrinting: r() > 0.4 };
    case 'decoration':
      return { areas: eventType === 'Wedding' ? some(['Mandapam', 'Entrance', 'Stage', 'Car decoration'], 2) : some(['Stage', 'Entrance', 'Photo booth'], 1), theme: pick(['Traditional temple', 'Pastel floral', 'Royal']), flowers: pick(['Fresh', 'Fresh', 'Mixed']), venueName: '' };
    case 'pandit':
      return { ritual: eventType === 'Wedding' ? 'Wedding' : eventType === 'Housewarming' ? 'Griha Pravesam' : eventType === 'Baby Shower' ? 'Seemantham' : pick(['Ganapathi Homam', 'Satyanarayana Pooja']), language: pick(['Tamil', 'Tamil', 'Sanskrit']), muhurtham: pick(['06:00 - 07:30', '09:00 - 10:30', '07:30 - 09:00']), vadhyars: eventType === 'Wedding' ? 4 : 2, samagriByPandit: r() > 0.5 };
    case 'melam':
      return { ensemble: pick(['Nadaswaram + Thavil', 'Nadaswaram + Thavil + Ottu']), artists: pick([4, 4, 6]), hours: pick([2, 3, 4]), occasions: eventType === 'Wedding' ? ['Janavasam / Baraat', 'Muhurtham'] : ['Muhurtham'] };
    case 'makeup':
      return { looks: eventType === 'Wedding' ? some(['Muhurtham', 'Reception'], 1) : [eventType], style: pick(['HD', 'Airbrush']), familyCount: pick([0, 2, 3]), trial: r() > 0.4, hairStyling: true, drape: true };
    case 'invitation':
      return { format: pick(['Printed', 'Both', 'Digital']), quantity: Math.round(guests * 0.8 / 50) * 50, language: pick(['Bilingual', 'Tamil', 'English']), style: pick(['Traditional', 'Modern', 'Laser cut']), videoInvite: r() > 0.5 };
    case 'mehendi':
      return { brideCoverage: pick(['Both hands to elbow', 'Hands and feet']), style: pick(['Arabic', 'Rajasthani', 'Indo-Arabic']), guests: pick([0, 10, 20, 30]), organic: true };
    case 'event_management':
    case 'wedding_planner':
      return { functions: eventType === 'Wedding' ? some(['Nichayathartham', 'Mehendi', 'Reception', 'Muhurtham'], 2) : [eventType], services: some(['Venue sourcing', 'Vendor management', 'Guest hospitality', 'Decor design', 'On-day coordination'], 2), budget: pick([1500000, 2500000, 3500000]), rsvp: r() > 0.5 };
    case 'music_dj':
      return { services: some(['DJ', 'Sound system', 'Lighting', 'Anchor / MC', 'LED dance floor'], 2), hours: pick([3, 4, 5]), genres: some(['Tamil', 'Bollywood', 'EDM', 'Retro'], 1), setting: pick(['Indoor', 'Outdoor']) };
    default:
      return {};
  }
}

const STAGE_PLAN = ['new', 'new', 'new', 'contacted', 'contacted', 'quoted', 'quoted', 'negotiation', 'booked', 'booked', 'booked', 'accepted', 'completed', 'completed', 'completed', 'cancelled', 'lost'];
const SOURCES = ['app', 'app', 'app', 'whatsapp', 'whatsapp', 'manual', 'website'];
const LOST = [['price_high', 'Price too high'], ['chose_competitor', 'Chose another vendor'], ['date_unavailable', 'Date not available'], ['no_response', 'No response']];

export function generateWorld(base) {
  const r = makeRng(20261111);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const between = (a, b) => a + Math.floor(r() * (b - a + 1));
  const out = { partners: [], listings: [], users: [], leads: [], quotes: [], bookings: [], invoices: [], threads: [], messages: [], reviews: [], members: [], crew: [], tasks: [], expenses: [], blocks: [], activity: [], leadActivities: [], notifications: [], menus: [] };
  let seq = 0;
  const id = (p) => p + 'g' + (seq++).toString(36);

  // Customers (app users)
  const people = CUSTOMERS.map(([name, area], i) => ({ id: 'u' + (100 + i), name, phone: '+91 9' + String(8400 + i * 37).padStart(4, '0') + ' ' + String(10000 + ((i * 27183) % 89999)), email: name.split(' ')[0].toLowerCase() + '@example.com', city: 'Chennai', area, joined: addDaysISO(TODAY, -between(10, 200)), status: 'active', bookings: 0 }));
  out.users.push(...people);

  // Extra crew for demo businesses
  DEMO_BUSINESSES.forEach(([pid, lid]) => {
    const cat = base.listings.find((l) => l.id === lid).category;
    (EXTRA_CREW[cat] || []).forEach(([name, title], j) => out.members.push({ id: id('m'), partnerId: pid, name, phone: '+91 97' + between(100, 999) + ' ' + between(10000, 99999), role: 'crew', status: 'active', title }));
  });
  const allMembers = [...base.members, ...out.members];

  // ---------- One deal: lead -> quote(s) -> booking -> invoice -> payments -> progress ----------
  const runDeal = (pid, lid, bi, k, stage, o = {}) => {
  const listing = base.listings.find((l) => l.id === lid) || out.listings.find((l) => l.id === lid);
  const partner = base.partners.find((p) => p.id === pid) || out.partners.find((p) => p.id === pid);
  const cat = listing.category;
  const team = allMembers.filter((m) => m.partnerId === pid);
  const sellers = team.filter((m) => ['owner', 'manager', 'sales'].includes(m.role));
  const crew = team.filter((m) => m.role === 'crew');
  const actor = (m) => (m || sellers[0] || { name: 'Owner' }).name;
  const code = partner.name.split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const state = { menus: base.menus };

    const buyer = o.buyer || null;
    const person = o.person || people[(bi * 5 + k * 3) % people.length];
    const source = o.source || (buyer ? (buyer.rfqId ? 'rfq' : buyer.type === 'vendor' ? 'planner' : 'corporate') : stage === 'completed' || stage === 'booked' ? pick(['app', 'app', 'whatsapp']) : pick(SOURCES));
    const onApp = source === 'app';
    const eventType = o.eventType || pick(EVENT_FOR[cat] || ['Wedding']);
    const [gmin, gmax] = GUESTS[eventType] || [100, 300];
    const guests = o.guests || Math.round(between(gmin, gmax) / 10) * 10;
    const eventDate = o.eventDate || (stage === 'completed' ? addDaysISO(TODAY, -between(4, 70)) : stage === 'lost' ? addDaysISO(TODAY, between(-20, 60)) : addDaysISO(TODAY, between(stage === 'booked' ? 6 : 14, 130)));
    const createdAt = addDaysISO(stage === 'completed' ? eventDate : TODAY, stage === 'completed' ? -between(30, 80) : stage === 'new' ? -between(0, 2) : -between(3, 40));
    const owner = pick(sellers) || { id: null, name: 'Owner' };
    const leadId = id('ld');
    const details = { ...detailsFor(cat, r, eventType, guests, listing), ...(o.details || {}) };
    const lead = {
      id: leadId, partnerId: pid, listingId: lid, customerId: onApp ? person.id : null, eventId: o.eventId || null, contactName: person.name, contactPhone: person.phone, area: person.area, source,
      eventType, eventDate, guests, budget: 0, requirements: buyer ? `${o.title || eventType} for ${buyer.orgName}. ${guests} guests.${buyer.note ? ' ' + buyer.note : ''}` : `${eventType} at ${person.area}. ${guests} guests.`, status: 'new', assignedTo: stage === 'new' && r() > 0.5 ? null : owner.id,
      priority: o.priority || (buyer ? 'high' : pick(['low', 'medium', 'medium', 'medium', 'high', 'hot'])), buyerType: buyer ? buyer.type : 'individual', buyer,
      nextFollowUp: !['new', 'contacted', 'quoted', 'negotiation'].includes(stage) ? null : addDaysISO(TODAY, between(-1, 4)), createdAt: createdAt + 'T' + String(between(9, 20)).padStart(2, '0') + ':' + String(between(0, 59)).padStart(2, '0') + ':00', bookingId: null, details,
    };
    const items = (QUOTE[cat] ? QUOTE[cat](lead, listing, state) : [{ description: listing.packages[0].name, qty: 1, unitPrice: listing.packages[0].price }]).filter((x) => x.qty > 0).map((x, i) => ({ id: 'qi' + i, ...x }));
    const subtotal = items.reduce((a, x) => a + x.qty * x.unitPrice, 0);
    lead.budget = Math.round((subtotal * between(85, 115)) / 100 / 1000) * 1000;
    out.leadActivities.push({ id: id('a'), leadId, type: 'status', body: onApp ? 'Booking request received from the app' : `Lead added from ${source}`, by: onApp ? 'System' : actor(owner), at: lead.createdAt });

    // Chat for app leads
    if (onApp) {
      const tId = id('t');
      out.threads.push({ id: tId, customerId: person.id, partnerId: pid, listingId: lid, leadId });
      (CHAT[cat] || CHAT.photography).slice(0, stage === 'new' ? 1 : 4).forEach((m, i) =>
        out.messages.push({ id: id('msg'), threadId: tId, side: i % 2 ? 'partner' : 'customer', type: 'text', body: m.replace('{date}', eventDate).replace('{event}', eventType.toLowerCase()).replace('{guests}', guests), at: addDaysISO(createdAt, Math.floor(i / 2)) + 'T1' + i + ':1' + i + ':00' })
      );
    }

    if (stage === 'new') return out.leads.push(lead);
    lead.status = 'contacted';
    out.leadActivities.push({ id: id('a'), leadId, type: 'call', body: `Called ${person.name.split(' ')[0]}. Discussed ${eventType.toLowerCase()} requirements.`, by: actor(owner), at: addDaysISO(createdAt, 1) + 'T11:00:00' });
    if (stage === 'contacted') return out.leads.push(lead);
    if (stage === 'lost') {
      lead.status = 'lost';
      const [code0, label0] = o.lost || pick(LOST);
      lead.lostReason = label0;
      lead.lostReasonCode = code0;
      return out.leads.push(lead);
    }

    // Quote(s)
    const gst = !!partner.gstin;
    const qNum = `${code}-${1100 + bi * 40 + k}`;
    const sentAt = addDaysISO(createdAt, 2) + 'T12:30:00';
    const openStage = stage === 'quoted' || stage === 'negotiation';
    const q1 = { id: id('q'), number: qNum, leadId, partnerId: pid, version: 1, items, discount: 0, gst, validUntil: openStage ? addDaysISO(TODAY, o.validDays != null ? o.validDays : between(-4, 18)) : addDaysISO(createdAt, 14), notes: '', status: 'sent', sentAt, viewedAt: onApp && r() > 0.3 ? addDaysISO(createdAt, 3) + 'T20:15:00' : null };
    out.quotes.push(q1);
    out.activity.push({ id: id('al'), partnerId: pid, actor: actor(owner), action: `sent quote ${qNum} v1 to ${person.name}`, at: sentAt });
    lead.status = 'quoted';
    let accepted = q1;
    if (stage === 'negotiation' || r() > 0.6) {
      q1.status = 'superseded';
      const q2 = { ...q1, id: id('q'), version: 2, discount: Math.round((subtotal * pick([5, 8, 10])) / 100 / 500) * 500, notes: 'Revised as discussed.', status: 'sent', sentAt: addDaysISO(createdAt, 5) + 'T17:00:00' };
      out.quotes.push(q2);
      out.leadActivities.push({ id: id('a'), leadId, type: 'note', body: 'Customer asked for a better price. Sent v2 with a discount.', by: actor(owner), at: q2.sentAt });
      lead.status = 'negotiation';
      accepted = q2;
    }
    if (stage === 'quoted' || stage === 'negotiation') return out.leads.push(lead);

    // Booking
    const taxable = subtotal - accepted.discount;
    const total = taxable + (gst ? Math.round(taxable * 0.18) : 0);
    accepted.status = 'accepted';
    if (!accepted.viewedAt && onApp) accepted.viewedAt = addDaysISO(createdAt, 5) + 'T19:00:00';
    const bookingId = id('b');
    const invId = id('inv');
    const createdB = addDaysISO(createdAt, 7);
    const status = stage === 'completed' ? (r() > 0.4 ? 'reviewed' : 'completed') : stage === 'cancelled' ? 'cancelled' : stage;
    lead.status = stage === 'cancelled' ? 'lost' : stage === 'accepted' ? lead.status : 'won';
    if (stage === 'cancelled') lead.lostReason = 'Cancelled: event postponed';
    lead.bookingId = bookingId;
    const buyerType = buyer ? buyer.type : 'individual';
    const sched = scheduleFor(buyerType, total, createdB, eventDate, addDaysISO, buyer && buyer.creditDays);
    const milDue = sched[1] ? sched[1].due : eventDate;
    const done = ['completed', 'reviewed'].includes(status);
    if (buyerType === 'corporate') {
      // Credit terms: nothing up front; paid by bank transfer after the event (some still within terms).
      if (done && sched[0].due < TODAY) Object.assign(sched[0], { paidAt: addDaysISO(eventDate, between(18, 28)) + 'T15:00:00', method: 'Bank transfer (NEFT)', channel: 'offline' });
    } else if (buyerType === 'vendor') {
      if (status !== 'accepted') Object.assign(sched[0], { paidAt: addDaysISO(createdB, 2) + 'T11:30:00', method: 'Bank transfer (NEFT)', channel: 'offline' });
      if (done && sched[1].due < TODAY) Object.assign(sched[1], { paidAt: addDaysISO(eventDate, 10) + 'T16:00:00', method: 'Bank transfer (NEFT)', channel: 'offline' });
    } else if (status !== 'accepted') {
      sched[0].paidAt = addDaysISO(createdB, 1) + 'T10:00:00';
      sched[0].method = 'UPI';
      sched[0].channel = 'online';
    }
    if (buyerType === 'individual' && (['completed', 'reviewed'].includes(status) || (status === 'booked' && milDue < TODAY && r() > 0.3))) {
      sched[1].paidAt = milDue + 'T11:00:00';
      sched[1].method = pick(['UPI', 'Bank transfer', 'Online']);
      sched[1].channel = sched[1].method === 'Online' ? 'online' : 'offline';
    }
    if (buyerType === 'individual' && status === 'booked' && !sched[1].paidAt && r() > 0.7) {
      // A part payment against the milestone (customer paid some cash now, rest later).
      sched[1].parts = [{ amount: Math.round((sched[1].amount * 0.4) / 1000) * 1000, at: addDaysISO(TODAY, -between(1, 6)) + 'T12:00:00', method: pick(['Cash', 'UPI']), channel: 'offline' }];
    }
    if (buyerType === 'individual' && ['completed', 'reviewed'].includes(status)) {
      sched[2].paidAt = eventDate + 'T18:00:00';
      sched[2].method = pick(['Cash', 'UPI', 'Online']);
      sched[2].channel = sched[2].method === 'Online' ? 'online' : 'offline';
      if (sched[2].channel === 'offline') out.activity.push({ id: id('al'), partnerId: pid, actor: actor(team.find((m) => m.role === 'accounts')), action: `recorded ${sched[2].method} payment on booking for ${person.name}`, at: eventDate + 'T18:10:00' });
    }
    if (status === 'cancelled') sched.forEach((x) => { if (!x.paidAt) x.waived = true; });
    out.invoices.push({ id: invId, number: `${code}/26-27/${String(200 + bi * 20 + k).padStart(4, '0')}`, partnerId: pid, bookingId, type: gst ? 'gst' : 'regular', billTo: buyer ? buyer.orgName : person.name, billToGstin: buyer ? buyer.gstin : '', buyerType, poNumber: buyer && buyer.poNumber, subtotal: taxable, gst, issuedAt: createdB, schedule: sched });

    const contractSigned = buyer ? false : status !== 'accepted' || r() > 0.5;
    const booking = {
      id: bookingId, number: 'BK-' + (3000 + bi * 30 + k), leadId, quoteId: accepted.id, partnerId: pid, listingId: lid, customerId: lead.customerId, eventDate, total, status, contractSigned,
      partnerSignedAt: contractSigned && (status !== 'accepted' && r() > 0.15) ? addDaysISO(createdB, 1) + 'T18:00:00' : null,
      signedAt: contractSigned ? addDaysISO(createdB, 1) + 'T09:30:00' : null,
      invoiceId: invId, createdAt: createdB + 'T10:00:00', details: {},
      buyerType, channel: buyer ? buyer.channel : onApp ? 'app_request' : 'crm_manual', buyerOrgId: buyer ? buyer.orgId : null, buyerOrgName: buyer ? buyer.orgName : null, poId: buyer ? buyer.poId || null : null, parentBookingId: buyer ? buyer.parentBookingId || null : null, projectId: buyer ? buyer.projectId || null : null,
    };
    if (status === 'cancelled') Object.assign(booking, { cancelledBy: 'customer', cancelReason: 'Event postponed', cancelledAt: addDaysISO(createdB, 10) + 'T10:00:00' });
    if (['completed', 'reviewed'].includes(status)) booking.completedAt = addDaysISO(eventDate, 1) + 'T09:00:00';
    booking.details = progress(cat, initBookingDetails(cat, lead, listing, state), status, eventDate, r);
    out.bookings.push(booking);
    out.leads.push(lead);
    if (status !== 'cancelled') out.blocks.push({ id: id('ab'), partnerId: pid, date: eventDate, status: status === 'accepted' ? 'tentative' : 'blocked', source: 'booking', bookingId });

    // Crew, tasks, expenses
    if (status !== 'cancelled' && crew.length) {
      const n = Math.min(crew.length, between(1, 3));
      crew.slice(0, n).forEach((m, j) =>
        out.crew.push({ id: id('c'), bookingId, memberId: m.id, role: m.title, callTime: ['05:30', '06:00', '07:00', '15:00'][j % 4], status: done ? 'checked_out' : eventDate <= addDaysISO(TODAY, 10) ? 'accepted' : j === n - 1 && r() > 0.5 ? 'assigned' : 'accepted', checkInAt: done ? eventDate + 'T0' + (5 + j) + ':40:00' : null, checkOutAt: done ? eventDate + 'T2' + j + ':10:00' : null })
      );
      if (status === 'booked' || status === 'accepted') {
        out.tasks.push({ id: id('tk'), bookingId, memberId: crew[0].id, title: TASKS[cat][0], due: addDaysISO(eventDate, -3), done: false });
        out.tasks.push({ id: id('tk'), bookingId, memberId: crew[n - 1].id, title: TASKS[cat][1], due: addDaysISO(eventDate, -1), done: r() > 0.7 });
      }
    }
    if (['completed', 'reviewed', 'booked'].includes(status)) {
      EXPENSES[cat].forEach(([category, paidTo, pct]) => {
        if (status === 'booked' && r() > 0.4) return;
        out.expenses.push({ id: id('x'), partnerId: pid, bookingId, category, amount: Math.round((total * pct * (0.8 + r() * 0.4)) / 100 / 100) * 100, paidTo, date: status === 'booked' ? addDaysISO(TODAY, -between(1, 10)) : eventDate });
      });
    }
    // Review
    if (status === 'reviewed') {
      const [title, body] = pick(REVIEW_TEXT[cat]);
      const rating = pick([5, 5, 4, 5, 4]);
      const at = addDaysISO(eventDate, between(2, 6));
      const pendingMod = at >= addDaysISO(TODAY, -5);
      out.reviews.push({ id: id('r'), listingId: lid, bookingId, customerName: person.name, rating, title, body, at, reply: !pendingMod && r() > 0.5 ? `Thank you ${person.name.split(' ')[0]}! It was a pleasure being part of your ${eventType.toLowerCase()}.` : '', status: pendingMod ? 'pending_moderation' : 'published' });
    }
    return lead;
  };
  // Last lead / quote / booking created by runDeal (it returns early for some stages).
  const lastDeal = () => {
    const lead = out.leads[out.leads.length - 1];
    const quotes = out.quotes.filter((q) => q.leadId === lead.id);
    return { lead, quote: quotes.find((q) => q.status === 'accepted') || quotes[quotes.length - 1] || null, booking: out.bookings.find((b) => b.id === lead.bookingId) || null };
  };
  const quoteTotal = (q) => {
    const sub = q.items.reduce((a, x) => a + x.qty * x.unitPrice, 0) - (q.discount || 0);
    return sub + (q.gst ? Math.round(sub * 0.18) : 0);
  };

  // ---------- Pipeline per demo business ----------
  DEMO_BUSINESSES.forEach(([pid, lid], bi) => {
    STAGE_PLAN.forEach((stage, k) => runDeal(pid, lid, bi, k, stage));

    // Notifications for this business
    out.notifications.push(
      { id: id('n'), to: 'partner', partnerId: pid, text: `New enquiry from ${people[(bi * 5) % people.length].name}`, at: TODAY + 'T09:12:00', read: false, link: '/partner/leads' },
      { id: id('n'), to: 'partner', partnerId: pid, text: 'Advance payment received', at: addDaysISO(TODAY, -1) + 'T18:40:00', read: false, link: '/partner/payments' },
      { id: id('n'), to: 'partner', partnerId: pid, text: '3 follow-ups due today', at: TODAY + 'T08:00:00', read: true, link: '/partner/leads' }
    );
  });

  // ---------- Priya's wedding (e1) and her daughter's birthday (e2) across categories ----------
  const priya = base.users.find((u) => u.id === 'u1');
  const P = (pid, lid, stage, o) => runDeal(pid, lid, 30, 60 + out.leads.length, stage, { person: { ...priya, area: 'Mylapore' }, source: 'app', ...o });
  const wedding = { eventId: 'e1', eventType: 'Wedding', eventDate: '2027-01-24', guests: 400 };
  P('p3', 'l3', 'quoted', { ...wedding, details: { areas: ['Mandapam', 'Entrance', 'Stage'], theme: 'Traditional temple', flowers: 'Fresh', venueName: 'Grand Lotus Mahal' } });
  P('p9', 'l9', 'booked', { ...wedding, details: { format: 'Both', quantity: 350, language: 'Bilingual', style: 'Laser cut', videoInvite: true } });
  P('p8', 'l8', 'contacted', { ...wedding, details: { itemType: 'Brass items', quantity: 400, budgetPerPiece: 250, namePrinting: true } });
  P('p7', 'l7', 'booked', { ...wedding, details: { ensemble: 'Nadaswaram + Thavil + Ottu', artists: 6, hours: 4, occasions: ['Janavasam / Baraat', 'Muhurtham'] } });
  P('p10', 'l10', 'booked', { ...wedding, eventDate: '2027-01-23', details: { brideCoverage: 'Hands and feet', style: 'Rajasthani', guests: 25, organic: true } });
  P('p11', 'l11', 'quoted', { ...wedding, eventType: 'Reception', details: { services: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC'], hours: 4, genres: ['Tamil', 'Bollywood'], setting: 'Indoor' } });
  const bday = { eventId: 'e2', eventType: 'Birthday', eventDate: '2026-12-14', guests: 80 };
  P('p3', 'l3', 'new', { ...bday, details: { areas: ['Stage', 'Photo booth'], theme: 'Pastel floral', flowers: 'Artificial', venueName: 'Home, Adyar' } });
  P('p8', 'l8', 'quoted', { ...bday, details: { itemType: 'Eco-friendly', quantity: 80, budgetPerPiece: 120, namePrinting: false } });
  // Priya's booked items should show work in progress she can act on.
  out.bookings.filter((b) => b.customerId === 'u1').forEach((b) => {
    (b.details.sections || []).forEach((sct) => {
      if (sct.type === 'approvals' && sct.items[0]) sct.items[0] = { ...sct.items[0], status: 'awaiting_approval', note: 'Please review and approve here.' };
    });
  });

  // ---------- More vendors per category ----------
  let pNum = 200;
  Object.entries(MORE_VENDORS).forEach(([cat, vendors]) => {
    const tmpl = base.listings.find((l) => l.category === cat && DEMO_BUSINESSES.some(([, lid]) => lid === l.id));
    vendors.forEach(([name, area], j) => {
      const pid = 'p' + pNum++;
      const lid = 'l' + pNum;
      const f = [0.85, 1.15, 0.7][j];
      out.partners.push({ id: pid, name, ownerId: 'new', category: cat, gstin: j === 2 ? '' : `33AA${String.fromCharCode(65 + j)}F${between(1000, 9999)}X1Z${j}`, verification: 'verified', subscription: SUB_OVERRIDE[name] || (j === 1 ? 'past_due' : 'active'), city: 'Chennai', joined: addDaysISO(TODAY, -between(60, 500)) });
      const listing = {
        ...tmpl,
        id: lid,
        partnerId: pid,
        title: name,
        area,
        distanceKm: Math.round((1 + r() * 22) * 10) / 10,
        priceFrom: Math.round((tmpl.priceFrom * f) / 10) * 10,
        rating: Math.round((4 + r() * 0.9) * 10) / 10,
        ratingCount: between(18, 260),
        featured: j === 0 && r() > 0.5,
        years: between(3, 25),
        responseTime: pick(['within 1 hour', 'within 2 hours', 'within 4 hours', 'within 1 day']),
        packages: tmpl.packages.map((p) => ({ ...p, id: p.id + lid, price: Math.round((p.price * f) / 10) * 10 })),
        addons: tmpl.addons.map((a) => ({ ...a, id: a.id + lid })),
        attributes: varyAttributes(cat, tmpl.attributes, j, r),
      };
      out.listings.push(listing);
      if (cat === 'catering') base.menus.filter((m) => m.listingId === tmpl.id).forEach((m) => out.menus.push({ ...m, id: m.id + lid, listingId: lid, pricePerPlate: Math.round((m.pricePerPlate * f) / 10) * 10 }));
      REVIEW_TEXT[cat].forEach(([title, body], k) => out.reviews.push({ id: id('r'), listingId: lid, bookingId: null, customerName: people[(pNum + k * 7) % people.length].name, rating: [5, 4, 4][k], title, body, at: addDaysISO(TODAY, -between(10, 200)), reply: '', status: 'published' }));
    });
  });

  // Older published reviews for the demo listings too.
  DEMO_BUSINESSES.forEach(([, lid], bi) => {
    const cat = base.listings.find((l) => l.id === lid).category;
    REVIEW_TEXT[cat].forEach(([title, body], k) => out.reviews.push({ id: id('r'), listingId: lid, bookingId: null, customerName: people[(bi * 3 + k * 11 + 5) % people.length].name, rating: [5, 5, 4][k], title, body, at: addDaysISO(TODAY, -between(80, 300)), reply: k === 0 ? 'Thank you so much for the kind words!' : '', status: 'published' }));
  });


  // ---------- B2B: corporate buyers and planners (RFQs, purchase orders, approvals, projects) ----------
  out.rfqs = [];
  out.pos = [];
  out.approvals = [];
  out.projects = [];
  out.bookingChanges = [];
  const vendorByName = (name) => out.partners.find((p) => p.name === name);
  const listingOf = (pid) => [...base.listings, ...out.listings].find((l) => l.partnerId === pid);
  const allPartners = [...base.partners, ...out.partners];
  const partnerName = (pid) => (allPartners.find((p) => p.id === pid) || {}).name;
  let b2bK = 0;
  let rfqSeq = 41;
  let poSeq = { org1: 112, org2: 30, p12: 18, p13: 9 };
  const ORG = (oid) => ORGS.find((o) => o.id === oid) || null;
  const buyerInfo = (kind, bid, contact) => {
    if (kind === 'corporate') {
      const o = ORG(bid);
      return { type: 'corporate', orgId: o.id, orgName: o.name, gstin: o.gstin, creditDays: o.creditDays, contact };
    }
    const p = allPartners.find((x) => x.id === bid);
    return { type: 'vendor', orgId: p.id, orgName: p.name, gstin: p.gstin, creditDays: 15, contact };
  };
  const poPrefix = (bid) => (ORG(bid) ? ORG(bid).poPrefix : bid === 'p12' ? 'RE' : 'SWP');
  const newPoNumber = (bid) => `PO/${poPrefix(bid)}/26-27/${String(poSeq[bid]++).padStart(4, '0')}`;

  // One vendor's part of an RFQ or a direct PO, run through the normal deal pipeline.
  const b2bDeal = (pid, stage, ctx) => {
    const lid = listingOf(pid).id;
    const extra = {};
    runDeal(pid, lid, 40, b2bK++, stage, {
      person: { name: ctx.contact.name, phone: ctx.contact.phone, area: ctx.area || 'Chennai' },
      source: ctx.rfqId ? 'rfq' : ctx.buyer.type === 'vendor' ? 'planner' : 'corporate',
      eventType: ctx.eventType || 'Corporate', eventDate: ctx.eventDate, guests: ctx.guests, title: ctx.title,
      buyer: { ...ctx.buyer, rfqId: ctx.rfqId || null, poId: ctx.poId || null, poNumber: ctx.poNumber || null, channel: ctx.channel, parentBookingId: ctx.parentBookingId || null, projectId: ctx.projectId || null, note: ctx.note },
      details: ctx.details, validDays: ctx.validDays, lost: ctx.lost,
      ...extra,
    });
    return lastDeal();
  };

  const approvalFor = (buyerKind, bid, amount, title, entityId, decided, at) => {
    const rules = APPROVAL_RULES.filter((r) => r.orgId === bid);
    const levels = levelsFor(rules, amount);
    if (!levels.length) return null;
    const apId = id('ap');
    const owner = buyerKind === 'planner' ? (base.members.find((m) => m.partnerId === bid && m.role === 'owner') || {}) : null;
    const lv = levels.map((l, i) => {
      const approverName = l.approverId === 'owner' && owner ? owner.name : l.approverName;
      const st = decided === 'approved' ? 'approved' : decided === 'pending' ? (i === 0 ? 'pending' : 'waiting') : i === 0 ? 'rejected' : 'waiting';
      return { ...l, approverName, status: st, at: ['approved', 'rejected'].includes(st) ? addDaysISO(at, i) + 'T1' + (1 + i) + ':20:00' : null, note: st === 'approved' ? ['Within event budget.', 'Approved for the annual plan.'][i] || 'Approved' : '' };
    });
    const status = lv.every((l) => l.status === 'approved') ? 'approved' : lv.some((l) => l.status === 'rejected') ? 'rejected' : 'pending';
    out.approvals.push({ id: apId, orgId: bid, buyerKind, entity: 'po', entityId, title, amount, levels: lv, status, requestedBy: buyerKind === 'corporate' ? 'Ramya Sekhar' : 'Shalini Joseph', requestedAt: at + 'T10:00:00' });
    return apId;
  };

  // RFQ: invite several vendors; each invite becomes a lead in that vendor's CRM.
  const makeRfq = (spec) => {
    const rid = 'rfq' + rfqSeq;
    const number = `RFQ-${spec.bid === 'org1' ? 'ZEN' : spec.bid === 'org2' ? 'KTL' : poPrefix(spec.bid)}-${String(rfqSeq++).padStart(3, '0')}`;
    const buyer = buyerInfo(spec.kind, spec.bid, spec.contact);
    const rfq = {
      id: rid, number, buyerKind: spec.kind, buyerId: spec.bid, buyerName: buyer.orgName, eventRef: spec.eventRef, title: spec.title, category: spec.category,
      requirements: spec.requirements, eventDate: spec.eventDate, guests: spec.guests, dueDate: spec.dueDate, budget: spec.budget || 0, costCenterId: spec.costCenterId || null,
      status: spec.status, createdBy: spec.contact.name, createdAt: spec.createdAt + 'T11:00:00', sentAt: spec.status === 'draft' ? null : spec.createdAt + 'T11:30:00', invites: [], awardedInviteId: null, poId: null,
    };
    out.rfqs.push(rfq);
    if (spec.status === 'draft') return rfq;
    spec.invites.forEach(([pid, st, opts = {}]) => {
      const invId = id('ri');
      const awarded = st === 'awarded';
      let poId = null;
      let poNumber = null;
      if (awarded && opts.po) {
        poId = id('po');
        poNumber = newPoNumber(spec.bid);
      }
      const leadStage = st === 'invited' || st === 'viewed' ? 'new' : st === 'declined' ? 'lost' : st === 'not_awarded' ? 'lost' : awarded ? (opts.po && ['accepted', 'fulfilled'].includes(opts.po) ? (opts.po === 'fulfilled' ? 'completed' : 'booked') : 'quoted') : 'quoted';
      const deal = b2bDeal(pid, leadStage, {
        buyer, contact: spec.contact, area: spec.area, eventDate: spec.eventDate, guests: spec.guests, title: spec.title, rfqId: rid, poId, poNumber, channel: spec.kind === 'corporate' ? 'corporate_rfq' : 'planner',
        projectId: spec.projectId, parentBookingId: spec.parentBookingId, note: `RFQ ${number}, quotes due ${spec.dueDate}.`, details: spec.details,
        validDays: 20, lost: st === 'declined' ? ['date_unavailable', 'Date not available'] : ['chose_competitor', 'Chose another vendor'],
      });
      if (st === 'not_awarded' || st === 'declined') {
        // Not-awarded vendors did send a quote before losing.
        if (st === 'not_awarded') {
          const q = { id: id('q'), number: `${partnerName(pid).split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}-R${rfqSeq}`, leadId: deal.lead.id, partnerId: pid, version: 1, items: [{ id: 'qi0', description: `${spec.title} - as per RFQ`, qty: 1, unitPrice: Math.round((spec.budget || 100000) * (1 + r() * 0.25) / 1000) * 1000 }], discount: 0, gst: true, validUntil: addDaysISO(spec.dueDate, 20), notes: 'As per RFQ scope.', status: 'rejected', sentAt: addDaysISO(spec.createdAt, 2) + 'T16:00:00' };
          out.quotes.push(q);
          deal.quote = q;
        }
      }
      deal.lead.rfqId = rid;
      deal.lead.rfqInviteId = invId;
      const invite = { id: invId, partnerId: pid, leadId: deal.lead.id, quoteId: deal.quote ? deal.quote.id : null, status: st, invitedAt: rfq.sentAt, respondedAt: deal.quote ? deal.quote.sentAt : null };
      if (st === 'viewed') invite.viewedAt = addDaysISO(spec.createdAt, 1) + 'T09:00:00';
      rfq.invites.push(invite);
      if (awarded) {
        rfq.awardedInviteId = invId;
        if (deal.quote) deal.quote.status = 'accepted';
        if (opts.po) {
          const amount = quoteTotal(deal.quote);
          const at = addDaysISO(spec.createdAt, 6);
          const po = {
            id: poId, number: poNumber, buyerKind: spec.kind, buyerId: spec.bid, buyerName: buyer.orgName, partnerId: pid, rfqId: rid, quoteId: deal.quote.id, leadId: deal.lead.id,
            bookingId: deal.booking ? deal.booking.id : null, costCenterId: spec.costCenterId || null, projectId: spec.projectId || null, eventRef: spec.eventRef,
            title: spec.title, items: deal.quote.items.map((x) => ({ ...x })), discount: deal.quote.discount || 0, gst: deal.quote.gst, amount, paymentTerms: spec.kind === 'corporate' ? `Net ${buyer.creditDays} after event` : '50% advance, balance in 15 days',
            eventDate: spec.eventDate, status: opts.po, createdAt: at + 'T10:00:00', issuedAt: ['issued', 'accepted', 'fulfilled'].includes(opts.po) ? addDaysISO(at, 2) + 'T12:00:00' : null,
            acceptedAt: ['accepted', 'fulfilled'].includes(opts.po) ? addDaysISO(at, 3) + 'T15:00:00' : null, raisedBy: spec.contact.name, approvalId: null,
          };
          po.approvalId = approvalFor(spec.kind, spec.bid, amount, `${po.number} - ${partnerName(pid)} (${spec.title})`, poId, opts.po === 'pending_approval' ? 'pending' : 'approved', at);
          if (deal.lead.status !== 'won') deal.lead.status = opts.po === 'issued' ? 'negotiation' : deal.lead.status;
          out.pos.push(po);
          rfq.poId = poId;
        }
      }
      if (st === 'invited' || st === 'viewed') deal.lead.nextFollowUp = spec.dueDate;
    });
    return rfq;
  };

  // Direct purchase order to a preferred vendor (no RFQ).
  const directPo = (spec) => {
    const buyer = buyerInfo(spec.kind, spec.bid, spec.contact);
    const poId = id('po');
    const poNumber = newPoNumber(spec.bid);
    const deal = b2bDeal(spec.pid, spec.stage, { buyer, contact: spec.contact, area: spec.area, eventDate: spec.eventDate, guests: spec.guests, title: spec.title, poId, poNumber, channel: spec.kind === 'corporate' ? 'corporate_po' : 'planner', projectId: spec.projectId, parentBookingId: spec.parentBookingId, details: spec.details });
    if (deal.quote && spec.stage === 'quoted') deal.quote.status = 'accepted';
    const amount = quoteTotal(deal.quote);
    const at = addDaysISO(deal.lead.createdAt.slice(0, 10), 4);
    const status = spec.po || (spec.stage === 'completed' ? 'fulfilled' : ['booked', 'accepted'].includes(spec.stage) ? 'accepted' : 'issued');
    const po = {
      id: poId, number: poNumber, buyerKind: spec.kind, buyerId: spec.bid, buyerName: buyer.orgName, partnerId: spec.pid, rfqId: null, quoteId: deal.quote.id, leadId: deal.lead.id,
      bookingId: deal.booking ? deal.booking.id : null, costCenterId: spec.costCenterId || null, projectId: spec.projectId || null, eventRef: spec.eventRef, title: spec.title,
      items: deal.quote.items.map((x) => ({ ...x })), discount: deal.quote.discount || 0, gst: deal.quote.gst, amount, paymentTerms: spec.kind === 'corporate' ? `Net ${buyer.creditDays} after event` : '50% advance, balance in 15 days',
      eventDate: spec.eventDate, status, createdAt: at + 'T10:00:00', issuedAt: status === 'pending_approval' ? null : addDaysISO(at, 1) + 'T12:00:00', acceptedAt: ['accepted', 'fulfilled'].includes(status) ? addDaysISO(at, 2) + 'T15:00:00' : null, raisedBy: spec.contact.name, approvalId: null,
    };
    po.approvalId = approvalFor(spec.kind, spec.bid, amount, `${po.number} - ${partnerName(spec.pid)} (${spec.title})`, poId, status === 'pending_approval' ? 'pending' : 'approved', at);
    if (status === 'issued' && deal.lead.status !== 'won') deal.lead.status = 'negotiation';
    out.pos.push(po);
    return { ...deal, po };
  };

  const ramya = { name: 'Ramya Sekhar', phone: '+91 98403 45120' };
  const joseph = { name: 'Joseph Daniel', phone: '+91 98406 22018' };
  const annual = { kind: 'corporate', bid: 'org1', contact: ramya, area: 'ECR', eventRef: { type: 'corp_event', id: 'ce1' }, eventDate: '2026-12-19', guests: 650, costCenterId: 'cc1' };
  makeRfq({ ...annual, category: 'venue', title: 'Annual Day 2026 - Venue', requirements: 'Indoor AC hall for 650 with stage, green rooms and parking for 150 cars. 4pm to 11pm.', dueDate: '2026-10-25', createdAt: '2026-10-14', status: 'awarded', budget: 600000,
    details: { session: 'Evening (4pm - 11pm)', rooms: 4, dining: 400, ownCaterer: true },
    invites: [['p16', 'awarded', { po: 'accepted' }], [vendorByName('Palm Grove Garden').id, 'not_awarded']] });
  makeRfq({ ...annual, category: 'catering', title: 'Annual Day 2026 - Dinner Catering', requirements: 'Dinner buffet for 650: 60% veg, 40% non-veg. Live counters (dosa, chaat). Service 7:30pm - 10pm.', dueDate: '2026-11-15', createdAt: '2026-11-04', status: 'open', budget: 520000,
    details: { meals: ['Dinner'], foodType: 'Veg + Non-veg', servingStyle: 'Buffet', cuisine: 'South Indian', liveCounters: true },
    invites: [['p2', 'responded'], ['p15', 'responded'], [vendorByName('Spice Route Banquets').id, 'viewed'], [vendorByName('Chettinad Virundhu').id, 'invited']] });
  makeRfq({ ...annual, category: 'music_dj', title: 'Annual Day 2026 - DJ, Sound & Lights', requirements: '4-hour DJ after awards, line array sound for 650, stage lighting, LED dance floor, emcee for awards.', dueDate: '2026-10-30', createdAt: '2026-10-20', status: 'awarded', budget: 150000,
    details: { services: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC', 'LED dance floor'], hours: 4, genres: ['Tamil', 'Bollywood', 'EDM'], setting: 'Indoor' },
    invites: [['p11', 'awarded', { po: 'issued' }], [vendorByName('DJ Vibe Chennai').id, 'not_awarded'], [vendorByName('Rhythm Riders Sound').id, 'declined']] });
  makeRfq({ ...annual, category: 'photography', title: 'Annual Day 2026 - Photo & Video', requirements: '2 photographers + 1 videographer, 5pm - 11pm, same-night social media reel, edited video in 10 days.', dueDate: '2026-11-05', createdAt: '2026-10-28', status: 'awarded', budget: 120000,
    details: { functions: ['Annual Day'], coverage: 'Photo + Video', hoursPerFunction: 6, drone: false, album: false },
    invites: [['p1', 'awarded', { po: 'pending_approval' }], ['p14', 'not_awarded'], [vendorByName('Pixel Tales Studio').id, 'not_awarded']] });
  makeRfq({ ...annual, category: 'return_gifts', title: 'Annual Day 2026 - Employee Gifts', requirements: '650 branded gift boxes: steel bottle + diary + sweets box. Zentech logo printing. Delivered by 15 Dec.', dueDate: '2026-11-18', createdAt: '2026-11-08', status: 'open', budget: 400000,
    details: { itemType: 'Eco-friendly', quantity: 650, budgetPerPiece: 550, namePrinting: true },
    invites: [['p8', 'invited'], [vendorByName('Kalpaka Gift House').id, 'responded'], [vendorByName('Green Favours Co.').id, 'responded']] });
  makeRfq({ ...annual, category: 'decoration', title: 'Annual Day 2026 - Stage & Entrance Decor', requirements: 'Stage backdrop with LED panels and brand colours, entrance arch, photo booth, award table decor.', dueDate: '2026-11-25', createdAt: '2026-11-10', status: 'draft', budget: 250000, invites: [] });

  // Sales kick-off: direct PO to the preferred caterer.
  directPo({ kind: 'corporate', bid: 'org1', contact: joseph, pid: 'p2', stage: 'booked', area: 'OMR', eventRef: { type: 'corp_event', id: 'ce2' }, eventDate: '2026-11-28', guests: 120, costCenterId: 'cc2', title: 'Q3 Sales Kick-off Dinner',
    details: { meals: ['Dinner'], foodType: 'Veg', servingStyle: 'Buffet', cuisine: 'South Indian', liveCounters: true } });
  directPo({ kind: 'corporate', bid: 'org1', contact: joseph, pid: 'p11', stage: 'quoted', po: 'issued', area: 'OMR', eventRef: { type: 'corp_event', id: 'ce2' }, eventDate: '2026-11-28', guests: 120, costCenterId: 'cc2', title: 'Q3 Sales Kick-off - DJ',
    details: { services: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC'], hours: 5, genres: ['Bollywood', 'Retro'], setting: 'Indoor' } });
  // Diwali (done): fulfilled POs, one invoice still within credit terms.
  directPo({ kind: 'corporate', bid: 'org1', contact: ramya, pid: 'p2', stage: 'completed', area: 'Taramani', eventRef: { type: 'corp_event', id: 'ce3' }, eventDate: '2026-10-30', guests: 400, costCenterId: 'cc1', title: 'Diwali Celebration 2026 - Lunch',
    details: { meals: ['Lunch'], foodType: 'Veg', servingStyle: 'Buffet', cuisine: 'South Indian', liveCounters: true } });
  directPo({ kind: 'corporate', bid: 'org1', contact: ramya, pid: 'p3', stage: 'completed', area: 'Taramani', eventRef: { type: 'corp_event', id: 'ce3' }, eventDate: '2026-10-30', guests: 400, costCenterId: 'cc1', title: 'Diwali Celebration 2026 - Decor',
    details: { areas: ['Stage', 'Entrance', 'Photo booth'], theme: 'Traditional temple', flowers: 'Fresh', venueName: 'Zentech cafeteria, Tidel Park' } });

  // ---------- Planner projects ----------
  const planner = (pid, client, stage, o) => {
    runDeal(pid, listingOf(pid).id, 41, b2bK++, stage, { person: client, source: client.id ? 'app' : 'whatsapp', ...o });
    return lastDeal();
  };
  // Royal Events: Kumar & Lakshmi wedding with five sub-vendors.
  const kl = planner('p12', { name: 'Kumar Subramanian', phone: '+91 98411 76543', area: 'Anna Nagar' }, 'booked', { eventType: 'Wedding', eventDate: '2027-02-12', guests: 500, details: { functions: ['Nichayathartham', 'Reception', 'Muhurtham'], services: ['Venue sourcing', 'Vendor management', 'Guest hospitality', 'On-day coordination'], budget: 3200000, rsvp: true } });
  const re = buyerInfo('vendor', 'p12', { name: 'Shalini Joseph', phone: '+91 98407 12002' });
  const pj1 = 'pj1';
  const klCtx = (pid, stage, details, po) => directPo({ kind: 'planner', bid: 'p12', contact: re.contact, pid, stage, po, area: 'Mylapore', eventRef: { type: 'project', id: pj1 }, eventDate: '2027-02-12', guests: 500, projectId: pj1, parentBookingId: kl.booking.id, title: 'Kumar & Lakshmi Wedding', details });
  const klVenue = klCtx('p4', 'booked', { session: '2 days', rooms: 25, dining: 250, ownCaterer: false });
  const klCater = klCtx('p2', 'booked', { meals: ['Breakfast', 'Lunch', 'Dinner'], foodType: 'Veg', servingStyle: 'Banana leaf', cuisine: 'South Indian', liveCounters: true });
  const klDecor = klCtx('p3', 'accepted', { areas: ['Mandapam', 'Entrance', 'Stage', 'Car decoration'], theme: 'Royal', flowers: 'Fresh', venueName: 'Grand Lotus Mahal' });
  const klMelam = klCtx('p7', 'booked', { ensemble: 'Nadaswaram + Thavil + Ottu', artists: 6, hours: 4, occasions: ['Janavasam / Baraat', 'Muhurtham'] });
  const klPhotoRfq = makeRfq({ kind: 'planner', bid: 'p12', contact: re.contact, area: 'Mylapore', eventRef: { type: 'project', id: pj1 }, eventDate: '2027-02-12', guests: 500, projectId: pj1, parentBookingId: kl.booking.id,
    category: 'photography', title: 'Kumar & Lakshmi Wedding - Photography', requirements: '3 functions, candid + traditional, drone at muhurtham, 2 albums.', dueDate: '2026-11-20', createdAt: '2026-11-06', status: 'open', budget: 220000,
    details: { functions: ['Nichayathartham', 'Reception', 'Muhurtham'], coverage: 'Photo + Video', hoursPerFunction: 6, drone: true, album: true },
    invites: [['p1', 'responded'], ['p14', 'responded'], [vendorByName('Moments by Madhan').id, 'invited']] });
  out.projects.push({
    id: pj1, partnerId: 'p12', title: 'Kumar & Lakshmi Wedding', clientName: 'Kumar Subramanian', clientPhone: '+91 98411 76543', clientBookingId: kl.booking.id, eventDate: '2027-02-12', guests: 500,
    clientBudget: 3200000, status: 'planning', manager: 'Shalini Joseph', area: 'Mylapore',
    budgetLines: [
      { id: 'bl1', category: 'venue', budget: 520000, subBookingId: klVenue.booking.id },
      { id: 'bl2', category: 'catering', budget: 1100000, subBookingId: klCater.booking.id },
      { id: 'bl3', category: 'decoration', budget: 420000, subBookingId: klDecor.booking.id },
      { id: 'bl4', category: 'melam', budget: 45000, subBookingId: klMelam.booking.id },
      { id: 'bl5', category: 'photography', budget: 220000, rfqId: klPhotoRfq.id },
      { id: 'bl6', category: 'makeup', budget: 60000 },
      { id: 'bl7', category: 'return_gifts', budget: 175000 },
    ],
  });
  // Royal Events: corporate gala for Kovai Textiles (a corporate client of the planner).
  const kt = runDeal('p12', 'l12', 41, b2bK++, 'booked', { person: { name: 'Sundar Rajan', phone: '+91 98940 33221', area: 'Coimbatore' }, eventType: 'Corporate', eventDate: '2027-01-09', guests: 800, title: 'Kovai Textiles 50 Years Gala', buyer: { ...buyerInfo('corporate', 'org2', { name: 'Sundar Rajan', phone: '+91 98940 33221' }), channel: 'corporate_po', poNumber: 'PO/KTL/26-27/0030' }, details: { functions: ['Gala dinner'], services: ['Venue sourcing', 'Vendor management', 'On-day coordination'], budget: 4500000, rsvp: false } }) && lastDeal();
  const pj2 = 'pj2';
  const ktCater = directPo({ kind: 'planner', bid: 'p12', contact: re.contact, pid: 'p15', stage: 'booked', area: 'Chennai Trade Centre', eventRef: { type: 'project', id: pj2 }, eventDate: '2027-01-09', guests: 800, projectId: pj2, parentBookingId: kt.booking.id, title: 'Kovai Textiles 50 Years Gala',
    details: { meals: ['Dinner'], foodType: 'Veg + Non-veg', servingStyle: 'Buffet', cuisine: 'South Indian', liveCounters: true } });
  const ktDj = makeRfq({ kind: 'planner', bid: 'p12', contact: re.contact, area: 'Chennai Trade Centre', eventRef: { type: 'project', id: pj2 }, eventDate: '2027-01-09', guests: 800, projectId: pj2, parentBookingId: kt.booking.id,
    category: 'music_dj', title: 'Kovai Textiles Gala - Sound, Lights & DJ', requirements: 'Concert-grade sound for 800, truss lighting, 3-hour DJ after dinner, emcee in Tamil and English.', dueDate: '2026-11-22', createdAt: '2026-11-09', status: 'open', budget: 260000,
    details: { services: ['DJ', 'Sound system', 'Lighting', 'Anchor / MC'], hours: 3, genres: ['Tamil', 'Retro'], setting: 'Indoor' },
    invites: [['p11', 'invited'], [vendorByName('DJ Vibe Chennai').id, 'responded']] });
  out.projects.push({
    id: pj2, partnerId: 'p12', title: 'Kovai Textiles 50 Years Gala', clientName: 'Kovai Textiles Ltd', clientPhone: '+91 98940 33221', clientBookingId: kt.booking.id, eventDate: '2027-01-09', guests: 800,
    clientBudget: 4500000, status: 'planning', manager: 'Rajesh Kannan', area: 'Chennai Trade Centre',
    budgetLines: [
      { id: 'bl1', category: 'venue', budget: 900000 },
      { id: 'bl2', category: 'catering', budget: 1450000, subBookingId: ktCater.booking.id },
      { id: 'bl3', category: 'music_dj', budget: 260000, rfqId: ktDj.id },
      { id: 'bl4', category: 'decoration', budget: 600000 },
      { id: 'bl5', category: 'photography', budget: 150000 },
    ],
  });
  // Shubh Wedding Planners: Ananya & Rohit beach wedding.
  const ar = planner('p13', { ...people[0] }, 'booked', { eventType: 'Wedding', eventDate: '2027-02-20', guests: 300, details: { functions: ['Mehendi', 'Reception', 'Muhurtham'], services: ['Venue sourcing', 'Decor design', 'Vendor management', 'Guest hospitality'], budget: 2800000, rsvp: true } });
  const swp = buyerInfo('vendor', 'p13', { name: 'Fathima Begum', phone: '+91 98408 13002' });
  const pj3 = 'pj3';
  const arCtx = (pid, stage, details, po) => directPo({ kind: 'planner', bid: 'p13', contact: swp.contact, pid, stage, po, area: 'ECR', eventRef: { type: 'project', id: pj3 }, eventDate: '2027-02-20', guests: 300, projectId: pj3, parentBookingId: ar.booking.id, title: 'Ananya & Rohit Wedding', details });
  const arMakeup = arCtx('p5', 'booked', { looks: ['Muhurtham', 'Reception'], style: 'Airbrush', familyCount: 3, trial: true, hairStyling: true, drape: true });
  const arMehendi = arCtx('p10', 'booked', { brideCoverage: 'Hands and feet', style: 'Indo-Arabic', guests: 30, organic: true });
  const arInvite = arCtx('p9', 'accepted', { format: 'Both', quantity: 250, language: 'Bilingual', style: 'Modern', videoInvite: true });
  arCtx('p6', 'quoted', { ritual: 'Wedding', language: 'Tamil', muhurtham: '09:00 - 10:30', vadhyars: 4, samagriByPandit: true }, 'issued');
  out.projects.push({
    id: pj3, partnerId: 'p13', title: 'Ananya & Rohit Wedding', clientName: people[0].name, clientPhone: people[0].phone, clientBookingId: ar.booking.id, eventDate: '2027-02-20', guests: 300,
    clientBudget: 2800000, status: 'planning', manager: 'Fathima Begum', area: 'ECR',
    budgetLines: [
      { id: 'bl1', category: 'venue', budget: 650000 },
      { id: 'bl2', category: 'makeup', budget: 90000, subBookingId: arMakeup.booking.id },
      { id: 'bl3', category: 'mehendi', budget: 40000, subBookingId: arMehendi.booking.id },
      { id: 'bl4', category: 'invitation', budget: 60000, subBookingId: arInvite.booking.id },
      { id: 'bl5', category: 'pandit', budget: 45000 },
      { id: 'bl6', category: 'decoration', budget: 500000 },
      { id: 'bl7', category: 'catering', budget: 720000 },
    ],
  });

  // ---------- Booking change requests (reschedule / guest count / scope) ----------
  const upcomingFor = (pid) => out.bookings.filter((b) => b.partnerId === pid && b.status === 'booked' && b.eventDate > TODAY && b.buyerType === 'individual');
  DEMO_BUSINESSES.slice(0, 11).forEach(([pid], i) => {
    const list = upcomingFor(pid);
    if (list[0]) {
      const b = list[0];
      const lead = out.leads.find((l) => l.id === b.leadId);
      const t = ['guest_count', 'reschedule', 'scope'][i % 3];
      out.bookingChanges.push({
        id: id('bc'), bookingId: b.id, partnerId: pid, type: t, requestedBy: 'customer', status: 'requested', at: addDaysISO(TODAY, -1) + 'T21:10:00',
        from: t === 'guest_count' ? String(lead.guests) : t === 'reschedule' ? b.eventDate : '',
        to: t === 'guest_count' ? String(lead.guests + 60) : t === 'reschedule' ? addDaysISO(b.eventDate, 7) : '',
        note: t === 'guest_count' ? 'Relatives from Bangalore confirmed. Can we add 60 more guests?' : t === 'reschedule' ? 'Family astrologer suggested a better muhurtham one week later.' : 'Can you add a second function the evening before?',
      });
    }
    if (list[1]) {
      const b = list[1];
      const lead = out.leads.find((l) => l.id === b.leadId);
      out.bookingChanges.push({ id: id('bc'), bookingId: b.id, partnerId: pid, type: 'guest_count', requestedBy: 'customer', status: 'approved', at: addDaysISO(TODAY, -9) + 'T10:00:00', decidedAt: addDaysISO(TODAY, -8) + 'T12:00:00', from: String(lead.guests - 30), to: String(lead.guests), note: 'Adding office colleagues.' });
    }
  });

  // Booking counts on customers
  out.users.forEach((u) => {
    u.bookings = out.bookings.filter((b) => b.customerId === u.id).length;
  });
  // ---------- The 4 photography studios run by the demo reseller (FrameWorks Partner Network) ----------
  // Each gets an owner, a small team and a pipeline so the partner console has real numbers.
  const STUDIO_TEAMS = [
    ['Suresh Kannan', 'Lavanya S', 'Prem Kumar', 'Hari V'],
    ['Madhan Raj', 'Keerthi M', 'Vignesh R', 'Sathish B'],
    ['Aishwarya Rao', 'Nandha K', 'Manoj P', 'Rakesh J'],
    ['Venkatesh Iyer', 'Gayathri V', 'Dinesh S', 'Ashok M'],
  ];
  const studios = [base.partners.find((p) => p.id === 'p14'), ...out.partners.filter((p) => p.category === 'photography')].filter(Boolean).slice(0, 4);
  studios.forEach((p, i) => {
    const [owner, sales, crew1, crew2] = STUDIO_TEAMS[i];
    const ph = () => '+91 98' + between(100, 999) + ' ' + between(10000, 99999);
    [
      [owner, 'owner', 'Owner'],
      [sales, 'sales', 'Sales'],
      [crew1, 'crew', 'Lead Photographer'],
      [crew2, 'crew', 'Cinematographer'],
    ].forEach(([name, role, title]) => {
      const m = { id: id('m'), partnerId: p.id, name, phone: ph(), role, status: 'active', title };
      out.members.push(m);
      allMembers.push(m);
    });
    const lid = (base.listings.find((l) => l.partnerId === p.id) || out.listings.find((l) => l.partnerId === p.id) || {}).id;
    if (lid) ['new', 'contacted', 'quoted', 'negotiation', 'booked', 'booked', 'accepted', 'completed', 'completed', 'lost'].slice(0, 10 - i).forEach((stage, k) => runDeal(p.id, lid, 40 + i, k + 3, stage));
  });


  // ---------- More pipeline for the 11 demo businesses (Karthik Raja's group) ----------
  // Added last so the ids and amounts of everything above stay the same.
  const MORE_STAGES = ['new', 'new', 'contacted', 'quoted', 'negotiation', 'booked', 'booked', 'booked', 'accepted', 'completed', 'completed', 'completed', 'lost'];
  DEMO_BUSINESSES.slice(0, 11).forEach(([pid, lid], bi) => MORE_STAGES.forEach((stage, k) => runDeal(pid, lid, bi + 17, k + 20, stage)));

  // ---------- A busy November for Lens & Light Studio: the studio's booking calendar ----------
  const NOV = [
    ['2026-11-01', 'Birthday', '10:00', 'Home, Besant Nagar', 4], ['2026-11-02', 'Engagement', '17:00', 'ITC Grand Chola', 5], ['2026-11-06', 'Birthday', '16:00', 'The Park, Nungambakkam', 3],
    ['2026-11-07', 'Baby Shower', '10:30', 'Home, Mylapore', 3], ['2026-11-08', 'Corporate', '09:00', 'Chennai Trade Centre', 8], ['2026-11-09', 'Corporate', '18:00', 'Taj Coromandel', 5],
    ['2026-11-12', 'Birthday', '17:00', 'Heritage Madurai', 4], ['2026-11-13', 'Engagement', '06:30', 'Kapaleeshwarar Temple', 3], ['2026-11-14', 'Housewarming', '07:00', 'Home, Anna Nagar', 3],
    ['2026-11-15', 'Wedding', '05:30', 'Le Meridien Coimbatore', 10], ['2026-11-16', 'Engagement', '18:30', 'Hyatt Regency Chennai', 5], ['2026-11-17', 'Engagement', '07:00', 'Mahabalipuram Beach', 4],
    ['2026-11-19', 'Engagement', '16:00', 'Dakshinachitra, ECR', 4], ['2026-11-20', 'Engagement', '06:00', 'Pondicherry Promenade', 4], ['2026-11-21', 'Baby Shower', '16:00', 'Fotopro Studio, Ramanathapuram', 2],
    ['2026-11-22', 'Birthday', '11:00', 'Home, Adyar', 3], ['2026-11-23', 'Reception', '18:30', 'Grand Lotus Mahal', 6], ['2026-11-24', 'Wedding', '05:30', 'Grand Lotus Mahal', 10],
    ['2026-11-27', 'Wedding', '06:00', 'Sri Lakshmi Kalyana Mandapam', 8], ['2026-11-28', 'Birthday', '10:00', 'Lens & Light Studio, Adyar', 2],
  ];
  NOV.forEach(([date, eventType, time, venue, hours], k) => {
    const stage = date < TODAY ? 'completed' : 'booked';
    const before = out.bookings.length;
    runDeal('p1', 'l1', 31, 80 + k, stage, { eventDate: date, eventType, details: { functions: [eventType === 'Corporate' ? 'Reception' : eventType === 'Wedding' ? 'Muhurtham' : eventType], hoursPerFunction: hours } });
    out.bookings.slice(before).forEach((b) => {
      b.details = { ...b.details, functions: (b.details.functions || []).map((f, j) => (j === 0 ? { ...f, date, time, venue, hours } : f)) };
    });
  });
  return out;
}

const TASKS = {
  photography: ['Collect shot list from couple', 'Charge batteries and format cards'],
  return_gifts: ['Confirm final quantity', 'Pack and label boxes'],
  venue: ['Confirm room allotment list', 'Deep clean hall and dining'],
  catering: ['Order provisions and vegetables', 'Arrange banana leaves and servers'],
  decoration: ['Order fresh flowers from Koyambedu', 'Load props and lights in van'],
  pandit: ['Share samagri list with family', 'Confirm muhurtham with family'],
  melam: ['Confirm all artists', 'Arrange troupe travel'],
  makeup: ['Confirm trial look photos', 'Pack bridal kit and lashes'],
  invitation: ['Get final names spelling approved', 'Confirm courier pickup'],
  mehendi: ['Prepare fresh organic cones', 'Confirm guest list for mehendi'],
  music_dj: ['Finalise playlist with couple', 'Check generator and power at venue'],
  event_management: ['Send run sheet to all vendors', 'Confirm guest pickup roster'],
  wedding_planner: ['Share final budget sheet with family', 'Walk-through at venue with vendors'],
};

const EXPENSES = {
  photography: [['Crew', 'Freelance second shooter', 8], ['Travel', 'Cab and fuel', 2], ['Material', 'Album printing', 7]],
  return_gifts: [['Material', 'Wholesale gift items', 45], ['Material', 'Printing and tags', 6], ['Travel', 'Delivery van', 3]],
  venue: [['Crew', 'Housekeeping staff', 4], ['Other', 'Electricity and generator diesel', 6], ['Material', 'Cleaning supplies', 1]],
  catering: [['Material', 'Provisions and vegetables', 38], ['Crew', 'Servers and cooks wages', 14], ['Material', 'Banana leaves and disposables', 3]],
  decoration: [['Material', 'Fresh flowers - Koyambedu', 28], ['Crew', 'Setup labour', 10], ['Travel', 'Tempo for props', 3]],
  pandit: [['Material', 'Samagri items', 10], ['Crew', 'Assistant vadhyars dakshina', 25], ['Travel', 'Cab', 4]],
  melam: [['Crew', 'Artists payment', 45], ['Travel', 'Troupe van', 8]],
  makeup: [['Material', 'Products and lashes', 10], ['Crew', 'Assistant artist', 12], ['Travel', 'Cab', 3]],
  invitation: [['Material', 'Paper and printing', 40], ['Material', 'Envelopes and boxes', 8], ['Travel', 'Courier', 3]],
  mehendi: [['Material', 'Organic henna cones', 8], ['Crew', 'Guest artists', 25]],
  music_dj: [['Crew', 'Sound and light technicians', 12], ['Other', 'Generator rental', 8], ['Travel', 'Equipment truck', 5]],
  event_management: [['Crew', 'Freelance coordinators', 14], ['Travel', 'Guest pickup cabs', 9], ['Other', 'Hospitality desk supplies', 3]],
  wedding_planner: [['Crew', 'Day-of coordinators', 12], ['Travel', 'Site visits', 4], ['Material', 'Design samples', 3]],
};

function varyAttributes(cat, a, j, r) {
  const v = JSON.parse(JSON.stringify(a || {}));
  if (cat === 'venue') {
    v.seating = [500, 1000, 300][j];
    v.halls = [
      { id: 'h1', name: 'Main Hall', seating: v.seating, dining: Math.round(v.seating / 2), floor: 'Ground floor', ac: j !== 1 },
      { id: 'h2', name: 'Annexe Hall', seating: Math.round(v.seating / 3), dining: Math.round(v.seating / 6), floor: 'First floor', ac: true },
    ];
    v.rooms = [20, 8, 6][j];
    v.outsideCatering = j === 1;
    v.vegOnly = j !== 1;
  }
  if (cat === 'catering') {
    v.vegOnly = j !== 1;
    v.cuisines = [['South Indian', 'Brahmin style'], ['Chettinad', 'South Indian', 'North Indian'], ['North Indian', 'Continental', 'South Indian']][j];
    v.servingStyles = [['Banana leaf'], ['Buffet', 'Banana leaf'], ['Buffet', 'Table service']][j];
    v.tasting = j !== 0;
  }
  if (cat === 'photography') {
    v.styles = [['Traditional', 'Candid'], ['Cinematic', 'Candid'], ['Traditional']][j];
    v.drone = j !== 2;
    v.deliveryDays = [30, 45, 60][j];
    v.crewSize = [6, 10, 4][j];
  }
  if (v.catalog) v.catalog = v.catalog.map((c) => ({ ...c, price: c.price ? Math.round((c.price * [0.85, 1.15, 0.7][j]) / 5) * 5 : c.price }));
  if (cat === 'makeup') v.styles = [['HD', 'Natural'], ['Airbrush', 'HD'], ['HD']][j];
  if (cat === 'mehendi') v.styles = [['Arabic', 'Indo-Arabic'], ['Rajasthani', 'Portrait'], ['Arabic']][j];
  if (cat === 'melam' && j === 2) v.ensembles = ['Chenda melam'];
  if (cat === 'music_dj') { v.ledFloor = j !== 2; v.maxGuests = [400, 1000, 300][j]; }
  if (cat === 'return_gifts') v.itemTypes = [['Thamboolam bag', 'Brass items'], ['Eco-friendly'], ['Thamboolam bag', 'German silver']][j];
  if (cat === 'decoration') v.themes = [['Traditional temple'], ['Pastel floral', 'Minimal modern'], ['Royal', 'Traditional temple']][j];
  if (cat === 'pandit') v.languages = [['Tamil', 'Sanskrit'], ['Tamil', 'Telugu', 'Sanskrit'], ['Tamil']][j];
  if (cat === 'invitation') v.formats = [['Printed'], ['Printed', 'Both'], ['Digital']][j];
  return v;
}

// Move a freshly-created booking's category details forward to match its status.
function progress(cat, d, status, eventDate, r) {
  const past = ['completed', 'reviewed'].includes(status);
  const days = Math.round((new Date(eventDate) - new Date(TODAY)) / 86400000);
  const near = !past && days <= 30;
  if (d.sections) {
    d.sections = d.sections.map((s) => {
      if (s.type === 'checklist') return { ...s, items: s.items.map((i, k) => ({ ...i, done: past || (near && k < s.items.length / 2) || (!near && k === 0 && r() > 0.5) })) };
      if (s.type === 'approvals') return { ...s, items: s.items.map((i, k) => ({ ...i, status: past ? 'approved' : near ? (k === 0 ? 'approved' : 'awaiting_approval') : k === 0 && r() > 0.4 ? 'awaiting_approval' : 'not_started', note: near || past ? 'Shared on WhatsApp and here' : '' })) };
      if (s.type === 'requests' && (near || past)) return { ...s, items: [{ id: 'rq1', text: 'Vaathi Coming for the entry', by: 'Customer' }, { id: 'rq2', text: 'Something Retro for parents', by: 'Customer' }] };
      return s;
    });
  }
  if (cat === 'photography' && d.deliverables) {
    d.deliverables = d.deliverables.map((x, k) => (past ? { ...x, done: k === 0 ? x.target : x.done, status: k === 0 ? 'delivered' : k === 1 ? 'awaiting_approval' : 'in_progress' } : x));
  }
  if (cat === 'catering' && d.meals) {
    d.tastingDate = addDaysISO(eventDate, -14);
    if (past || days <= 3) d.headcountLocked = true;
  }
  if (cat === 'venue') d.depositStatus = past ? 'refunded' : 'pending';
  return d;
}
