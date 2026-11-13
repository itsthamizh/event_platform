// Shared UI for config-driven category packs. Booking details look like:
//   { fields: {...}, sections: [{ id, type: schedule|checklist|approvals|requests, title, items, customerTicks? }] }
import { useState } from 'react';
import { fmtDate, fmtDay, inr, todayISO } from '../config';
import { navigate } from '../router';
import { usePerms, useStore } from '../store';
import { Badge, Button, Card, Icon } from '../components/ui';
import { FieldGrid, MiniTable, ModuleHeader, Section } from '../components/crm';
import { inScope } from '../accounts';

export const APPROVAL = {
  not_started: { label: 'Not shared yet', tone: 'gray' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'amber' },
  changes: { label: 'Changes requested', tone: 'red' },
  approved: { label: 'Approved', tone: 'green' },
};

export const progressOf = (details) => {
  const lists = ((details && details.sections) || []).filter((s) => s.type === 'checklist');
  const all = lists.flatMap((s) => s.items);
  return all.length ? Math.round((all.filter((i) => i.done).length / all.length) * 100) : null;
};
export const waitingOf = (details) => ((details && details.sections) || []).filter((s) => s.type === 'approvals').flatMap((s) => s.items).filter((i) => i.status === 'awaiting_approval').length;

function useSectionUpdater(booking) {
  const { actions } = useStore();
  const d = booking.details || {};
  return (secId, fn, message, to) =>
    actions.updateBookingDetails(booking.id, { sections: (d.sections || []).map((s) => (s.id === secId ? { ...s, items: fn(s.items) } : s)) }, message, to);
}

