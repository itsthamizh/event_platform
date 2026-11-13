// Platform masters (data model M03): muhurtham calendar, cities and areas,
// tax rates, event types with checklist templates, feature flags, document series.

// Auspicious (muhurtham) dates for Chennai, Nov 2026 - Jun 2027. Drives demand,
// surge pricing on venues / photographers and date suggestions in the app.
export const MUHURTHAM_DATES = [
  ['2026-11-15', 'Karthigai', 'Valarpirai'], ['2026-11-22', 'Karthigai', 'Valarpirai'], ['2026-11-23', 'Karthigai', 'Valarpirai'], ['2026-11-29', 'Karthigai', 'Theipirai'],
  ['2026-12-06', 'Karthigai', 'Valarpirai'], ['2026-12-13', 'Karthigai', 'Theipirai'], ['2026-12-14', 'Karthigai', 'Theipirai'],
  ['2027-01-20', 'Thai', 'Valarpirai'], ['2027-01-22', 'Thai', 'Valarpirai'], ['2027-01-24', 'Thai', 'Valarpirai'], ['2027-01-27', 'Thai', 'Valarpirai'], ['2027-01-31', 'Thai', 'Theipirai'],
  ['2027-02-07', 'Thai', 'Theipirai'], ['2027-02-10', 'Thai', 'Theipirai'], ['2027-02-12', 'Thai', 'Theipirai'], ['2027-02-17', 'Maasi', 'Valarpirai'], ['2027-02-20', 'Maasi', 'Valarpirai'], ['2027-02-21', 'Maasi', 'Valarpirai'],
  ['2027-03-03', 'Maasi', 'Theipirai'], ['2027-03-07', 'Maasi', 'Theipirai'], ['2027-04-18', 'Chithirai', 'Valarpirai'], ['2027-04-25', 'Chithirai', 'Valarpirai'],
  ['2027-05-02', 'Chithirai', 'Theipirai'], ['2027-05-16', 'Vaikasi', 'Valarpirai'], ['2027-05-23', 'Vaikasi', 'Valarpirai'], ['2027-06-06', 'Vaikasi', 'Theipirai'], ['2027-06-13', 'Aani', 'Valarpirai'],
].map(([date, month, paksha]) => ({ date, month, paksha, demand: ['2027-01-24', '2027-02-12', '2027-02-20', '2026-11-23'].includes(date) ? 'Very high' : 'High' }));

export const CITIES = [
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', gst: '33', active: true, areas: ['Mylapore', 'T. Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'OMR', 'Tambaram', 'Porur', 'ECR', 'Taramani'] },
  { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', gst: '33', active: true, areas: ['RS Puram', 'Peelamedu', 'Saibaba Colony', 'Gandhipuram'] },
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', gst: '33', active: true, areas: ['Anna Nagar', 'KK Nagar', 'Tallakulam'] },
  { id: 'trichy', name: 'Trichy', state: 'Tamil Nadu', gst: '33', active: true, areas: ['Thillai Nagar', 'Srirangam'] },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', gst: '29', active: false, areas: ['Indiranagar', 'Jayanagar', 'Whitefield'] },
];

export const TAX_RATES = [
  { id: 'gst18', name: 'GST 18%', rate: 18, appliesTo: 'Services: photography, decor, DJ, makeup, planners, venue hire', hsn: '9983 / 9963' },
  { id: 'gst5', name: 'GST 5% (outdoor catering)', rate: 5, appliesTo: 'Outdoor catering without ITC', hsn: '996334' },
  { id: 'gst12', name: 'GST 12%', rate: 12, appliesTo: 'Printed invitations', hsn: '4909' },
  { id: 'gst0', name: 'Exempt', rate: 0, appliesTo: 'Religious services by pandits (unregistered)', hsn: '9995' },
];

export const FEATURE_FLAGS = [
  { key: 'instant_booking', label: 'Instant booking (no quote) for fixed-price packages', on: false, scope: 'Chennai' },
  { key: 'wallet', label: 'Customer wallet and referral credit', on: true, scope: 'All cities' },
  { key: 'coupons', label: 'Coupons at checkout', on: true, scope: 'All cities' },
  { key: 'corporate_rfq', label: 'Corporate RFQs and purchase orders', on: true, scope: 'Chennai, Coimbatore' },
  { key: 'whatsapp_capture', label: 'WhatsApp Business lead capture', on: true, scope: 'Partner Basic plan' },
  { key: 'commission', label: 'Platform commission on in-app payments', on: false, scope: 'Not launched' },
];

export const DOC_SERIES = [
  { type: 'Invoice', format: '{PARTNER}/{FY}/{0001}', example: 'LL/26-27/0214', reset: 'Every 1 April' },
  { type: 'Credit note', format: '{PARTNER}/CN/{FY}/{0001}', example: 'LL/CN/26-27/0003', reset: 'Every 1 April' },
  { type: 'Quote', format: '{PARTNER}-{1001}', example: 'LL-1102', reset: 'Never' },
  { type: 'Booking', format: 'BK-{0001}', example: 'BK-3004', reset: 'Never' },
  { type: 'Purchase order (buyer)', format: 'PO/{BUYER}/{FY}/{0001}', example: 'PO/ZEN/26-27/0114', reset: 'Every 1 April' },
  { type: 'Subscription invoice (Zoho for Vizhaa)', format: 'VZ/SUB/{FY}/{0001}', example: 'VZ/SUB/26-27/1801', reset: 'Every 1 April' },
];
