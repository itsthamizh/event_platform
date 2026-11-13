import { useEffect, useState } from 'react';
import { fmtDate, inr } from '../../config';
import { EVENT_TYPES } from '../../data/mock';
import { Link, navigate } from '../../router';
import { availabilityFor, useStore } from '../../store';
import { listingStatus } from '../../lifecycle';
import { activeBranches } from '../../accounts';
import { AVAIL_LABEL, AVAIL_MODEL, WEEKDAYS, availabilityDetail, muhurthamOf, surchargesFor } from '../../ops';
import { Avatar, Badge, Button, Card, Cover, Empty, Field, Icon, Legend, Modal, MonthCalendar, Stars } from '../../components/ui';
import { categoryOf } from '../../components/Shared';
import { packFor } from '../../categories/packs';
import { EnquiryFields, ProfileSections, defaultsFor } from '../../categories/PackFields';

const AV_LABEL = { available: 'Available', limited: 'Limited', taken: 'Taken', closed: 'Closed', too_soon: 'Too soon' };

export function VendorProfile({ id }) {
  const { state, actions } = useStore();
  const listing = state.listings.find((l) => l.id === id);
  const myEvents = state.events.filter((e) => e.customerId === state.customerId && e.date >= new Date().toISOString().slice(0, 10));
  const [pkgId, setPkgId] = useState(listing ? listing.packages[0].id : null);
  const [eventId, setEventId] = useState(myEvents[0] ? myEvents[0].id : '');
  const firstEvent = myEvents[0];
  const [date, setDate] = useState(firstEvent ? firstEvent.date : '');
  const [eventType, setEventType] = useState(firstEvent ? firstEvent.type : 'Wedding');
  const [guests, setGuests] = useState(firstEvent ? firstEvent.guests : 100);
  const [message, setMessage] = useState('');
  const [addons, setAddons] = useState([]);
  const [report, setReport] = useState(false);
  const [rReason, setRReason] = useState('Asked to pay outside the app');
  const [rText, setRText] = useState('');
  const [branchPick, setBranchPick] = useState('');
  const [forCompany, setForCompany] = useState(false);
  const [company, setCompany] = useState({ name: '', gstin: '' });
  useEffect(() => {
    if (id) actions.trackView(id);
  }, [id, actions]);
  const pack = packFor(listing ? listing.category : '');
  const [details, setDetails] = useState(() => defaultsFor(pack.enquiry));
  if (!listing) return <Empty title="Partner not found" />;

  const partner = state.partners.find((p) => p.id === listing.partnerId);
  const branches = activeBranches(state, listing.partnerId);
  const cat = categoryOf(state, listing.category);
  const reviews = state.reviews.filter((r) => r.listingId === listing.id && ['published', 'reported'].includes(r.status));
  const live = listingStatus(partner) === 'live';
  const loggedIn = state.role === 'customer';
  const fav = state.favourites.some((f) => f.listingId === listing.id);
  const openLead = loggedIn && state.leads.find((l) => l.listingId === listing.id && l.customerId === state.customerId && !['lost'].includes(l.status));
  const avail = date ? availabilityFor(state, listing, date) : null;
  const availInfo = date ? availabilityDetail(state, listing, date) : null;
  const surge = surchargesFor(listing, date);
  const muh = date && muhurthamOf(date);
  const pk = listing.packages.find((p) => p.id === pkgId);

  const requireLogin = () => navigate('/login?next=' + encodeURIComponent('/vendor/' + listing.id));

  const pickEvent = (eid) => {
    setEventId(eid);
    const ev = state.events.find((e) => e.id === eid);
    if (ev) {
      setDate(ev.date);
      setEventType(ev.type);
      setGuests(ev.guests);
    }
  };

  const send = () => {
    if (!loggedIn) return requireLogin();
    const leadId = actions.sendEnquiry({ listingId: listing.id, eventId, eventType, date, guests, budget: pk ? pk.price : 0, message, packageId: pkgId, details, addons, branchId: branchPick || undefined, company: forCompany && company.name.trim() ? { name: company.name.trim(), gstin: company.gstin.trim() } : undefined });
    navigate('/bookings/' + leadId);
    return null;
  };

  const chat = () => {
    if (!loggedIn) return requireLogin();
    const existing = state.threads.find((t) => t.customerId === state.customerId && t.listingId === listing.id);
    const tid = existing ? existing.id : actions.startChat(listing.id);
    navigate('/chat/' + tid);
    return null;
  };

  return (
    <div className="container section">
      <Link to={'/browse?cat=' + listing.category} className="back-link">
        <Icon name="back" size={16} /> {cat.name}
      </Link>
      {!live && (
        <div className="notice notice-warning mb">
          <Icon name="alert" />
          <span>This partner is not taking new booking requests in the app right now. Existing bookings are not affected.</span>
        </div>
      )}
      <div className="row between wrap gap">
        <div>
          <div className="row gap-s wrap">
            <h1>{listing.title}</h1>
            {listing.verified && (
              <Badge tone="green">
                <Icon name="shieldCheck" size={12} /> Verified
              </Badge>
            )}
            {listing.featured && <Badge tone="gold">Featured</Badge>}
          </div>
          <div className="vcard-meta mt-s">
            <Stars value={listing.rating} count={listing.ratingCount + ' reviews'} />
            <span>{cat.name}</span>
            <span className="row gap-xs">
              <Icon name="pin" size={13} /> {listing.area}, Chennai - {listing.distanceKm} km away
            </span>
            <span className="row gap-xs">
              <Icon name="clock" size={13} /> Replies {listing.responseTime}
            </span>
          </div>
        </div>
        <div className="row gap-s">
          {loggedIn && (
            <Button variant="secondary" icon="heart" onClick={() => actions.toggleFavourite(listing.id, eventId || null)}>
              {fav ? 'Shortlisted' : 'Shortlist'}
            </Button>
          )}
          <Button variant="secondary" icon="chat" onClick={chat}>
            Chat
          </Button>
        </div>
      </div>

      <div className="gallery">
        {[0, 1, 2, 3, 4].map((i) => (
          <Cover key={i} seed={listing.id + i} icon={i === 0 ? cat.icon : 'image'} height="100%" />
        ))}
      </div>

      <div className="grid grid-side">
        <div className="stack">
          <Card title="About">
            <p>{listing.about}</p>
            <div className="highlight-list mt">
              {listing.highlights.map((h) => (
                <Badge key={h} tone="gray">
                  <Icon name="check" size={12} /> {h}
                </Badge>
              ))}
            </div>
            <div className="kv mt">
              <div>
                <dt>Experience</dt>
                <dd>{listing.years} years</dd>
              </div>
              <div>
                <dt>Events served</dt>
                <dd>{listing.eventTypes.join(', ')}</dd>
              </div>
              <div>
                <dt>GST</dt>
                <dd>{partner.gstin ? 'Registered' : 'Not registered'}</dd>
              </div>
            </div>
          </Card>

          <ProfileSections sections={pack.profile(listing, state)} />

          <Card title="Packages and pricing" subtitle="Select a package to include it in your booking request">
            <div className="grid grid-2">
              {listing.packages.map((p) => (
                <div key={p.id} className={'package ' + (pkgId === p.id ? 'active' : '')} onClick={() => setPkgId(p.id)}>
                  <div className="row between">
                    <h3>{p.name}</h3>
                    {pkgId === p.id && <Icon name="check" className="brand" />}
                  </div>
                  <div className="mt-s">
                    <b style={{ fontSize: 18 }}>{inr(p.price)}</b> <span className="muted small">{p.unit}</span>
                  </div>
                  {p.maxGuests && <div className="small muted">Up to {p.maxGuests} guests</div>}
                  <ul>
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {listing.addons.length > 0 && (
              <div className="mt">
                <h4>Add-ons</h4>
                <div className="chips mt-s">
                  {listing.addons.map((a) => (
                    <span key={a.id} className="chip">
                      {a.name} - {inr(a.price)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Check availability" subtitle="Tap a date to use it in your request">
            <MonthCalendar
              initial={date || undefined}
              selected={date}
              onPick={setDate}
              compact
              getDay={(iso) => {
                const s = availabilityFor(state, listing, iso);
                return { status: s === 'closed' || s === 'too_soon' ? 'taken' : s, title: AV_LABEL[s] + (muhurthamOf(iso) ? ' - muhurtham day' : ''), disabled: ['taken', 'closed', 'too_soon'].includes(s) };
              }}
            />
            <Legend items={[['available', 'Available'], ['limited', 'Limited'], ['taken', 'Taken / closed']]} />
            <p className="tiny muted mt-s">
              {AVAIL_LABEL[AVAIL_MODEL[listing.category] || 'capacity']}
              {listing.availability && listing.availability.leadDays ? ` - order at least ${listing.availability.leadDays} days ahead` : listing.availability ? ` - takes up to ${listing.availability.capacity} event${listing.availability.capacity === 1 ? '' : 's'} a day` : ''}
              {listing.availability && (listing.availability.closedWeekdays || []).length > 0 && ` - closed on ${listing.availability.closedWeekdays.map((d) => WEEKDAYS[d]).join(', ')}`}
            </p>
          </Card>

          {branches.length > 1 && (
            <Card title={`${branches.length} branches`}>
              <div className="grid grid-3">
                {branches.map((b) => (
                  <div key={b.id}>
                    <b>{b.name}</b> {b.isMain && <Badge tone="brand">Main</Badge>}
                    <div className="small muted">{[b.address, b.area !== b.name ? b.area : '', b.city].filter(Boolean).join(', ')}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(listing.hours || (listing.serviceAreas || []).length > 0) && (
            <Card title="Hours and service areas">
              {listing.hours && (
                <div className="kv">
                  <div><dt>Mon - Fri</dt><dd>{listing.hours.weekdays}</dd></div>
                  <div><dt>Saturday</dt><dd>{listing.hours.saturday}</dd></div>
                  <div><dt>Sunday</dt><dd>{listing.hours.sunday}</dd></div>
                  <div><dt>Chat replies</dt><dd>{listing.hours.chatReply}</dd></div>
                </div>
              )}
              {(listing.serviceAreas || []).length > 0 && (
                <div className="chips mt">
                  {listing.serviceAreas.map((a) => (
                    <span key={a.area} className="chip">
                      {a.area} {a.travelCharge ? `+ ${inr(a.travelCharge)} travel` : '- no travel charge'}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )}

          {(listing.faqs || []).length > 0 && (
            <Card title="Frequently asked questions">
              <div className="stack-s">
                {listing.faqs.map((f) => (
                  <details key={f.id}>
                    <summary>
                      <b>{f.q}</b>
                    </summary>
                    <p className="muted small mt-s">{f.a}</p>
                  </details>
                ))}
              </div>
            </Card>
          )}

          <Card title={`Reviews (${reviews.length})`} actions={<Stars value={listing.rating} count={listing.ratingCount} />}>
            {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="row gap-s">
                  <Avatar name={r.customerName} size={32} />
                  <div className="grow">
                    <b>{r.customerName}</b>
                    <div className="small muted">
                      {fmtDate(r.at)} {r.bookingId && '- Verified booking'}
                    </div>
                  </div>
                  <Stars value={r.rating} />
                </div>
                <h4 className="mt-s">{r.title}</h4>
                <p className="muted">{r.body}</p>
                {r.reply && (
                  <div className="reply">
                    <b>Reply from {partner.name}:</b> {r.reply}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>

        <aside className="sticky">
          <Card>
            <div className="stack">
              <div>
                <span className="small muted">Starts at</span>
                <div>
                  <b style={{ fontSize: 22 }}>{inr(listing.priceFrom)}</b> <span className="muted">{listing.priceUnit}</span>
                </div>
              </div>
              {openLead ? (
                <div className="notice">
                  <Icon name="info" />
                  <div>
                    You already have an enquiry with this partner.
                    <div className="mt-s">
                      <Link to={'/bookings/' + openLead.id} className="link">
                        View booking status
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {loggedIn && myEvents.length > 0 && (
                    <Field label="For event">
                      <select className="select" value={eventId} onChange={(e) => pickEvent(e.target.value)}>
                        {myEvents.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                        <option value="">Another event</option>
                      </select>
                    </Field>
                  )}
                  <div className="grid grid-2">
                    <Field label="Event type">
                      <select className="select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                        {EVENT_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Guests">
                      <input className="input" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Event date">
                    <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                  {avail && (
                    <div className={'notice ' + (avail === 'available' ? 'notice-success' : avail === 'limited' ? 'notice-warning' : 'notice-danger')}>
                      <Icon name={avail === 'taken' ? 'x' : 'calendar'} />
                      <span>
                        {fmtDate(date)} is <b>{AV_LABEL[avail].toLowerCase()}</b>
                        {availInfo && availInfo.reason ? ` - ${availInfo.reason}` : ''}
                        {avail === 'taken' && '. Please pick another date.'}
                      </span>
                    </div>
                  )}
                  {(muh || surge.length > 0) && (
                    <div className="notice">
                      <Icon name="sun" />
                      <span className="small">
                        {muh ? `${fmtDate(date)} is a muhurtham day (${muh.month} month, ${muh.demand.toLowerCase()} demand). ` : ''}
                        {surge.length ? `Price on this date: ${surge.map((x) => `${x.name} +${x.pct}%`).join(', ')}.` : 'Book early - dates fill fast.'}
                      </span>
                    </div>
                  )}
                  {pack.enquiry.length > 0 && (
                    <div className="stack-s" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
                      <span className="field-label">{pack.generic ? 'Details' : pack.label + ' details'}</span>
                      <EnquiryFields fields={pack.enquiry} values={details} onChange={setDetails} listing={listing} />
                    </div>
                  )}
                  <Field label="Package">
                    <select className="select" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
                      {listing.packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {inr(p.price)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {listing.addons.length > 0 && (
                    <Field label="Add-ons (optional)">
                      <div className="chips">
                        {listing.addons.map((a) => (
                          <button key={a.id} type="button" className={'chip ' + (addons.includes(a.id) ? 'active' : '')} style={{ height: 28, fontSize: 12 }} onClick={() => setAddons(addons.includes(a.id) ? addons.filter((x) => x !== a.id) : [...addons, a.id])}>
                            {a.name} + {inr(a.price)}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                  <Field label="Booking for">
                    <div className="row gap">
                      <label className="check">
                        <input type="radio" checked={!forCompany} onChange={() => setForCompany(false)} /> Myself / family
                      </label>
                      <label className="check">
                        <input type="radio" checked={forCompany} onChange={() => setForCompany(true)} /> My company
                      </label>
                    </div>
                  </Field>
                  {forCompany && (
                    <div className="grid grid-2">
                      <Field label="Company name">
                        <input className="input" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="e.g. Zentech Solutions" />
                      </Field>
                      <Field label="GSTIN" hint="For a GST invoice in the company's name">
                        <input className="input" value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })} />
                      </Field>
                    </div>
                  )}
                  {branches.length > 1 && (
                    <Field label="Preferred branch">
                      <select className="select" value={branchPick} onChange={(e) => setBranchPick(e.target.value)}>
                        <option value="">Any branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}, {b.city}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Message (optional)">
                    <textarea className="textarea" placeholder="Share timings, venue and anything specific" value={message} onChange={(e) => setMessage(e.target.value)} />
                  </Field>
                  <Button block size="lg" onClick={send} disabled={!date || ['taken', 'closed', 'too_soon'].includes(avail) || !live || (forCompany && !company.name.trim())}>
                    {loggedIn ? 'Send booking request' : 'Log in to book'}
                  </Button>
                  <p className="tiny muted center">Free to request. You pay only after accepting a quote.</p>
                </>
              )}
            </div>
          </Card>
          {loggedIn && (
            <button className="link small mt" onClick={() => setReport(true)}>
              <Icon name="flag" size={13} /> Report this partner
            </button>
          )}
        </aside>
      </div>
      <Modal
        open={report}
        title={`Report ${listing.title}`}
        onClose={() => setReport(false)}
        footer={
          <Button
            onClick={() => {
              actions.reportEntity({ type: 'partner', reportedPartnerId: listing.partnerId, reason: rReason, details: rText });
              setReport(false);
            }}
          >
            Send report
          </Button>
        }
      >
        <div className="stack">
          <Field label="What is wrong?">
            <select className="select" value={rReason} onChange={(e) => setRReason(e.target.value)}>
              <option>Asked to pay outside the app</option>
              <option>Photos or reviews look fake</option>
              <option>Rude or unsafe behaviour</option>
              <option>Business does not exist</option>
            </select>
          </Field>
          <Field label="Details (optional)">
            <textarea className="textarea" value={rText} onChange={(e) => setRText(e.target.value)} />
          </Field>
          <p className="tiny muted">Reports are confidential. The partner is not told who reported them.</p>
        </div>
      </Modal>
    </div>
  );
}

export function Compare({ ids }) {
  const { state } = useStore();
  const list = (ids || '').split(',').map((id) => state.listings.find((l) => l.id === id)).filter(Boolean);
  if (list.length < 2) return <div className="container section"><Empty title="Pick at least two partners to compare" action={<Link to="/browse" className="btn btn-primary">Explore partners</Link>} /></div>;
  const rows = [
    ['Category', (l) => categoryOf(state, l.category).name],
    ['Rating', (l) => <Stars value={l.rating} count={l.ratingCount} />],
    ['Starting price', (l) => <b>{inr(l.priceFrom)} <span className="muted small">{l.priceUnit}</span></b>],
    ['Packages', (l) => l.packages.map((p) => <div key={p.id} className="small">{p.name}: {inr(p.price)}</div>)],
    ['Area', (l) => `${l.area} (${l.distanceKm} km)`],
    ['Experience', (l) => `${l.years} years`],
    ['Highlights', (l) => l.highlights.join(', ')],
    ['Response time', (l) => l.responseTime],
    ['Verified', (l) => (l.verified ? <Badge tone="green">Yes</Badge> : <Badge tone="gray">No</Badge>)],
  ];
  const sameCat = list.every((l) => l.category === list[0].category);
  if (sameCat) rows.splice(4, 0, ...packFor(list[0].category).compare);
  return (
    <div className="container section">
      <Link to="/browse" className="back-link">
        <Icon name="back" size={16} /> Back to results
      </Link>
      <h1 className="mb">Compare partners</h1>
      <div className="card table-wrap">
        <table className="table compare-table">
          <thead>
            <tr>
              <th />
              {list.map((l) => (
                <th key={l.id}>
                  <Cover seed={l.id + l.title} icon={categoryOf(state, l.category).icon} height={90} />
                  <div className="mt-s" style={{ textTransform: 'none', color: 'var(--ink)', fontSize: 14 }}>
                    {l.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}>
                <td>{label}</td>
                {list.map((l) => (
                  <td key={l.id}>{fn(l)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {list.map((l) => (
                <td key={l.id}>
                  <Link to={'/vendor/' + l.id} className="btn btn-primary btn-sm">
                    View and book
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