// ---------------- Customer ----------------
export function makeCustomerPanel(cfg) {
  return function ConfigCustomerPanel({ booking }) {
    const d = booking.details || {};
    const upd = useSectionUpdater(booking);
    const [req, setReq] = useState('');
    const active = booking.status !== 'cancelled';
    return (
      <Card title={cfg.customerTitle} subtitle={cfg.customerSubtitle}>
        <dl className="kv">
          {cfg.fields
            .filter((f) => !f.partnerOnly)
            .map((f) => (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{f.type === 'date' && d.fields && d.fields[f.key] ? fmtDate(d.fields[f.key]) : (d.fields && d.fields[f.key]) || '-'}</dd>
              </div>
            ))}
        </dl>
        {(d.sections || []).map((s) => (
          <div key={s.id} className="mt">
            <h4>{s.title}</h4>
            <div className="stack-s mt-s">
              {s.type === 'schedule' &&
                s.items.map((it) => (
                  <div key={it.id} className="row gap-s small">
                    <Icon name="clock" size={14} className="brand" />
                    <b>{it.label}</b>
                    <span className="muted">
                      {it.date ? fmtDay(it.date) : ''} {it.time}
                      {it.who ? ' - ' + it.who : ''}
                    </span>
                  </div>
                ))}
              {s.type === 'checklist' && (
                <>
                  {s.customerTicks && <p className="small muted">Tick the items your family has arranged. The partner sees it right away.</p>}
                  {s.items.map((it) => {
                    const mine = s.customerTicks && it.by === 'family';
                    return (
                      <label key={it.id} className="check small">
                        <input
                          type="checkbox"
                          checked={it.done}
                          disabled={!mine || !active}
                          onChange={() => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)), !it.done ? `Family arranged: ${it.label}` : null, 'partner')}
                        />
                        <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>
                          {it.label}
                          {it.qty ? ` - ${it.qty}` : ''}
                        </span>
                        {s.customerTicks && <span className="tiny muted">{it.by === 'family' ? 'You arrange' : 'Partner arranges'}</span>}
                      </label>
                    );
                  })}
                </>
              )}
              {s.type === 'approvals' &&
                s.items.map((it) => (
                  <div key={it.id} className="sched-row">
                    <div className="grow">
                      <div className="row between">
                        <b>{it.label}</b>
                        <Badge tone={APPROVAL[it.status].tone}>{APPROVAL[it.status].label}</Badge>
                      </div>
                      {it.note && <div className="small muted mt-s">{it.note}</div>}
                      {it.status === 'awaiting_approval' && active && (
                        <div className="row gap-s mt-s">
                          <Button size="sm" icon="check" onClick={() => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, status: 'approved' } : x)), `Customer approved: ${it.label}`, 'partner')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, status: 'changes' } : x)), `Customer asked for changes: ${it.label}`, 'partner')}>
                            Request changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {s.type === 'requests' && (
                <>
                  {s.items.map((it) => (
                    <div key={it.id} className="row gap-s small">
                      <Icon name="music" size={14} className="brand" /> {it.text} <span className="muted tiny">{it.by}</span>
                    </div>
                  ))}
                  {active && (
                    <div className="row gap-s">
                      <input className="input" placeholder="Add a request" value={req} onChange={(e) => setReq(e.target.value)} />
                      <Button
                        size="sm"
                        disabled={!req}
                        onClick={() => {
                          upd(s.id, (items) => [...items, { id: 'rq' + Date.now(), text: req, by: 'Customer' }], `New request: ${req}`, 'partner');
                          setReq('');
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </Card>
    );
  };
}

// ---------------- Partner ----------------
export function makePartnerPanel(cfg) {
  return function ConfigPartnerPanel({ booking }) {
    const { actions } = useStore();
    const { can } = usePerms();
    const d = booking.details || {};
    const upd = useSectionUpdater(booking);
    const edit = (can('crew.assign') || can('calendar.manage')) && booking.status !== 'cancelled';
    const [adds, setAdds] = useState({});
    const setField = (k, v) => actions.updateBookingDetails(booking.id, { fields: { ...(d.fields || {}), [k]: v } });
    return (
      <>
        <Section id={cfg.id + '-details'} title={cfg.partnerTitle}>
          <FieldGrid
            fields={cfg.fields.map((f) => [
              f.label,
              edit ? (
                <input className="input input-sm" style={{ maxWidth: f.wide ? 420 : 240 }} type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} value={(d.fields && d.fields[f.key]) || ''} onChange={(e) => setField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
              ) : f.type === 'date' && d.fields && d.fields[f.key] ? (
                fmtDate(d.fields[f.key])
              ) : (
                d.fields && d.fields[f.key]
              ),
            ])}
          />
        </Section>
        {(d.sections || []).map((s) => (
          <Section
            key={s.id}
            id={cfg.id + '-' + s.id}
            title={s.title}
            count={s.items.length}
            actions={s.type === 'checklist' && s.items.length > 0 && <span className="small muted">{s.items.filter((i) => i.done).length} of {s.items.length} done</span>}
          >
            {s.type === 'schedule' && (
              <MiniTable
                rows={s.items}
                empty="Nothing scheduled."
                columns={[
                  { label: 'Step', render: (it) => it.label },
                  { label: 'Date', render: (it) => (edit ? <input className="input input-sm" type="date" style={{ width: 150 }} value={it.date || ''} onChange={(e) => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, date: e.target.value } : x)))} /> : it.date ? fmtDay(it.date) : '-') },
                  { label: 'Time', render: (it) => (edit ? <input className="input input-sm" style={{ width: 90 }} value={it.time || ''} placeholder="hh:mm" onChange={(e) => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, time: e.target.value } : x)))} /> : it.time || '-') },
                  { label: 'Who', render: (it) => (edit ? <input className="input input-sm" style={{ width: 150 }} value={it.who || ''} onChange={(e) => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, who: e.target.value } : x)))} /> : it.who || '-') },
                  { label: '', align: 'right', render: (it) => (edit ? <button className="zc-rl-link" onClick={() => upd(s.id, (items) => items.filter((x) => x.id !== it.id))}>Remove</button> : null) },
                ]}
              />
            )}
            {s.type === 'checklist' && (
              <div className="stack-s">
                {s.items.map((it) => (
                  <label key={it.id} className="check">
                    <input type="checkbox" checked={it.done} disabled={!edit} onChange={() => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} />
                    <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>
                      {it.label}
                      {it.qty ? ` - ${it.qty}` : ''}
                    </span>
                    {s.customerTicks && (
                      <span className={'badge ' + (it.by === 'family' ? 'badge-blue' : 'badge-gray')} style={{ cursor: edit ? 'pointer' : 'default' }} onClick={(e) => { e.preventDefault(); if (edit) upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, by: x.by === 'family' ? 'partner' : 'family' } : x))); }}>
                        {it.by === 'family' ? 'Family arranges' : 'We arrange'}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {s.type === 'approvals' && (
              <MiniTable
                rows={s.items}
                columns={[
                  { label: 'Item', render: (it) => it.label },
                  { label: 'Status', render: (it) => <Badge tone={APPROVAL[it.status].tone}>{APPROVAL[it.status].label}</Badge> },
                  { label: 'Note to customer', render: (it) => (edit ? <input className="input input-sm" style={{ width: 240 }} value={it.note || ''} placeholder="Link or note" onChange={(e) => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, note: e.target.value } : x)))} /> : it.note || '-') },
                  {
                    label: '',
                    align: 'right',
                    render: (it) =>
                      edit && it.status !== 'approved' && it.status !== 'awaiting_approval' ? (
                        <button className="zc-rl-link" onClick={() => upd(s.id, (items) => items.map((x) => (x.id === it.id ? { ...x, status: 'awaiting_approval' } : x)), `${it.label} is ready for your approval`, 'customer')}>
                          Send for approval
                        </button>
                      ) : null,
                  },
                ]}
              />
            )}
            {s.type === 'requests' && (
              <div className="stack-s">
                {s.items.length === 0 && <div className="muted small">No requests yet. Customers add them from their booking page.</div>}
                {s.items.map((it) => (
                  <div key={it.id} className="row gap-s">
                    <Icon name="music" size={14} className="brand" /> {it.text} <span className="tiny muted">from {it.by}</span>
                  </div>
                ))}
              </div>
            )}
            {edit && s.type !== 'approvals' && s.type !== 'requests' && (
              <div className="row gap-s mt">
                <input className="input input-sm" style={{ width: 260 }} placeholder={s.type === 'schedule' ? 'Add a step' : 'Add an item'} value={adds[s.id] || ''} onChange={(e) => setAdds({ ...adds, [s.id]: e.target.value })} />
                <button
                  className="zc-btn zc-btn-primary"
                  disabled={!adds[s.id]}
                  onClick={() => {
                    const item = s.type === 'schedule' ? { id: 'x' + Date.now(), label: adds[s.id], date: booking.eventDate, time: '', who: '' } : { id: 'x' + Date.now(), label: adds[s.id], done: false, by: 'partner' };
                    upd(s.id, (items) => [...items, item]);
                    setAdds({ ...adds, [s.id]: '' });
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </Section>
        ))}
      </>
    );
  };
}

