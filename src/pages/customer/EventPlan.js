// Customer event planner: one event, several functions, with guests / RSVP,
// the host's own budget tracker (bookings + off-platform spends), a checklist
// from the event-type template and family co-planners.
import { useState } from 'react';
import { daysBetween, fmtDate, inr, inrShort, todayISO } from '../../config';
import { Link } from '../../router';
import { customerStage, invoiceTotals, useStore } from '../../store';
import { Badge, Button, Card, Empty, Field, Icon, LinkButton, Modal, PageHeader, Tabs } from '../../components/ui';
import { categoryOf } from '../../components/Shared';
import { EventForm } from './Account';

const bookingsForEvent = (state, eventId) =>
  state.leads
    .filter((l) => l.eventId === eventId && l.customerId === state.customerId)
    .map((l) => ({ lead: l, booking: state.bookings.find((b) => b.id === l.bookingId), listing: state.listings.find((x) => x.id === l.listingId) }));

const RSVP = { yes: 'Coming', no: 'Not coming', maybe: 'Maybe', pending: 'No reply' };

export function EventDetail({ id }) {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const e = state.events.find((x) => x.id === id);
  if (!e) return <Empty title="Event not found" />;
  const items = bookingsForEvent(state, e.id);
  const active = items.filter((i) => !i.booking || i.booking.status !== 'cancelled');
  const committed = active.filter((i) => i.booking).reduce((s, i) => s + i.booking.total, 0);
  const paidVendors = active
    .filter((i) => i.booking)
    .reduce((s, i) => {
      const inv = state.invoices.find((x) => x.id === i.booking.invoiceId);
      return s + (inv ? invoiceTotals(inv).paid : 0);
    }, 0);
  const off = (e.budgetItems || []).reduce((a, b) => a + (b.spent || 0), 0);
  const guests = e.guestList || [];
  const heads = guests.reduce((a, g) => a + g.count, 0);
  const coming = guests.filter((g) => g.rsvp === 'yes').reduce((a, g) => a + g.count, 0);
  const checklist = e.checklist || [];
  const days = daysBetween(todayISO(), e.date);
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'functions', label: 'Functions', count: (e.functions || []).length },
    { id: 'guests', label: 'Guests & RSVP', count: guests.length },
    { id: 'budget', label: 'Budget' },
    { id: 'checklist', label: 'Checklist', count: checklist.filter((c) => !c.done).length },
    { id: 'family', label: 'Family', count: (e.collaborators || []).length },
  ];
  return (
    <div className="container section">
      <PageHeader
        back="/events"
        title={e.title}
        subtitle={`${e.type} - ${fmtDate(e.date)} - ${e.area} - ${e.guests} guests${days >= 0 ? ` - in ${days} days` : ''}`}
        actions={
          <>
            <Button variant="secondary" icon="edit" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <LinkButton to="/browse" icon="search">
              Find partners
            </LinkButton>
          </>
        }
      />
      <div className="grid grid-4 mb">
        <div className="stat">
          <span className="small muted">Budget</span>
          <div className="stat-value">{inrShort(e.budget)}</div>
        </div>
        <div className="stat">
          <span className="small muted">Committed (bookings + other spends)</span>
          <div className="stat-value">{inrShort(committed + off)}</div>
          <div className="small muted">{Math.round(((committed + off) / (e.budget || 1)) * 100)}% of budget</div>
        </div>
        <div className="stat">
          <span className="small muted">Guests confirmed</span>
          <div className="stat-value">{coming}</div>
          <div className="small muted">of {heads} invited</div>
        </div>
        <div className="stat">
          <span className="small muted">Checklist</span>
          <div className="stat-value">
            {checklist.filter((c) => c.done).length}/{checklist.length}
          </div>
          <div className="small muted">{checklist.filter((c) => !c.done && c.due < todayISO()).length} overdue</div>
        </div>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt">
        {tab === 'overview' && <Overview e={e} active={active} />}
        {tab === 'functions' && <Functions e={e} active={active} />}
        {tab === 'guests' && <Guests e={e} />}
        {tab === 'budget' && <Budget e={e} active={active} committed={committed} paidVendors={paidVendors} />}
        {tab === 'checklist' && <Checklist e={e} />}
        {tab === 'family' && <Family e={e} />}
      </div>
      <Modal open={edit} title="Edit event" onClose={() => setEdit(false)} wide>
        <EventForm
          initial={e}
          onCancel={() => setEdit(false)}
          onSave={(f) => {
            actions.updateEvent(e.id, f);
            setEdit(false);
          }}
        />
      </Modal>
    </div>
  );
}

