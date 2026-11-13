// Catering pack: menus, per-plate pricing per meal, tasting, final headcount lock.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../config';
import { navigate } from '../router';
import { usePerms, useStore } from '../store';
import { Badge, Button, Card, Field, Icon, Modal } from '../components/ui';
import { FieldGrid, MiniTable, ModuleHeader, Section } from '../components/crm';
import { inScope } from '../accounts';

const MEALS = ['Breakfast', 'Lunch', 'Hi-tea', 'Dinner'];

const plateTotal = (meals, menus) => meals.reduce((a, m) => a + (Number(m.guests) || 0) * ((menus.find((x) => x.id === m.menuId) || {}).pricePerPlate || 0), 0);

export function CateringCustomerPanel({ booking, listing }) {
  const { state, actions } = useStore();
  const d = booking.details || {};
  const menus = state.menus.filter((m) => m.listingId === listing.id);
  const [counts, setCounts] = useState(() => Object.fromEntries((d.meals || []).map((m) => [m.id, m.guests])));
  const open = !d.headcountLocked && ['accepted', 'booked'].includes(booking.status);
  const changed = (d.meals || []).some((m) => Number(counts[m.id]) !== Number(m.guests));
  const total = plateTotal(d.meals || [], menus);
  return (
    <Card title="Menu and guest count" subtitle={`${d.servingStyle || ''} service - about ${d.staff || '-'} serving staff`}>
      <div className="stack">
        {(d.meals || []).map((m) => {
          const menu = menus.find((x) => x.id === m.menuId) || { items: [], name: '-' };
          return (
            <div key={m.id} className="sched-row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <b>
                  {m.meal} at {m.time} - {menu.name}
                </b>
                <div className="chips mt-s">
                  {menu.items.map((it) => (
                    <span key={it} className="chip" style={{ height: 26, fontSize: 12 }}>
                      {it}
                    </span>
                  ))}
                </div>
              </div>
              <div className="right" style={{ minWidth: 120 }}>
                <div className="small muted">Guests</div>
                {open ? (
                  <input className="input input-sm" style={{ width: 90 }} type="number" value={counts[m.id]} onChange={(e) => setCounts({ ...counts, [m.id]: e.target.value })} />
                ) : (
                  <b>{m.guests}</b>
                )}
                <div className="tiny muted">{inr(menu.pricePerPlate)} / plate</div>
              </div>
            </div>
          );
        })}
        <div className="row between wrap gap-s">
          <span className="small">
            Food total at current count: <b>{inr(total)}</b>
          </span>
          {open && changed && (
            <Button
              size="sm"
              onClick={() =>
                actions.updateBookingDetails(
                  booking.id,
                  { meals: d.meals.map((m) => ({ ...m, guests: Number(counts[m.id]) || 0 })) },
                  `Customer updated the guest count to ${Object.values(counts).map(Number).join(' / ')}`,
                  'partner'
                )
              }
            >
              Update guest count
            </Button>
          )}
        </div>
        {d.headcountLocked ? (
          <div className="notice notice-success">
            <Icon name="lock" />
            <span>Final headcount is locked. Extra plates on the day are billed at the same rate.</span>
          </div>
        ) : (
          <div className="notice">
            <Icon name="clock" />
            <span>
              You can change the guest count until <b>{fmtDate(d.headcountLockDate)}</b>.{d.tastingDate ? ` Food tasting is on ${fmtDate(d.tastingDate)}.` : ''}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function CateringPartnerPanel({ booking, listing }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const d = booking.details || {};
  const menus = state.menus.filter((m) => m.listingId === listing.id);
  const edit = can('crew.assign') && ['accepted', 'booked'].includes(booking.status) && !d.headcountLocked;
  const setMeal = (id, patch) => actions.updateBookingDetails(booking.id, { meals: d.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const total = plateTotal(d.meals || [], menus);
  const quote = state.quotes.find((q) => q.id === booking.quoteId);
  const quotedFood = quote ? quote.items.filter((i) => /plates/i.test(i.description)).reduce((a, i) => a + i.qty * i.unitPrice, 0) : 0;
  const extra = total - quotedFood;
  return (
    <Section
      id="catering"
      title="Menu & Headcount"
      actions={
        d.headcountLocked ? (
          <Badge tone="green">Headcount locked</Badge>
        ) : (
          can('crew.assign') && (
            <button className="zc-btn zc-btn-primary" onClick={() => actions.updateBookingDetails(booking.id, { headcountLocked: true }, 'Final headcount locked by the caterer', 'customer')}>
              Lock final headcount
            </button>
          )
        )
      }
    >
      <MiniTable
        rows={d.meals || []}
        columns={[
          { label: 'Meal', render: (m) => m.meal },
          { label: 'Time', render: (m) => (edit ? <input className="input input-sm" style={{ width: 90 }} value={m.time} onChange={(e) => setMeal(m.id, { time: e.target.value })} /> : m.time) },
          {
            label: 'Menu',
            render: (m) =>
              edit ? (
                <select className="select input-sm" value={m.menuId} onChange={(e) => setMeal(m.id, { menuId: e.target.value })}>
                  {menus.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({inr(x.pricePerPlate)})
                    </option>
                  ))}
                </select>
              ) : (
                (menus.find((x) => x.id === m.menuId) || {}).name
              ),
          },
          { label: 'Guests', align: 'right', render: (m) => (edit ? <input className="input input-sm" style={{ width: 80 }} type="number" value={m.guests} onChange={(e) => setMeal(m.id, { guests: Number(e.target.value) })} /> : m.guests) },
          { label: 'Amount', align: 'right', render: (m) => inr((Number(m.guests) || 0) * ((menus.find((x) => x.id === m.menuId) || {}).pricePerPlate || 0)) },
        ]}
      />
      {edit && (
        <button
          className="zc-rl-link mt-s"
          onClick={() => {
            const used = (d.meals || []).map((m) => m.meal);
            const meal = MEALS.find((x) => !used.includes(x)) || 'Dinner';
            actions.updateBookingDetails(booking.id, { meals: [...(d.meals || []), { id: 'ml' + Date.now(), meal, time: '19:30', menuId: (menus[0] || {}).id, guests: (d.meals && d.meals[0] && d.meals[0].guests) || 100 }] });
          }}
        >
          + Add meal
        </button>
      )}
      <div className="zc-section-sub">Event logistics</div>
      <FieldGrid
        fields={[
          ['Serving style', d.servingStyle],
          ['Serving staff', edit ? <input className="input input-sm" style={{ width: 80 }} type="number" value={d.staff} onChange={(e) => actions.updateBookingDetails(booking.id, { staff: Number(e.target.value) })} /> : d.staff],
          ['Food tasting', edit ? <input className="input input-sm" style={{ width: 160 }} type="date" value={d.tastingDate || ''} onChange={(e) => actions.updateBookingDetails(booking.id, { tastingDate: e.target.value }, `Food tasting scheduled for ${fmtDate(e.target.value)}`, 'customer')} /> : d.tastingDate ? fmtDate(d.tastingDate) : 'Not scheduled'],
          ['Headcount lock date', fmtDate(d.headcountLockDate)],
          ['Food total (current count)', <b>{inr(total)}</b>],
          ['Difference vs quote', extra === 0 ? 'None' : <b className={extra > 0 ? 'amber' : 'green'}>{extra > 0 ? '+' : ''}{inr(extra)} {extra > 0 ? 'to bill as extra plates' : 'lower than quoted'}</b>],
        ]}
      />
    </Section>
  );
}

function MenuModal({ menu, onClose, listingId }) {
  const { actions } = useStore();
  const [m, setM] = useState(menu || { id: 'mn' + Date.now(), listingId, name: '', meal: 'Lunch', foodType: 'Veg', pricePerPlate: 400, items: [] });
  const [text, setText] = useState((m.items || []).join('\n'));
  return (
    <Modal
      open
      title={menu ? 'Edit menu' : 'New menu'}
      onClose={onClose}
      footer={
        <Button
          disabled={!m.name}
          onClick={() => {
            actions.saveMenu({ ...m, pricePerPlate: Number(m.pricePerPlate) || 0, items: text.split('\n').map((x) => x.trim()).filter(Boolean) });
            onClose();
          }}
        >
          Save menu
        </Button>
      }
    >
      <div className="stack">
        <Field label="Menu name">
          <input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
        </Field>
        <div className="grid grid-3">
          <Field label="Meal">
            <select className="select" value={m.meal} onChange={(e) => setM({ ...m, meal: e.target.value })}>
              {MEALS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Food">
            <select className="select" value={m.foodType} onChange={(e) => setM({ ...m, foodType: e.target.value })}>
              <option>Veg</option>
              <option>Non-veg</option>
            </select>
          </Field>
          <Field label="Price per plate">
            <input className="input" type="number" value={m.pricePerPlate} onChange={(e) => setM({ ...m, pricePerPlate: e.target.value })} />
          </Field>
        </div>
        <Field label="Items" hint="One dish per line">
          <textarea className="textarea" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function CateringModule() {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [editing, setEditing] = useState(null);
  const listing = state.listings.find((l) => l.partnerId === state.partnerId);
  const menus = state.menus.filter((m) => m.listingId === listing.id);
  const today = todayISO();
  const upcoming = state.bookings
    .filter((b) => inScope(state, b) && ['accepted', 'booked'].includes(b.status) && b.eventDate >= today)
    .map((b) => ({ ...b, lead: state.leads.find((l) => l.id === b.leadId) || {} }))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return (
    <>
      <ModuleHeader
        title="Menus & Headcount"
        subtitle="Your menus with per-plate rates, and the guest count for every upcoming event."
        actions={can('listing.edit') && <button className="zc-btn zc-btn-primary" onClick={() => setEditing('new')}>Create Menu</button>}
      />
      <div className="stack">
        <Section title="Upcoming events - headcount" count={upcoming.length}>
          <MiniTable
            rows={upcoming}
            onRow={(b) => navigate('/partner/bookings/' + b.id)}
            empty="No upcoming events."
            columns={[
              { label: 'Booking', render: (b) => b.number },
              { label: 'Customer', render: (b) => b.lead.contactName },
              { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
              { label: 'Meals', render: (b) => ((b.details && b.details.meals) || []).map((m) => m.meal).join(', ') },
              { label: 'Plates', align: 'right', render: (b) => ((b.details && b.details.meals) || []).reduce((a, m) => a + (Number(m.guests) || 0), 0) },
              { label: 'Lock Date', render: (b) => fmtDate(b.details && b.details.headcountLockDate) },
              { label: 'Headcount', render: (b) => (b.details && b.details.headcountLocked ? <Badge tone="green">Locked</Badge> : <Badge tone="amber">Open</Badge>) },
            ]}
          />
        </Section>
        <Section title="Menus" count={menus.length}>
          <div className="grid grid-2">
            {menus.map((m) => (
              <div key={m.id} className="card">
                <div className="card-head">
                  <div>
                    <h3>{m.name}</h3>
                    <p className="small muted">
                      {m.meal} - {m.foodType} - {m.items.length} items
                    </p>
                  </div>
                  <div className="row gap-s">
                    <b>{inr(m.pricePerPlate)}</b>
                    <span className="small muted">/ plate</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="chips">
                    {m.items.map((it) => (
                      <span key={it} className="chip" style={{ height: 26, fontSize: 12 }}>
                        {it}
                      </span>
                    ))}
                  </div>
                  {can('listing.edit') && (
                    <div className="row gap-s mt">
                      <button className="zc-rl-link" onClick={() => setEditing(m)}>
                        Edit
                      </button>
                      <button className="zc-rl-link red" onClick={() => actions.removeMenu(m.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      {editing && <MenuModal menu={editing === 'new' ? null : editing} listingId={listing.id} onClose={() => setEditing(null)} />}
    </>
  );
}