// ---------------- Module page ----------------
export function makeModule(cfg) {
  return function ConfigModule() {
    const { state, actions } = useStore();
    const { can } = usePerms();
    const listing = state.listings.find((l) => l.partnerId === state.partnerId);
    const catalog = (listing.attributes && listing.attributes.catalog) || [];
    const [row, setRow] = useState({ name: '', price: '', extra: '' });
    const today = todayISO();
    const upcoming = state.bookings
      .filter((b) => inScope(state, b) && ['accepted', 'booked'].includes(b.status) && b.eventDate >= today)
      .map((b) => ({ ...b, lead: state.leads.find((l) => l.id === b.leadId) || {} }))
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const nextSteps = upcoming
      .flatMap((b) => ((b.details && b.details.sections) || []).filter((s) => s.type === 'schedule').flatMap((s) => s.items.map((it) => ({ ...it, id: b.id + it.id, booking: b }))))
      .filter((it) => it.date >= today)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
      .slice(0, 12);
    const saveCatalog = (items) => actions.updateListing(listing.id, { attributes: { ...listing.attributes, catalog: items } });
    return (
      <>
        <ModuleHeader title={cfg.module.label} subtitle={cfg.moduleSubtitle} />
        <div className="stack">
          <Section title={cfg.boardTitle} count={upcoming.length}>
            <MiniTable
              rows={upcoming}
              onRow={(b) => navigate('/partner/bookings/' + b.id)}
              empty="No upcoming bookings."
              columns={[
                { label: 'Booking', render: (b) => b.number },
                { label: 'Customer', render: (b) => b.lead.contactName },
                { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
                ...cfg.boardColumns.map((c) => ({
                  label: c.label,
                  render: (b) => {
                    const v = b.details && b.details.fields && b.details.fields[c.key];
                    return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? fmtDate(v) : v || '-';
                  },
                })),
                {
                  label: 'Progress',
                  render: (b) => {
                    const p = progressOf(b.details);
                    return p === null ? '-' : (
                      <span className="row gap-s">
                        <span className="progress" style={{ width: 80 }}>
                          <span style={{ width: p + '%' }} />
                        </span>
                        {p}%
                      </span>
                    );
                  },
                },
                { label: 'Waiting on Customer', render: (b) => waitingOf(b.details) || '-' },
              ]}
            />
          </Section>
          <Section title={cfg.scheduleTitle} count={nextSteps.length}>
            <MiniTable
              rows={nextSteps}
              onRow={(it) => navigate('/partner/bookings/' + it.booking.id)}
              empty="Nothing scheduled yet."
              columns={[
                { label: 'Step', render: (it) => it.label },
                { label: 'Customer', render: (it) => it.booking.lead.contactName },
                { label: 'Date', render: (it) => fmtDay(it.date) },
                { label: 'Time', render: (it) => it.time || '-' },
                { label: 'Who', render: (it) => it.who || '-' },
              ]}
            />
          </Section>
          <Section title={cfg.catalog.title} count={catalog.length}>
            <MiniTable
              rows={catalog.map((c, i) => ({ ...c, id: 'c' + i, i }))}
              empty="Nothing added yet."
              columns={[
                { label: cfg.catalog.nameLabel, render: (c) => c.name },
                { label: cfg.catalog.priceLabel, align: 'right', render: (c) => (c.price ? inr(c.price) : '-') },
                { label: cfg.catalog.extraLabel, render: (c) => c.extra || '-' },
                { label: '', align: 'right', render: (c) => (can('listing.edit') ? <button className="zc-rl-link red" onClick={() => saveCatalog(catalog.filter((_, j) => j !== c.i))}>Remove</button> : null) },
              ]}
            />
            {can('listing.edit') && (
              <div className="row gap-s mt wrap">
                <input className="input input-sm" style={{ width: 220 }} placeholder={cfg.catalog.nameLabel} value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
                <input className="input input-sm" style={{ width: 120 }} type="number" placeholder={cfg.catalog.priceLabel} value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })} />
                <input className="input input-sm" style={{ width: 200 }} placeholder={cfg.catalog.extraLabel} value={row.extra} onChange={(e) => setRow({ ...row, extra: e.target.value })} />
                <button
                  className="zc-btn zc-btn-primary"
                  disabled={!row.name}
                  onClick={() => {
                    saveCatalog([...catalog, { name: row.name, price: Number(row.price) || 0, extra: row.extra }]);
                    setRow({ name: '', price: '', extra: '' });
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </Section>
        </div>
      </>
    );
  };
}
