// Photography studio operations: Equipments, Crew, Vendors and Vendor POs.
//   Equipments: cameras, lenses, lights, video, drones, audio... with serial, value, status, service date
//               and which shoots use them on a date.
//   Crew:       staff photographers / videographers / drone operators / editors plus freelancers.
//   Vendors:    freelancers, album printers, rental houses, transport.
//   Vendor POs: what the studio orders from a vendor for a shoot; paying it adds the cost to the shoot.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../../config';
import { navigate } from '../../router';
import { useStore } from '../../store';
import { Avatar, Badge, Button, Card, Field, Icon, Modal, Tabs } from '../../components/ui';
import { Kpis, MiniTable, ModuleHeader } from '../../components/crm';
import { inScope } from '../../accounts';
import { CREW_ROLES, EQUIP_CATEGORIES, VENDOR_TYPES, VPO_LABEL, VPO_STAGES, vpoTotal } from '../../data/studio';
import { LeaveCard } from './Phase2';

const leadOf = (state, b) => state.leads.find((l) => l.id === (b || {}).leadId) || {};
const shootLabel = (state, b) => (b ? `${b.number} - ${leadOf(state, b).contactName || b.buyerOrgName || ''} (${fmtDate(b.eventDate)})` : '-');
const VPO_TONE = { draft: 'gray', sent: 'brand', confirmed: 'violet', delivered: 'amber', paid: 'green', cancelled: 'red' };
const reservedOn = (state, itemId, date) => state.reservations.filter((r) => r.itemId === itemId && r.date === date).reduce((a, r) => a + Number(r.qty || 0), 0);

