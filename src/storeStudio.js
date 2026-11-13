// Photography studio actions: equipment, crew profiles, vendors and vendor purchase orders.
import { nowISO, todayISO, uid } from './config';
import { newRecordBranch } from './accounts';
import { VPO_LABEL, vpoTotal } from './data/studio';

export function studioActions({ update, log, actorName, toast }) {
  return {
    // Equipment register (shares the inventory list; adds category, serial, value, status, service date).
    saveEquipment: (item) => {
      update((s) => ({
        inventory: item.id
          ? s.inventory.map((x) => (x.id === item.id ? { ...x, ...item, qty: Number(item.qty) || 0, value: Number(item.value) || 0 } : x))
          : [...s.inventory, { condition: 'Good', status: 'available', ...item, id: uid('eq'), partnerId: s.partnerId, branchId: newRecordBranch(s), group: item.category, qty: Number(item.qty) || 1, value: Number(item.value) || 0 }],
        activity: log(s, actorName(s), `${item.id ? 'Updated' : 'Added'} equipment ${item.name}`),
      }));
      toast(item.id ? 'Equipment updated' : 'Equipment added');
    },
    setEquipmentStatus: (id, status) => {
      update((s) => ({ inventory: s.inventory.map((x) => (x.id === id ? { ...x, status, condition: status === 'repair' ? 'Needs service' : 'Good', serviceDue: status === 'available' && x.status === 'repair' ? todayISO() : x.serviceDue } : x)) }));
      toast(status === 'repair' ? 'Sent for repair' : 'Back in service');
    },
    // Crew profile: role on shoots, staff or freelance, day rate, skills.
    saveCrewProfile: (memberId, patch) => {
      update((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) }));
      toast('Crew profile saved');
    },
    // Vendors: freelancers, album printers, rental houses, transport.
    saveVendor: (v) => {
      update((s) => ({
        vendors: v.id ? s.vendors.map((x) => (x.id === v.id ? { ...x, ...v, rate: Number(v.rate) || 0 } : x)) : [...s.vendors, { status: 'active', since: todayISO(), rating: 0, ...v, id: uid('vd'), partnerId: s.partnerId, rate: Number(v.rate) || 0 }],
        activity: log(s, actorName(s), `${v.id ? 'Updated' : 'Added'} vendor ${v.name}`),
      }));
      toast(v.id ? 'Vendor updated' : 'Vendor added');
    },
    // Vendor POs: what the studio orders from a vendor for a shoot.
    saveVendorPo: (po) => {
      update((s) => {
        const mine = s.vendorPos.filter((x) => x.partnerId === s.partnerId).length;
        const number = `VPO/${(s.partners.find((p) => p.id === s.partnerId) || { name: 'XX' }).name.split(' ').filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}/26-27/${String(mine + 1).padStart(4, '0')}`;
        const booking = s.bookings.find((b) => b.id === po.bookingId);
        return {
          vendorPos: po.id
            ? s.vendorPos.map((x) => (x.id === po.id ? { ...x, ...po } : x))
            : [{ status: 'draft', notes: '', ...po, id: uid('vpo'), partnerId: s.partnerId, branchId: booking ? booking.branchId : newRecordBranch(s), number, createdAt: todayISO() }, ...s.vendorPos],
          activity: log(s, actorName(s), `${po.id ? 'Updated' : 'Raised'} vendor PO ${po.title}`),
        };
      });
      toast(po.id ? 'Vendor PO updated' : 'Vendor PO created');
    },
    // Paying a vendor PO books the cost against the shoot (shows in the shoot's profit).
    setVendorPoStatus: (id, status) => {
      update((s) => {
        const po = s.vendorPos.find((x) => x.id === id);
        const vendor = s.vendors.find((x) => x.id === po.vendorId) || {};
        const expense = status === 'paid' && po.status !== 'paid'
          ? [{ id: uid('x'), partnerId: po.partnerId, branchId: po.branchId, bookingId: po.bookingId || null, category: vendor.type || 'Vendor', amount: vpoTotal(po), paidTo: vendor.name || 'Vendor', date: todayISO(), vendorPoId: po.id }]
          : [];
        return {
          vendorPos: s.vendorPos.map((x) => (x.id === id ? { ...x, status, [status + 'At']: nowISO() } : x)),
          expenses: [...expense, ...s.expenses],
          activity: log(s, actorName(s), `Vendor PO ${po.number} marked ${VPO_LABEL[status]}`),
        };
      });
      toast(status === 'paid' ? 'Marked paid and added to the shoot costs' : `Marked ${VPO_LABEL[status].toLowerCase()}`);
    },
  };
}
