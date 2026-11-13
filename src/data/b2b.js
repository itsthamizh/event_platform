// B2B side of the marketplace (data model M16): corporate buyers, planners
// (Event Management / Wedding Planner partners), RFQs, purchase orders,
// approval workflows, cost centres and the preferred-vendor network.

// Business accounts. Partners are organizations too (org_type partner / planner);
// this list holds the corporate buyers.
export const ORGS = [
  {
    id: 'org1', type: 'corporate', name: 'Zentech Solutions Pvt Ltd', gstin: '33AAACZ4321H1Z9', pan: 'AAACZ4321H', city: 'Chennai',
    address: 'Block 4, Tidel Park, Taramani, Chennai 600113', creditDays: 30, poPrefix: 'ZEN', employees: 1800,
    billingEmail: 'accounts.payable@zentech.example',
  },
  {
    id: 'org2', type: 'corporate', name: 'Kovai Textiles Ltd', gstin: '29AABCK7788L1Z3', pan: 'AABCK7788L', city: 'Bengaluru',
    address: 'Corporate office: ITPL Road, Whitefield, Bengaluru 560066', creditDays: 45, poPrefix: 'KTL', employees: 950, billingEmail: 'finance@kovaitex.example',
  },
];

export const CORP_USERS = [
  { id: 'cu1', orgId: 'org1', name: 'Ramya Sekhar', title: 'HR & Events Manager', phone: '+91 98403 45120', role: 'requester' },
  { id: 'cu2', orgId: 'org1', name: 'Venkat Raman', title: 'Finance Controller', phone: '+91 98404 11872', role: 'approver' },
  { id: 'cu3', orgId: 'org1', name: 'Meera Pillai', title: 'Director - People', phone: '+91 98405 77310', role: 'approver' },
  { id: 'cu4', orgId: 'org1', name: 'Joseph Daniel', title: 'Sales Ops Lead', phone: '+91 98406 22018', role: 'requester' },
];

export const COST_CENTERS = [
  { id: 'cc1', orgId: 'org1', code: 'HR-ENG', name: 'People & Culture', budget: 1800000, owner: 'Meera Pillai' },
  { id: 'cc2', orgId: 'org1', code: 'SAL-01', name: 'Sales', budget: 800000, owner: 'Joseph Daniel' },
  { id: 'cc3', orgId: 'org1', code: 'MKT-02', name: 'Marketing & Brand', budget: 1200000, owner: 'Ramya Sekhar' },
  { id: 'cc4', orgId: 'org1', code: 'ADM-03', name: 'Admin & Facilities', budget: 500000, owner: 'Venkat Raman' },
];

// Approval rules: spend above the amount needs every listed level, in order.
export const APPROVAL_RULES = [
  { id: 'ar1', orgId: 'org1', name: 'Spend above ₹1 lakh', above: 100000, levels: [{ level: 1, approverId: 'cu2', approverName: 'Venkat Raman', title: 'Finance Controller' }] },
  {
    id: 'ar2', orgId: 'org1', name: 'Spend above ₹3 lakh', above: 300000,
    levels: [
      { level: 1, approverId: 'cu2', approverName: 'Venkat Raman', title: 'Finance Controller' },
      { level: 2, approverId: 'cu3', approverName: 'Meera Pillai', title: 'Director - People' },
    ],
  },
  // Planner rule: the planner owner approves sub-vendor POs above ₹2 lakh.
  { id: 'ar3', orgId: 'p12', name: 'Sub-vendor PO above ₹2 lakh', above: 200000, levels: [{ level: 1, approverId: 'owner', approverName: 'Owner', title: 'Owner' }] },
];

export const CORP_EVENTS = [
  { id: 'ce1', orgId: 'org1', title: 'Zentech Annual Day 2026', type: 'Corporate', date: '2026-12-19', area: 'ECR', guests: 650, costCenterId: 'cc1', needs: ['venue', 'catering', 'decoration', 'music_dj', 'photography', 'return_gifts'], budget: 2400000, owner: 'Ramya Sekhar' },
  { id: 'ce2', orgId: 'org1', title: 'Q3 Sales Kick-off Dinner', type: 'Corporate', date: '2026-11-28', area: 'OMR', guests: 120, costCenterId: 'cc2', needs: ['catering', 'music_dj'], budget: 300000, owner: 'Joseph Daniel' },
  { id: 'ce3', orgId: 'org1', title: 'Diwali Celebration 2026', type: 'Corporate', date: '2026-10-30', area: 'Taramani', guests: 400, costCenterId: 'cc1', needs: ['catering', 'decoration'], budget: 450000, owner: 'Ramya Sekhar' },
  { id: 'ce4', orgId: 'org1', title: 'Customer Advisory Board Dinner', type: 'Corporate', date: '2027-02-06', area: 'Adyar', guests: 60, costCenterId: 'cc3', needs: ['venue', 'catering', 'photography'], budget: 350000, owner: 'Ramya Sekhar' },
];

