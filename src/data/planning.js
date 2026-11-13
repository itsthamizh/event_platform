// Customer event planning (data model M10): functions inside an event, family
// co-planners, guest list with RSVP, the host's own budget tracker and a checklist
// built from an admin-managed template per event type.

export const CHECKLIST_TEMPLATES = {
  Wedding: [
    ['Fix muhurtham date with family astrologer', -180, 'pandit'],
    ['Book the venue', -150, 'venue'],
    ['Book photographer', -120, 'photography'],
    ['Finalise caterer after tasting', -90, 'catering'],
    ['Order invitations', -75, 'invitation'],
    ['Book makeup artist and fix trial date', -60, 'makeup'],
    ['Book nadaswaram troupe', -60, 'melam'],
    ['Finalise decoration theme', -45, 'decoration'],
    ['Send invitations to all guests', -40, null],
    ['Order return gifts', -30, 'return_gifts'],
    ['Book mehendi artist', -30, 'mehendi'],
    ['Confirm guest count with caterer', -7, 'catering'],
    ['Share function timings with all vendors', -5, null],
    ['Pay balance amounts', -1, null],
  ],
  Birthday: [
    ['Decide theme and venue', -30, 'decoration'],
    ['Send invites', -21, null],
    ['Book photographer', -20, 'photography'],
    ['Order cake', -7, null],
    ['Order return gifts', -10, 'return_gifts'],
    ['Confirm food headcount', -3, 'catering'],
  ],
  Engagement: [
    ['Fix date with both families', -60, 'pandit'],
    ['Book hall', -45, 'venue'],
    ['Book makeup artist', -30, 'makeup'],
    ['Book mehendi artist', -20, 'mehendi'],
    ['Confirm guest list', -10, null],
  ],
  Housewarming: [
    ['Fix griha pravesam muhurtham', -30, 'pandit'],
    ['Book pandit and samagri', -21, 'pandit'],
    ['Book caterer', -14, 'catering'],
    ['Invite relatives and neighbours', -10, null],
  ],
  Corporate: [
    ['Get budget approval', -60, null],
    ['Send RFQs to vendors', -45, null],
    ['Book venue', -40, 'venue'],
    ['Finalise catering', -21, 'catering'],
    ['Share agenda and run of show', -7, null],
  ],
};

export const buildChecklist = (type, date, addDays) =>
  (CHECKLIST_TEMPLATES[type] || CHECKLIST_TEMPLATES.Birthday).map(([title, offset, category], i) => ({
    id: 'ck' + i, title, due: addDays(date, offset), category, done: false, fromTemplate: true,
  }));

