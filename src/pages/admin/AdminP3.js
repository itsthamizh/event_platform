// Admin console (data model M19-M22 + M03): support desk, trust & safety,
// unified moderation queue, featured placements and campaigns, search and
// platform insights, audit log and exports, and the platform masters in Setup.
import { useState } from 'react';
import { fmtDate, fmtDateTime, inr, inrShort, todayISO } from '../../config';
import { navigate } from '../../router';
import { useStore } from '../../store';
import { downloadCsv } from '../../storeP3';
import { Badge, BarList, Button, ColumnChart, Field, Modal, Tabs } from '../../components/ui';
import { Component, Kpis, ListView, MiniTable, ModuleHeader, Section } from '../../components/crm';
import { categoryOf } from '../../components/Shared';
import { AVAIL_LABEL, AVAIL_MODEL } from '../../ops';
import { CHECKLIST_TEMPLATES } from '../../data/planning';
import { EVENT_TYPES } from '../../data/mock';

const TICKET_LABEL = { open: 'Open', pending: 'Waiting on user', resolved: 'Resolved', closed: 'Closed' };
const TICKET_TONE = { open: 'red', pending: 'amber', resolved: 'green', closed: 'gray' };
const who = (state, t) => (t.raisedBy === 'customer' ? (state.users.find((u) => u.id === t.raisedById) || {}).name : (state.partners.find((p) => p.id === t.raisedById) || {}).name) || '-';
const hoursSince = (iso) => Math.round((Date.now() - new Date(iso).getTime()) / 3600000);

