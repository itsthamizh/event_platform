// Renders a pack's enquiry questions, Explore filters and profile sections (customer app).
import { inr } from '../config';
import { Card, Field } from '../components/ui';

export function EnquiryFields({ fields, values, onChange, listing }) {
  const set = (k, v) => onChange({ ...values, [k]: v });
  return fields.map((f) => {
    const v = values[f.key];
    if (f.type === 'toggle')
      return (
        <label key={f.key} className="check">
          <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}
        </label>
      );
    if (f.type === 'multi')
      return (
        <Field key={f.key} label={f.label}>
          <div className="chips">
            {f.options.map((o) => {
              const on = (v || []).includes(o);
              return (
                <button key={o} type="button" className={'chip ' + (on ? 'active' : '')} style={{ height: 28, fontSize: 12 }} onClick={() => set(f.key, on ? v.filter((x) => x !== o) : [...(v || []), o])}>
                  {o}
                </button>
              );
            })}
          </div>
        </Field>
      );
    if (f.type === 'select' || f.type === 'hall') {
      const opts = f.type === 'hall' ? [['', 'Any hall'], ...((listing.attributes && listing.attributes.halls) || []).map((h) => [h.id, `${h.name} (${h.seating})`])] : f.options.map((o) => [o, o]);
      return (
        <Field key={f.key} label={f.label}>
          <select className="select" value={v} onChange={(e) => set(f.key, e.target.value)}>
            {opts.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      );
    }
    return (
      <Field key={f.key} label={f.label}>
        <input className="input" type={f.type === 'number' ? 'number' : 'text'} value={v} onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
      </Field>
    );
  });
}

export const defaultsFor = (fields) => Object.fromEntries(fields.map((f) => [f.key, Array.isArray(f.def) ? [...f.def] : f.def]));

export function PackFilters({ filters, values, onChange }) {
  const set = (k, v) => onChange({ ...values, [k]: v });
  return filters.map((f) => {
    const v = values[f.key];
    if (f.type === 'toggle')
      return (
        <label key={f.key} className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked || undefined)} /> {f.label}
        </label>
      );
    if (f.type === 'number')
      return (
        <Field key={f.key} label={f.label}>
          <input className="input" type="number" placeholder={f.placeholder} value={v || ''} onChange={(e) => set(f.key, e.target.value || undefined)} />
        </Field>
      );
    return (
      <Field key={f.key} label={f.label}>
        <select className="select" value={v || ''} onChange={(e) => set(f.key, e.target.value || undefined)}>
          <option value="">Any</option>
          {f.options.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </Field>
    );
  });
}

export const applyPackFilters = (filters, values, listings) =>
  listings.filter((l) => filters.every((f) => values[f.key] === undefined || values[f.key] === '' || f.test({ ...l, attributes: l.attributes || {} }, values[f.key])));

export function ProfileSections({ sections }) {
  return sections.map((s) => (
    <Card key={s.title} title={s.title}>
      {s.table && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {s.table.cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{j === 0 ? <b>{c}</b> : c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.fields && (
        <dl className="kv">
          {s.fields.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.list && (
        <ul className="muted" style={{ paddingLeft: 18, margin: 0 }}>
          {s.list.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {s.menus && (
        <div className="grid grid-2">
          {s.menus.map((m) => (
            <div key={m.id} className="package">
              <div className="row between">
                <h3>{m.name}</h3>
                <b>{inr(m.pricePerPlate)}</b>
              </div>
              <div className="small muted">
                {m.meal} - {m.foodType} - per plate
              </div>
              <ul>
                {m.items.slice(0, 8).map((it) => (
                  <li key={it}>{it}</li>
                ))}
                {m.items.length > 8 && <li className="muted">+ {m.items.length - 8} more</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  ));
}
