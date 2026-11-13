import { useMemo, useState } from 'react';
import { CITY, inr } from '../../config';
import { HOW_IT_WORKS, AREAS, EVENT_TYPES } from '../../data/mock';
import { Link, navigate } from '../../router';
import { availabilityFor, useStore } from '../../store';
import { isListed } from '../../lifecycle';
import { Badge, Button, Cover, Empty, Field, Icon, LinkButton } from '../../components/ui';
import { VendorCard, categoryOf } from '../../components/Shared';
import { packFor } from '../../categories/packs';
import { PackFilters, applyPackFilters } from '../../categories/PackFields';

export function Home() {
  const { state } = useStore();
  const [cat, setCat] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState('');
  const live = state.listings.filter((l) => isListed(state, l));
  const featured = live.filter((l) => l.featured).slice(0, 8);
  const nearby = [...live].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);
  const search = () => {
    const q = new URLSearchParams();
    if (cat) q.set('cat', cat);
    if (area) q.set('area', area);
    if (date) q.set('date', date);
    navigate('/browse?' + q.toString());
  };
  return (
    <>
      <section className="hero">
        <div className="container">
          <Badge tone="brand">
            <Icon name="pin" size={12} /> {CITY}
          </Badge>
          <h1 className="mt">
            Plan every <em>celebration</em> with partners you can trust
          </h1>
          <p>Venues, photographers, caterers, decorators, pandits, melam and more. Compare, chat, book and pay in one place.</p>
          <div className="searchbar">
            <label>
              <span>Looking for</span>
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Area</span>
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Near me</option>
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Event date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <Button size="lg" icon="search" onClick={search}>
              Search
            </Button>
          </div>
          <div className="trust">
            <span>
              <Icon name="shieldCheck" size={16} className="green" /> Verified partners
            </span>
            <span>
              <Icon name="lock" size={16} className="green" /> Secure payments
            </span>
            <span>
              <Icon name="star" size={16} className="green" /> Reviews from real bookings
            </span>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Pick what you need</h2>
          <Link to="/browse" className="link">
            See all partners
          </Link>
        </div>
        <div className="cat-grid">
          {state.categories.map((c) => (
            <Link key={c.id} to={'/browse?cat=' + c.id} className="cat-tile">
              <span className="cat-icon">
                <Icon name={c.icon} size={22} />
              </span>
              {c.name}
              <span className="tiny muted">{(() => { const n = state.listings.filter((l) => (l.category === c.id || (l.extraCategories || []).includes(c.id)) && isListed(state, l)).length; return n + (n === 1 ? ' partner' : ' partners'); })()}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <div>
            <h2>Featured partners</h2>
            <p className="muted">Top-rated and verified this season</p>
          </div>
        </div>
        <div className="vgrid">
          {featured.map((l) => (
            <VendorCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <div>
            <h2>Near you</h2>
            <p className="muted">Partners closest to Mylapore</p>
          </div>
          <Link to="/browse?sort=distance" className="link">
            View on list
          </Link>
        </div>
        <div className="vgrid">
          {nearby.map((l) => (
            <VendorCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>From search to booked in six steps</h2>
        </div>
        <div className="how">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} className="how-step">
              <div className="how-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p className="muted mt-s">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Event ideas and guides</h2>
          <Link to="/ideas" className="link">
            All ideas
          </Link>
        </div>
        <div className="grid grid-3">
          {state.articles
            .filter((a) => a.status === 'published')
            .slice(0, 3)
            .map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
        </div>
      </section>

      <section className="section container">
        <div className="cta-band">
          <div>
            <h2>Run an event business?</h2>
            <p>Get leads, send quotes, collect payments and manage your crew with Zoho for Vizhaa Partner. {inr(199)} per month.</p>
          </div>
          <LinkButton to="/partner/onboarding" variant="gold" size="lg">
            List your business
          </LinkButton>
        </div>
      </section>
    </>
  );
}

function ArticleCard({ a }) {
  return (
    <Link to={'/ideas/' + a.id} className="card">
      <Cover seed={a.id + a.title} icon="sparkles" height={140} className="no-radius" />
      <div className="card-body stack-s">
        <Badge tone="brand">{a.category}</Badge>
        <h3>{a.title}</h3>
        <p className="muted small">{a.excerpt}</p>
        <span className="tiny muted">{a.read} min read</span>
      </div>
    </Link>
  );
}

export function Browse({ query }) {
  const { state, actions } = useStore();
  const [cat, setCat] = useState(query.cat || '');
  const [area, setArea] = useState(query.area || '');
  const [date, setDate] = useState(query.date || '');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [eventType, setEventType] = useState('');
  const [sort, setSort] = useState(query.sort || 'recommended');
  const [text, setText] = useState(query.q || '');
  const [compare, setCompare] = useState([]);
  const [packVals, setPackVals] = useState({});
  const pack = packFor(cat);

  const results = useMemo(() => {
    let r = state.listings.filter((l) => isListed(state, l)).filter((l) => {
      const p = state.partners.find((x) => x.id === l.partnerId);
      return p && p.verification === 'verified';
    });
    if (cat) r = r.filter((l) => l.category === cat || (l.extraCategories || []).includes(cat));
    if (area) r = r.filter((l) => l.area === area);
    if (maxPrice) r = r.filter((l) => l.priceFrom <= Number(maxPrice));
    if (minRating) r = r.filter((l) => l.rating >= minRating);
    if (eventType) r = r.filter((l) => l.eventTypes.includes(eventType));
    if (text) r = r.filter((l) => (l.title + ' ' + l.about + ' ' + l.area).toLowerCase().includes(text.toLowerCase()));
    if (date) r = r.filter((l) => availabilityFor(state, l, date) !== 'taken');
    if (cat) r = applyPackFilters(pack.filters, packVals, r);
    const sorters = {
      recommended: (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      rating: (a, b) => b.rating - a.rating,
      price: (a, b) => a.priceFrom - b.priceFrom,
      distance: (a, b) => a.distanceKm - b.distanceKm,
    };
    return [...r].sort(sorters[sort]);
  }, [state, cat, area, maxPrice, minRating, eventType, text, date, sort, pack, packVals]);

  const toggleCompare = (id) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id]));
  const catName = cat ? categoryOf(state, cat).name : 'All partners';

  return (
    <div className="container section">
      <div className="grid grid-side-l">
        <aside className="card filters">
          <div className="card-body">
            <div className="row between mb">
              <h3>Filters</h3>
              <button
                className="link small"
                onClick={() => {
                  setCat('');
                  setArea('');
                  setDate('');
                  setMaxPrice('');
                  setMinRating(0);
                  setEventType('');
                  setText('');
                  setPackVals({});
                }}
              >
                Clear
              </button>
            </div>
            <Field label="Search">
              <input className="input" placeholder="Name or keyword" value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
            <Field label="Category">
              <select className="select" value={cat} onChange={(e) => { setCat(e.target.value); setPackVals({}); }}>
                <option value="">All categories</option>
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {cat && pack.filters.length > 0 && (
              <div style={{ background: 'var(--brand-50)', borderRadius: 10, padding: '4px 12px 12px', margin: '12px 0' }}>
                <div className="field-label" style={{ marginTop: 10 }}>{pack.label} filters</div>
                <PackFilters filters={pack.filters} values={packVals} onChange={setPackVals} />
              </div>
            )}
            <Field label="Event type">
              <select className="select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="">Any</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Area">
              <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Anywhere in Chennai</option>
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Available on" hint="Hides partners already fully booked">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Starting price up to">
              <select className="select" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
                <option value="">Any price</option>
                <option value="1000">{inr(1000)}</option>
                <option value="25000">{inr(25000)}</option>
                <option value="60000">{inr(60000)}</option>
                <option value="150000">{inr(150000)}</option>
                <option value="300000">{inr(300000)}</option>
              </select>
            </Field>
            <Field label="Rating">
              <div className="chips">
                {[0, 4, 4.5].map((r) => (
                  <button key={r} className={'chip ' + (minRating === r ? 'active' : '')} onClick={() => setMinRating(r)}>
                    {r === 0 ? 'Any' : r + '+'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </aside>
        <div>
          <div className="results-head">
            <div>
              <h1>{catName}</h1>
              <p className="muted">
                {results.length} partners in Chennai{date ? ' available on the selected date' : ''}
                {state.role === 'customer' && (
                  <>
                    {' - '}
                    <button
                      className="link small"
                      onClick={() => actions.saveSearch(`${catName}${area ? ' in ' + area : ''}${maxPrice ? ' under ₹' + Number(maxPrice).toLocaleString('en-IN') : ''}${date ? ' on ' + date : ''}`, `?${[cat && 'cat=' + cat, area && 'area=' + area, date && 'date=' + date].filter(Boolean).join('&')}`)}
                    >
                      Save this search
                    </button>
                  </>
                )}
              </p>
            </div>
            <select className="select" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="price">Lowest price</option>
              <option value="distance">Nearest</option>
            </select>
          </div>
          {results.length === 0 ? (
            <Empty icon="search" title="No partners match these filters">Try another date or remove a filter.</Empty>
          ) : (
            <div className="vgrid">
              {results.map((l) => (
                <VendorCard key={l.id} listing={l} compare={compare.includes(l.id)} onCompare={toggleCompare} />
              ))}
            </div>
          )}
        </div>
      </div>
      {compare.length > 0 && (
        <div className="compare-bar">
          <span>
            <b>{compare.length}</b> selected to compare {compare.length >= 4 && '(max 4)'}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setCompare([])} style={{ color: '#fff' }}>
            Clear
          </Button>
          <Button size="sm" variant="gold" disabled={compare.length < 2} onClick={() => navigate('/compare?ids=' + compare.join(','))}>
            Compare now
          </Button>
        </div>
      )}
    </div>
  );
}

export function Ideas() {
  const { state } = useStore();
  return (
    <div className="container section">
      <h1>Event ideas and guides</h1>
      <p className="muted mb">Rituals, budgets, checklists and inspiration from the community and our partners.</p>
      <div className="grid grid-3">
        {state.articles
          .filter((a) => a.status === 'published')
          .map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
      </div>
    </div>
  );
}

export function Article({ id }) {
  const { state } = useStore();
  const a = state.articles.find((x) => x.id === id);
  if (!a) return <Empty title="Article not found" />;
  const related = state.listings.filter((l) => l.featured && isListed(state, l)).slice(0, 3);
  return (
    <div className="container section">
      <div className="article">
        <Link to="/ideas" className="back-link">
          <Icon name="back" size={16} /> All ideas
        </Link>
        <Badge tone="brand">{a.category}</Badge>
        <h1 className="mt-s">{a.title}</h1>
        <p className="muted small">{a.read} min read</p>
        <Cover seed={a.id + a.title} icon="sparkles" height={260} className="mt" />
        <p>{a.excerpt}</p>
        <p>
          This is placeholder article content. In the product, the admin team writes these guides in the Content section of the admin console, and each
          guide can link to relevant partner categories so readers can go straight from inspiration to booking.
        </p>
        <h3 className="mt-l mb">Partners for this</h3>
        <div className="vgrid">
          {related.map((l) => (
            <VendorCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
    </div>
  );
}
