// Zoho CRM-style building blocks for the Partner CRM and Admin console:
// module list views (with filter panel, kanban), record detail pages (stage path,
// blueprint bar, related lists) and the Setup page shell.
import { useMemo, useState } from 'react';
import { Link } from '../router';
import { Avatar, Icon } from './ui';

// ---------- List view (NextGen: view tabs, Filter/Sort toolbar, footer pager) ----------
export function ListView({
  module,
  views = [],
  columns,
  rows,
  filterFields = [],
  onRow,
  onCreate,
  createLabel,
  kanban,
  defaultMode = 'list',
  toolbarExtra,
  rowKey = (r) => r.id,
}) {
  const allViews = views.length ? views : [{ id: 'all', label: `All ${module.plural}`, filter: () => true }];
  const [viewId, setViewId] = useState(allViews[0].id);
  const [mode, setMode] = useState(defaultMode);
  const [selected, setSelected] = useState([]);
  const [filterSearch, setFilterSearch] = useState('');
  const [active, setActive] = useState({});
  const [sort, setSort] = useState(null);
  const [sortMenu, setSortMenu] = useState(false);
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const view = allViews.find((v) => v.id === viewId) || allViews[0];

  const filtered = useMemo(() => {
    let r = rows.filter(view.filter);
    Object.entries(active).forEach(([k, v]) => {
      const f = filterFields.find((x) => x.key === k);
      if (!f || v === '' || v === undefined) return;
      r = r.filter((row) => {
        const val = f.get(row);
        if (f.type === 'text') return String(val || '').toLowerCase().includes(String(v).toLowerCase());
        return String(val) === String(v);
      });
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const get = col.sortValue || ((row) => row[col.key]);
      r = [...r].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x || '').localeCompare(String(y || ''));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, view, active, sort, columns, filterFields]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pg = Math.min(page, pages - 1);
  const visible = filtered.slice(pg * perPage, pg * perPage + perPage);
  const allChecked = visible.length > 0 && visible.every((r) => selected.includes(rowKey(r)));
  const toggleAll = () => setSelected(allChecked ? selected.filter((id) => !visible.some((r) => rowKey(r) === id)) : [...new Set([...selected, ...visible.map(rowKey)])]);
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const activeCount = Object.values(active).filter((v) => v !== undefined && v !== '').length;
  const sortable = columns.filter((c) => c.sortable !== false && c.label);

  return (
    <div className="zc-list">
      <div className="zc-views">
        {allViews.map((v) => (
          <button
            key={v.id}
            className={'zc-view ' + (v.id === viewId ? 'on' : '')}
            onClick={() => {
              setViewId(v.id);
              setPage(0);
            }}
          >
            {v.label}
          </button>
        ))}
        <button className="zc-view" aria-label="More views">
          ...
        </button>
      </div>

      <div className="zc-toolbar">
        <div className="row gap-xs">
          <button className={'zc-ghost ' + (showFilters ? 'on' : '')} onClick={() => setShowFilters(!showFilters)}>
            <Icon name="filter" size={15} /> Filter {activeCount > 0 && <span className="zc-count-dot">{activeCount}</span>}
          </button>
          <div className="bell">
            <button className={'zc-ghost ' + (sort ? 'on' : '')} onClick={() => setSortMenu(!sortMenu)}>
              <Icon name="list" size={15} /> Sort
            </button>
            {sortMenu && (
              <div className="zc-menu-pop" onMouseLeave={() => setSortMenu(false)}>
                {sortable.map((c) => (
                  <button
                    key={c.key}
                    className={sort && sort.key === c.key ? 'on' : ''}
                    onClick={() => {
                      setSort(sort && sort.key === c.key ? { key: c.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' });
                      setSortMenu(false);
                    }}
                  >
                    {c.label}
                    {sort && sort.key === c.key && <span>{sort.dir === 'asc' ? 'A-Z' : 'Z-A'}</span>}
                  </button>
                ))}
                {sort && (
                  <button
                    onClick={() => {
                      setSort(null);
                      setSortMenu(false);
                    }}
                  >
                    Clear sort
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="zc-modes">
            <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} title="List view" aria-label="List view">
              <Icon name="list" size={16} />
            </button>
            {kanban && (
              <button className={mode === 'kanban' ? 'on' : ''} onClick={() => setMode('kanban')} title="Kanban view" aria-label="Kanban view">
                <Icon name="grid" size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="row gap-s">
          {toolbarExtra}
          {onCreate && (
            <span className="zc-split">
              <button className="zc-btn zc-btn-primary" onClick={onCreate}>
                {createLabel || `Create ${module.singular}`}
              </button>
              <button className="zc-btn zc-btn-primary" aria-label="More create options">
                <Icon name="chevronDown" size={13} />
              </button>
            </span>
          )}
          <button className="zc-btn zc-btn-icon" aria-label="More actions">
            ...
          </button>
        </div>
      </div>

      <div className="zc-list-body">
        {showFilters && filterFields.length > 0 && (
          <aside className="zc-filters">
            <div className="zc-filters-head">Filter {module.plural} by</div>
            <div className="zc-filters-search">
              <Icon name="search" size={14} />
              <input placeholder="Search" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>
            <div className="zc-filters-group">
              <Icon name="chevronDown" size={12} /> Filter By Fields
            </div>
            {filterFields
              .filter((f) => f.label.toLowerCase().includes(filterSearch.toLowerCase()))
              .map((f) => {
                const on = active[f.key] !== undefined;
                const opts = f.type === 'select' ? f.options || [...new Set(rows.map(f.get).filter((x) => x !== null && x !== undefined && x !== ''))] : null;
                return (
                  <div key={f.key} className="zc-filter">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const n = { ...active };
                          if (on) delete n[f.key];
                          else n[f.key] = '';
                          setActive(n);
                          setPage(0);
                        }}
                      />
                      {f.label}
                    </label>
                    {on &&
                      (f.type === 'select' ? (
                        <select className="select input-sm" value={active[f.key]} onChange={(e) => setActive({ ...active, [f.key]: e.target.value })}>
                          <option value="">- None -</option>
                          {opts.map((o) => {
                            const val = typeof o === 'object' ? o.value : o;
                            const label = typeof o === 'object' ? o.label : o;
                            return (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input className="input input-sm" placeholder="contains" value={active[f.key]} onChange={(e) => setActive({ ...active, [f.key]: e.target.value })} />
                      ))}
                  </div>
                );
              })}
            {activeCount > 0 && (
              <button className="zc-rl-link" style={{ margin: '10px 14px' }} onClick={() => setActive({})}>
                Clear filters
              </button>
            )}
          </aside>
        )}

        <div className="zc-list-main">
          {mode === 'kanban' && kanban ? (
            <div className="zc-kanban">
              {kanban.groups.map((g) => {
                const items = filtered.filter((r) => kanban.groupOf(r) === g.id);
                return (
                  <div key={g.id} className="zc-kcol" style={{ '--kc': g.color || 'var(--zc-blue)' }}>
                    <div className="zc-kcol-head">
                      <b>{g.label}</b>
                      <span className="muted tiny">
                        {kanban.total ? kanban.total(items) + ' - ' : ''}
                        {items.length} {items.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>
                    <div className="zc-kcol-body">
                      {items.map((r) => (
                        <div key={rowKey(r)} className="zc-kcard" onClick={() => onRow && onRow(r)}>
                          {kanban.card(r)}
                        </div>
                      ))}
                      {items.length === 0 && <div className="muted tiny center" style={{ padding: 16 }}>No records</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="zc-table-wrap">
              <table className="zc-table">
                <thead>
                  <tr>
                    <th className="zc-cb">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        style={{ textAlign: c.align || 'left', width: c.width }}
                        className={c.sortable === false ? '' : 'sortable'}
                        onClick={() => c.sortable !== false && setSort(sort && sort.key === c.key ? { key: c.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' })}
                      >
                        {c.label}
                        {sort && sort.key === c.key && <span className="zc-sort">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={rowKey(r)} className={selected.includes(rowKey(r)) ? 'sel' : ''}>
                      <td className="zc-cb" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.includes(rowKey(r))} onChange={() => toggle(rowKey(r))} aria-label="Select row" />
                      </td>
                      {columns.map((c, i) => (
                        <td key={c.key} style={{ textAlign: c.align || 'left' }} onClick={() => onRow && onRow(r)} className={onRow ? 'clickable' : ''}>
                          {i === 0 && onRow ? <span className="zc-link">{c.render ? c.render(r) : r[c.key]}</span> : c.render ? c.render(r) : r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="center muted" style={{ padding: 48 }}>
                        No {module.plural.toLowerCase()} found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="zc-list-foot">
            <span>
              Total Records <b>{filtered.length}</b>
              {selected.length > 0 && <span className="muted"> - {selected.length} selected</span>}
            </span>
            {mode === 'list' && (
              <span className="zc-pager">
                <select className="zc-perpage" value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }} aria-label="Records per page">
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} Records Per Page
                    </option>
                  ))}
                </select>
                <button disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Previous page">
                  <Icon name="back" size={14} />
                </button>
                <span>
                  {filtered.length ? pg * perPage + 1 : 0} to {Math.min(filtered.length, (pg + 1) * perPage)}
                </span>
                <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Next page">
                  <Icon name="chevronRight" size={14} />
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Detail view ----------
export function RecordHeader({ back, title, subtitle, avatar, badges, actions, owner }) {
  return (
    <div className="zc-rhead">
      <div className="row gap-s grow" style={{ minWidth: 0 }}>
        {back && (
          <Link to={back} className="icon-btn" aria-label="Back">
            <Icon name="back" />
          </Link>
        )}
        {avatar && <Avatar name={avatar} size={40} />}
        <div style={{ minWidth: 0 }}>
          <div className="row gap-s wrap">
            <h1 className="zc-rtitle">{title}</h1>
            {badges}
          </div>
          <div className="small muted">
            {subtitle}
            {owner && (
              <>
                {subtitle ? ' - ' : ''}
                Owner: <b className="zc-ink">{owner}</b>
              </>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="row gap-s wrap">{actions}</div>}
    </div>
  );
}

// Chevron stage path, like the Deals stage bar.
export function StagePath({ stages, current, lost, onPick }) {
  const idx = stages.findIndex((s) => (s.id || s) === current);
  return (
    <div className={'zc-path ' + (lost ? 'lost' : '')}>
      {stages.map((s, i) => {
        const id = s.id || s;
        const label = s.label || s;
        return (
          <button key={id} type="button" disabled={!onPick} onClick={() => onPick && onPick(id)} className={'zc-path-step ' + (i < idx ? 'done' : i === idx ? 'current' : '')}>
            {i < idx && <Icon name="check" size={12} strokeWidth={3} />} {label}
          </button>
        );
      })}
    </div>
  );
}

// Blueprint-style strip: current state + the transitions available from it.
export function BlueprintBar({ state, transitions = [], note }) {
  return (
    <div className="zc-blueprint">
      <span className="zc-bp-label">
        <Icon name="activity" size={14} /> Blueprint
      </span>
      <span className="small">
        Current state: <b>{state}</b>
      </span>
      {note && <span className="small muted">{note}</span>}
      <span className="grow" />
      {transitions.map((t) => (
        <button key={t.label} className={'zc-btn ' + (t.primary ? 'zc-btn-primary' : '')} onClick={t.onClick} disabled={t.disabled}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function DetailLayout({ nav, tab, onTab, children, tabs = ['Overview', 'Timeline'] }) {
  return (
    <div className="zc-detail">
      <aside className="zc-dnav">
        <div className="zc-dnav-title">Related List</div>
        {nav.map((n) => (
          <a
            key={n.id}
            href={'#' + window.location.hash.slice(1).split('?')[0]}
            onClick={(e) => {
              e.preventDefault();
              if (onTab && tab !== 'Overview') onTab('Overview');
              setTimeout(() => {
                const el = document.getElementById('sec-' + n.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 30);
            }}
          >
            {n.label}
            {n.count != null && <span className="zc-count">{n.count}</span>}
          </a>
        ))}
      </aside>
      <div className="zc-dmain">
        {onTab && (
          <div className="zc-dtabs">
            {tabs.map((t) => (
              <button key={t} className={tab === t ? 'on' : ''} onClick={() => onTab(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Section({ id, title, actions, children, count }) {
  return (
    <section className="zc-section" id={id ? 'sec-' + id : undefined}>
      <header>
        <h3>
          {title}
          {count != null && <span className="zc-count">{count}</span>}
        </h3>
        {actions && <div className="row gap-s">{actions}</div>}
      </header>
      <div className="zc-section-body">{children}</div>
    </section>
  );
}

export function FieldGrid({ fields, cols = 2 }) {
  return (
    <div className={'zc-fields cols-' + cols}>
      {fields.filter(Boolean).map(([label, value]) => (
        <div key={label} className="zc-field">
          <span className="zc-flabel">{label}</span>
          <span className="zc-fvalue">{value === null || value === undefined || value === '' ? <span className="muted">-</span> : value}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniTable({ columns, rows, onRow, empty = 'No records found' }) {
  if (!rows.length) return <div className="muted small zc-empty-rl">{empty}</div>;
  return (
    <div className="zc-table-wrap">
      <table className="zc-table zc-table-mini">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} style={{ textAlign: c.align || 'left' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'clickable' : ''}>
              {columns.map((c, j) => (
                <td key={c.label} style={{ textAlign: c.align || 'left' }}>
                  {j === 0 && onRow ? <span className="zc-link">{c.render(r)}</span> : c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Timeline({ items }) {
  if (!items.length) return <div className="muted small zc-empty-rl">No activity yet.</div>;
  return (
    <ul className="zc-timeline">
      {items.map((t) => (
        <li key={t.id}>
          <span className="zc-tl-dot">
            <Icon name={t.icon || 'activity'} size={12} />
          </span>
          <div>
            <div>{t.body}</div>
            <div className="tiny muted">{t.meta}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- Module page header (used for non-list pages like Home, Calendar) ----------
export function ModuleHeader({ title, actions, subtitle }) {
  return (
    <div className="zc-mhead">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="small muted">{subtitle}</div>}
      </div>
      {actions && <div className="row gap-s wrap">{actions}</div>}
    </div>
  );
}

// ---------- Setup shell ----------
export function SetupShell({ groups, current, children, title }) {
  return (
    <div className="zc-setup">
      <aside className="zc-setup-nav">
        <div className="zc-setup-title">
          <Icon name="settings" size={16} /> Setup
        </div>
        {groups.map((g) => (
          <div key={g.label}>
            <div className="zc-setup-group">{g.label}</div>
            {g.items.map((i) => (
              <Link key={i.to} to={i.to} className={current === i.to ? 'active' : ''}>
                {i.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <div className="zc-setup-main">
        {title && <h1 className="zc-setup-h1">{title}</h1>}
        {children}
      </div>
    </div>
  );
}

// ---------- Home dashboard pieces ----------
export function Welcome({ name, initials, homeLabel }) {
  return (
    <div className="zc-welcome">
      <span className="zc-welcome-icon">
        <span>{initials}</span>
      </span>
      <h1>Welcome {name}</h1>
      <div className="zc-welcome-right">
        <button className="zc-btn zc-btn-icon" aria-label="Refresh" title="Refresh">
          <Icon name="activity" size={15} />
        </button>
        <button className="zc-btn">
          {homeLabel} <Icon name="chevronDown" size={13} />
        </button>
        <button className="zc-btn zc-btn-icon" aria-label="More">
          ...
        </button>
      </div>
    </div>
  );
}

export function Kpis({ items }) {
  return (
    <div className="zc-kpis">
      {items.filter(Boolean).map((k) => (
        <Link key={k.label} to={k.to || '#'} className="zc-kpi">
          <span className="zc-kpi-label">{k.label}</span>
          <span className="zc-kpi-value">{k.value}</span>
        </Link>
      ))}
    </div>
  );
}

// A home component: title + small table with pagination, like "My Open Tasks".
export function Component({ title, columns, rows, onRow, pageSize = 5, empty = 'No records found', children }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil((rows || []).length / pageSize));
  const pg = Math.min(page, pages - 1);
  const visible = rows ? rows.slice(pg * pageSize, pg * pageSize + pageSize) : [];
  return (
    <section className="zc-comp">
      <div className="zc-comp-head">
        <h3>{title}</h3>
        <span className="zc-comp-actions">
          <button className="zc-hbtn" aria-label="Refresh">
            <Icon name="activity" size={14} />
          </button>
          <button className="zc-hbtn" aria-label="More">
            ...
          </button>
        </span>
      </div>
      <div className="zc-comp-body">
        {children ||
          (visible.length === 0 ? (
            <div className="muted center" style={{ padding: '48px 0' }}>{empty}</div>
          ) : (
            <table className="zc-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} style={{ textAlign: c.align || 'left' }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id || i}>
                    {columns.map((c, j) => (
                      <td key={c.label} style={{ textAlign: c.align || 'left' }} className={onRow ? 'clickable' : ''} onClick={onRow ? () => onRow(r) : undefined}>
                        {j === 0 && onRow ? <span className="zc-link">{c.render(r)}</span> : c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
      {!children && rows && rows.length > 0 && (
        <div className="zc-comp-foot">
          <span>
            {pg * pageSize + 1} - {Math.min(rows.length, (pg + 1) * pageSize)}
          </span>
          <span className="zc-pager">
            <button disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Previous">
              <Icon name="back" size={13} />
            </button>
            <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Next">
              <Icon name="chevronRight" size={13} />
            </button>
          </span>
        </div>
      )}
    </section>
  );
}

const FUNNEL_COLORS = ['#b7cdf6', '#e8c3f3', '#c9b8f5', '#f3d27a', '#b9e3c7', '#f5c0c0', '#cfd6e4'];

// Funnel chart drawn as stacked trapezoids; widths follow each stage's count.
export function Funnel({ data }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  const W = 260;
  const rowH = 34;
  const H = data.length * rowH;
  const minW = 36;
  // Value-based widths, but never wider than the stage above, so it always reads as a funnel.
  const widths = [];
  data.forEach((d, i) => {
    const w = minW + (W - minW) * (d.v / max);
    widths.push(i === 0 ? Math.max(w, W * 0.9) : Math.min(w, widths[i - 1] * 0.88));
  });
  return (
    <svg viewBox={`0 0 ${W + 190} ${H + 10}`} width="100%" style={{ maxHeight: 260 }} role="img" aria-label="Funnel chart">
      {data.map((d, i) => {
        const top = widths[i];
        const bottom = i < data.length - 1 ? widths[i + 1] : top * 0.85;
        const y = 5 + i * rowH;
        const cx = W / 2;
        const pts = `${cx - top / 2},${y} ${cx + top / 2},${y} ${cx + bottom / 2},${y + rowH - 2} ${cx - bottom / 2},${y + rowH - 2}`;
        return (
          <g key={d.k}>
            <polygon points={pts} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
            <line x1={cx + top / 2 - 4} y1={y + rowH / 2} x2={W + 14} y2={y + rowH / 2} stroke="#c6ccd8" strokeWidth="1" />
            <text x={W + 18} y={y + rowH / 2 + 4} className="zc-funnel-label">
              {d.k} : {d.v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