// Off-platform spends the host tracks alongside bookings made in the app.
export const EVENT_EXTRAS = {
  e1: {
    functions: [
      { id: 'f1', name: 'Nichayathartham', date: '2027-01-22', time: '18:00', venue: 'Grand Lotus Mahal - Annexe Hall', guests: 150, categories: ['venue', 'catering', 'photography', 'pandit'] },
      { id: 'f2', name: 'Mehendi & Sangeet', date: '2027-01-23', time: '11:00', venue: 'Home, Mylapore', guests: 60, categories: ['mehendi', 'music_dj', 'photography'] },
      { id: 'f3', name: 'Janavasam & Reception', date: '2027-01-23', time: '18:30', venue: 'Grand Lotus Mahal - Main Hall', guests: 400, categories: ['venue', 'catering', 'decoration', 'melam', 'photography', 'makeup', 'music_dj'] },
      { id: 'f4', name: 'Muhurtham', date: '2027-01-24', time: '07:30', venue: 'Grand Lotus Mahal - Main Hall', guests: 350, categories: ['venue', 'catering', 'decoration', 'melam', 'pandit', 'photography', 'makeup', 'return_gifts'] },
    ],
    collaborators: [
      { id: 'cb1', name: 'Arjun Mohan', relation: 'Groom', phone: '+91 98402 33445', access: 'Co-planner', status: 'active' },
      { id: 'cb2', name: 'Lakshmi Raman', relation: 'Mother', phone: '+91 94440 55667', access: 'Co-planner', status: 'active' },
      { id: 'cb3', name: 'Kavya Raman', relation: 'Sister', phone: '+91 98843 77889', access: 'View only', status: 'invited' },
    ],
    budgetItems: [
      { id: 'bi1', category: 'Jewellery', label: 'Thaali and wedding jewellery', planned: 450000, spent: 420000, offPlatform: true },
      { id: 'bi2', category: 'Clothing', label: 'Kanjivaram sarees (bride + family)', planned: 180000, spent: 165000, offPlatform: true },
      { id: 'bi3', category: 'Travel', label: 'Train tickets for Madurai relatives', planned: 40000, spent: 18500, offPlatform: true },
      { id: 'bi4', category: 'Stay', label: 'Extra hotel rooms near venue', planned: 60000, spent: 0, offPlatform: true },
      { id: 'bi5', category: 'Other', label: 'Temple donation and nalangu items', planned: 25000, spent: 12000, offPlatform: true },
    ],
    guestList: [
      ['Raman family (Madurai)', 'Bride side', 'Family', 6, 'yes'], ['Subramanian Periyappa', 'Bride side', 'Family', 4, 'yes'], ['Vasanthi Chithi', 'Bride side', 'Family', 3, 'yes'],
      ['Gopal Mama & family', 'Bride side', 'Family', 5, 'maybe'], ['Saroja Athai', 'Bride side', 'Family', 2, 'yes'], ['Priya\'s school friends', 'Bride side', 'Friends', 12, 'yes'],
      ['College gang (CEG 2019)', 'Bride side', 'Friends', 18, 'pending'], ['Infosys team', 'Bride side', 'Office', 15, 'pending'], ['Neighbours - Luz Church Rd', 'Bride side', 'Neighbours', 10, 'yes'],
      ['Mohan family', 'Groom side', 'Family', 8, 'yes'], ['Arjun\'s grandparents', 'Groom side', 'Family', 2, 'yes'], ['Bangalore cousins', 'Groom side', 'Family', 9, 'maybe'],
      ['Arjun\'s office (Zoho)', 'Groom side', 'Office', 20, 'pending'], ['Arjun\'s cricket club', 'Groom side', 'Friends', 14, 'yes'], ['US relatives (via video)', 'Groom side', 'Family', 6, 'no'],
      ['Family doctor & family', 'Bride side', 'Family friends', 4, 'yes'], ['Music teacher', 'Bride side', 'Family friends', 2, 'yes'], ['Appa\'s office (TNEB)', 'Bride side', 'Office', 25, 'pending'],
      ['Amma\'s bhajan group', 'Bride side', 'Family friends', 16, 'yes'], ['Coimbatore relatives', 'Groom side', 'Family', 11, 'pending'], ['Arjun\'s school friends', 'Groom side', 'Friends', 10, 'yes'],
      ['Kumbakonam relatives', 'Bride side', 'Family', 14, 'maybe'], ['Apartment association', 'Groom side', 'Neighbours', 8, 'pending'], ['Tuition sir family', 'Bride side', 'Family friends', 3, 'no'],
    ].map(([name, side, group, count, rsvp], i) => ({ id: 'gs' + i, name, side, group, count, rsvp, invited: rsvp !== 'pending' || i % 3 !== 0, phone: '+91 9' + String(8000 + i * 113).slice(0, 4) + ' ' + String(20000 + i * 791).slice(0, 5), functions: i % 4 === 3 ? ['f3', 'f4'] : ['f1', 'f3', 'f4'] })),
  },
  e2: {
    functions: [{ id: 'f1', name: 'Birthday party', date: '2026-12-14', time: '17:00', venue: 'Home terrace, Adyar', guests: 80, categories: ['decoration', 'photography', 'catering', 'return_gifts'] }],
    collaborators: [{ id: 'cb1', name: 'Arjun Mohan', relation: 'Husband', phone: '+91 98402 33445', access: 'Co-planner', status: 'active' }],
    budgetItems: [
      { id: 'bi1', category: 'Cake', label: '2-tier fondant cake (Cakewalk Adyar)', planned: 9000, spent: 0, offPlatform: true },
      { id: 'bi2', category: 'Other', label: 'Kids games and magician', planned: 12000, spent: 5000, offPlatform: true },
    ],
    guestList: [
      ['Grandparents (both sides)', 'Family', 'Family', 4, 'yes'], ['Play school friends', 'Friends', 'Kids', 14, 'yes'], ['Apartment kids', 'Friends', 'Kids', 12, 'maybe'],
      ['Cousins', 'Family', 'Family', 10, 'yes'], ['Office friends', 'Friends', 'Office', 16, 'pending'], ['Neighbours', 'Friends', 'Neighbours', 8, 'yes'],
    ].map(([name, side, group, count, rsvp], i) => ({ id: 'gs' + i, name, side, group, count, rsvp, invited: true, phone: '', functions: ['f1'] })),
  },
  e3: {
    functions: [{ id: 'f1', name: 'Engagement', date: '2026-10-05', time: '10:00', venue: 'Home, Mylapore', guests: 120, categories: ['mehendi', 'makeup'] }],
    collaborators: [],
    budgetItems: [{ id: 'bi1', category: 'Clothing', label: 'Engagement saree', planned: 35000, spent: 32000, offPlatform: true }],
    guestList: [],
  },
};
