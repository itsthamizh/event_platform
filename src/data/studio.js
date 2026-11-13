// Photography studio data: equipment register, crew profiles, vendors (freelancers, album
// printers, rentals) and vendor purchase orders raised against shoots.
// Built on top of the generated world so the ids above stay untouched.

export const EQUIP_CATEGORIES = ['Camera', 'Lens', 'Video', 'Lighting', 'Drone', 'Audio', 'Support', 'Storage', 'Power'];
export const VENDOR_TYPES = ['Freelance photographer', 'Freelance videographer', 'Drone operator', 'Photo editor / retoucher', 'Album printer', 'Equipment rental', 'Studio / set rental', 'Transport'];
export const CREW_ROLES = ['Lead Photographer', 'Candid Photographer', 'Cinematographer', 'Drone Operator', 'Photo Editor', 'Video Editor', 'Assistant'];
export const VPO_STAGES = ['draft', 'sent', 'confirmed', 'delivered', 'paid'];
export const VPO_LABEL = { draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed', delivered: 'Delivered', paid: 'Paid', cancelled: 'Cancelled' };

// [name, category, brand / model, qty, unit value, service months]
const PHOTO_KIT = [
  ['Canon EOS R5 body', 'Camera', 'Canon EOS R5', 2, 339000, 12],
  ['Sony FX3 cinema camera', 'Video', 'Sony ILME-FX3', 2, 389000, 12],
  ['70-200mm f/2.8 lens', 'Lens', 'Sony FE 70-200 GM II', 2, 239000, 18],
  ['85mm f/1.4 portrait lens', 'Lens', 'Sony FE 85mm GM', 2, 149000, 18],
  ['35mm f/1.8 lens', 'Lens', 'Sony FE 35mm', 3, 52000, 18],
  ['Aputure 300d LED light', 'Lighting', 'Aputure LS 300d II', 4, 72000, 12],
  ['Softbox 120 cm', 'Lighting', 'Godox Octa 120', 6, 6500, 24],
  ['Light stand', 'Support', 'Manfrotto 1004BAC', 10, 9000, 24],
  ['Video tripod', 'Support', 'Manfrotto 504X', 4, 48000, 24],
  ['Wireless mic kit', 'Audio', 'Rode Wireless GO II', 4, 24000, 12],
  ['Audio recorder', 'Audio', 'Zoom H6', 2, 26000, 12],
  ['SD card 128 GB V90', 'Storage', 'Sony Tough', 30, 9500, 36],
  ['Portable SSD 2 TB', 'Storage', 'Samsung T7 Shield', 6, 17000, 36],
  ['Camera battery', 'Power', 'Sony NP-FZ100', 16, 6500, 18],
];
const CAT_OF = (name, group) => {
  const n = (name + ' ' + (group || '')).toLowerCase();
  if (n.includes('drone') || n.includes('mavic')) return 'Drone';
  if (n.includes('lens') || n.includes('mm')) return 'Lens';
  if (n.includes('flash') || n.includes('light')) return 'Lighting';
  if (n.includes('gimbal') || n.includes('tripod') || n.includes('stand')) return 'Support';
  if (n.includes('body') || n.includes('camera')) return 'Camera';
  return 'Camera';
};
const VALUE_OF = { Camera: 249000, Lens: 189000, Drone: 215000, Lighting: 42000, Support: 69000 };

const CREW_PROFILE = {
  'Lead Photographer': { dayRate: 8000, skills: ['Traditional', 'Candid', 'Portraits'] },
  'Candid Photographer': { dayRate: 6000, skills: ['Candid', 'Couple shoots'] },
  Cinematographer: { dayRate: 9000, skills: ['Cinematic film', 'Same-day edit', 'Gimbal'] },
  'Drone Operator': { dayRate: 5500, skills: ['DGCA licence', 'Aerial video'] },
};

const VENDORS = [
  ['Rajesh Freelance Clicks', 'Freelance photographer', 'Rajesh K', 'Velachery', 7000, 'per day', 4.6],
  ['Vimal Films', 'Freelance videographer', 'Vimal R', 'Porur', 9000, 'per day', 4.7],
  ['SkyEye Drones', 'Drone operator', 'Sathish Kumar', 'OMR', 6500, 'per day', 4.5],
  ['PixelPerfect Retouch', 'Photo editor / retoucher', 'Nivetha S', 'Remote', 120, 'per photo', 4.8],
  ['Canvera Albums Chennai', 'Album printer', 'Anand P', 'Guindy', 18000, 'per album', 4.4],
  ['LensRentals Chennai', 'Equipment rental', 'Farook M', 'T. Nagar', 3500, 'per day', 4.3],
  ['Backdrop Studio Co.', 'Studio / set rental', 'Revathi L', 'Anna Nagar', 6000, 'per slot', 4.2],
  ['Madras Travels', 'Transport', 'Selvam T', 'Adyar', 2800, 'per trip', 4.1],
];

export function buildStudio({ partners, inventory, members, bookings, leads, today }) {
  const photo = partners.filter((p) => p.category === 'photography');
  const outInventory = inventory.map((it) => {
    const p = photo.find((x) => x.id === it.partnerId);
    if (!p) return it;
    const category = CAT_OF(it.name, it.group);
    return { ...it, category, model: it.model || it.name, value: it.value || VALUE_OF[category] || 50000, serial: it.serial || serialFor(it.id), status: it.status || 'available', serviceDue: it.serviceDue || addMonths(today, (it.id.length % 5) + 1), purchased: it.purchased || '2024-0' + ((it.id.length % 8) + 1) + '-15' };
  });
  // Full studio kit for every photography business (the demo studio gets it all).
  photo.forEach((p, pi) => {
    const kit = p.id === 'p1' ? PHOTO_KIT : PHOTO_KIT.filter((_, k) => k % 2 === pi % 2);
    const branches = [...new Set(outInventory.filter((x) => x.partnerId === p.id).map((x) => x.branchId))];
    kit.forEach(([name, category, model, qty, value, months], k) =>
      outInventory.push({
        id: `eq-${p.id}-${k}`, partnerId: p.id, branchId: branches[k % Math.max(1, branches.length)] || null, name, group: category, category, model, qty: p.id === 'p1' ? qty : Math.max(1, Math.round(qty / 2)),
        value, serial: serialFor(p.id + k), condition: k === 5 ? 'Needs service' : 'Good', status: p.id === 'p1' && k === 5 ? 'repair' : 'available',
        serviceDue: addMonths(today, k % 3 === 0 ? 0 : (k % months) + 1), purchased: `202${3 + (k % 3)}-${String((k % 12) + 1).padStart(2, '0')}-10`,
      })
    );
  });
  // Crew profiles: role, staff or freelance, day rate and skills.
  const outMembers = members.map((m) => {
    if (!photo.some((p) => p.id === m.partnerId) || m.role !== 'crew') return m;
    const role = m.title || 'Assistant';
    const prof = CREW_PROFILE[m.title] || CREW_PROFILE[role] || { dayRate: 4000, skills: ['Assisting'] };
    return { ...m, crewRole: role, employment: 'Staff', dayRate: m.dayRate || prof.dayRate, skills: m.skills || prof.skills };
  });
  // Vendors and their POs (demo studio).
  const vendors = [];
  const vendorPos = [];
  photo.forEach((p) => {
    const list = p.id === 'p1' ? VENDORS : VENDORS.slice(0, 4);
    list.forEach(([name, type, contact, area, rate, unit, rating], k) =>
      vendors.push({ id: `vd-${p.id}-${k}`, partnerId: p.id, name, type, contact, phone: '+91 9' + String(8410000000 + k * 7331 + p.id.length * 97).slice(0, 4) + ' ' + String(10000 + k * 4441).slice(0, 5), area, rate, unit, rating, gstin: k % 3 === 0 ? '' : `33AA${'BCDEFGH'[k % 7]}V${4100 + k}K1Z${k}`, status: 'active', since: '2025-0' + ((k % 9) + 1) + '-01' })
    );
  });
  const pBookings = bookings.filter((b) => b.partnerId === 'p1' && b.status !== 'cancelled').sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const v = (k) => `vd-p1-${k}`;
  const leadName = (b) => (leads.find((l) => l.id === b.leadId) || {}).contactName || 'Customer';
  let n = 0;
  pBookings.forEach((b, i) => {
    const past = b.eventDate < today;
    const type = (leads.find((l) => l.id === b.leadId) || {}).eventType || '';
    const add = (vendor, lines, status) => {
      n += 1;
      vendorPos.push({
        id: `vpo-${n}`, partnerId: 'p1', branchId: b.branchId || null, number: `VPO/LL/26-27/${String(n).padStart(4, '0')}`, vendorId: vendor, bookingId: b.id,
        title: `${lines[0][0]} - ${leadName(b)}`, lines: lines.map(([desc, qty, rate]) => ({ desc, qty, rate })), status,
        needBy: b.eventDate, createdAt: addDaysStr(b.eventDate, -12), notes: '',
      });
    };
    if (type === 'Wedding' || type === 'Reception') add(v(0), [['Second shooter (candid)', 1, 7000]], past ? 'paid' : i % 2 ? 'confirmed' : 'sent');
    if (type === 'Wedding' && i % 2 === 0) add(v(2), [['Drone coverage', 1, 6500]], past ? 'paid' : 'confirmed');
    if (type === 'Engagement' && i % 3 === 0) add(v(1), [['Freelance cinematographer', 1, 9000]], past ? 'delivered' : 'draft');
    if (past && i % 2 === 0) add(v(4), [['Premium album 40 pages', 1, 18000], ['Parent album 20 pages', 2, 7500]], i % 4 === 0 ? 'delivered' : 'confirmed');
    if (past && i % 3 === 1) add(v(3), [['Retouching', 120, 120]], 'paid');
    if (!past && i % 4 === 1) add(v(5), [['Extra 70-200mm lens (rental)', 1, 3500], ['Extra Sony A7 IV body (rental)', 1, 4000]], 'sent');
    if (i % 5 === 2) add(v(7), [['Crew cab (round trip)', 1, 2800]], past ? 'paid' : 'draft');
  });
  return { inventory: outInventory, members: outMembers, vendors, vendorPos };
}

const serialFor = (seed) => {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) % 9999991;
  return 'SN' + String(h).padStart(7, '0');
};
function addMonths(iso, m) {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
}
function addDaysStr(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
export const vpoTotal = (po) => po.lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.rate || 0), 0);
