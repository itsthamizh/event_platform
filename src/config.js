// App-wide constants and small helpers.
// Amounts in the UI are whole rupees. The backend stores paise (see the data model doc).

export const APP_NAME = 'Zoho for Vizhaa';
// The 11 products. Everything in the app is built around these.
export const CORE_PRODUCTS = ['photography', 'return_gifts', 'venue', 'catering', 'decoration', 'pandit', 'melam', 'makeup', 'invitation', 'mehendi', 'music_dj'];
export const PARTNER_APP_NAME = 'Zoho for Vizhaa Partner';
export const CITY = 'Chennai';
export const GST_RATE = 18;
export const SUBSCRIPTION_PRICE = 199;

export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export const inrShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1).replace(/\.0$/, '') + ' Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1).replace(/\.0$/, '') + ' L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return inr(v);
};

const toDate = (iso) => (iso && iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso));

export const fmtDate = (iso) =>
  iso ? toDate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtDay = (iso) =>
  iso ? toDate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

export const fmtTime = (iso) =>
  iso ? toDate(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export const fmtDateTime = (iso) => (iso ? fmtDate(iso) + ', ' + fmtTime(iso) : '');

export const todayISO = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const nowISO = () => new Date().toISOString();

export const addDays = (iso, days) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const daysBetween = (fromIso, toIso) =>
  Math.round((toDate(toIso) - toDate(fromIso)) / 86400000);

let counter = 0;
export const uid = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Deterministic pastel gradient used as a stand-in for vendor photos.
const PALETTES = [
  ['#f6d365', '#fda085'],
  ['#a1c4fd', '#c2e9fb'],
  ['#fbc2eb', '#a6c1ee'],
  ['#84fab0', '#8fd3f4'],
  ['#ffecd2', '#fcb69f'],
  ['#d4fc79', '#96e6a1'],
  ['#e0c3fc', '#8ec5fc'],
  ['#fccb90', '#d57eeb'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
];
export const coverFor = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};