export const PREFERRED_VENDORS = [
  { id: 'pv1', buyerId: 'org1', partnerId: 'p2', terms: '6% off listed per-plate rates, Net 30', since: '2025-04-01', contract: 'Zentech_SriMurugan_RateCard_2026.pdf', rating: 5 },
  { id: 'pv2', buyerId: 'org1', partnerId: 'p11', terms: 'Fixed ₹95,000 per 4-hour show incl. sound & lights', since: '2025-11-15', contract: 'Zentech_Beatbox_MSA.pdf', rating: 4 },
  { id: 'pv3', buyerId: 'org1', partnerId: 'p1', terms: 'Corporate day rate ₹38,000 per photographer', since: '2026-02-10', contract: 'Zentech_LensLight_Agreement.pdf', rating: 5 },
  { id: 'pv4', buyerId: 'org1', partnerId: 'p3', terms: '10% off stage packages', since: '2025-10-01', contract: '', rating: 4 },
  // Planner networks
  { id: 'pv5', buyerId: 'p12', partnerId: 'p4', terms: 'Planner rate: 8% below listed hall tariff', since: '2024-12-15', contract: 'RoyalEvents_GrandLotus.pdf', rating: 5 },
  { id: 'pv6', buyerId: 'p12', partnerId: 'p2', terms: '₹40 off per plate for 300+ plates', since: '2025-01-10', contract: '', rating: 5 },
  { id: 'pv7', buyerId: 'p12', partnerId: 'p3', terms: 'Planner rate 12% off, setup 6 hours before', since: '2025-02-01', contract: '', rating: 4 },
  { id: 'pv8', buyerId: 'p12', partnerId: 'p7', terms: 'Fixed ₹28,000 per muhurtham', since: '2025-03-20', contract: '', rating: 5 },
  { id: 'pv9', buyerId: 'p12', partnerId: 'p1', terms: 'Planner rate 10% off Gold and Platinum', since: '2025-05-05', contract: 'RoyalEvents_LensLight.pdf', rating: 5 },
  { id: 'pv10', buyerId: 'p13', partnerId: 'p5', terms: 'Bridal look at ₹30,000 for planner clients', since: '2025-06-01', contract: '', rating: 5 },
  { id: 'pv11', buyerId: 'p13', partnerId: 'p10', terms: '15% off guest mehendi', since: '2025-06-01', contract: '', rating: 4 },
  { id: 'pv12', buyerId: 'p13', partnerId: 'p9', terms: 'Free design for 300+ cards', since: '2025-07-12', contract: '', rating: 4 },
  { id: 'pv13', buyerId: 'p13', partnerId: 'p6', terms: 'Standard dakshina, samagri at cost', since: '2025-07-12', contract: '', rating: 5 },
];

// Teams for the two planner businesses (so their Partner CRM works with every role).
export const PLANNER_MEMBERS = [
  { id: 'm120', partnerId: 'p12', name: 'Rajesh Kannan', phone: '+91 98407 12001', role: 'owner', status: 'active', title: 'Founder' },
  { id: 'm121', partnerId: 'p12', name: 'Shalini Joseph', phone: '+91 98407 12002', role: 'manager', status: 'active', title: 'Head of Operations' },
  { id: 'm122', partnerId: 'p12', name: 'Aravind S', phone: '+91 98407 12003', role: 'sales', status: 'active', title: 'Client Relations' },
  { id: 'm123', partnerId: 'p12', name: 'Kalaivani M', phone: '+91 98407 12004', role: 'accounts', status: 'active', title: 'Accounts' },
  { id: 'm124', partnerId: 'p12', name: 'Prem Kumar', phone: '+91 98407 12005', role: 'crew', status: 'active', title: 'Event Coordinator' },
  { id: 'm125', partnerId: 'p12', name: 'Nithya R', phone: '+91 98407 12006', role: 'crew', status: 'active', title: 'Event Coordinator' },
  { id: 'm130', partnerId: 'p13', name: 'Sneha Agarwal', phone: '+91 98408 13001', role: 'owner', status: 'active', title: 'Founder & Lead Planner' },
  { id: 'm131', partnerId: 'p13', name: 'Fathima Begum', phone: '+91 98408 13002', role: 'manager', status: 'active', title: 'Planning Manager' },
  { id: 'm132', partnerId: 'p13', name: 'Rohan Iyer', phone: '+91 98408 13003', role: 'sales', status: 'active', title: 'Wedding Consultant' },
  { id: 'm133', partnerId: 'p13', name: 'Bhuvana K', phone: '+91 98408 13004', role: 'accounts', status: 'active', title: 'Accounts' },
  { id: 'm134', partnerId: 'p13', name: 'Dev Anand', phone: '+91 98408 13005', role: 'crew', status: 'active', title: 'Day-of Coordinator' },
];
