// Photography pack: shoot schedule per function, shot list, deliverables with customer approval.
import { useState } from 'react';
import { addDays, fmtDate, fmtDay, todayISO } from '../config';
import { navigate } from '../router';
import { usePerms, useStore } from '../store';
import { Badge, Button, Card, Icon } from '../components/ui';
import { MiniTable, ModuleHeader, Section } from '../components/crm';
import { inScope } from '../accounts';

export const DELIVERABLE_STATUS = {
  not_started: { label: 'Not started', tone: 'gray' },
  in_progress: { label: 'In progress', tone: 'blue' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  delivered: { label: 'Delivered', tone: 'green' },
};

const pct = (d) => (d.target ? Math.min(100, Math.round((d.done / d.target) * 100)) : 0);
const overall = (list = []) => (list.length ? Math.round(list.reduce((a, d) => a + (d.status === 'delivered' || d.status === 'approved' ? 100 : pct(d)), 0) / list.length) : 0);

export function PhotoCustomerPanel({ booking }) {
  const { actions } = useStore();
  const d = booking.details || {};
  const setDel = (id, patch, msg) => actions.updateBookingDetails(booking.id, { deliverables: d.deliverables.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, msg, 'partner');
  return (
    <Card title="Shoot schedule and deliverables" subtitle={`${overall(d.deliverables)}% of deliverables complete`}>
      <h4>Schedule</h4>
      <div className="stack-s mt-s">
        {(d.functions || []).map((f) => (
          <div key={f.id} className="row gap-s small">
            <Icon name="camera" size={14} className="brand" />
            <b>{f.name}</b>
            <span className="muted">
              {fmtDay(f.date)}, {f.time}
              {f.venue ? ' - ' + f.venue : ''} - {f.photographers} photographer{f.photographers === 1 ? '' : 's'}
              {f.videographers ? `, ${f.videographers} videographer` : ''}
            </span>
          </div>
        ))}
      </div>
      <h4 className="mt">Deliverables</h4>
      <div className="stack-s mt-s">
        {(d.deliverables || []).map((x) => (
          <div key={x.id} className="sched-row">
            <div className="grow">
              <div className="row between">
                <b>{x.label}</b>
                <Badge tone={DELIVERABLE_STATUS[x.status].tone}>{DELIVERABLE_STATUS[x.status].label}</Badge>
              </div>
              {x.target > 1 && (
                <div className="row gap-s mt-s small">
                  <div className="progress grow">
                    <span style={{ width: pct(x) + '%' }} />
                  </div>
                  <span className="muted">
                    {x.done} / {x.target}
                  </span>
                </div>
              )}
              {x.status === 'awaiting_approval' && (
                <div className="row gap-s mt-s">
                  <Button size="sm" icon="check" onClick={() => setDel(x.id, { status: 'approved' }, `Customer approved: ${x.label}`)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDel(x.id, { status: 'in_progress' }, `Customer asked for changes: ${x.label}`)}>
                    Request changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PhotoPartnerPanel({ booking }) {
  const { actions } = useStore();
  const { can } = usePerms();
  const d = booking.details || {};
  const edit = can('crew.assign') && booking.status !== 'cancelled';
  const [fn, setFn] = useState({ name: '', date: booking.eventDate, time: '09:00', venue: '' });
  const [shots, setShots] = useState(d.shotList || '');
  const setFns = (functions) => actions.updateBookingDetails(booking.id, { functions });
  const setDel = (id, patch, msg) => actions.updateBookingDetails(booking.id, { deliverables: d.deliverables.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, msg, msg ? 'customer' : undefined);
  return (
    <>
      <Section id="shoots" title="Shoot Schedule" count={(d.functions || []).length}>
        <MiniTable
          rows={d.functions || []}
          empty="No functions added."
          columns={[
            { label: 'Function', render: (f) => f.name },
            { label: 'Date', render: (f) => fmtDay(f.date) },
            { label: 'Time', render: (f) => f.time },
            { label: 'Venue', render: (f) => (edit ? <input className="input input-sm" style={{ width: 200 }} value={f.venue} placeholder="Add venue" onChange={(e) => setFns(d.functions.map((x) => (x.id === f.id ? { ...x, venue: e.target.value } : x)))} /> : f.venue || '-') },
            { label: 'Photo / Video', render: (f) => `${f.photographers} / ${f.videographers}` },
            { label: '', align: 'right', render: (f) => (edit ? <button className="zc-rl-link" onClick={() => setFns(d.functions.filter((x) => x.id !== f.id))}>Remove</button> : null) },
          ]}
        />
        {edit && (
          <div className="row gap-s mt wrap">
            <input className="input input-sm" style={{ width: 160 }} placeholder="Function (e.g. Reception)" value={fn.name} onChange={(e) => setFn({ ...fn, name: e.target.value })} />
            <input className="input input-sm" style={{ width: 150 }} type="date" value={fn.date} onChange={(e) => setFn({ ...fn, date: e.target.value })} />
            <input className="input input-sm" style={{ width: 100 }} type="time" value={fn.time} onChange={(e) => setFn({ ...fn, time: e.target.value })} />
            <input className="input input-sm" style={{ width: 200 }} placeholder="Venue" value={fn.venue} onChange={(e) => setFn({ ...fn, venue: e.target.value })} />
            <button
              className="zc-btn zc-btn-primary"
              disabled={!fn.name}
              onClick={() => {
                setFns([...(d.functions || []), { ...fn, id: 'f' + Date.now(), photographers: 1, videographers: 0 }]);
                setFn({ name: '', date: booking.eventDate, time: '09:00', venue: '' });
              }}
            >
              Add function
            </button>
          </div>
        )}
        <div className="zc-section-sub">Shot list</div>
        {edit ? (
          <div className="stack-s">
            <textarea className="textarea" value={shots} onChange={(e) => setShots(e.target.value)} placeholder="Must-have shots, family groups, rituals to capture" />
            {shots !== (d.shotList || '') && (
              <button className="zc-btn zc-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => actions.updateBookingDetails(booking.id, { shotList: shots })}>
                Save shot list
              </button>
            )}
          </div>
        ) : (
          <p className="muted">{d.shotList || '-'}</p>
        )}
      </Section>

      <Section id="deliverables" title="Deliverables" count={(d.deliverables || []).length} actions={<span className="small muted">{overall(d.deliverables)}% complete</span>}>
        <MiniTable
          rows={d.deliverables || []}
          columns={[
            { label: 'Deliverable', render: (x) => x.label },
            {
              label: 'Progress',
              render: (x) =>
                x.target > 1 ? (
                  <span className="row gap-s">
                    {edit ? <input className="input input-sm" style={{ width: 80 }} type="number" value={x.done} onChange={(e) => setDel(x.id, { done: Math.min(x.target, Number(e.target.value)), status: x.status === 'not_started' ? 'in_progress' : x.status })} /> : x.done}
                    <span className="muted">/ {x.target}</span>
                  </span>
                ) : (
                  '-'
                ),
            },
            { label: 'Status', render: (x) => <Badge tone={DELIVERABLE_STATUS[x.status].tone}>{DELIVERABLE_STATUS[x.status].label}</Badge> },
            {
              label: '',
              align: 'right',
              render: (x) =>
                edit ? (
                  <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                    {['not_started', 'in_progress'].includes(x.status) && (
                      <button className="zc-rl-link" onClick={() => setDel(x.id, { status: 'awaiting_approval', done: x.target > 1 ? x.done : 1 }, `${x.label} is ready for your approval`)}>
                        Send for approval
                      </button>
                    )}
                    {['approved', 'in_progress'].includes(x.status) && (
                      <button className="zc-rl-link" onClick={() => setDel(x.id, { status: 'delivered', done: x.target }, `${x.label} delivered`)}>
                        Mark delivered
                      </button>
                    )}
                  </span>
                ) : null,
            },
          ]}
        />
      </Section>
    </>
  );
}

export function PhotoModule() {
  const { state } = useStore();
  const today = todayISO();
  const bookings = state.bookings
    .filter((b) => inScope(state, b) && b.status !== 'cancelled')
    .map((b) => ({ ...b, lead: state.leads.find((l) => l.id === b.leadId) || {} }));
  const shoots = bookings
    .flatMap((b) => ((b.details && b.details.functions) || []).map((f) => ({ ...f, id: b.id + f.id, booking: b })))
    .filter((f) => f.date >= today && f.date <= addDays(today, 120))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tracked = bookings.filter((b) => b.details && (b.details.deliverables || []).length).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const memberName = (id) => (state.members.find((m) => m.id === id) || {}).name;
  return (
    <>
      <ModuleHeader title="Shoots & Deliverables" subtitle="Every upcoming shoot, and where each couple's photos, films and albums stand." />
      <div className="stack">
        <Section title="Upcoming shoots" count={shoots.length}>
          <MiniTable
            rows={shoots}
            onRow={(f) => navigate('/partner/bookings/' + f.booking.id)}
            empty="No shoots in the next 120 days."
            columns={[
              { label: 'Function', render: (f) => f.name },
              { label: 'Customer', render: (f) => f.booking.lead.contactName },
              { label: 'Date', render: (f) => fmtDay(f.date) },
              { label: 'Call Time', render: (f) => f.time },
              { label: 'Venue', render: (f) => f.venue || '-' },
              { label: 'Crew Assigned', render: (f) => state.crew.filter((c) => c.bookingId === f.booking.id).map((c) => memberName(c.memberId)).join(', ') || <span className="red">None</span> },
            ]}
          />
        </Section>
        <Section title="Deliverables tracker" count={tracked.length}>
          <MiniTable
            rows={tracked}
            onRow={(b) => navigate('/partner/bookings/' + b.id)}
            columns={[
              { label: 'Booking', render: (b) => b.number },
              { label: 'Customer', render: (b) => b.lead.contactName },
              { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
              { label: 'Items', render: (b) => b.details.deliverables.map((x) => `${x.label}${x.target > 1 ? ` ${x.done}/${x.target}` : ''}`).join(' - ') },
              {
                label: 'Complete',
                render: (b) => (
                  <span className="row gap-s">
                    <span className="progress" style={{ width: 90 }}>
                      <span style={{ width: overall(b.details.deliverables) + '%' }} />
                    </span>
                    {overall(b.details.deliverables)}%
                  </span>
                ),
              },
              { label: 'Waiting on Customer', render: (b) => b.details.deliverables.filter((x) => x.status === 'awaiting_approval').length || '-' },
            ]}
          />
        </Section>
      </div>
    </>
  );
}
