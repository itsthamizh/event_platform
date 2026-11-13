// Shared building blocks used by all three apps.
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { coverFor, fmtDate, initials, todayISO } from '../config';
import { useStore } from '../store';
import { Link } from '../router';

export { Icon };

export function Button({ variant = 'primary', size, icon, children, className = '', block, ...rest }) {
  const cls = ['btn', 'btn-' + variant, size ? 'btn-' + size : '', block ? 'btn-block' : '', className].join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size, icon, children, className = '', block }) {
  const cls = ['btn', 'btn-' + variant, size ? 'btn-' + size : '', block ? 'btn-block' : '', className].join(' ');
  return (
    <Link to={to} className={cls}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </Link>
  );
}

const TONES = {
  new: 'blue', contacted: 'violet', quoted: 'amber', negotiation: 'orange', won: 'green', lost: 'gray',
  Enquiry: 'blue', Quoted: 'amber', Accepted: 'violet', Booked: 'green', Completed: 'teal', Reviewed: 'gray', Cancelled: 'red',
  accepted: 'violet', booked: 'green', completed: 'teal', reviewed: 'gray', cancelled: 'red',
  paid: 'green', partially_paid: 'amber', issued: 'blue', overdue: 'red', due: 'amber', waived: 'gray',
  verified: 'green', pending: 'amber', rejected: 'red', suspended: 'red',
  active: 'green', invited: 'amber', removed: 'gray', blocked: 'red', trial: 'blue', past_due: 'red',
  published: 'green', reported: 'red', hidden: 'gray', draft: 'gray', live: 'green', scheduled: 'blue',
  open: 'red', evidence: 'amber', decided: 'green', requested: 'amber', processed: 'green', approved: 'green',
  on_hold: 'red', sent: 'blue', superseded: 'gray', changes_requested: 'orange', tentative: 'amber',
  viewed: 'violet', expired: 'gray', withdrawn: 'gray', partially_signed: 'amber', signed: 'green', void: 'gray',
  in_progress: 'blue', no_show: 'red', disputed: 'red', rescheduled: 'violet', upcoming: 'blue', grace: 'orange',
  assigned: 'amber', declined: 'red', checked_in: 'blue', checked_out: 'teal', pending_moderation: 'amber',
  awarded: 'green', not_awarded: 'gray', responded: 'violet', closed: 'gray', pending_approval: 'amber', fulfilled: 'teal',
  waiting: 'gray', planning: 'blue', change_requested: 'orange', corporate: 'violet', vendor: 'teal', individual: 'gray',
  processing: 'blue', failed: 'red', revised: 'gray', confirmed: 'green',
};

const LABELS = {
  partially_paid: 'Partly paid', past_due: 'Past due', on_hold: 'On hold', changes_requested: 'Revision requested', superseded: 'Revised',
  partially_signed: 'Partly signed', in_progress: 'In progress', no_show: 'No-show', pending_moderation: 'In moderation', not_awarded: 'Not awarded',
  pending_approval: 'Pending approval', checked_in: 'Checked in', checked_out: 'Checked out', change_requested: 'Change requested', responded: 'Quoted',
  grace: 'Grace period', vendor: 'Planner', booked: 'Confirmed',
};

