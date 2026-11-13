// Operations widgets shared by the Partner CRM and the customer app:
// run sheet, inventory reservations, shipments, tastings / trials, coupon box.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../config';
import { useStore } from '../store';
import { checkCoupon } from '../ops';
import { Badge, Button, Field, Modal } from './ui';
import { MiniTable, Section } from './crm';

const SHIP_FLOW = ['packed', 'shipped', 'in_transit', 'delivered'];
const SHIP_LABEL = { packed: 'Packed', shipped: 'Shipped', in_transit: 'In transit', delivered: 'Delivered' };
export const TRIAL_TYPES = { catering: 'Food tasting', makeup: 'Makeup trial', venue: 'Venue site visit', decoration: 'Mood board meeting', mehendi: 'Design consultation', wedding_planner: 'Planning call', event_management: 'Planning call', photography: 'Pre-shoot meeting' };

// ---------- Run sheet (minute-by-minute plan for the day) ----------
export function RunSheet({ booking, editable, compact }) {
  const { state, actions } = useStore();
  const [f, setF] = useState({ time: '', item: '', owner: '' });
  const rows = state.runSheets[booking.id] || [];
  if (compact) {
    if (!rows.length) return null;
    return (
      <div className="stack-s">
        {rows.map((r) => (
          <div key={r.id} className="row gap-s small">
            <b style={{ width: 90 }}>{r.time}</b>
            <span className="grow">{r.item}</span>
            <span className="muted">{r.owner}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Section id="runsheet" title="Run Sheet (event day)" count={rows.length} actions={<span className="small muted">Shared with crew and customer</span>}>
      <MiniTable
        rows={rows}
        empty="No run sheet yet. Add the timings for the day."
        columns={[
          { label: 'Time', render: (r) => <b>{r.time}</b> },
          { label: 'What happens', render: (r) => <span style={{ textDecoration: r.done ? 'line-through' : 'none' }}>{r.item}</span> },
          { label: 'Owner', render: (r) => r.owner },
          {
            label: '',
            align: 'right',
            render: (r) =>
              editable ? (
                <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                  <button className="zc-rl-link" onClick={() => actions.runSheetItem(booking.id, 'update', { id: r.id, done: !r.done })}>
                    {r.done ? 'Undo' : 'Done'}
                  </button>
                  <button className="zc-rl-link" onClick={() => actions.runSheetItem(booking.id, 'remove', r)}>
                    Remove
                  </button>
                </span>
              ) : null,
          },
        ]}
      />
      {editable && (
        <div className="row gap-s mt-s">
          <input className="input input-sm" style={{ width: 110 }} placeholder="06:30" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="Time" />
          <input className="input input-sm" placeholder="What happens" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} aria-label="Run sheet item" />
          <input className="input input-sm" style={{ width: 170 }} placeholder="Owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} aria-label="Owner" />
          <button
            className="zc-btn zc-btn-primary"
            disabled={!f.time || !f.item}
            onClick={() => {
              actions.runSheetItem(booking.id, 'add', f);
              setF({ time: '', item: '', owner: '' });
            }}
          >
            Add
          </button>
        </div>
      )}
    </Section>
  );
}

// ---------- Inventory reserved for a booking ----------
export const reservedOn = (state, itemId, date, exceptBooking) => state.reservations.filter((r) => r.itemId === itemId && r.date === date && r.bookingId !== exceptBooking).reduce((a, r) => a + r.qty, 0);

export function InventorySection({ booking, editable }) {
  const { state, actions } = useStore();
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState(1);
  const items = state.inventory.filter((i) => i.partnerId === booking.partnerId);
  if (!items.length) return null;
  const rows = state.reservations.filter((r) => r.bookingId === booking.id).map((r) => ({ ...r, item: items.find((i) => i.id === r.itemId) || {} }));
  const pick = items.find((i) => i.id === itemId);
  const free = pick ? pick.qty - reservedOn(state, pick.id, booking.eventDate, booking.id) : 0;
  return (
    <Section id="inventory" title="Equipment & Inventory" count={rows.length} actions={<span className="small muted">Reserved for {fmtDate(booking.eventDate)}</span>}>
      <MiniTable
        rows={rows}
        empty="Nothing reserved yet."
        columns={[
          { label: 'Item', render: (r) => r.item.name },
          { label: 'Group', render: (r) => r.item.group },
          { label: 'Reserved', align: 'right', render: (r) => r.qty },
          { label: 'Stock left that day', align: 'right', render: (r) => r.item.qty - reservedOn(state, r.itemId, booking.eventDate, booking.id) - r.qty },
          { label: '', align: 'right', render: (r) => (editable ? <button className="zc-rl-link" onClick={() => actions.releaseReservation(r.id)}>Release</button> : null) },
        ]}
      />
      {editable && (
        <div className="row gap-s mt-s">
          <select className="select input-sm" value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Item">
            <option value="">Reserve an item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.qty - reservedOn(state, i.id, booking.eventDate, booking.id)} free that day)
              </option>
            ))}
          </select>
          <input className="input input-sm" style={{ width: 90 }} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
          <button className="zc-btn zc-btn-primary" disabled={!pick || qty < 1 || qty > free} onClick={() => actions.reserveItem(booking.id, itemId, qty)}>
            Reserve
          </button>
          {pick && qty > free && <span className="small red">Only {free} free on this date</span>}
        </div>
      )}
    </Section>
  );
}

