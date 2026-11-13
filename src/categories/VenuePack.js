// Venue pack: halls, sessions, guest rooms, check-in/out and the damage deposit.
import { useState } from 'react';
import { addDays, fmtDate, fmtDay, inr, todayISO } from '../config';
import { Link } from '../router';
import { usePerms, useStore } from '../store';
import { Badge, Card, Icon } from '../components/ui';
import { FieldGrid, MiniTable, ModuleHeader, Section } from '../components/crm';
import { inScope } from '../accounts';

const SESSIONS = ['Morning (6am - 2pm)', 'Evening (4pm - 11pm)', 'Full day', '2 days'];
const DEPOSIT_LABEL = { pending: 'To collect', collected: 'Collected', refunded: 'Refunded' };

const hallOf = (listing, id) => ((listing.attributes && listing.attributes.halls) || []).find((h) => h.id === id);

export function VenueCustomerPanel({ booking, listing }) {
  const d = booking.details || {};
  const hall = hallOf(listing, d.hallId);
  return (
    <Card title="Your venue booking" subtitle="Hall, session, rooms and check-in details">
      <div className="kv">
        <div>
          <dt>Hall</dt>
          <dd>{hall ? `${hall.name} (${hall.seating} seats)` : '-'}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{d.session}</dd>
        </div>
        <div>
          <dt>Guest rooms</dt>
          <dd>{d.rooms}</dd>
        </div>
        <div>
          <dt>Check-in</dt>
          <dd>{d.checkIn}</dd>
        </div>
        <div>
          <dt>Check-out</dt>
          <dd>{d.checkOut}</dd>
        </div>
        <div>
          <dt>Damage deposit</dt>
          <dd>
            {inr(d.deposit)} - {DEPOSIT_LABEL[d.depositStatus] || '-'}
          </dd>
        </div>
      </div>
      {(listing.attributes.rules || []).length > 0 && (
        <>
          <h4 className="mt">House rules</h4>
          <ul className="small muted" style={{ paddingLeft: 18, margin: '6px 0 0' }}>
            {listing.attributes.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function VenuePartnerPanel({ booking, listing }) {
  const { actions } = useStore();
  const { can } = usePerms();
  const d = booking.details || {};
  const edit = can('calendar.manage') && ['accepted', 'booked'].includes(booking.status);
  const money = can('payments.record');
  const set = (patch) => actions.updateBookingDetails(booking.id, patch);
  const halls = listing.attributes.halls || [];
  return (
    <Section id="venue" title="Hall & Session">
      <FieldGrid
        fields={[
          ['Hall', edit ? (
            <select className="select input-sm" style={{ maxWidth: 240 }} value={d.hallId} onChange={(e) => set({ hallId: e.target.value })}>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.seating})</option>
              ))}
            </select>
          ) : (hallOf(listing, d.hallId) || {}).name],
          ['Session', edit ? (
            <select className="select input-sm" style={{ maxWidth: 240 }} value={d.session} onChange={(e) => set({ session: e.target.value })}>
              {SESSIONS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          ) : d.session],
          ['Guest rooms', edit ? <input className="input input-sm" style={{ width: 90 }} type="number" value={d.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })} /> : d.rooms],
          ['Check-in', edit ? <input className="input input-sm" style={{ maxWidth: 200 }} value={d.checkIn} onChange={(e) => set({ checkIn: e.target.value })} /> : d.checkIn],
          ['Check-out', edit ? <input className="input input-sm" style={{ maxWidth: 200 }} value={d.checkOut} onChange={(e) => set({ checkOut: e.target.value })} /> : d.checkOut],
          ['Damage deposit', (
            <span className="row gap-s wrap">
              {inr(d.deposit)} <Badge status={d.depositStatus === 'collected' ? 'paid' : d.depositStatus === 'refunded' ? 'processed' : 'due'}>{DEPOSIT_LABEL[d.depositStatus]}</Badge>
              {money && d.depositStatus === 'pending' && (
                <button className="zc-rl-link" onClick={() => actions.updateBookingDetails(booking.id, { depositStatus: 'collected' }, 'Damage deposit collected at check-in', 'customer')}>
                  Mark collected
                </button>
              )}
              {money && d.depositStatus === 'collected' && (
                <button className="zc-rl-link" onClick={() => actions.updateBookingDetails(booking.id, { depositStatus: 'refunded' }, 'Damage deposit refunded', 'customer')}>
                  Mark refunded
                </button>
              )}
            </span>
          )],
        ]}
      />
      <div className="zc-section-sub">Notes for housekeeping</div>
      {edit ? (
        <textarea className="textarea" value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Arrival times, room allotment, special requests" />
      ) : (
        <p className="muted">{d.notes || '-'}</p>
      )}
    </Section>
  );
}

