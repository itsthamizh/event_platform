import { useState } from 'react';
import { SUBSCRIPTION_PRICE, daysBetween, fmtDate, fmtDateTime, inr, todayISO } from '../../config';
import { AREAS, EVENT_TYPES } from '../../data/mock';
import { ALL_PERMS, PERM_LABELS, useStore } from '../../store';
import { Avatar, Badge, Button, Card, Cover, Field, Icon, Modal, Stars, Table, Tabs } from '../../components/ui';
import { categoryOf } from '../../components/Shared';
import { ModuleHeader, StagePath } from '../../components/crm';
import { SUB_FLOW, SUB_LABEL, SUB_NOTE, listingStatus } from '../../lifecycle';
import { activeBranches, inScope } from '../../accounts';

export function ListingEditor() {
  const { state, actions } = useStore();
  const listing = state.listings.find((l) => l.partnerId === state.partnerId);
  const [tab, setTab] = useState('profile');
  const [f, setF] = useState({ title: listing.title, about: listing.about, area: listing.area, eventTypes: listing.eventTypes, highlights: listing.highlights.join(', '), capacity: listing.capacity });
  const [packages, setPackages] = useState(listing.packages.map((p) => ({ ...p, features: p.features.join('\n') })));
  const cat = categoryOf(state, listing.category);
  const save = () =>
    actions.updateListing(listing.id, {
      ...f,
      capacity: Number(f.capacity),
      highlights: f.highlights.split(',').map((x) => x.trim()).filter(Boolean),
      packages: packages.map((p) => ({ ...p, price: Number(p.price), features: p.features.split('\n').filter(Boolean) })),
      priceFrom: Math.min(...packages.map((p) => Number(p.price))),
    });
  return (
    <>
      <ModuleHeader
        title="Your listing"
        subtitle="This is what customers see in the app."
        actions={
          <>
            <Badge tone="green">Live</Badge>
            <a href={'#/vendor/' + listing.id} className="btn btn-secondary">
              <Icon name="eye" size={16} /> Preview
            </a>
            <Button onClick={save}>Save changes</Button>
          </>
        }
      />
      <Tabs tabs={[{ id: 'profile', label: 'Profile' }, { id: 'packages', label: 'Packages and pricing' }, { id: 'portfolio', label: 'Portfolio' }]} value={tab} onChange={setTab} />
      <div className="mt">
        {tab === 'profile' && (
          <Card>
            <div className="grid grid-2">
              <Field label="Business name">
                <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </Field>
              <Field label="Category">
                <input className="input" value={cat.name} disabled />
              </Field>
              <Field label="Area">
                <select className="select" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Events per day" hint="How many events you can cover on the same date">
                <input className="input" type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
              </Field>
            </div>
            <Field label="About">
              <textarea className="textarea" rows={4} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
            </Field>
            <Field label="Highlights" hint="Comma separated">
              <input className="input" value={f.highlights} onChange={(e) => setF({ ...f, highlights: e.target.value })} />
            </Field>
            <Field label="Events you serve">
              <div className="chips">
                {EVENT_TYPES.map((t) => (
                  <button key={t} className={'chip ' + (f.eventTypes.includes(t) ? 'active' : '')} onClick={() => setF({ ...f, eventTypes: f.eventTypes.includes(t) ? f.eventTypes.filter((x) => x !== t) : [...f.eventTypes, t] })}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </Card>
        )}
        {tab === 'packages' && (
          <div className="stack">
            {packages.map((p, i) => (
              <Card key={p.id} title={p.name || 'New package'} actions={<button className="icon-btn" onClick={() => setPackages(packages.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>}>
                <div className="grid grid-3">
                  <Field label="Name">
                    <input className="input" value={p.name} onChange={(e) => setPackages(packages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  </Field>
                  <Field label="Price">
                    <input className="input" type="number" value={p.price} onChange={(e) => setPackages(packages.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  </Field>
                  <Field label="Unit">
                    <select className="select" value={p.unit} onChange={(e) => setPackages(packages.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}>
                      {['per event', 'per day', 'per plate', 'per hour', 'per piece', 'per look'].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="What's included" hint="One item per line">
                  <textarea className="textarea" value={p.features} onChange={(e) => setPackages(packages.map((x, j) => (j === i ? { ...x, features: e.target.value } : x)))} />
                </Field>
              </Card>
            ))}
            <Button variant="secondary" icon="plus" onClick={() => setPackages([...packages, { id: 'pk' + Date.now(), name: '', price: 0, unit: 'per event', features: '' }])}>
              Add package
            </Button>
          </div>
        )}
        {tab === 'portfolio' && (
          <Card title="Photos and videos" subtitle="Upload your best work. The first image is your cover.">
            <div className="thumbs">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Cover key={i} seed={listing.id + i} icon={i === 0 ? cat.icon : 'image'} height={100} />
              ))}
              <div className="upload" style={{ justifyContent: 'center', height: 100 }}>
                <Icon name="plus" /> Upload
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

export function PartnerReviews() {
  const { state, actions } = useStore();
  const listing = state.listings.find((l) => l.partnerId === state.partnerId);
  const reviews = state.reviews.filter((r) => r.listingId === listing.id);
  const [drafts, setDrafts] = useState({});
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  return (
    <>
      <ModuleHeader title="Reviews" subtitle="Reviews can only come from completed bookings. Replies show publicly on your listing." />
      <div className="grid grid-side-l">
        <Card>
          <div className="center">
            <div style={{ fontSize: 40, fontWeight: 800 }}>{listing.rating}</div>
            <Stars value={listing.rating} count={listing.ratingCount} />
          </div>
          <div className="stack-s mt">
            {dist.map((d) => (
              <div key={d.n} className="row gap-s small">
                <span style={{ width: 14 }}>{d.n}</span>
                <div className="progress grow">
                  <span style={{ width: (d.c / (reviews.length || 1)) * 100 + '%', background: 'var(--gold)' }} />
                </div>
                <span className="muted">{d.c}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="row gap-s">
                <Avatar name={r.customerName} size={34} />
                <div className="grow">
                  <b>{r.customerName}</b>
                  <div className="small muted">
                    {fmtDate(r.at)} {r.bookingId && '- Verified booking'}
                  </div>
                </div>
                <Stars value={r.rating} />
                {r.status === 'reported' && <Badge status="reported">Under review</Badge>}
              </div>
              <h4 className="mt-s">{r.title}</h4>
              <p className="muted">{r.body}</p>
              {r.reply ? (
                <div className="reply">
                  <b>Your reply:</b> {r.reply}
                </div>
              ) : (
                <div className="row gap-s mt">
                  <input className="input" placeholder="Write a public reply" value={drafts[r.id] || ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
                  <Button disabled={!drafts[r.id]} onClick={() => actions.replyReview(r.id, drafts[r.id])}>
                    Reply
                  </Button>
                  {r.status !== 'reported' && (
                    <Button variant="ghost" icon="flag" onClick={() => actions.reportReview(r.id, 'Partner says review is inaccurate')}>
                      Report
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

const ROLE_INFO = {
  owner: 'Everything, including billing',
  manager: 'Full access except billing and subscription',
  sales: 'Leads, quotes, chat and calendar',
  accounts: 'Invoices, payments and expenses',
  crew: 'Only their assigned events and tasks',
};

export function Team({ mode = 'users' }) {
  const { state, actions } = useStore();
  const tab = mode === 'roles' ? 'roles' : 'members';
  const [invite, setInvite] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', role: 'crew', title: '', branchId: '' });
  const members = state.members.filter((m) => inScope(state, m) && m.status !== 'removed');
  const branches = activeBranches(state);
  const roles = Object.keys(ROLE_INFO);
  return (
    <>
      <ModuleHeader
        title={tab === 'roles' ? 'Profiles and permissions' : 'Users'}
        subtitle={tab === 'roles' ? 'Each profile decides which modules and actions a user can access.' : `${members.length} users. Each person logs in with their own phone number and sees only what their profile allows.`}
        actions={tab === 'members' && <button className="zc-btn zc-btn-primary" onClick={() => setInvite(true)}>+ New User</button>}
      />
      <div className="mt">
        {tab === 'members' ? (
          <Card pad={false}>
            <Table
              rows={members}
              columns={[
                { label: 'Name', render: (m) => <span className="row gap-s"><Avatar name={m.name} size={30} /><span><b>{m.name}</b><div className="tiny muted">{m.phone}</div></span></span> },
                { label: 'Title', key: 'title' },
                {
                  label: 'Role',
                  render: (m) =>
                    m.role === 'owner' ? (
                      <Badge tone="brand">Owner</Badge>
                    ) : (
                      <select className="select input-sm" style={{ width: 130 }} value={m.role} onChange={(e) => actions.setMemberRole(m.id, e.target.value)}>
                        {roles.filter((r) => r !== 'owner').map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    ),
                },
                branches.length > 1 && {
                  label: 'Branch',
                  render: (m) =>
                    m.role === 'owner' ? (
                      <span className="small muted">All branches</span>
                    ) : (
                      <select className="select input-sm" style={{ width: 150 }} value={m.branchId || ''} onChange={(e) => actions.setMemberBranch(m.id, e.target.value)} aria-label={'Branch for ' + m.name}>
                        <option value="">All branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ),
                },
                { label: 'Status', render: (m) => <Badge status={m.status} /> },
                {
                  label: '',
                  align: 'right',
                  render: (m) =>
                    m.role !== 'owner' && (
                      <Button size="sm" variant="ghost" onClick={() => actions.removeMember(m.id)}>
                        Remove
                      </Button>
                    ),
                },
              ].filter(Boolean)}
            />
          </Card>
        ) : (
          <Card subtitle="Changes apply immediately. Switch roles in the demo bar to see the effect.">
            <div className="table-wrap">
              <table className="table perm-table">
                <thead>
                  <tr>
                    <th>Permission</th>
                    {roles.map((r) => (
                      <th key={r}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMS.map((p) => (
                    <tr key={p}>
                      <td>{PERM_LABELS[p]}</td>
                      {roles.map((r) => {
                        const on = (state.rolePerms[r] || []).includes(p);
                        return (
                          <td key={r}>
                            <button className={'dot-toggle ' + (on ? 'on' : '')} disabled={r === 'owner'} onClick={() => actions.toggleRolePerm(r, p)} aria-label={`${r} ${p}`}>
                              {on && <Icon name="check" size={14} strokeWidth={3} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <Modal
        open={invite}
        title="Invite a team member"
        onClose={() => setInvite(false)}
        footer={
          <Button
            disabled={!f.name || !f.phone}
            onClick={() => {
              actions.inviteMember(f);
              setInvite(false);
              setF({ name: '', phone: '', role: 'crew', title: '', branchId: '' });
            }}
          >
            Send invite
          </Button>
        }
      >
        <div className="stack">
          <div className="grid grid-2">
            <Field label="Name">
              <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Phone or email">
              <input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Job title">
            <input className="input" placeholder="e.g. Second shooter" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </Field>
          {branches.length > 1 && (
            <Field label="Branch" hint="Staff tied to a branch only see that branch's leads, bookings and calendar.">
              <select className="select" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Role">
            <div className="stack-s">
              {roles
                .filter((r) => r !== 'owner')
                .map((r) => (
                  <label key={r} className="check">
                    <input type="radio" name="role" checked={f.role === r} onChange={() => setF({ ...f, role: r })} />
                    <b style={{ textTransform: 'capitalize' }}>{r}</b> <span className="muted small">{ROLE_INFO[r]}</span>
                  </label>
                ))}
            </div>
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function Activity() {
  const { state } = useStore();
  return (
    <>
      <ModuleHeader title="Audit log" subtitle="Everything your team did, newest first." />
      <Card>
        <ul className="timeline">
          {state.activity
            .filter((a) => a.partnerId === state.partnerId)
            .map((a) => (
              <li key={a.id}>
                <Avatar name={a.actor} size={30} />
                <div>
                  <b>{a.actor}</b> {a.action}
                  <div className="tiny muted">{fmtDateTime(a.at)}</div>
                </div>
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
}

export function Subscription() {
  const { state, actions } = useStore();
  const pid = state.partnerId;
  const s = state.subscriptions[pid] || state.subscription;
  const partner = state.partners.find((p) => p.id === pid);
  const left = daysBetween(todayISO(), s.periodEnd);
  const listing = listingStatus(partner);
  const lapsed = ['past_due', 'grace', 'expired', 'cancelled'].includes(s.status);
  const tone = { trial: 'info', active: 'success', past_due: 'warning', grace: 'warning', expired: 'danger', cancelled: 'danger' }[s.status];
  return (
    <>
      <ModuleHeader title="Subscription" subtitle="One simple plan for your CRM and your listing in the app." />
      <StagePath stages={SUB_FLOW.map((x) => ({ id: x, label: SUB_LABEL[x] }))} current={s.status === 'cancelled' ? 'active' : s.status} lost={s.status === 'cancelled'} />
      <div className={'notice mb notice-' + (tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : '')} style={{ marginTop: 12 }}>
        <Icon name={lapsed ? 'alert' : 'check'} />
        <span className="grow">
          <b>{SUB_LABEL[s.status]}.</b> {SUB_NOTE[s.status]} Listing in the app: <b>{listing === 'live' ? 'Live' : listing === 'draft' ? 'Not live (verification pending)' : 'Hidden'}</b>.
        </span>
        {lapsed && <Button onClick={() => actions.paySubscription(pid)}>Pay {inr(SUBSCRIPTION_PRICE + 36)} now</Button>}
      </div>
      <div className="grid grid-2">
        <Card title={s.plan} actions={<Badge status={s.status}>{SUB_LABEL[s.status]}</Badge>}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>
            {inr(SUBSCRIPTION_PRICE)} <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>per 30 days + GST</span>
          </div>
          {s.status === 'trial' ? (
            <p className="muted mt-s">Free trial ends {fmtDate(s.trialEnds)}. Add a payment method to continue after that.</p>
          ) : (
            <p className="muted mt-s">
              Current period {fmtDate(s.periodStart)} to {fmtDate(s.periodEnd)} - {left >= 0 ? `${left} days left` : `ended ${-left} days ago`}
            </p>
          )}
          <div className="progress brand mt">
            <span style={{ width: Math.max(0, Math.min(100, ((30 - left) / 30) * 100)) + '%' }} />
          </div>
          <ul className="mt" style={{ paddingLeft: 18 }}>
            <li>Listing in the customer app</li>
            <li>Unlimited leads, quotes and invoices</li>
            <li>Calendar, crew and expenses</li>
            <li>Up to 5 team logins</li>
          </ul>
          <div className="row gap-s mt wrap">
            <Button onClick={() => actions.paySubscription(pid)}>{lapsed ? 'Pay and reactivate' : 'Renew now'}</Button>
            <label className="check">
              <input type="checkbox" checked={s.autoRenew} onChange={() => actions.toggleAutoRenewFor(pid)} /> Auto-renew
            </label>
            {s.status === 'active' && (
              <button className="link small" onClick={() => actions.cancelSubscription(pid)}>
                Cancel subscription
              </button>
            )}
          </div>
          <p className="tiny muted mt">If the plan expires, your listing is hidden from the app but your CRM data stays safe.</p>
        </Card>
        <Card title="Billing history" pad={false}>
          <Table
            rows={s.history}
            empty="No payments yet"
            columns={[
              { label: 'Date', render: (h) => fmtDate(h.date) },
              { label: 'Invoice', render: (h) => h.invoice || '-' },
              { label: 'Amount', render: (h) => inr(h.amount) },
              { label: 'GST', render: (h) => inr(h.gst) },
              { label: 'Status', render: (h) => <Badge status={h.status} /> },
            ]}
          />
        </Card>
      </div>
      <div className="grid grid-2 mt">
        <Card title="Subscription events">
          <ul className="zc-timeline">
            {s.events.map((e, i) => (
              <li key={i}>
                <span className="zc-tl-dot">
                  <Icon name="activity" size={12} />
                </span>
                <div>
                  <div>{e.text}</div>
                  <div className="tiny muted">{fmtDateTime(e.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Try the lifecycle (demo)" subtitle="See what happens to the listing when a renewal fails.">
          <div className="row gap-s wrap">
            <Button variant="secondary" size="sm" onClick={() => actions.simulateSubscription(pid, 'past_due')}>Renewal fails</Button>
            <Button variant="secondary" size="sm" onClick={() => actions.simulateSubscription(pid, 'grace')}>Enter grace period</Button>
            <Button variant="secondary" size="sm" onClick={() => actions.simulateSubscription(pid, 'expired')}>Expire</Button>
          </div>
          <p className="tiny muted mt">An expired or cancelled plan hides the listing from Explore. Paying makes it live again straight away.</p>
        </Card>
      </div>
    </>
  );
}