// ---------- Shipments (gifts, invitations, albums) ----------
export function ShipmentsSection({ booking, editable }) {
  const { state, actions } = useStore();
  const [item, setItem] = useState('');
  const rows = state.shipments.filter((s) => s.bookingId === booking.id);
  const listing = state.listings.find((l) => l.id === booking.listingId) || {};
  if (!rows.length && !['return_gifts', 'invitation', 'photography'].includes(listing.category)) return null;
  return (
    <Section id="shipments" title="Shipments" count={rows.length}>
      <MiniTable
        rows={rows}
        empty="Nothing shipped yet."
        columns={[
          { label: 'Item', render: (r) => r.item },
          { label: 'Courier', render: (r) => r.courier + (r.awb ? ' - ' + r.awb : '') },
          { label: 'Deliver to', render: (r) => r.address },
          { label: 'ETA', render: (r) => fmtDate(r.eta) },
          { label: 'Status', render: (r) => <Badge tone={{ packed: 'gray', shipped: 'blue', in_transit: 'amber', delivered: 'green' }[r.status]}>{SHIP_LABEL[r.status]}</Badge> },
          {
            label: '',
            align: 'right',
            render: (r) => {
              const next = SHIP_FLOW[SHIP_FLOW.indexOf(r.status) + 1];
              return editable && next ? <button className="zc-rl-link" onClick={() => actions.setShipmentStatus(r.id, next)}>Mark {SHIP_LABEL[next].toLowerCase()}</button> : null;
            },
          },
        ]}
      />
      {editable && (
        <div className="row gap-s mt-s">
          <input className="input input-sm" placeholder="What is being sent (e.g. 400 return gifts)" value={item} onChange={(e) => setItem(e.target.value)} aria-label="Shipment item" />
          <button
            className="zc-btn zc-btn-primary"
            disabled={!item}
            onClick={() => {
              actions.addShipment(booking.id, item, 'Own van');
              setItem('');
            }}
          >
            Create shipment
          </button>
        </div>
      )}
    </Section>
  );
}