// What the host still needs, per function and category, and where each one stands.
function Overview({ e, active }) {
  const { state } = useStore();
  const shortlist = state.favourites.filter((f) => f.eventId === e.id).map((f) => state.listings.find((l) => l.id === f.listingId)).filter(Boolean);
  const statusFor = (catId) => {
    const it = active.find((i) => i.listing && i.listing.category === catId);
    if (!it) return null;
    return { stage: customerStage(it.lead, it.booking), it };
  };
  const fnsFor = (catId) => (e.functions || []).filter((f) => (f.categories || []).includes(catId)).map((f) => f.name);
  const needs = e.needs.length ? e.needs : state.categories.map((c) => c.id);
  const done = needs.filter((c) => {
    const s = statusFor(c);
    return s && ['Booked', 'Completed', 'Reviewed'].includes(s.stage);
  }).length;
  return (
    <div className="grid grid-side">
      <Card title="What you need" subtitle={`${done} of ${needs.length} booked. Each need is linked to the functions it covers.`}>
        <div className="progress brand mb">
          <span style={{ width: (done / (needs.length || 1)) * 100 + '%' }} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {needs.map((catId) => {
                const c = categoryOf(state, catId);
                const s = statusFor(catId);
                const fns = fnsFor(catId);
                return (
                  <tr key={catId}>
                    <td style={{ width: 40 }}>
                      <span className="cat-icon" style={{ width: 34, height: 34 }}>
                        <Icon name={c.icon} size={16} />
                      </span>
                    </td>
                    <td>
                      <b>{c.name}</b>
                      <div className="small muted">{s ? s.it.listing.title : fns.length ? fns.join(', ') : 'All functions'}</div>
                    </td>
                    <td>{s ? <Badge status={s.stage} /> : <Badge tone="gray">Not started</Badge>}</td>
                    <td className="right">
                      {s ? (
                        <Link to={'/bookings/' + s.it.lead.id} className="link small">
                          Open
                        </Link>
                      ) : (
                        <Link to={'/browse?cat=' + catId} className="link small">
                          Find
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="stack">
        <Card title="Functions">
          {(e.functions || []).length === 0 ? (
            <p className="muted small">Add functions like Nichayathartham, Mehendi or Reception in the Functions tab.</p>
          ) : (
            <div className="stack-s">
              {e.functions.map((f) => (
                <div key={f.id} className="row between small">
                  <span>
                    <b>{f.name}</b>
                    <div className="muted">{f.venue}</div>
                  </span>
                  <span className="right">
                    {fmtDate(f.date)}
                    <div className="muted">{f.time}</div>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Shortlisted for this event">
          {shortlist.length === 0 ? (
            <p className="muted small">Tap the heart on any partner to shortlist.</p>
          ) : (
            <div className="stack-s">
              {shortlist.map((l) => (
                <Link key={l.id} to={'/vendor/' + l.id} className="row between small">
                  <b>{l.title}</b>
                  <span className="muted">{categoryOf(state, l.category).name}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Functions({ e, active }) {
  const { state, actions } = useStore();
  const blank = { name: '', date: e.date, time: '10:00', venue: '', guests: e.guests, categories: [] };
  const [form, setForm] = useState(null);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const vendorFor = (catId) => active.find((i) => i.listing && i.listing.category === catId && i.booking);
  return (
    <>
      <div className="row between mb">
        <p className="muted small">Each function has its own date, venue, guest count and the vendors it needs.</p>
        <Button icon="plus" onClick={() => setForm(blank)}>
          Add function
        </Button>
      </div>
      {(e.functions || []).length === 0 && <Empty icon="calendar" title="No functions yet">Split your event into functions so every vendor knows where and when.</Empty>}
      <div className="grid grid-2">
        {(e.functions || [])
          .slice()
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
          .map((f) => (
            <Card
              key={f.id}
              title={f.name}
              subtitle={`${fmtDate(f.date)} at ${f.time} - ${f.venue || 'Venue to be decided'} - ${f.guests} guests`}
              actions={
                <button className="link small" onClick={() => setForm(f)}>
                  Edit
                </button>
              }
            >
              <div className="chips">
                {(f.categories || []).map((c) => {
                  const v = vendorFor(c);
                  return (
                    <span key={c} className={'chip ' + (v ? 'active' : '')} title={v ? v.listing.title : 'Not booked yet'}>
                      <Icon name={categoryOf(state, c).icon} size={13} /> {categoryOf(state, c).name}
                      {v ? ' - ' + v.listing.title : ''}
                    </span>
                  );
                })}
              </div>
            </Card>
          ))}
      </div>
      <Modal
        open={!!form}
        title={form && form.id ? 'Edit function' : 'Add function'}
        onClose={() => setForm(null)}
        wide
        footer={
          <>
            {form && form.id && (
              <Button
                variant="ghost"
                onClick={() => {
                  actions.eventItem(e.id, 'functions', 'remove', form);
                  setForm(null);
                }}
              >
                Remove
              </Button>
            )}
            <Button
              disabled={!form || !form.name}
              onClick={() => {
                actions.eventItem(e.id, 'functions', form.id ? 'update' : 'add', { ...form, guests: Number(form.guests) || 0 });
                setForm(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {form && (
          <div className="stack">
            <Field label="Function name">
              <input className="input" value={form.name} onChange={(x) => set('name', x.target.value)} placeholder="e.g. Nichayathartham, Sangeet, Reception" />
            </Field>
            <div className="grid grid-3">
              <Field label="Date">
                <input className="input" type="date" value={form.date} onChange={(x) => set('date', x.target.value)} />
              </Field>
              <Field label="Time">
                <input className="input" type="time" value={form.time} onChange={(x) => set('time', x.target.value)} />
              </Field>
              <Field label="Guests">
                <input className="input" type="number" value={form.guests} onChange={(x) => set('guests', x.target.value)} />
              </Field>
            </div>
            <Field label="Venue">
              <input className="input" value={form.venue} onChange={(x) => set('venue', x.target.value)} placeholder="Hall name or address" />
            </Field>
            <Field label="Vendors needed for this function">
              <div className="chips">
                {state.categories.map((c) => (
                  <button key={c.id} type="button" className={'chip ' + (form.categories.includes(c.id) ? 'active' : '')} onClick={() => set('categories', form.categories.includes(c.id) ? form.categories.filter((x) => x !== c.id) : [...form.categories, c.id])}>
                    <Icon name={c.icon} size={13} /> {c.name}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

function Guests({ e }) {
  const { actions } = useStore();
  const [side, setSide] = useState('All');
  const [add, setAdd] = useState(null);
  const guests = e.guestList || [];
  const sides = ['All', ...new Set(guests.map((g) => g.side))];
  const list = guests.filter((g) => side === 'All' || g.side === side);
  const sum = (f) => guests.filter(f).reduce((a, g) => a + g.count, 0);
  const fname = (fid) => ((e.functions || []).find((f) => f.id === fid) || {}).name;
  return (
    <>
      <div className="grid grid-4 mb">
        {['yes', 'maybe', 'pending', 'no'].map((r) => (
          <div key={r} className="stat">
            <span className="small muted">{RSVP[r]}</span>
            <div className="stat-value">{sum((g) => g.rsvp === r)}</div>
            <div className="small muted">{guests.filter((g) => g.rsvp === r).length} invites</div>
          </div>
        ))}
      </div>
      <Card
        title="Guest list"
        subtitle={`${guests.length} invites, ${sum(() => true)} people. Share the count with your caterer before the headcount lock.`}
        actions={
          <div className="row gap-s">
            <Button size="sm" variant="secondary" icon="whatsapp" onClick={() => actions.sendGuestInvites(e.id)}>
              Send invites + RSVP link
            </Button>
            <Button size="sm" icon="plus" onClick={() => setAdd({ name: '', side: sides[1] || 'Family', group: 'Family', count: 2, rsvp: 'pending', phone: '', invited: false, functions: (e.functions || []).map((f) => f.id) })}>
              Add guest
            </Button>
          </div>
        }
        pad={false}
      >
        <div className="row gap-s wrap" style={{ padding: '10px 16px' }}>
          {sides.map((s) => (
            <button key={s} className={'chip ' + (side === s ? 'active' : '')} onClick={() => setSide(s)}>
              {s}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty icon="users" title="No guests yet">Add family and friends to track RSVPs.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Side</th>
                  <th>Group</th>
                  <th className="right">People</th>
                  <th>Functions</th>
                  <th>Invite</th>
                  <th>RSVP</th>
                </tr>
              </thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <b>{g.name}</b>
                      {g.phone && <div className="tiny muted">{g.phone}</div>}
                    </td>
                    <td>{g.side}</td>
                    <td>{g.group}</td>
                    <td className="right">{g.count}</td>
                    <td className="small muted">{(g.functions || []).map(fname).filter(Boolean).join(', ') || '-'}</td>
                    <td>{g.invited ? <Badge tone="green">Sent</Badge> : <Badge tone="gray">Not sent</Badge>}</td>
                    <td>
                      <select className="select input-sm" value={g.rsvp} onChange={(x) => actions.eventItem(e.id, 'guestList', 'update', { id: g.id, rsvp: x.target.value })} aria-label={'RSVP for ' + g.name}>
                        {Object.entries(RSVP).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal
        open={!!add}
        title="Add guest"
        onClose={() => setAdd(null)}
        footer={
          <Button
            disabled={!add || !add.name}
            onClick={() => {
              actions.eventItem(e.id, 'guestList', 'add', { ...add, count: Number(add.count) || 1 });
              setAdd(null);
            }}
          >
            Add
          </Button>
        }
      >
        {add && (
          <div className="stack">
            <Field label="Name or family">
              <input className="input" value={add.name} onChange={(x) => setAdd({ ...add, name: x.target.value })} placeholder="e.g. Gopal Mama & family" />
            </Field>
            <div className="grid grid-3">
              <Field label="Side">
                <input className="input" value={add.side} onChange={(x) => setAdd({ ...add, side: x.target.value })} />
              </Field>
              <Field label="Group">
                <select className="select" value={add.group} onChange={(x) => setAdd({ ...add, group: x.target.value })}>
                  {['Family', 'Friends', 'Office', 'Neighbours', 'Family friends', 'Kids'].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="People">
                <input className="input" type="number" value={add.count} onChange={(x) => setAdd({ ...add, count: x.target.value })} />
              </Field>
            </div>
            <Field label="WhatsApp number">
              <input className="input" value={add.phone} onChange={(x) => setAdd({ ...add, phone: x.target.value })} placeholder="+91" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

function Budget({ e, active, committed, paidVendors }) {
  const { state, actions } = useStore();
  const [add, setAdd] = useState(null);
  const booked = active.filter((i) => i.booking);
  const extra = e.budgetItems || [];
  const plannedExtra = extra.reduce((a, b) => a + (b.planned || 0), 0);
  const spentExtra = extra.reduce((a, b) => a + (b.spent || 0), 0);
  const total = committed + spentExtra;
  const left = e.budget - total;
  return (
    <div className="stack">
      <Card title="Budget at a glance">
        <div className="grid grid-4">
          <div>
            <div className="small muted">Booked in the app</div>
            <b>{inr(committed)}</b>
            <div className="tiny muted">{inr(paidVendors)} paid so far</div>
          </div>
          <div>
            <div className="small muted">Other spends</div>
            <b>{inr(spentExtra)}</b>
            <div className="tiny muted">of {inr(plannedExtra)} planned</div>
          </div>
          <div>
            <div className="small muted">Total committed</div>
            <b>{inr(total)}</b>
          </div>
          <div>
            <div className="small muted">Left in budget</div>
            <b className={left < 0 ? 'red' : 'green'}>{inr(left)}</b>
          </div>
        </div>
        <div className="progress brand mt">
          <span style={{ width: Math.min(100, (total / (e.budget || 1)) * 100) + '%' }} />
        </div>
      </Card>
      <Card title="Vendors booked in the app" pad={false}>
        {booked.length === 0 ? (
          <Empty icon="briefcase" title="No bookings yet" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th className="right">Total</th>
                  <th className="right">Paid</th>
                  <th className="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {booked.map((i) => {
                  const inv = state.invoices.find((x) => x.id === i.booking.invoiceId);
                  const t = inv ? invoiceTotals(inv) : { paid: 0, due: 0 };
                  return (
                    <tr key={i.lead.id}>
                      <td>{categoryOf(state, i.listing.category).name}</td>
                      <td>
                        <Link to={'/bookings/' + i.lead.id} className="link">
                          {i.listing.title}
                        </Link>
                      </td>
                      <td className="right">{inr(i.booking.total)}</td>
                      <td className="right green">{inr(t.paid)}</td>
                      <td className="right">{inr(t.due)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card
        title="Other spends"
        subtitle="Jewellery, clothes, travel and anything you pay outside the app."
        pad={false}
        actions={
          <Button size="sm" icon="plus" onClick={() => setAdd({ category: 'Other', label: '', planned: 0, spent: 0, offPlatform: true })}>
            Add item
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="right">Planned</th>
                <th className="right">Spent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {extra.map((b) => (
                <tr key={b.id}>
                  <td>{b.label}</td>
                  <td>{b.category}</td>
                  <td className="right">{inr(b.planned)}</td>
                  <td className="right">
                    <input className="input input-sm right" style={{ width: 110 }} type="number" value={b.spent} onChange={(x) => actions.eventItem(e.id, 'budgetItems', 'update', { id: b.id, spent: Number(x.target.value) || 0 })} aria-label={'Spent on ' + b.label} />
                  </td>
                  <td className="right">
                    <button className="link small" onClick={() => actions.eventItem(e.id, 'budgetItems', 'remove', b)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {extra.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    Nothing added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={!!add}
        title="Add budget item"
        onClose={() => setAdd(null)}
        footer={
          <Button
            disabled={!add || !add.label}
            onClick={() => {
              actions.eventItem(e.id, 'budgetItems', 'add', { ...add, planned: Number(add.planned) || 0, spent: Number(add.spent) || 0 });
              setAdd(null);
            }}
          >
            Add
          </Button>
        }
      >
        {add && (
          <div className="stack">
            <Field label="Item">
              <input className="input" value={add.label} onChange={(x) => setAdd({ ...add, label: x.target.value })} placeholder="e.g. Silk sarees for family" />
            </Field>
            <div className="grid grid-3">
              <Field label="Category">
                <select className="select" value={add.category} onChange={(x) => setAdd({ ...add, category: x.target.value })}>
                  {['Jewellery', 'Clothing', 'Travel', 'Stay', 'Cake', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Planned">
                <input className="input" type="number" value={add.planned} onChange={(x) => setAdd({ ...add, planned: x.target.value })} />
              </Field>
              <Field label="Spent">
                <input className="input" type="number" value={add.spent} onChange={(x) => setAdd({ ...add, spent: x.target.value })} />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Checklist({ e }) {
  const { state, actions } = useStore();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(todayISO());
  const today = todayISO();
  const list = (e.checklist || []).slice().sort((a, b) => a.due.localeCompare(b.due));
  return (
    <Card
      title="Planning checklist"
      subtitle={`Built from the ${e.type} template. Add your own tasks too.`}
      actions={
        <Button size="sm" variant="secondary" onClick={() => actions.resetChecklist(e.id)}>
          Rebuild from template
        </Button>
      }
    >
      <div className="stack-s">
        {list.map((c) => (
          <label key={c.id} className="check row between" style={{ width: '100%' }}>
            <span className="row gap-s">
              <input type="checkbox" checked={c.done} onChange={() => actions.eventItem(e.id, 'checklist', 'update', { id: c.id, done: !c.done })} />
              <span style={{ textDecoration: c.done ? 'line-through' : 'none' }} className={c.done ? 'muted' : ''}>
                {c.title}
              </span>
              {c.category && (
                <Link to={'/browse?cat=' + c.category} className="tiny link">
                  {categoryOf(state, c.category).name}
                </Link>
              )}
            </span>
            <span className={'small ' + (!c.done && c.due < today ? 'red' : 'muted')}>{fmtDate(c.due)}</span>
          </label>
        ))}
      </div>
      <div className="row gap-s mt">
        <input className="input" placeholder="Add a task" value={title} onChange={(x) => setTitle(x.target.value)} />
        <input className="input" type="date" style={{ width: 170 }} value={due} onChange={(x) => setDue(x.target.value)} />
        <Button
          disabled={!title}
          onClick={() => {
            actions.eventItem(e.id, 'checklist', 'add', { title, due, done: false, category: null });
            setTitle('');
          }}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}

function Family({ e }) {
  const { actions } = useStore();
  const [f, setF] = useState({ name: '', relation: '', phone: '', access: 'Co-planner' });
  return (
    <div className="grid grid-side">
      <Card title="People planning with you" subtitle="Co-planners can chat with vendors, approve items and pay. View-only members can follow along.">
        {(e.collaborators || []).length === 0 ? (
          <p className="muted">Invite your family to plan together.</p>
        ) : (
          <div className="stack-s">
            {e.collaborators.map((c) => (
              <div key={c.id} className="row between">
                <span>
                  <b>{c.name}</b> <span className="muted small">({c.relation})</span>
                  <div className="tiny muted">{c.phone}</div>
                </span>
                <span className="row gap-s">
                  <select className="select input-sm" value={c.access} onChange={(x) => actions.eventItem(e.id, 'collaborators', 'update', { id: c.id, access: x.target.value })} aria-label={'Access for ' + c.name}>
                    <option>Co-planner</option>
                    <option>View only</option>
                  </select>
                  <Badge status={c.status} />
                  <button className="link small" onClick={() => actions.eventItem(e.id, 'collaborators', 'remove', c)}>
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Invite someone">
        <div className="stack">
          <Field label="Name">
            <input className="input" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} />
          </Field>
          <Field label="Relation">
            <input className="input" value={f.relation} onChange={(x) => setF({ ...f, relation: x.target.value })} placeholder="e.g. Mother, Brother" />
          </Field>
          <Field label="Phone">
            <input className="input" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} placeholder="+91" />
          </Field>
          <Field label="Access">
            <select className="select" value={f.access} onChange={(x) => setF({ ...f, access: x.target.value })}>
              <option>Co-planner</option>
              <option>View only</option>
            </select>
          </Field>
          <Button
            disabled={!f.name || !f.phone}
            onClick={() => {
              actions.inviteCollaborator(e.id, f);
              setF({ name: '', relation: '', phone: '', access: 'Co-planner' });
            }}
          >
            Send invite
          </Button>
        </div>
      </Card>
    </div>
  );
}