// Which halls and sessions are taken on a date.
const occupancy = (state, partnerId, listing, date) => {
  const res = {};
  state.bookings
    .filter((b) => b.partnerId === partnerId && b.status !== 'cancelled')
    .forEach((b) => {
      const d = b.details || {};
      const days = d.session === '2 days' ? [addDays(b.eventDate, -1), b.eventDate] : [b.eventDate];
      if (!days.includes(date)) return;
      const lead = state.leads.find((l) => l.id === b.leadId) || {};
      const slots = d.session && d.session.startsWith('Morning') ? ['am'] : d.session && d.session.startsWith('Evening') ? ['pm'] : ['am', 'pm'];
      slots.forEach((s) => {
        res[(d.hallId || 'h1') + s] = { booking: b, name: lead.contactName, tentative: b.status === 'accepted' };
      });
    });
  return res;
};

export function VenueModule() {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const listing = state.listings.find((l) => l.partnerId === state.partnerId);
  const halls = listing.attributes.halls || [];
  const [from, setFrom] = useState(todayISO());
  const [newHall, setNewHall] = useState({ name: '', seating: 200, dining: 100, floor: 'Ground floor' });
  const upcoming = state.bookings.filter((b) => inScope(state, b) && b.status !== 'cancelled' && b.eventDate >= todayISO()).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  const manual = (date) => state.blocks.some((b) => inScope(state, b) && b.date === date && b.source === 'manual');
  return (
    <>
      <ModuleHeader
        title="Halls & Sessions"
        subtitle="Which hall is booked for which session, and the halls you offer."
        actions={
          <>
            <input type="date" className="input input-sm" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} />
            {upcoming[0] && (
              <button className="zc-btn" onClick={() => setFrom(addDays(upcoming[0].eventDate, -3))}>
                Jump to next booking
              </button>
            )}
          </>
        }
      />
      <div className="stack">
        <Section title={`Hall availability - ${fmtDate(days[0])} to ${fmtDate(days[13])}`}>
          <div className="zc-table-wrap">
            <table className="zc-table zc-table-mini">
              <thead>
                <tr>
                  <th>Date</th>
                  {halls.map((h) => (
                    <th key={h.id} colSpan={2} style={{ textAlign: 'center' }}>
                      {h.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th />
                  {halls.map((h) => [
                    <th key={h.id + 'am'} style={{ textAlign: 'center', fontWeight: 500 }}>Morning</th>,
                    <th key={h.id + 'pm'} style={{ textAlign: 'center', fontWeight: 500 }}>Evening</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const occ = occupancy(state, state.partnerId, listing, date);
                  const blocked = manual(date);
                  return (
                    <tr key={date}>
                      <td className="nowrap">{fmtDay(date)}</td>
                      {halls.map((h) =>
                        ['am', 'pm'].map((s) => {
                          const o = occ[h.id + s];
                          return (
                            <td key={h.id + s} style={{ textAlign: 'center' }}>
                              {o ? (
                                <Link to={'/partner/bookings/' + o.booking.id} className={'badge ' + (o.tentative ? 'badge-amber' : 'badge-blue')}>
                                  {o.name}
                                </Link>
                              ) : blocked ? (
                                <span className="badge badge-gray">Blocked</span>
                              ) : (
                                <span className="muted tiny">Available</span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tiny muted mt-s">
            <Icon name="info" size={12} /> Blue = confirmed booking, yellow = advance pending, grey = blocked on the calendar.
          </p>
        </Section>

        <Section title="Halls" count={halls.length}>
          <MiniTable
            rows={halls}
            columns={[
              { label: 'Hall', render: (h) => h.name },
              { label: 'Seating', align: 'right', render: (h) => h.seating },
              { label: 'Dining', align: 'right', render: (h) => h.dining },
              { label: 'Floor', render: (h) => h.floor },
              { label: 'AC', render: (h) => (h.ac ? 'Yes' : 'No') },
            ]}
          />
          {can('listing.edit') && (
            <div className="row gap-s mt wrap">
              <input className="input input-sm" style={{ width: 180 }} placeholder="Hall name" value={newHall.name} onChange={(e) => setNewHall({ ...newHall, name: e.target.value })} />
              <input className="input input-sm" style={{ width: 100 }} type="number" placeholder="Seating" value={newHall.seating} onChange={(e) => setNewHall({ ...newHall, seating: Number(e.target.value) })} />
              <input className="input input-sm" style={{ width: 100 }} type="number" placeholder="Dining" value={newHall.dining} onChange={(e) => setNewHall({ ...newHall, dining: Number(e.target.value) })} />
              <input className="input input-sm" style={{ width: 140 }} placeholder="Floor" value={newHall.floor} onChange={(e) => setNewHall({ ...newHall, floor: e.target.value })} />
              <button
                className="zc-btn zc-btn-primary"
                disabled={!newHall.name}
                onClick={() => {
                  actions.updateListing(listing.id, { attributes: { ...listing.attributes, halls: [...halls, { ...newHall, id: 'h' + Date.now(), ac: true }] } });
                  setNewHall({ name: '', seating: 200, dining: 100, floor: 'Ground floor' });
                }}
              >
                Add hall
              </button>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