// ---------- Equipments ----------
export function Equipments() {
  const { state, actions } = useStore();
  const [cat, setCat] = useState('all');
  const [date, setDate] = useState(todayISO());
  const [edit, setEdit] = useState(null);
  const items = state.inventory.filter((i) => inScope(state, i));
  const rows = items.filter((i) => cat === 'all' || (i.category || i.group) === cat);
  const value = items.reduce((a, i) => a + Number(i.value || 0) * Number(i.qty || 0), 0);
  const outToday = items.filter((i) => reservedOn(state, i.id, date) > 0).length;
  const repair = items.filter((i) => i.status === 'repair').length;
  const due = items.filter((i) => i.serviceDue && i.serviceDue <= todayISO() && i.status !== 'repair').length;
  const counts = Object.fromEntries(EQUIP_CATEGORIES.map((c) => [c, items.filter((i) => (i.category || i.group) === c).length]));
  return (
    <div className="stack">
      <ModuleHeader title="Equipments" subtitle="Cameras, lenses, lights, video, drones and audio the studio owns. Booking a shoot reserves kit for that date." actions={<Button icon="plus" onClick={() => setEdit({ name: '', category: 'Camera', model: '', qty: 1, value: '', serial: '', serviceDue: '', condition: 'Good', status: 'available' })}>Add Equipment</Button>} />
      <Kpis
        items={[
          { label: 'Items', value: items.reduce((a, i) => a + Number(i.qty || 0), 0) },
          { label: 'Kit Value', value: inr(value) },
          { label: `In Use on ${fmtDate(date)}`, value: outToday },
          { label: 'In Repair', value: repair },
          { label: 'Service Due', value: due },
        ]}
      />
      <div className="row between wrap gap-s">
        <div className="chips">
          <button className={'chip ' + (cat === 'all' ? 'active' : '')} onClick={() => setCat('all')}>
            All ({items.length})
          </button>
          {EQUIP_CATEGORIES.filter((c) => counts[c]).map((c) => (
            <button key={c} className={'chip ' + (cat === c ? 'active' : '')} onClick={() => setCat(c)}>
              {c} ({counts[c]})
            </button>
          ))}
        </div>
        <span className="row gap-s small">
          Availability on <input className="input input-sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Availability date" />
        </span>
      </div>
      <div className="zc-list">
        <MiniTable
          rows={rows}
          columns={[
            { label: 'Equipment', render: (i) => <span><b>{i.name}</b><div className="tiny muted">{i.model && i.model !== i.name ? i.model + ' - ' : ''}{i.serial || ''}</div></span> },
            { label: 'Category', render: (i) => i.category || i.group },
            { label: 'Owned', align: 'right', render: (i) => i.qty },
            { label: `Free on ${fmtDate(date)}`, align: 'right', render: (i) => { const free = i.status === 'repair' ? 0 : i.qty - reservedOn(state, i.id, date); return <span className={free <= 0 ? 'red' : 'green'}>{free}</span>; } },
            { label: 'Shoots using it', render: (i) => state.reservations.filter((r) => r.itemId === i.id && r.date === date).map((r) => state.bookings.find((b) => b.id === r.bookingId)).filter(Boolean).map((b) => <button key={b.id} className="zc-rl-link" onClick={() => navigate('/partner/bookings/' + b.id)}>{b.number} </button>) },
            { label: 'Status', render: (i) => (i.status === 'repair' ? <Badge tone="red">In repair</Badge> : i.serviceDue && i.serviceDue <= todayISO() ? <Badge tone="amber">Service due</Badge> : <Badge tone="green">Available</Badge>) },
            { label: 'Next Service', render: (i) => (i.serviceDue ? fmtDate(i.serviceDue) : '-') },
            { label: 'Value', align: 'right', render: (i) => (i.value ? inr(i.value * i.qty) : '-') },
            {
              label: '',
              render: (i) => (
                <span className="row gap-s">
                  <button className="zc-rl-link" onClick={() => setEdit(i)}>Edit</button>
                  <button className="zc-rl-link" onClick={() => actions.setEquipmentStatus(i.id, i.status === 'repair' ? 'available' : 'repair')}>{i.status === 'repair' ? 'Back in service' : 'Send to repair'}</button>
                </span>
              ),
            },
          ]}
        />
      </div>
      <Modal
        open={!!edit}
        title={edit && edit.id ? 'Edit equipment' : 'Add equipment'}
        onClose={() => setEdit(null)}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit || !edit.name.trim()} onClick={() => { actions.saveEquipment({ ...edit, group: edit.category }); setEdit(null); }}>Save</Button></>}
      >
        {edit && (
          <div className="grid grid-2">
            <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Sony A7 IV body" /></Field>
            <Field label="Category">
              <select className="select" value={edit.category || edit.group} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                {EQUIP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Brand / model"><input className="input" value={edit.model || ''} onChange={(e) => setEdit({ ...edit, model: e.target.value })} /></Field>
            <Field label="Serial no."><input className="input" value={edit.serial || ''} onChange={(e) => setEdit({ ...edit, serial: e.target.value })} /></Field>
            <Field label="Quantity"><input className="input" type="number" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} /></Field>
            <Field label="Value per unit (₹)"><input className="input" type="number" value={edit.value || ''} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></Field>
            <Field label="Next service"><input className="input" type="date" value={edit.serviceDue || ''} onChange={(e) => setEdit({ ...edit, serviceDue: e.target.value })} /></Field>
            <Field label="Condition">
              <select className="select" value={edit.condition || 'Good'} onChange={(e) => setEdit({ ...edit, condition: e.target.value })}>
                {['Good', 'Needs service', 'Damaged'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- Crew ----------
export function StudioCrew() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('roster');
  const [edit, setEdit] = useState(null);
  const today = todayISO();
  const staff = state.members.filter((m) => inScope(state, m) && m.status !== 'removed' && m.role === 'crew');
  const freelancers = state.vendors.filter((v) => v.partnerId === state.partnerId && ['Freelance photographer', 'Freelance videographer', 'Drone operator', 'Photo editor / retoucher'].includes(v.type));
  const upcoming = state.bookings.filter((b) => inScope(state, b) && ['accepted', 'booked'].includes(b.status) && b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const jobsOf = (m) => state.crew.filter((c) => c.memberId === m.id).map((c) => ({ ...c, b: state.bookings.find((b) => b.id === c.bookingId) })).filter((c) => c.b && c.b.status !== 'cancelled');
  const onLeave = (m) => state.leaves.some((l) => l.memberId === m.id && l.date === today);
  return (
    <div className="stack">
      <ModuleHeader title="Crew" subtitle="Photographers, cinematographers, drone operators and editors - staff and freelance - and who is on which shoot." />
      <Tabs tabs={[{ id: 'roster', label: 'Roster', count: staff.length + freelancers.length }, { id: 'shoots', label: 'Upcoming shoots', count: upcoming.length }, { id: 'leave', label: 'Leave' }]} value={tab} onChange={setTab} />
      {tab === 'roster' && (
        <>
          <Card pad={false} title="Staff crew">
            <MiniTable
              rows={staff}
              columns={[
                { label: 'Staff crew', render: (m) => <span className="row gap-s"><Avatar name={m.name} size={28} /><span><b>{m.name}</b><div className="tiny muted">{m.phone}</div></span></span> },
                { label: 'Role on shoots', render: (m) => m.crewRole || m.title },
                { label: 'Skills', render: (m) => <span className="row gap-xs wrap">{(m.skills || []).map((x) => <Badge key={x}>{x}</Badge>)}</span> },
                { label: 'Day rate', align: 'right', render: (m) => (m.dayRate ? inr(m.dayRate) : '-') },
                { label: 'Shoots this month', align: 'right', render: (m) => jobsOf(m).filter((c) => c.b.eventDate.slice(0, 7) === today.slice(0, 7)).length },
                { label: 'Next shoot', render: (m) => { const n = jobsOf(m).filter((c) => c.b.eventDate >= today).sort((a, b) => a.b.eventDate.localeCompare(b.b.eventDate))[0]; return n ? <button className="zc-rl-link" onClick={() => navigate('/partner/bookings/' + n.b.id)}>{fmtDate(n.b.eventDate)} - {n.role}</button> : '-'; } },
                { label: 'Today', render: (m) => (onLeave(m) ? <Badge tone="amber">On leave</Badge> : <Badge tone="green">Available</Badge>) },
                { label: '', render: (m) => <button className="zc-rl-link" onClick={() => setEdit({ id: m.id, name: m.name, crewRole: m.crewRole || m.title || CREW_ROLES[0], dayRate: m.dayRate || '', skills: (m.skills || []).join(', ') })}>Edit</button> },
              ]}
            />
          </Card>
          <Card pad={false} title="Freelancers (from Vendors)">
            <MiniTable
              rows={freelancers}
              empty="No freelancers yet - add them under Vendors."
              columns={[
                { label: 'Freelancers (from Vendors)', render: (v) => <span><b>{v.name}</b><div className="tiny muted">{v.contact} - {v.phone}</div></span> },
                { label: 'Type', render: (v) => v.type },
                { label: 'Rate', align: 'right', render: (v) => `${inr(v.rate)} ${v.unit}` },
                { label: 'Rating', align: 'right', render: (v) => (v.rating ? v.rating.toFixed(1) : '-') },
                { label: 'Booked via POs', align: 'right', render: (v) => state.vendorPos.filter((p) => p.vendorId === v.id && p.status !== 'cancelled').length },
                { label: '', render: () => <button className="zc-rl-link" onClick={() => navigate('/partner/vendor-pos')}>Raise PO</button> },
              ]}
            />
          </Card>
        </>
      )}
      {tab === 'shoots' && (
        <div className="zc-list">
          <MiniTable
            rows={upcoming}
            columns={[
              { label: 'Shoot', render: (b) => <b>{shootLabel(state, b)}</b> },
              { label: 'Event', render: (b) => leadOf(state, b).eventType },
              { label: 'Crew', render: (b) => { const c = state.crew.filter((x) => x.bookingId === b.id); return c.length ? c.map((x) => `${(state.members.find((m) => m.id === x.memberId) || {}).name || '?'} (${x.role})`).join(', ') : <Badge tone="red">No crew</Badge>; } },
              { label: 'Freelancers', render: (b) => state.vendorPos.filter((p) => p.bookingId === b.id && p.status !== 'cancelled').map((p) => (state.vendors.find((v) => v.id === p.vendorId) || {}).name).filter(Boolean).join(', ') || '-' },
              { label: '', render: (b) => <button className="zc-rl-link" onClick={() => navigate('/partner/bookings/' + b.id)}>Assign</button> },
            ]}
          />
        </div>
      )}
      {tab === 'leave' && <LeaveCard />}
      <Modal
        open={!!edit}
        title={edit ? `Crew profile - ${edit.name}` : ''}
        onClose={() => setEdit(null)}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => { actions.saveCrewProfile(edit.id, { crewRole: edit.crewRole, dayRate: Number(edit.dayRate) || 0, skills: edit.skills.split(',').map((x) => x.trim()).filter(Boolean) }); setEdit(null); }}>Save</Button></>}
      >
        {edit && (
          <>
            <div className="grid grid-2">
              <Field label="Role on shoots">
                <select className="select" value={edit.crewRole} onChange={(e) => setEdit({ ...edit, crewRole: e.target.value })}>
                  {[...new Set([edit.crewRole, ...CREW_ROLES])].map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Day rate (₹)"><input className="input" type="number" value={edit.dayRate} onChange={(e) => setEdit({ ...edit, dayRate: e.target.value })} /></Field>
            </div>
            <Field label="Skills" hint="Comma separated, e.g. Candid, Drone, Same-day edit"><input className="input" value={edit.skills} onChange={(e) => setEdit({ ...edit, skills: e.target.value })} /></Field>
          </>
        )}
      </Modal>
    </div>
  );
}

// ---------- Vendors ----------
export function Vendors() {
  const { state, actions } = useStore();
  const [type, setType] = useState('all');
  const [edit, setEdit] = useState(null);
  const list = state.vendors.filter((v) => v.partnerId === state.partnerId);
  const rows = list.filter((v) => type === 'all' || v.type === type);
  const spent = (v) => state.vendorPos.filter((p) => p.vendorId === v.id && p.status === 'paid').reduce((a, p) => a + vpoTotal(p), 0);
  const open = (v) => state.vendorPos.filter((p) => p.vendorId === v.id && !['paid', 'cancelled'].includes(p.status)).length;
  return (
    <div className="stack">
      <ModuleHeader title="Vendors" subtitle="Freelance shooters, editors, album printers, rental houses and transport the studio works with." actions={<Button icon="plus" onClick={() => setEdit({ name: '', type: VENDOR_TYPES[0], contact: '', phone: '', area: '', rate: '', unit: 'per day', gstin: '' })}>Add Vendor</Button>} />
      <div className="chips">
        <button className={'chip ' + (type === 'all' ? 'active' : '')} onClick={() => setType('all')}>All ({list.length})</button>
        {VENDOR_TYPES.filter((t) => list.some((v) => v.type === t)).map((t) => (
          <button key={t} className={'chip ' + (type === t ? 'active' : '')} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>
      <div className="zc-list">
        <MiniTable
          rows={rows}
          columns={[
            { label: 'Vendor', render: (v) => <span><b>{v.name}</b><div className="tiny muted">{v.contact} - {v.phone}</div></span> },
            { label: 'Type', render: (v) => v.type },
            { label: 'Area', render: (v) => v.area },
            { label: 'Rate', align: 'right', render: (v) => `${inr(v.rate)} ${v.unit}` },
            { label: 'Rating', align: 'right', render: (v) => (v.rating ? v.rating.toFixed(1) : '-') },
            { label: 'Open POs', align: 'right', render: open },
            { label: 'Paid so far', align: 'right', render: (v) => inr(spent(v)) },
            { label: 'GSTIN', render: (v) => v.gstin || '-' },
            { label: '', render: (v) => <button className="zc-rl-link" onClick={() => setEdit(v)}>Edit</button> },
          ]}
        />
      </div>
      <Modal
        open={!!edit}
        title={edit && edit.id ? 'Edit vendor' : 'Add vendor'}
        onClose={() => setEdit(null)}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit || !edit.name.trim()} onClick={() => { actions.saveVendor(edit); setEdit(null); }}>Save</Button></>}
      >
        {edit && (
          <div className="grid grid-2">
            <Field label="Vendor name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Type">
              <select className="select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Contact person"><input className="input" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Area"><input className="input" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} /></Field>
            <Field label="GSTIN"><input className="input" value={edit.gstin || ''} onChange={(e) => setEdit({ ...edit, gstin: e.target.value.toUpperCase() })} /></Field>
            <Field label="Rate (₹)"><input className="input" type="number" value={edit.rate} onChange={(e) => setEdit({ ...edit, rate: e.target.value })} /></Field>
            <Field label="Rate unit">
              <select className="select" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>{['per day', 'per shoot', 'per photo', 'per album', 'per slot', 'per trip'].map((u) => <option key={u}>{u}</option>)}</select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- Vendor POs ----------
export function VendorPos() {
  const { state, actions } = useStore();
  const [view, setView] = useState('open');
  const [edit, setEdit] = useState(null);
  const vendors = state.vendors.filter((v) => v.partnerId === state.partnerId);
  const all = state.vendorPos.filter((p) => inScope(state, p));
  const rows = all.filter((p) => (view === 'open' ? !['paid', 'cancelled'].includes(p.status) : view === 'all' ? true : p.status === view));
  const shoots = state.bookings.filter((b) => inScope(state, b) && b.status !== 'cancelled').sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const next = { draft: 'sent', sent: 'confirmed', confirmed: 'delivered', delivered: 'paid' };
  const blank = () => ({ vendorId: (vendors[0] || {}).id || '', bookingId: '', title: '', needBy: todayISO(), lines: [{ desc: '', qty: 1, rate: (vendors[0] || {}).rate || 0 }], notes: '' });
  const total = (s) => all.filter((p) => p.status === s).reduce((a, p) => a + vpoTotal(p), 0);
  return (
    <div className="stack">
      <ModuleHeader title="Vendor POs" subtitle="Orders to freelancers, album printers and rental houses for a shoot. Paying one adds the cost to that shoot." actions={<Button icon="plus" onClick={() => setEdit(blank())}>Create Vendor PO</Button>} />
      <Kpis
        items={[
          { label: 'Open POs', value: all.filter((p) => !['paid', 'cancelled'].includes(p.status)).length },
          { label: 'Confirmed (to deliver)', value: inr(total('confirmed')) },
          { label: 'Delivered (to pay)', value: inr(total('delivered')) },
          { label: 'Paid', value: inr(total('paid')) },
        ]}
      />
      <Tabs tabs={[{ id: 'open', label: 'Open' }, ...VPO_STAGES.map((s) => ({ id: s, label: VPO_LABEL[s], count: all.filter((p) => p.status === s).length })), { id: 'all', label: 'All' }]} value={view} onChange={setView} />
      <div className="zc-list">
        <MiniTable
          rows={rows}
          columns={[
            { label: 'PO Number', render: (p) => <b>{p.number}</b> },
            { label: 'Vendor', render: (p) => (vendors.find((v) => v.id === p.vendorId) || {}).name || '-' },
            { label: 'For', render: (p) => p.title },
            { label: 'Shoot', render: (p) => { const b = state.bookings.find((x) => x.id === p.bookingId); return b ? <button className="zc-rl-link" onClick={() => navigate('/partner/bookings/' + b.id)}>{b.number}</button> : '-'; } },
            { label: 'Need By', render: (p) => fmtDate(p.needBy) },
            { label: 'Amount', align: 'right', render: (p) => inr(vpoTotal(p)) },
            { label: 'Status', render: (p) => <Badge tone={VPO_TONE[p.status]}>{VPO_LABEL[p.status]}</Badge> },
            {
              label: '',
              render: (p) =>
                next[p.status] ? (
                  <span className="row gap-s">
                    <button className="zc-rl-link" onClick={() => actions.setVendorPoStatus(p.id, next[p.status])}>Mark {VPO_LABEL[next[p.status]].toLowerCase()}</button>
                    {p.status === 'draft' && <button className="zc-rl-link" onClick={() => setEdit(p)}>Edit</button>}
                    <button className="zc-rl-link" onClick={() => actions.setVendorPoStatus(p.id, 'cancelled')}>Cancel</button>
                  </span>
                ) : null,
            },
          ]}
        />
      </div>
      <Modal
        open={!!edit}
        wide
        title={edit && edit.id ? `Edit ${edit.number}` : 'Create vendor PO'}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button
              disabled={!edit || !edit.vendorId || !edit.lines.some((l) => l.desc.trim())}
              onClick={() => {
                const lines = edit.lines.filter((l) => l.desc.trim()).map((l) => ({ ...l, qty: Number(l.qty) || 1, rate: Number(l.rate) || 0 }));
                actions.saveVendorPo({ ...edit, lines, title: edit.title || `${lines[0].desc}${edit.bookingId ? ' - ' + (leadOf(state, state.bookings.find((b) => b.id === edit.bookingId)).contactName || '') : ''}` });
                setEdit(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {edit && (
          <>
            <div className="grid grid-2">
              <Field label="Vendor">
                <select className="select" value={edit.vendorId} onChange={(e) => setEdit({ ...edit, vendorId: e.target.value })}>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
                </select>
              </Field>
              <Field label="For shoot (booking)">
                <select className="select" value={edit.bookingId} onChange={(e) => { const b = state.bookings.find((x) => x.id === e.target.value); setEdit({ ...edit, bookingId: e.target.value, needBy: b ? b.eventDate : edit.needBy }); }}>
                  <option value="">Studio use (no shoot)</option>
                  {shoots.map((b) => <option key={b.id} value={b.id}>{shootLabel(state, b)}</option>)}
                </select>
              </Field>
              <Field label="Need by"><input className="input" type="date" value={edit.needBy} onChange={(e) => setEdit({ ...edit, needBy: e.target.value })} /></Field>
              <Field label="Title (optional)"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Second shooter - Priya wedding" /></Field>
            </div>
            <div className="small muted mt-s mb-s">Items</div>
            {edit.lines.map((l, k) => (
              <div key={k} className="row gap-s mb-s">
                <input className="input" style={{ flex: 3 }} placeholder="Description" value={l.desc} onChange={(e) => setEdit({ ...edit, lines: edit.lines.map((x, j) => (j === k ? { ...x, desc: e.target.value } : x)) })} />
                <input className="input" style={{ flex: 1 }} type="number" placeholder="Qty" value={l.qty} onChange={(e) => setEdit({ ...edit, lines: edit.lines.map((x, j) => (j === k ? { ...x, qty: e.target.value } : x)) })} />
                <input className="input" style={{ flex: 1 }} type="number" placeholder="Rate" value={l.rate} onChange={(e) => setEdit({ ...edit, lines: edit.lines.map((x, j) => (j === k ? { ...x, rate: e.target.value } : x)) })} />
                <span style={{ width: 100, textAlign: 'right' }}>{inr((Number(l.qty) || 0) * (Number(l.rate) || 0))}</span>
              </div>
            ))}
            <div className="row between">
              <button className="link small" onClick={() => setEdit({ ...edit, lines: [...edit.lines, { desc: '', qty: 1, rate: 0 }] })}><Icon name="plus" size={12} /> Add item</button>
              <b>Total {inr(vpoTotal({ lines: edit.lines }))}</b>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