// Customer-side tracking card content.
export function ShipmentTracking({ booking }) {
  const { state } = useStore();
  const rows = state.shipments.filter((s) => s.bookingId === booking.id);
  if (!rows.length) return null;
  return (
    <div className="stack">
      {rows.map((r) => {
        const idx = SHIP_FLOW.indexOf(r.status);
        return (
          <div key={r.id}>
            <div className="row between">
              <b>{r.item}</b>
              <span className="small muted">
                {r.courier}
                {r.awb ? ' - ' + r.awb : ''}
              </span>
            </div>
            <div className="row gap-xs mt-s">
              {SHIP_FLOW.map((st, i) => (
                <span key={st} className={'badge badge-' + (i <= idx ? 'green' : 'gray')}>
                  {SHIP_LABEL[st]}
                </span>
              ))}
            </div>
            <div className="tiny muted mt-s">{r.status === 'delivered' ? `Delivered ${fmtDate(r.deliveredAt)}` : `Expected by ${fmtDate(r.eta)}`}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Tastings / trials / site visits ----------
export function TrialsSection({ lead, side = 'partner' }) {
  const { state, actions } = useStore();
  const listing = state.listings.find((l) => l.id === lead.listingId) || {};
  const type = TRIAL_TYPES[listing.category];
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: todayISO(), time: '11:00', people: 4, notes: '' });
  if (!type) return null;
  const rows = state.trials.filter((t) => t.leadId === lead.id);
  const body = (
    <>
      <MiniTable
        rows={rows}
        empty={`No ${type.toLowerCase()} scheduled.`}
        columns={[
          { label: 'Type', render: (t) => t.type },
          { label: 'When', render: (t) => `${fmtDate(t.date)} at ${t.time}` },
          { label: 'People', align: 'right', render: (t) => t.people },
          { label: 'Status', render: (t) => <Badge tone={{ scheduled: 'blue', done: 'green', cancelled: 'gray' }[t.status]}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge> },
          { label: 'Notes', render: (t) => t.notes || '-' },
          {
            label: '',
            align: 'right',
            render: (t) =>
              t.status === 'scheduled' ? (
                <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                  {side === 'partner' && (
                    <button className="zc-rl-link" onClick={() => actions.setTrialStatus(t.id, 'done', t.notes || 'Done')}>
                      Mark done
                    </button>
                  )}
                  <button className={side === 'partner' ? 'zc-rl-link' : 'link small'} onClick={() => actions.setTrialStatus(t.id, 'cancelled')}>
                    Cancel
                  </button>
                </span>
              ) : null,
          },
        ]}
      />
      <button className={side === 'partner' ? 'zc-rl-link mt-s' : 'link small mt-s'} onClick={() => setOpen(true)}>
        + Schedule {type.toLowerCase()}
      </button>
      <Modal
        open={open}
        title={`Schedule ${type.toLowerCase()}`}
        onClose={() => setOpen(false)}
        footer={
          <Button
            onClick={() => {
              actions.scheduleTrial(lead.id, { ...f, type, people: Number(f.people) || 1 }, side);
              setOpen(false);
            }}
          >
            Schedule
          </Button>
        }
      >
        <div className="grid grid-3">
          <Field label="Date">
            <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <input className="input" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </Field>
          <Field label="People coming">
            <input className="input" type="number" value={f.people} onChange={(e) => setF({ ...f, people: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Want to taste the Chettinad menu" />
        </Field>
      </Modal>
    </>
  );
  if (side === 'customer') return body;
  return (
    <Section id="trials" title={`${type}s & Visits`} count={rows.length}>
      {body}
    </Section>
  );
}

// ---------- Coupon box (customer, before the first payment) ----------
export function CouponBox({ booking }) {
  const { state, actions } = useStore();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const applied = state.redemptions.find((r) => r.bookingId === booking.id);
  if (applied)
    return (
      <div className="notice notice-success">
        <span>
          Coupon <b>{applied.code}</b> applied: {inr(applied.amount)} off.
        </span>
      </div>
    );
  const offers = state.coupons.filter((c) => c.active && c.validTill >= todayISO() && (!c.partnerId || c.partnerId === booking.partnerId) && booking.total >= c.minAmount);
  return (
    <div className="stack-s">
      <div className="row gap-s">
        <input className="input" placeholder="Coupon code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} aria-label="Coupon code" />
        <Button
          variant="secondary"
          disabled={!code}
          onClick={() => {
            const chk = checkCoupon(state, booking, code);
            if (!chk.ok) setErr(chk.error);
            else actions.applyCoupon(booking.id, code);
          }}
        >
          Apply
        </Button>
      </div>
      {err && <div className="small red">{err}</div>}
      {offers.length > 0 && (
        <div className="chips">
          {offers.map((c) => (
            <button key={c.id} className="chip" style={{ height: 28, fontSize: 12 }} onClick={() => setCode(c.code)} title={c.title}>
              {c.code} - {c.type === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