export function Badge({ status, children, tone }) {
  const t = tone || TONES[status] || 'gray';
  const label = children || LABELS[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');
  return <span className={'badge badge-' + t}>{label}</span>;
}

export function Card({ title, actions, children, className = '', pad = true, subtitle }) {
  return (
    <section className={'card ' + className}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="row gap-s">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

export function Avatar({ name, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: coverFor(name) }}>
      {initials(name)}
    </span>
  );
}

export function Cover({ seed, label, height = 160, icon, children, className = '' }) {
  return (
    <div className={'cover ' + className} style={{ background: coverFor(seed), height }}>
      {icon && <Icon name={icon} size={typeof height === 'number' ? Math.min(56, height / 3) : 48} className="cover-icon" strokeWidth={1.5} />}
      {label && <span className="cover-label">{label}</span>}
      {children}
    </div>
  );
}

export function Stars({ value, count, size = 14 }) {
  return (
    <span className="stars">
      <Icon name="star" size={size} className="star-on" />
      <b>{Number(value).toFixed(1)}</b>
      {count != null && <span className="muted">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className={n <= value ? 'on' : ''} aria-label={n + ' stars'}>
          <Icon name="star" size={28} />
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone }) {
  return (
    <div className={'stat ' + (tone ? 'stat-' + tone : '')}>
      <div className="stat-top">
        <span className="muted small">{label}</span>
        {icon && <Icon name={icon} size={18} className="muted" />}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

export function Empty({ icon = 'info', title, children, action }) {
  return (
    <div className="empty">
      <Icon name={icon} size={32} />
      <h4>{title}</h4>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Field({ label, hint, children, error }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={'modal ' + (wide ? 'modal-wide' : '')} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const id = typeof t === 'string' ? t : t.id;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'string' ? null : t.count;
        return (
          <button key={id} role="tab" className={'tab ' + (value === id ? 'active' : '')} onClick={() => onChange(id)}>
            {label}
            {count != null && <span className="tab-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Steps({ steps, current, cancelled }) {
  const idx = steps.indexOf(current);
  return (
    <ol className={'steps ' + (cancelled ? 'steps-cancelled' : '')}>
      {steps.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
          <span className="step-dot">{i < idx ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
          <span className="step-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast toast-' + t.tone}>
          <Icon name={t.tone === 'warning' ? 'alert' : 'check'} size={16} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-head">
      <div>
        {back && (
          <Link to={back} className="back-link">
            <Icon name="back" size={16} /> Back
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="row gap-s wrap">{actions}</div>}
    </div>
  );
}

export function KeyValue({ rows }) {
  return (
    <dl className="kv">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BarList({ data, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="barlist">
      {data.map((d) => (
        <div className="barlist-row" key={d.k}>
          <span className="barlist-label">{d.k}</span>
          <span className="barlist-track">
            <span className="barlist-fill" style={{ width: (d.v / max) * 100 + '%' }} />
          </span>
          <span className="barlist-value">{format(d.v)}</span>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({ data, height = 160, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="colchart" style={{ height }}>
      {data.map((d) => (
        <div className="colchart-col" key={d.m}>
          <span className="colchart-val">{format(d.v)}</span>
          <span className="colchart-bar" style={{ height: (d.v / max) * (height - 44) }} />
          <span className="colchart-label">{d.m}</span>
        </div>
      ))}
    </div>
  );
}

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// Month grid. getDay(iso) -> { status?: 'available'|'limited'|'taken'|'blocked'|'booked', content?: node, disabled?: bool }
export function MonthCalendar({ initial, getDay, onPick, selected, compact }) {
  const start = initial || todayISO();
  const [ym, setYm] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const first = new Date(ym.y, ym.m, 1);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${ym.y}-${pad(ym.m + 1)}-${pad(d)}`);
  const today = todayISO();
  const shift = (n) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };
  return (
    <div className={'cal ' + (compact ? 'cal-compact' : '')}>
      <div className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
          <Icon name="back" />
        </button>
        <b>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="cal-grid">
        {WEEK.map((w) => (
          <span key={w} className="cal-week">
            {compact ? w[0] : w}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={'x' + i} />;
          const info = (getDay && getDay(iso)) || {};
          const past = iso < today;
          const disabled = info.disabled || (past && !info.allowPast);
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onPick && onPick(iso)}
              className={['cal-day', info.status ? 'cal-' + info.status : '', selected === iso ? 'cal-selected' : '', iso === today ? 'cal-today' : '', past ? 'cal-past' : ''].join(' ')}
              title={info.title || fmtDate(iso)}
            >
              <span className="cal-num">{Number(iso.slice(8))}</span>
              {info.content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map(([cls, label]) => (
        <span key={label}>
          <i className={'legend-dot cal-' + cls} /> {label}
        </span>
      ))}
    </div>
  );
}

export function Table({ columns, rows, onRow, empty = 'Nothing here yet' }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.label} style={{ textAlign: c.align || 'left', width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'clickable' : ''}>
              {columns.map((c) => (
                <td key={c.key || c.label} style={{ textAlign: c.align || 'left' }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