// ---------- Support desk ----------
export function Support() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState('');
  const cur = open && state.tickets.find((t) => t.id === open);
  const rows = state.tickets.map((t) => ({ ...t, who: who(state, t), age: hoursSince(t.createdAt) }));
  return (
    <>
      <ListView
        module={{ singular: 'Ticket', plural: 'Tickets' }}
        rows={rows}
        onRow={(t) => setOpen(t.id)}
        views={[
          { id: 'open', label: 'Open Tickets', filter: (t) => ['open', 'pending'].includes(t.status) },
          { id: 'unassigned', label: 'Unassigned', filter: (t) => !t.assignedTo && t.status === 'open' },
          { id: 'sla', label: 'SLA Breached', filter: (t) => t.status === 'open' && t.age > t.slaHours },
          { id: 'all', label: 'All Tickets', filter: () => true },
        ]}
        filterFields={[
          { key: 'category', label: 'Category', type: 'select', get: (t) => t.category },
          { key: 'raisedBy', label: 'Raised By', type: 'select', get: (t) => t.raisedBy },
          { key: 'priority', label: 'Priority', type: 'select', get: (t) => t.priority },
        ]}
        columns={[
          { key: 'number', label: 'Ticket' },
          { key: 'subject', label: 'Subject' },
          { key: 'who', label: 'From', render: (t) => <span>{t.who} <span className="tiny muted">({t.raisedBy})</span></span> },
          { key: 'category', label: 'Category' },
          { key: 'priority', label: 'Priority', render: (t) => <Badge tone={{ urgent: 'red', high: 'orange', medium: 'blue', low: 'gray' }[t.priority]}>{t.priority}</Badge> },
          { key: 'status', label: 'Status', render: (t) => <Badge tone={TICKET_TONE[t.status]}>{TICKET_LABEL[t.status]}</Badge> },
          { key: 'assignedTo', label: 'Agent', render: (t) => t.assignedTo || <span className="red small">Unassigned</span> },
          { key: 'age', label: 'Age', align: 'right', render: (t) => <span className={t.status === 'open' && t.age > t.slaHours ? 'red' : ''}>{t.age < 48 ? t.age + 'h' : Math.round(t.age / 24) + 'd'}</span> },
        ]}
      />
      <Modal open={!!cur} title={cur ? `${cur.number} - ${cur.subject}` : ''} onClose={() => setOpen(null)} wide>
        {cur && (
          <div className="stack">
            <div className="row gap-s wrap">
              <Badge tone={TICKET_TONE[cur.status]}>{TICKET_LABEL[cur.status]}</Badge>
              <span className="small muted">
                {who(state, cur)} ({cur.raisedBy}) - {cur.category} {cur.bookingRef ? '- ' + cur.bookingRef : ''} - SLA {cur.slaHours}h
              </span>
              <span className="grow" />
              <select className="select input-sm" style={{ width: 180 }} value={cur.assignedTo || ''} onChange={(e) => actions.setTicket(cur.id, { assignedTo: e.target.value || null })} aria-label="Assign to">
                <option value="">Unassigned</option>
                {['Kavitha (Support)', 'Ravi (Support)', 'Anand (Payments)'].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <button className="zc-btn" onClick={() => actions.setTicket(cur.id, { status: 'resolved' })}>
                Resolve
              </button>
              <button className="zc-btn" onClick={() => actions.setTicket(cur.id, { status: 'closed' })}>
                Close
              </button>
            </div>
            {cur.messages.map((m) => (
              <div key={m.id} className={'zc-wa-msg ' + (m.side === 'agent' ? 'partner' : 'customer')} style={{ maxWidth: '85%' }}>
                <b className="tiny">{m.side === 'agent' ? 'Zoho for Vizhaa Support' : who(state, cur)}</b>
                <div>{m.body}</div>
                <span className="tiny muted">{fmtDateTime(m.at)}</span>
              </div>
            ))}
            <div className="row gap-s">
              <input className="input" placeholder="Reply to the user" value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button
                disabled={!reply}
                onClick={() => {
                  actions.replyTicket(cur.id, 'agent', reply);
                  setReply('');
                }}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------- Trust & safety ----------
export function Trust() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('reports');
  const [b, setB] = useState({ type: 'phone', value: '', reason: '' });
  const [s, setS] = useState({ partnerId: 'p3', reason: '', severity: 'warning' });
  const pname = (pid) => (state.partners.find((p) => p.id === pid) || {}).name || '-';
  return (
    <>
      <ModuleHeader title="Trust & Safety" subtitle="Reports from users, automated risk signals, the blocklist and partner strikes." />
      <Tabs
        tabs={[
          { id: 'reports', label: 'Reports', count: state.reports.filter((r) => r.status === 'open').length },
          { id: 'flags', label: 'Fraud signals', count: state.fraudFlags.filter((r) => r.status === 'open').length },
          { id: 'block', label: 'Blocklist', count: state.blocklist.length },
          { id: 'strikes', label: 'Strikes', count: state.strikes.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt">
        {tab === 'reports' && (
          <Section title="User reports">
            <MiniTable
              rows={state.reports}
              columns={[
                { label: 'Type', render: (r) => r.type },
                { label: 'About', render: (r) => (r.reportedPartnerId ? pname(r.reportedPartnerId) : (state.users.find((u) => u.id === r.reportedUserId) || {}).name) },
                { label: 'Reason', render: (r) => <span><b>{r.reason}</b><div className="tiny muted">{r.details}</div></span> },
                { label: 'By', render: (r) => r.reportedBy },
                { label: 'When', render: (r) => fmtDate(r.at) },
                { label: 'Status', render: (r) => <Badge tone={r.status === 'open' ? 'red' : r.status === 'actioned' ? 'green' : 'gray'}>{r.action || r.status}</Badge> },
                {
                  label: '',
                  align: 'right',
                  render: (r) =>
                    r.status === 'open' && (
                      <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                        <button className="zc-rl-link" onClick={() => actions.resolveReport(r.id, 'Dismissed')}>Dismiss</button>
                        {r.reportedPartnerId && <button className="zc-rl-link" onClick={() => { actions.issueStrike(r.reportedPartnerId, r.reason, 'warning'); actions.resolveReport(r.id, 'Warning issued'); }}>Warn partner</button>}
                        {r.type === 'review' && <button className="zc-rl-link" onClick={() => actions.resolveReport(r.id, 'Review hidden')}>Hide review</button>}
                      </span>
                    ),
                },
              ]}
            />
          </Section>
        )}
        {tab === 'flags' && (
          <Section title="Automated risk signals">
            <MiniTable
              rows={state.fraudFlags}
              columns={[
                { label: 'Signal', render: (f) => <span><b>{f.signal}</b><div className="tiny muted">{f.detail}</div></span> },
                { label: 'Entity', render: (f) => f.entity },
                { label: 'Risk', align: 'right', render: (f) => <b className={f.score >= 80 ? 'red' : f.score >= 65 ? 'orange' : ''}>{f.score}</b> },
                { label: 'Raised', render: (f) => fmtDateTime(f.at) },
                { label: 'Status', render: (f) => <Badge tone={f.status === 'open' ? 'red' : f.status === 'confirmed' ? 'orange' : 'gray'}>{f.status}</Badge> },
                {
                  label: '',
                  align: 'right',
                  render: (f) =>
                    f.status === 'open' && (
                      <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                        <button className="zc-rl-link" onClick={() => actions.setFlag(f.id, 'cleared')}>Clear</button>
                        <button className="zc-rl-link" onClick={() => actions.setFlag(f.id, 'confirmed')}>Confirm fraud</button>
                      </span>
                    ),
                },
              ]}
            />
          </Section>
        )}
        {tab === 'block' && (
          <Section title="Blocklist" actions={<span className="small muted">Blocked values cannot sign up, pay or use coupons</span>}>
            <MiniTable
              rows={state.blocklist}
              columns={[
                { label: 'Type', render: (x) => x.type },
                { label: 'Value', render: (x) => <b>{x.value}</b> },
                { label: 'Reason', render: (x) => x.reason },
                { label: 'By', render: (x) => `${x.by} - ${fmtDate(x.at)}` },
                { label: '', align: 'right', render: (x) => <button className="zc-rl-link" onClick={() => actions.unblockEntity(x.id)}>Unblock</button> },
              ]}
            />
            <div className="row gap-s mt-s">
              <select className="select input-sm" style={{ width: 120 }} value={b.type} onChange={(e) => setB({ ...b, type: e.target.value })} aria-label="Type">
                {['phone', 'upi', 'device', 'email'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input className="input input-sm" placeholder="Value" value={b.value} onChange={(e) => setB({ ...b, value: e.target.value })} aria-label="Value" />
              <input className="input input-sm" placeholder="Reason" value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} aria-label="Reason" />
              <button className="zc-btn zc-btn-primary" disabled={!b.value || !b.reason} onClick={() => { actions.blockEntity(b); setB({ type: 'phone', value: '', reason: '' }); }}>
                Block
              </button>
            </div>
          </Section>
        )}
        {tab === 'strikes' && (
          <Section title="Partner strikes and warnings" actions={<span className="small muted">3 active strikes trigger a listing review</span>}>
            <MiniTable
              rows={state.strikes}
              columns={[
                { label: 'Partner', render: (x) => pname(x.partnerId) },
                { label: 'Type', render: (x) => <Badge tone={x.severity === 'strike' ? 'red' : 'amber'}>{x.severity}</Badge> },
                { label: 'Reason', render: (x) => x.reason },
                { label: 'Issued', render: (x) => `${fmtDate(x.at)} by ${x.by}` },
                { label: 'Expires', render: (x) => fmtDate(x.expiresAt) },
              ]}
            />
            <div className="row gap-s mt-s">
              <select className="select input-sm" value={s.partnerId} onChange={(e) => setS({ ...s, partnerId: e.target.value })} aria-label="Partner">
                {state.partners.filter((p) => p.verification === 'verified').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select className="select input-sm" style={{ width: 120 }} value={s.severity} onChange={(e) => setS({ ...s, severity: e.target.value })} aria-label="Severity">
                <option value="warning">Warning</option>
                <option value="strike">Strike</option>
              </select>
              <input className="input input-sm" placeholder="Reason" value={s.reason} onChange={(e) => setS({ ...s, reason: e.target.value })} aria-label="Reason" />
              <button className="zc-btn zc-btn-primary" disabled={!s.reason} onClick={() => actions.issueStrike(s.partnerId, s.reason, s.severity)}>
                Issue
              </button>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

// ---------- Unified moderation queue ----------
export function Moderation() {
  const { state, actions } = useStore();
  const items = [
    ...state.partners.filter((p) => p.verification === 'pending').map((p) => ({ id: 'p' + p.id, kind: 'New partner', title: p.name, sub: categoryOf(state, p.category).name, at: p.joined, go: () => navigate('/admin/verification') })),
    ...state.reviews.filter((r) => r.status === 'pending_moderation').map((r) => ({ id: 'r' + r.id, kind: 'Review', title: `${r.rating} stars: ${r.title}`, sub: `${r.customerName} on ${(state.listings.find((l) => l.id === r.listingId) || {}).title}`, at: r.at, body: r.body, approve: () => actions.moderateReview(r.id, 'published'), reject: () => actions.moderateReview(r.id, 'hidden') })),
    ...state.reviews.filter((r) => r.status === 'reported').map((r) => ({ id: 'x' + r.id, kind: 'Reported review', title: r.title, sub: r.reportReason || 'Reported by partner', at: r.at, body: r.body, approve: () => actions.moderateReview(r.id, 'published'), reject: () => actions.moderateReview(r.id, 'hidden') })),
    ...state.articles.filter((a) => a.status === 'draft').map((a) => ({ id: 'a' + a.id, kind: 'Article draft', title: a.title, sub: a.category, at: todayISO(), approve: () => actions.toggleArticle(a.id) })),
    ...state.waTemplates.filter((t) => t.status === 'pending').map((t) => ({ id: 'w' + t.id, kind: 'WhatsApp template', title: t.name, sub: 'Waiting for Meta approval', at: todayISO(), body: t.body })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return (
    <>
      <ModuleHeader title="Moderation queue" subtitle={`${items.length} items waiting: new partners, reviews, reported content and drafts in one place.`} />
      <div className="stack">
        {items.map((i) => (
          <div key={i.id} className="zc-section">
            <div className="zc-section-body row between gap wrap">
              <div className="grow" style={{ minWidth: 260 }}>
                <Badge tone="blue">{i.kind}</Badge> <b>{i.title}</b>
                <div className="small muted">
                  {i.sub} - {fmtDate(i.at)}
                </div>
                {i.body && <div className="small mt-s">"{i.body}"</div>}
              </div>
              <div className="row gap-s">
                {i.go && <button className="zc-btn" onClick={i.go}>Open</button>}
                {i.reject && <button className="zc-btn" onClick={i.reject}>Hide</button>}
                {i.approve && <button className="zc-btn zc-btn-primary" onClick={i.approve}>{i.kind === 'Article draft' ? 'Publish' : 'Approve'}</button>}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="muted center" style={{ padding: 40 }}>Queue is clear.</div>}
      </div>
    </>
  );
}

// ---------- Featured placements + campaigns ----------
export function Marketing() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('placements');
  const [p, setP] = useState(null);
  const [c, setC] = useState(null);
  const title = (id) => (state.listings.find((l) => l.id === id) || {}).title;
  return (
    <>
      <ModuleHeader title="Marketing" subtitle="Paid featured slots for partners, and campaigns to customers and partners." actions={tab === 'placements' ? <button className="zc-btn zc-btn-primary" onClick={() => setP({ listingId: 'l3', slot: 'Decoration - top of results', category: 'decoration', city: 'Chennai', from: todayISO(), to: '2026-12-11', price: 4999 })}>Book Placement</button> : <button className="zc-btn zc-btn-primary" onClick={() => setC({ name: '', channel: 'WhatsApp', audience: '', size: 1000 })}>New Campaign</button>} />
      <Tabs tabs={[{ id: 'placements', label: 'Featured placements', count: state.placements.filter((x) => x.status === 'live').length }, { id: 'campaigns', label: 'Campaigns', count: state.campaigns.length }]} value={tab} onChange={setTab} />
      <div className="mt">
        {tab === 'placements' && (
          <MiniTable
            rows={state.placements}
            columns={[
              { label: 'Partner', render: (x) => title(x.listingId) },
              { label: 'Slot', render: (x) => x.slot },
              { label: 'Period', render: (x) => `${fmtDate(x.from)} - ${fmtDate(x.to)}` },
              { label: 'Price', align: 'right', render: (x) => inr(x.price) },
              { label: 'Impressions', align: 'right', render: (x) => x.impressions.toLocaleString('en-IN') },
              { label: 'Clicks', align: 'right', render: (x) => x.clicks.toLocaleString('en-IN') },
              { label: 'CTR', align: 'right', render: (x) => (x.impressions ? ((x.clicks / x.impressions) * 100).toFixed(1) + '%' : '-') },
              { label: 'Enquiries', align: 'right', render: (x) => x.enquiries },
              { label: 'Status', render: (x) => <Badge status={x.status} /> },
              { label: '', align: 'right', render: (x) => x.status !== 'ended' && <button className="zc-rl-link" onClick={() => actions.endPlacement(x.id)}>End</button> },
            ]}
          />
        )}
        {tab === 'campaigns' && (
          <MiniTable
            rows={state.campaigns}
            columns={[
              { label: 'Campaign', render: (x) => <b>{x.name}</b> },
              { label: 'Channel', render: (x) => x.channel },
              { label: 'Audience', render: (x) => <span className="small">{x.audience} ({x.size.toLocaleString('en-IN')})</span> },
              { label: 'Sent', render: (x) => (x.sentAt ? fmtDateTime(x.sentAt) : '-') },
              { label: 'Delivered', align: 'right', render: (x) => x.delivered.toLocaleString('en-IN') },
              { label: 'Opened', align: 'right', render: (x) => (x.delivered ? Math.round((x.opened / x.delivered) * 100) + '%' : '-') },
              { label: 'Clicked', align: 'right', render: (x) => (x.delivered ? Math.round((x.clicked / x.delivered) * 100) + '%' : '-') },
              { label: 'Bookings', align: 'right', render: (x) => x.conversions },
              { label: 'Status', render: (x) => <Badge status={x.status} /> },
              { label: '', align: 'right', render: (x) => ['draft', 'scheduled'].includes(x.status) && <button className="zc-rl-link" onClick={() => actions.sendCampaign(x.id)}>Send now</button> },
            ]}
          />
        )}
      </div>
      <Modal open={!!p} title="Book a featured placement" onClose={() => setP(null)} footer={<Button onClick={() => { actions.savePlacement(p); setP(null); }}>Book</Button>}>
        {p && (
          <div className="grid grid-2">
            <Field label="Partner">
              <select className="select" value={p.listingId} onChange={(e) => { const l = state.listings.find((x) => x.id === e.target.value); setP({ ...p, listingId: l.id, category: l.category, slot: `${categoryOf(state, l.category).name} - top of results` }); }}>
                {state.listings.filter((l) => ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12', 'l13'].includes(l.id)).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price">
              <input className="input" type="number" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} />
            </Field>
            <Field label="From">
              <input className="input" type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} />
            </Field>
            <Field label="To">
              <input className="input" type="date" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
      <Modal open={!!c} title="New campaign" onClose={() => setC(null)} footer={<Button disabled={!c || !c.name || !c.audience} onClick={() => { actions.saveCampaign(c); setC(null); }}>Save draft</Button>}>
        {c && (
          <div className="stack">
            <Field label="Name">
              <input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
            </Field>
            <div className="grid grid-2">
              <Field label="Channel">
                <select className="select" value={c.channel} onChange={(e) => setC({ ...c, channel: e.target.value })}>
                  {['WhatsApp', 'Push', 'SMS + Email', 'Email'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Audience size">
                <input className="input" type="number" value={c.size} onChange={(e) => setC({ ...c, size: e.target.value })} />
              </Field>
            </div>
            <Field label="Audience">
              <input className="input" value={c.audience} onChange={(e) => setC({ ...c, audience: e.target.value })} placeholder="e.g. Customers with a wedding in Feb 2027 and no photographer booked" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

// ---------- Insights ----------
export function PlatformInsights() {
  const { state } = useStore();
  const st = state.platformStats;
  const sum = (k) => st.reduce((a, d) => a + d[k], 0);
  const weeks = [0, 1, 2, 3].map((w) => {
    const sl = st.slice(w * 7 + 2, w * 7 + 9);
    return { m: sl[0] ? fmtDate(sl[0].date).slice(0, 6) : '', v: sl.reduce((a, d) => a + d.bookings, 0) };
  });
  const zero = state.searchLogs.filter((x) => x.zero);
  return (
    <>
      <ModuleHeader title="Insights" subtitle="Last 30 days across Chennai." />
      <Kpis
        items={[
          { label: 'New Customers', value: sum('signups').toLocaleString('en-IN') },
          { label: 'Searches', value: sum('searches').toLocaleString('en-IN') },
          { label: 'Enquiries', value: sum('enquiries').toLocaleString('en-IN') },
          { label: 'Bookings', value: sum('bookings').toLocaleString('en-IN') },
          { label: 'Search to Booking', value: ((sum('bookings') / sum('searches')) * 100).toFixed(2) + '%' },
          { label: 'GMV', value: inrShort(sum('gmv')) },
        ]}
      />
      <div className="zc-comps">
        <Component title="Bookings per week">
          <ColumnChart data={weeks} height={190} />
        </Component>
        <Component title="Top searches">
          <BarList data={state.searchLogs.filter((x) => !x.zero).slice(0, 8).map((x) => ({ k: x.q, v: x.count }))} />
        </Component>
        <Component
          title="Searches with no results (supply gaps)"
          rows={zero}
          columns={[
            { label: 'Search', render: (x) => x.q },
            { label: 'Times', render: (x) => x.count },
            { label: 'Category', render: (x) => (x.category ? categoryOf(state, x.category).name : 'New category?') },
          ]}
        />
        <Component title="Enquiries by category">
          <BarList data={state.categories.map((c) => ({ k: c.name, v: state.leads.filter((l) => (state.listings.find((x) => x.id === l.listingId) || {}).category === c.id).length })).filter((x) => x.v).sort((a, b) => b.v - a.v)} />
        </Component>
      </div>
    </>
  );
}

// ---------- Audit log ----------
export function AuditLog() {
  const { state, actions } = useStore();
  const exportPartners = () => {
    const rows = state.partners.map((p) => ({ id: p.id, name: p.name, category: p.category, gstin: p.gstin, verification: p.verification, subscription: p.subscription }));
    downloadCsv('partners.csv', rows);
    actions.logExport('Partners (CSV)', rows.length, 'Platform Admin');
  };
  return (
    <>
      <ModuleHeader title="Audit log" subtitle="Sensitive admin actions (suspensions, refunds, payouts, impersonation) and every data export." actions={<button className="zc-btn" onClick={exportPartners}>Export partners (CSV)</button>} />
      <Section title="Admin actions" count={state.adminActions.length}>
        <MiniTable
          rows={state.adminActions}
          columns={[
            { label: 'When', render: (a) => fmtDateTime(a.at) },
            { label: 'Admin', render: (a) => a.by },
            { label: 'Action', render: (a) => a.action },
            { label: 'IP', render: (a) => <span className="tiny muted">{a.ip}</span> },
          ]}
        />
      </Section>
      <Section title="Data exports" count={state.exports.length}>
        <MiniTable
          rows={state.exports}
          columns={[
            { label: 'When', render: (e) => fmtDateTime(e.at) },
            { label: 'By', render: (e) => e.by },
            { label: 'Export', render: (e) => e.what },
            { label: 'Rows', align: 'right', render: (e) => e.rows },
          ]}
        />
      </Section>
    </>
  );
}

// ---------- Setup: platform masters ----------
export function CitiesSetup() {
  const { state, actions } = useStore();
  return (
    <MiniTable
      rows={state.cities}
      columns={[
        { label: 'City', render: (c) => <b>{c.name}</b> },
        { label: 'State (GST code)', render: (c) => `${c.state} (${c.gst})` },
        { label: 'Areas', render: (c) => <span className="small">{c.areas.join(', ')}</span> },
        { label: 'Live', render: (c) => <input type="checkbox" checked={c.active} onChange={() => actions.toggleCity(c.id)} aria-label={'Live in ' + c.name} /> },
      ]}
    />
  );
}

const PRICING_UNIT = { venue: 'per slot / day', catering: 'per plate', photography: 'per event', decoration: 'per event', makeup: 'per look', pandit: 'per ritual', melam: 'per event', mehendi: 'per person', music_dj: 'per hour block', return_gifts: 'per unit', invitation: 'per unit', event_management: 'per event', wedding_planner: 'per event' };
export function CategoriesSetup() {
  const { state } = useStore();
  return (
    <MiniTable
      rows={state.categories}
      columns={[
        { label: 'Category', render: (c) => <b>{c.name}</b> },
        { label: 'Availability model', render: (c) => AVAIL_LABEL[AVAIL_MODEL[c.id] || 'capacity'] },
        { label: 'Pricing unit', render: (c) => PRICING_UNIT[c.id] },
        { label: 'Live partners', align: 'right', render: (c) => state.listings.filter((l) => l.category === c.id).length },
      ]}
    />
  );
}

export function EventTypesSetup() {
  return (
    <MiniTable
      rows={EVENT_TYPES.map((t) => ({ id: t, t }))}
      columns={[
        { label: 'Event type', render: (x) => <b>{x.t}</b> },
        { label: 'Checklist template', render: (x) => (CHECKLIST_TEMPLATES[x.t] ? `${CHECKLIST_TEMPLATES[x.t].length} tasks` : 'Uses Birthday template') },
        { label: 'First tasks', render: (x) => <span className="small">{(CHECKLIST_TEMPLATES[x.t] || CHECKLIST_TEMPLATES.Birthday).slice(0, 3).map((c) => c[0]).join('; ')}</span> },
      ]}
    />
  );
}

export function TaxSetup() {
  const { state } = useStore();
  return (
    <>
      <MiniTable
        rows={state.taxRates}
        columns={[
          { label: 'Rate', render: (t) => <b>{t.name}</b> },
          { label: 'Applies to', render: (t) => t.appliesTo },
          { label: 'SAC / HSN', render: (t) => t.hsn },
        ]}
      />
      <div className="zc-section-sub">Document numbering</div>
      <MiniTable
        rows={state.docSeries.map((d) => ({ ...d, id: d.type }))}
        columns={[
          { label: 'Document', render: (d) => d.type },
          { label: 'Format', render: (d) => <code>{d.format}</code> },
          { label: 'Example', render: (d) => d.example },
          { label: 'Resets', render: (d) => d.reset },
        ]}
      />
    </>
  );
}

export function FlagsSetup() {
  const { state, actions } = useStore();
  return (
    <>
      <MiniTable
        rows={state.featureFlags.map((f) => ({ ...f, id: f.key }))}
        columns={[
          { label: 'Feature', render: (f) => f.label },
          { label: 'Scope', render: (f) => f.scope },
          { label: 'On', render: (f) => <input type="checkbox" checked={f.on} onChange={() => actions.toggleFlag(f.key)} aria-label={f.label} /> },
        ]}
      />
      <div className="zc-section-sub">Commission rules</div>
      <MiniTable
        rows={state.commissionRules}
        columns={[
          { label: 'Rule', render: (r) => r.name },
          { label: 'Category', render: (r) => (r.category ? categoryOf(state, r.category).name : 'All') },
          { label: 'Plan', render: (r) => r.plan },
          { label: 'Commission', align: 'right', render: (r) => r.pct + '%' },
          { label: 'From', render: (r) => fmtDate(r.from) },
          { label: 'Active', render: (r) => <input type="checkbox" checked={r.active} onChange={() => actions.toggleCommission(r.id)} aria-label={'Active ' + r.name} /> },
        ]}
      />
    </>
  );
}

export function AdminUsersSetup() {
  const { state, actions } = useStore();
  return (
    <MiniTable
      rows={state.adminUsers}
      columns={[
        { label: 'Name', render: (u) => <b>{u.name}</b> },
        { label: 'Email', render: (u) => u.email },
        {
          label: 'Role',
          render: (u) => (
            <select className="select input-sm" value={u.role} onChange={(e) => actions.setAdminRole(u.id, e.target.value)} aria-label={'Role for ' + u.name}>
              {['Super admin', 'Support', 'Payments & Risk', 'Content & Marketing'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          ),
        },
        { label: '2FA', render: (u) => (u.twoFactor ? <Badge tone="green">On</Badge> : <Badge tone="red">Off</Badge>) },
        { label: 'Last active', render: (u) => fmtDateTime(u.lastActive) },
      ]}
    />
  );
}
