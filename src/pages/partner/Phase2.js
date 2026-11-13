// Partner CRM: inventory, crew leave, payouts, credit notes and the Setup pages
// for availability, pricing rules and add-ons, service areas and hours, FAQs.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../../config';
import { Link, navigate } from '../../router';
import { useStore } from '../../store';
import { Avatar, Badge, Button, Card, Field, Modal } from '../../components/ui';
import { ListView, MiniTable, ModuleHeader, Section } from '../../components/crm';
import { AVAIL_LABEL, AVAIL_MODEL, WEEKDAYS, buildPayouts } from '../../ops';
import { MUHURTHAM_DATES } from '../../data/masters';
import { reservedOn } from '../../components/Ops';
import { inScope } from '../../accounts';

const myListing = (state) => state.listings.find((l) => l.partnerId === state.partnerId);

// ---------- Inventory ----------
export function Inventory() {
  const { state, actions } = useStore();
  const [edit, setEdit] = useState(null);
  const [date, setDate] = useState(() => {
    const next = state.reservations.filter((r) => state.inventory.some((i) => i.id === r.itemId && inScope(state, i)) && r.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0];
    return next ? next.date : todayISO();
  });
  const items = state.inventory.filter((i) => inScope(state, i));
  const res = state.reservations.filter((r) => items.some((i) => i.id === r.itemId));
  const busy = [...new Set(res.filter((r) => r.date >= todayISO()).map((r) => r.date))].sort().slice(0, 8);
  return (
    <>
      <ModuleHeader title="Inventory" subtitle="Equipment and stock you own. Reservations stop two events on the same day from using more than you have." actions={<button className="zc-btn zc-btn-primary" onClick={() => setEdit({ name: '', qty: 1, group: '' })}>Add Item</button>} />
      <div className="row gap-s wrap mb">
        <span className="small muted">Check a date:</span>
        <input className="input input-sm" type="date" style={{ width: 170 }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        {busy.map((d) => (
          <button key={d} className={'chip ' + (d === date ? 'active' : '')} style={{ height: 28, fontSize: 12 }} onClick={() => setDate(d)}>
            {fmtDate(d)}
          </button>
        ))}
      </div>
      <div className="zc-list">
        <div className="zc-table-wrap">
          <table className="zc-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Group</th>
                <th style={{ textAlign: 'right' }}>Owned</th>
                <th style={{ textAlign: 'right' }}>Reserved on {fmtDate(date)}</th>
                <th style={{ textAlign: 'right' }}>Free</th>
                <th>Bookings using it</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const used = reservedOn(state, i.id, date);
                const bks = res.filter((r) => r.itemId === i.id && r.date === date).map((r) => state.bookings.find((b) => b.id === r.bookingId)).filter(Boolean);
                return (
                  <tr key={i.id}>
                    <td>
                      <b>{i.name}</b>
                    </td>
                    <td>{i.group}</td>
                    <td style={{ textAlign: 'right' }}>{i.qty}</td>
                    <td style={{ textAlign: 'right' }}>{used}</td>
                    <td style={{ textAlign: 'right' }} className={i.qty - used <= 0 ? 'red' : 'green'}>
                      {i.qty - used}
                    </td>
                    <td>
                      {bks.map((b) => (
                        <button key={b.id} className="zc-rl-link" onClick={() => navigate('/partner/bookings/' + b.id)}>
                          {b.number}{' '}
                        </button>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="zc-rl-link" onClick={() => setEdit(i)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Modal
        open={!!edit}
        title={edit && edit.id ? 'Edit item' : 'Add item'}
        onClose={() => setEdit(null)}
        footer={
          <Button
            disabled={!edit || !edit.name}
            onClick={() => {
              actions.saveInventoryItem({ ...edit, qty: Number(edit.qty) || 0 });
              setEdit(null);
            }}
          >
            Save
          </Button>
        }
      >
        {edit && (
          <div className="grid grid-3">
            <Field label="Item">
              <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Group">
              <input className="input" value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })} />
            </Field>
            <Field label="Quantity owned">
              <input className="input" type="number" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------- Crew leave (used inside the Crew page) ----------
export function LeaveCard() {
  const { state, actions } = useStore();
  const members = state.members.filter((m) => inScope(state, m) && m.status === 'active');
  const [f, setF] = useState({ memberId: '', date: todayISO(), reason: 'Personal' });
  const rows = state.leaves.filter((l) => l.partnerId === state.partnerId && l.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date));
  const name = (id) => (members.find((m) => m.id === id) || {}).name || '-';
  return (
    <Card title="Leave and unavailable days" subtitle="Members on leave can't be assigned to an event that day." className="mt">
      <MiniTable
        rows={rows}
        empty="No upcoming leave."
        columns={[
          { label: 'Member', render: (l) => <span className="row gap-s"><Avatar name={name(l.memberId)} size={22} /> {name(l.memberId)}</span> },
          { label: 'Date', render: (l) => fmtDate(l.date) },
          { label: 'Reason', render: (l) => l.reason },
          { label: 'Clash', render: (l) => (state.crew.some((c) => c.memberId === l.memberId && (state.bookings.find((b) => b.id === c.bookingId) || {}).eventDate === l.date) ? <Badge tone="red">Assigned that day</Badge> : '-') },
          { label: '', align: 'right', render: (l) => <button className="zc-rl-link" onClick={() => actions.removeLeave(l.id)}>Remove</button> },
        ]}
      />
      <div className="row gap-s mt-s">
        <select className="select input-sm" value={f.memberId} onChange={(e) => setF({ ...f, memberId: e.target.value })} aria-label="Member">
          <option value="">Member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input className="input input-sm" type="date" style={{ width: 160 }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Leave date" />
        <input className="input input-sm" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} aria-label="Reason" />
        <button className="zc-btn zc-btn-primary" disabled={!f.memberId} onClick={() => actions.addLeave(f.memberId, f.date, f.reason)}>
          Add leave
        </button>
      </div>
    </Card>
  );
}

// ---------- Payouts ----------
export function Payouts() {
  const { state } = useStore();
  const [open, setOpen] = useState(null);
  const rows = buildPayouts(state).filter((p) => p.partnerId === state.partnerId);
  const bank = { name: 'Indian Overseas Bank', last4: '4417' };
  return (
    <>
      <ListView
        module={{ singular: 'Payout', plural: 'Payouts' }}
        rows={rows}
        onRow={setOpen}
        views={[
          { id: 'all', label: 'All Payouts', filter: () => true },
          { id: 'next', label: 'Upcoming', filter: (p) => ['scheduled', 'processing', 'on_hold'].includes(p.status) },
          { id: 'paid', label: 'Paid', filter: (p) => p.status === 'paid' },
        ]}
        toolbarExtra={<span className="small muted">Settled to {bank.name} XXXX{bank.last4} every week, {state.settings.payoutHoldDays} days after the week ends</span>}
        columns={[
          { key: 'period', label: 'Collection Week', sortValue: (p) => p.week },
          { key: 'count', label: 'Payments', align: 'right', render: (p) => p.items.length, sortValue: (p) => p.items.length },
          { key: 'gross', label: 'Collected in App', align: 'right', render: (p) => inr(p.gross) },
          { key: 'refunds', label: 'Refunds', align: 'right', render: (p) => (p.refunds ? '-' + inr(p.refunds) : '-') },
          { key: 'tds', label: 'TDS 1% (194-O)', align: 'right', render: (p) => '-' + inr(p.tds) },
          { key: 'net', label: 'Net Payout', align: 'right', render: (p) => <b>{inr(p.net)}</b> },
          { key: 'payDate', label: 'Pay Date', render: (p) => fmtDate(p.payDate) },
          { key: 'status', label: 'Status', render: (p) => <span><Badge status={p.status} /> {p.note && <span className="tiny muted">{p.note}</span>}</span> },
          { key: 'utr', label: 'UTR', render: (p) => p.utr || '-' },
        ]}
      />
      <Modal open={!!open} title={open ? `Payout for ${open.period}` : ''} onClose={() => setOpen(null)} wide>
        {open && (
          <MiniTable
            rows={open.items}
            columns={[
              { label: 'Invoice', render: (i) => i.invoiceNumber },
              { label: 'Installment', render: (i) => i.label },
              { label: 'Paid On', render: (i) => fmtDate(i.at) },
              { label: 'Method', render: (i) => i.method },
              { label: 'Amount', align: 'right', render: (i) => inr(i.amount) },
            ]}
          />
        )}
      </Modal>
    </>
  );
}

// ---------- Credit notes ----------
export function CreditNotes() {
  const { state } = useStore();
  const rows = state.creditNotes.filter((c) => c.partnerId === state.partnerId);
  return (
    <ListView
      module={{ singular: 'Credit Note', plural: 'Credit Notes' }}
      rows={rows}
      columns={[
        { key: 'number', label: 'Credit Note' },
        { key: 'invoiceNumber', label: 'Against Invoice' },
        { key: 'customer', label: 'Customer' },
        { key: 'reason', label: 'Reason' },
        { key: 'amount', label: 'Amount', align: 'right', render: (c) => inr(c.amount) },
        { key: 'gst', label: 'GST Reversed', align: 'right', render: (c) => (c.gst ? inr(c.gst) : '-') },
        { key: 'issuedAt', label: 'Issued', render: (c) => fmtDate(c.issuedAt) },
      ]}
    />
  );
}

// ---------- Setup: availability ----------
export function AvailabilitySetup() {
  const { state, actions } = useStore();
  const l = myListing(state);
  const a = l.availability || {};
  const model = AVAIL_MODEL[l.category] || 'capacity';
  const set = (patch) => actions.saveListing(l.id, { availability: { ...a, ...patch } });
  return (
    <div className="stack">
      <Section title="How your availability works">
        <p className="small">
          Model for {l.title}: <b>{AVAIL_LABEL[model]}</b>.{' '}
          {model === 'delivery' ? 'Customers can pick any date that leaves you enough lead time to produce and deliver.' : model === 'slot' ? 'Each hall and session is booked separately; a date is taken when every hall is booked.' : 'A date is taken when all your teams are booked.'} Accepted quotes hold the date for 48 hours; the hold lapses if the advance is not paid.
        </p>
      </Section>
      <Section title="Rules">
        <div className="grid grid-3">
          {model !== 'delivery' && (
            <Field label={model === 'slot' ? 'Halls / sessions per day' : 'Events you can take per day'}>
              <input className="input" type="number" min={1} value={a.capacity || 1} onChange={(e) => set({ capacity: Number(e.target.value) || 1 })} />
            </Field>
          )}
          {model === 'delivery' && (
            <>
              <Field label="Lead time (days)">
                <input className="input" type="number" min={1} value={a.leadDays || 10} onChange={(e) => set({ leadDays: Number(e.target.value) || 1 })} />
              </Field>
              <Field label="Orders you can deliver per day">
                <input className="input" type="number" min={1} value={a.dailyOrders || 6} onChange={(e) => set({ dailyOrders: Number(e.target.value) || 1 })} />
              </Field>
            </>
          )}
        </div>
        <Field label="Closed every week on">
          <div className="chips">
            {WEEKDAYS.map((d, i) => {
              const on = (a.closedWeekdays || []).includes(i);
              return (
                <button key={d} className={'chip ' + (on ? 'active' : '')} onClick={() => set({ closedWeekdays: on ? a.closedWeekdays.filter((x) => x !== i) : [...(a.closedWeekdays || []), i] })}>
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <p className="tiny muted">Block single dates from the Calendar. Changes apply to new enquiries straight away.</p>
      </Section>
    </div>
  );
}

// ---------- Setup: pricing rules and add-ons ----------
export function PricingSetup() {
  const { state, actions } = useStore();
  const l = myListing(state);
  const rules = l.pricingRules || [];
  const [r, setR] = useState({ name: 'Muhurtham day', type: 'muhurtham', pct: 15, from: '12-15', to: '12-31' });
  const [ad, setAd] = useState({ name: '', price: '' });
  const upcoming = MUHURTHAM_DATES.filter((m) => m.date >= todayISO()).slice(0, 10);
  return (
    <div className="stack">
      <Section title="Date-based pricing" count={rules.length}>
        <MiniTable
          rows={rules}
          empty="No pricing rules. Your package prices apply on every date."
          columns={[
            { label: 'Rule', render: (x) => x.name },
            { label: 'Applies on', render: (x) => (x.type === 'muhurtham' ? 'Muhurtham days' : x.type === 'weekend' ? 'Saturdays and Sundays' : `${x.from} to ${x.to} every year`) },
            { label: 'Change', align: 'right', render: (x) => `+${x.pct}%` },
            {
              label: 'Active',
              render: (x) => <input type="checkbox" checked={x.active !== false} onChange={() => actions.saveListing(l.id, { pricingRules: rules.map((y) => (y.id === x.id ? { ...y, active: y.active === false } : y)) })} aria-label={'Active ' + x.name} />,
            },
            { label: '', align: 'right', render: (x) => <button className="zc-rl-link" onClick={() => actions.saveListing(l.id, { pricingRules: rules.filter((y) => y.id !== x.id) })}>Remove</button> },
          ]}
        />
        <div className="row gap-s mt-s wrap">
          <input className="input input-sm" style={{ width: 200 }} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} aria-label="Rule name" />
          <select className="select input-sm" style={{ width: 150 }} value={r.type} onChange={(e) => setR({ ...r, type: e.target.value })} aria-label="Rule type">
            <option value="muhurtham">Muhurtham days</option>
            <option value="weekend">Weekends</option>
            <option value="season">Season (MM-DD)</option>
          </select>
          {r.type === 'season' && (
            <>
              <input className="input input-sm" style={{ width: 80 }} value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} aria-label="From" />
              <input className="input input-sm" style={{ width: 80 }} value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} aria-label="To" />
            </>
          )}
          <input className="input input-sm" style={{ width: 80 }} type="number" value={r.pct} onChange={(e) => setR({ ...r, pct: e.target.value })} aria-label="Percent" />
          <span className="small">%</span>
          <button className="zc-btn zc-btn-primary" onClick={() => actions.saveListing(l.id, { pricingRules: [...rules, { ...r, id: 'pr' + Date.now(), pct: Number(r.pct) || 0, active: true }] })}>
            Add rule
          </button>
        </div>
        <p className="tiny muted mt-s">Rules add a line to quotes built with "Fill from enquiry". Next muhurtham days: {upcoming.map((m) => fmtDate(m.date)).join(', ')}.</p>
      </Section>
      <Section title="Add-ons" count={l.addons.length}>
        <MiniTable
          rows={l.addons}
          columns={[
            { label: 'Add-on', render: (x) => x.name },
            { label: 'Price', align: 'right', render: (x) => inr(x.price) },
            { label: '', align: 'right', render: (x) => <button className="zc-rl-link" onClick={() => actions.saveListing(l.id, { addons: l.addons.filter((y) => y.id !== x.id) })}>Remove</button> },
          ]}
        />
        <div className="row gap-s mt-s">
          <input className="input input-sm" placeholder="e.g. Drone coverage" value={ad.name} onChange={(e) => setAd({ ...ad, name: e.target.value })} aria-label="Add-on name" />
          <input className="input input-sm" style={{ width: 120 }} type="number" placeholder="Price" value={ad.price} onChange={(e) => setAd({ ...ad, price: e.target.value })} aria-label="Add-on price" />
          <button
            className="zc-btn zc-btn-primary"
            disabled={!ad.name || !ad.price}
            onClick={() => {
              actions.saveListing(l.id, { addons: [...l.addons, { id: 'ad' + Date.now(), name: ad.name, price: Number(ad.price) }] });
              setAd({ name: '', price: '' });
            }}
          >
            Add
          </button>
        </div>
      </Section>
    </div>
  );
}

// ---------- Setup: service areas and hours ----------
export function ServiceSetup() {
  const { state, actions } = useStore();
  const l = myListing(state);
  const h = l.hours || {};
  const areas = l.serviceAreas || [];
  const setH = (k, v) => actions.saveListing(l.id, { hours: { ...h, [k]: v } });
  return (
    <div className="stack">
      <Section title="Business hours">
        <div className="grid grid-2">
          {[['weekdays', 'Mon - Fri'], ['saturday', 'Saturday'], ['sunday', 'Sunday'], ['chatReply', 'Chat reply promise']].map(([k, label]) => (
            <Field key={k} label={label}>
              <input className="input" value={h[k] || ''} onChange={(e) => setH(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Section>
      {areas.length > 0 && (
        <Section title="Service areas and travel charges" count={areas.length}>
          <MiniTable
            rows={areas.map((a) => ({ ...a, id: a.area }))}
            columns={[
              { label: 'Area', render: (a) => a.area + (a.area === l.area ? ' (base)' : '') },
              {
                label: 'Travel charge',
                align: 'right',
                render: (a) => <input className="input input-sm right" style={{ width: 110 }} type="number" value={a.travelCharge} onChange={(e) => actions.saveListing(l.id, { serviceAreas: areas.map((x) => (x.area === a.area ? { ...x, travelCharge: Number(e.target.value) || 0 } : x)) })} aria-label={'Travel to ' + a.area} />,
              },
            ]}
          />
          <p className="tiny muted mt-s">The travel charge is added to quotes when the customer's event is in that area.</p>
        </Section>
      )}
      <Section title="Other products">
        <p className="small muted">
          Each product (Photography, Decoration, Return Gifts, ...) is its own business in your account, with its own listing, CRM module and branches.{' '}
          <Link to="/partner/products" className="link">
            See my products
          </Link>
        </p>
      </Section>
    </div>
  );
}

// ---------- Setup: FAQs ----------
export function FaqSetup() {
  const { state, actions } = useStore();
  const l = myListing(state);
  const faqs = l.faqs || [];
  const [f, setF] = useState({ q: '', a: '' });
  return (
    <Section title="Questions customers ask" count={faqs.length}>
      <div className="stack">
        {faqs.map((x) => (
          <div key={x.id} className="row between gap-s">
            <div className="grow">
              <b>{x.q}</b>
              <div className="small muted">{x.a}</div>
            </div>
            <button className="zc-rl-link" onClick={() => actions.saveListing(l.id, { faqs: faqs.filter((y) => y.id !== x.id) })}>
              Remove
            </button>
          </div>
        ))}
        <Field label="Question">
          <input className="input" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </Field>
        <Field label="Answer">
          <textarea className="textarea" value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} />
        </Field>
        <div>
          <button
            className="zc-btn zc-btn-primary"
            disabled={!f.q || !f.a}
            onClick={() => {
              actions.saveListing(l.id, { faqs: [...faqs, { id: 'fq' + Date.now(), ...f }] });
              setF({ q: '', a: '' });
            }}
          >
            Add FAQ
          </button>
        </div>
      </div>
    </Section>
  );
}
