// Photography studio Home, modelled on the studio's own Zoho CRM dashboard:
// tabs to the main modules, four studio KPIs, a month booking calendar and the upcoming schedule.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../../config';
import { navigate } from '../../router';
import { invoiceTotals, useStore } from '../../store';
import { Icon } from '../../components/ui';
import { inScope } from '../../accounts';

const TYPE_COLOR = { Wedding: '#4f6ef7', Engagement: '#8b5cf6', Reception: '#6366f1', Birthday: '#eab308', 'Baby Shower': '#ec4899', Housewarming: '#14b8a6', Corporate: '#0ea5e9', Pooja: '#f97316' };
const colorOf = (t) => TYPE_COLOR[t] || '#64748b';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const time12 = (t) => {
  if (!t) return '';
  const [h, mi] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export function PhotoHome() {
  const { state } = useStore();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const leadOf = (b) => state.leads.find((l) => l.id === b.leadId) || {};
  const bookings = state.bookings
    .filter((b) => inScope(state, b) && b.status !== 'cancelled')
    .map((b) => {
      const l = leadOf(b);
      const f = ((b.details || {}).functions || [])[0] || {};
      return { ...b, lead: l, who: b.buyerOrgName || l.contactName || '-', type: l.eventType || f.name, time: f.time || '', venue: f.venue || l.area || '', hours: f.hours || (l.details || {}).hoursPerFunction || null };
    });
  const invoices = state.invoices.filter((i) => inScope(state, i));
  const month = today.slice(0, 7);
  const prev = (() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const inMonth = (mm) => bookings.filter((b) => b.eventDate.slice(0, 7) === mm).length;
  const thisMonth = inMonth(month);
  const delta = thisMonth - inMonth(prev);
  const pending = invoices.map((i) => invoiceTotals(i)).filter((t) => t.due > 0);
  const newEnq = state.leads.filter((l) => inScope(state, l) && !l.isDeal && l.createdAt.slice(0, 7) === month).length;
  const completed = bookings.filter((b) => ['completed', 'reviewed'].includes(b.status)).length;
  const monthName = MONTHS[Number(today.slice(5, 7)) - 1];

  // Month grid
  const first = new Date(cursor.y, cursor.m, 1);
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDay = (d) => bookings.filter((b) => b.eventDate === ymd(cursor.y, cursor.m, d)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const shift = (n) => setCursor((c) => ({ y: c.m + n < 0 ? c.y - 1 : c.m + n > 11 ? c.y + 1 : c.y, m: (c.m + n + 12) % 12 }));

  // Upcoming schedule
  const upcoming = bookings
    .filter((b) => b.eventDate >= today && ['accepted', 'booked'].includes(b.status))
    .sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time))
    .slice(0, 8);
  const groups = [];
  upcoming.forEach((b) => {
    const g = groups.find((x) => x.date === b.eventDate);
    if (g) g.items.push(b);
    else groups.push({ date: b.eventDate, items: [b] });
  });
  const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

  const tabs = [
    { label: 'Enquiries', to: '/partner/leads' },
    { label: 'Booking Shoots', to: '/partner/bookings' },
    { label: 'Shoots & Deliverables', to: '/partner/deliverables' },
    { label: 'Crew', to: '/partner/studio-crew' },
    { label: 'Vendor POs', to: '/partner/vendor-pos' },
    { label: 'Equipments', to: '/partner/equipment' },
  ];
  const kpis = [
    { icon: 'camera', tone: 'blue', label: `Total bookings (${monthName})`, value: thisMonth, sub: `${delta >= 0 ? '+' : ''}${delta} vs last month`, subTone: delta >= 0 ? 'up' : 'down', to: '/partner/bookings' },
    { icon: 'file', tone: 'amber', label: 'Pending invoices', value: inr(pending.reduce((a, t) => a + t.due, 0)), sub: `${pending.length} invoices`, subTone: 'warn', to: '/partner/invoices' },
    { icon: 'chat', tone: 'violet', label: 'New enquiries', value: newEnq, sub: monthName, subTone: 'up', to: '/partner/leads' },
    { icon: 'check', tone: 'green', label: 'Completed sessions', value: completed, sub: 'All time', subTone: 'muted', to: '/partner/deliverables' },
  ];

  return (
    <div className="ph">
      <div className="ph-tabs">
        <span className="ph-tab active">Overview</span>
        {tabs.map((t) => (
          <button key={t.to} className="ph-tab" onClick={() => navigate(t.to)}>
            {t.label} <Icon name="chevronRight" size={12} />
          </button>
        ))}
      </div>
      <div className="ph-kpis">
        {kpis.map((k) => (
          <button key={k.label} className="ph-kpi" onClick={() => navigate(k.to)}>
            <span className={'ph-kpi-icon ' + k.tone}>
              <Icon name={k.icon} size={20} />
            </span>
            <span>
              <span className="ph-kpi-label">{k.label}</span>
              <span className="ph-kpi-value">{k.value}</span>
              <span className={'ph-kpi-sub ' + k.subTone}>{k.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="ph-main">
        <section className="ph-card">
          <div className="ph-card-head">
            <b>
              <Icon name="calendar" size={16} /> Booking Calendar
            </b>
            <span className="row gap-s">
              <button className="ph-nav" onClick={() => shift(-1)} aria-label="Previous month">
                ‹
              </button>
              <b className="ph-month">
                {MONTHS[cursor.m]} {cursor.y}
              </b>
              <button className="ph-nav" onClick={() => shift(1)} aria-label="Next month">
                ›
              </button>
            </span>
          </div>
          <div className="ph-cal">
            {DOW.map((d) => (
              <div key={d} className="ph-dow">
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={'e' + i} className="ph-day empty" />;
              const list = byDay(d);
              const date = ymd(cursor.y, cursor.m, d);
              return (
                <div key={date} className={'ph-day' + (list.length ? ' has' : '') + (date === today ? ' today' : '')} onClick={() => list[0] && navigate('/partner/bookings/' + list[0].id)} title={list.map((b) => `${b.who} - ${b.type}`).join('\n')}>
                  <span className="ph-dnum">{d}</span>
                  {list.length > 0 && (
                    <>
                      <span className="ph-dots">
                        {list.slice(0, 3).map((b) => (
                          <i key={b.id} style={{ background: colorOf(b.type) }} />
                        ))}
                        {list.length > 3 && <small>+{list.length - 3}</small>}
                      </span>
                      <span className="ph-dlabel">
                        {list[0].who} - {list[0].type}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <section className="ph-card">
          <div className="ph-card-head">
            <b>
              <Icon name="clock" size={16} /> Upcoming Schedule
            </b>
            <span className="ph-chip">{new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          {groups.length === 0 ? (
            <p className="muted small">Nothing scheduled.</p>
          ) : (
            groups.map((g) => (
              <div key={g.date} className="ph-sched-day">
                <div className="ph-sched-date">{dayLabel(g.date)}</div>
                {g.items.map((b) => (
                  <div key={b.id} className="ph-sched-row" onClick={() => navigate('/partner/bookings/' + b.id)}>
                    <span className="ph-sched-time">{time12(b.time)}</span>
                    <span className="ph-sched-dot" style={{ borderColor: colorOf(b.type) }} />
                    <span className="ph-sched-card" style={{ background: colorOf(b.type) + '14' }}>
                      <b>
                        {b.who} - {b.type}
                      </b>
                      {b.venue && (
                        <span className="small muted">
                          <Icon name="pin" size={12} /> {b.venue}
                        </span>
                      )}
                      <span className="small">
                        {b.hours ? `${b.hours} hrs - ` : ''}
                        {inr(b.total)}
                      </span>
                      <span className="tiny muted">
                        {b.number} - {fmtDate(b.eventDate)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
