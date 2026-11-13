// B2B screens (data model M16). The same screens serve two buyers:
//  - corporate buyers in the "Vizha for Business" console (/corp)
//  - planners (Event Management / Wedding Planner partners) inside their Partner CRM (/partner)
// plus the vendor side of a purchase order (accept / decline) for every partner.
import { useState } from 'react';
import { addDays, fmtDate, fmtDateTime, inr, inrShort, todayISO } from '../../config';
import { Link, navigate } from '../../router';
import { quoteTotals, useStore } from '../../store';
import { currentBuyer } from '../../storeExtra';
import { APPROVAL_LABEL, INVITE_LABEL, PO_FLOW, PO_LABEL, RFQ_FLOW, RFQ_LABEL, isListed, quoteStatus } from '../../lifecycle';
import { Badge, Button, Empty, Field, Modal, Stars } from '../../components/ui';
import { BlueprintBar, Component, DetailLayout, FieldGrid, Kpis, ListView, MiniTable, ModuleHeader, RecordHeader, Section, StagePath, Welcome } from '../../components/crm';
import { categoryOf } from '../../components/Shared';
import { EnquiryFields, defaultsFor } from '../../categories/PackFields';
import { packFor } from '../../categories/packs';

// Paths differ between the corporate console and the planner's CRM.
export const b2bPaths = (kind) =>
  kind === 'corporate'
    ? { rfqs: '/corp/rfqs', pos: '/corp/pos', approvals: '/corp/approvals', vendors: '/corp/vendors', events: '/corp/events' }
    : { rfqs: '/partner/rfqs', pos: '/partner/purchase-orders', approvals: '/partner/approvals', vendors: '/partner/vendor-network', events: '/partner/projects' };

const pname = (state, pid) => (state.partners.find((p) => p.id === pid) || {}).name || '-';
const eventTitle = (state, ref) => {
  if (!ref) return '-';
  if (ref.type === 'corp_event') return (state.corpEvents.find((e) => e.id === ref.id) || {}).title || '-';
  return (state.projects.find((p) => p.id === ref.id) || {}).title || '-';
};
const PoBadge = ({ po }) => <Badge status={po.status}>{PO_LABEL[po.status]}</Badge>;
const RfqBadge = ({ rfq }) => {
  const late = rfq.status === 'open' && rfq.dueDate < todayISO();
  return <Badge status={late ? 'overdue' : rfq.status} tone={late ? undefined : { open: 'blue', draft: 'gray', closed: 'amber', awarded: 'green', cancelled: 'red' }[rfq.status]}>{late ? 'Past due date' : RFQ_LABEL[rfq.status]}</Badge>;
};

// Can the signed-in person approve this level?
const canApprove = (state, ap) => {
  const lvl = ap.levels.find((l) => l.status === 'pending');
  if (!lvl) return false;
  if (ap.buyerKind === 'corporate') {
    const map = { corp_approver: 'cu2', corp_director: 'cu3' };
    return map[state.role] === lvl.approverId;
  }
  return state.role === 'owner' && ap.orgId === state.partnerId;
};

// ---------- Corporate home ----------
export function CorpHome() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const today = todayISO();
  const rfqs = state.rfqs.filter((r) => r.buyerId === buyer.id);
  const pos = state.pos.filter((p) => p.buyerId === buyer.id);
  const approvals = state.approvals.filter((a) => a.orgId === buyer.id);
  const mine = approvals.filter((a) => canApprove(state, a));
  const quotesIn = rfqs.filter((r) => r.status === 'open').reduce((a, r) => a + r.invites.filter((i) => i.status === 'responded').length, 0);
  const committed = pos.filter((p) => ['issued', 'accepted', 'fulfilled', 'pending_approval'].includes(p.status)).reduce((a, p) => a + p.amount, 0);
  const budget = state.costCenters.filter((c) => c.orgId === buyer.id).reduce((a, c) => a + c.budget, 0);
  const events = state.corpEvents.filter((e) => e.orgId === buyer.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <Welcome name={buyer.user.name} initials={buyer.name.slice(0, 2).toUpperCase()} homeLabel={`${buyer.name.split(' ')[0]} Home`} />
      <Kpis
        items={[
          { label: 'Upcoming Events', value: events.length, to: '/corp/events' },
          { label: 'Open RFQs', value: rfqs.filter((r) => r.status === 'open').length, to: '/corp/rfqs' },
          { label: 'Quotes to Review', value: quotesIn, to: '/corp/rfqs' },
          { label: 'Waiting for My Approval', value: mine.length, to: '/corp/approvals' },
          { label: 'Committed Spend (FY 26-27)', value: `${inrShort(committed)} / ${inrShort(budget)}`, to: '/corp/cost-centers' },
        ]}
      />
      <div className="zc-comps">
        <Component
          title="Upcoming Events"
          rows={events}
          onRow={(e) => navigate('/corp/events/' + e.id)}
          columns={[
            { label: 'Event', render: (e) => e.title },
            { label: 'Date', render: (e) => fmtDate(e.date) },
            { label: 'Guests', render: (e) => e.guests },
            { label: 'Owner', render: (e) => e.owner },
          ]}
        />
        <Component
          title="Waiting for My Approval"
          rows={mine}
          onRow={() => navigate('/corp/approvals')}
          empty="Nothing waiting for you"
          columns={[
            { label: 'Request', render: (a) => a.title },
            { label: 'Amount', align: 'right', render: (a) => inr(a.amount) },
            { label: 'Raised By', render: (a) => a.requestedBy },
          ]}
        />
        <Component
          title="Open RFQs"
          rows={rfqs.filter((r) => ['open', 'draft'].includes(r.status))}
          onRow={(r) => navigate('/corp/rfqs/' + r.id)}
          columns={[
            { label: 'RFQ', render: (r) => r.number },
            { label: 'Title', render: (r) => r.title },
            { label: 'Quotes', render: (r) => `${r.invites.filter((i) => i.status === 'responded').length} of ${r.invites.length}` },
            { label: 'Due', render: (r) => fmtDate(r.dueDate) },
          ]}
        />
        <Component
          title="Recent Purchase Orders"
          rows={[...pos].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
          onRow={(p) => navigate('/corp/pos/' + p.id)}
          columns={[
            { label: 'PO', render: (p) => p.number },
            { label: 'Vendor', render: (p) => pname(state, p.partnerId) },
            { label: 'Amount', align: 'right', render: (p) => inr(p.amount) },
            { label: 'Status', render: (p) => <PoBadge po={p} /> },
          ]}
        />
      </div>
    </>
  );
}

// ---------- Corporate events ----------
export function CorpEvents() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const rows = state.corpEvents
    .filter((e) => e.orgId === buyer.id)
    .map((e) => {
      const pos = state.pos.filter((p) => p.eventRef && p.eventRef.id === e.id && !['cancelled', 'rejected'].includes(p.status));
      return { ...e, committed: pos.reduce((a, p) => a + p.amount, 0), cc: state.costCenters.find((c) => c.id === e.costCenterId) || {} };
    });
  return (
    <ListView
      module={{ singular: 'Event', plural: 'Events' }}
      rows={rows}
      onRow={(e) => navigate('/corp/events/' + e.id)}
      views={[
        { id: 'up', label: 'Upcoming Events', filter: (e) => e.date >= todayISO() },
        { id: 'all', label: 'All Events', filter: () => true },
        { id: 'past', label: 'Past Events', filter: (e) => e.date < todayISO() },
      ]}
      columns={[
        { key: 'title', label: 'Event' },
        { key: 'date', label: 'Date', render: (e) => fmtDate(e.date) },
        { key: 'guests', label: 'Guests', align: 'right' },
        { key: 'cc', label: 'Cost Centre', render: (e) => `${e.cc.code} - ${e.cc.name}`, sortValue: (e) => e.cc.code },
        { key: 'budget', label: 'Budget', align: 'right', render: (e) => inr(e.budget) },
        { key: 'committed', label: 'Committed', align: 'right', render: (e) => inr(e.committed) },
        { key: 'owner', label: 'Owner' },
      ]}
    />
  );
}

export function CorpEventDetail({ id }) {
  const { state } = useStore();
  const e = state.corpEvents.find((x) => x.id === id);
  if (!e) return <Empty title="Event not found" />;
  const rfqs = state.rfqs.filter((r) => r.eventRef && r.eventRef.id === e.id);
  const pos = state.pos.filter((p) => p.eventRef && p.eventRef.id === e.id);
  const cc = state.costCenters.find((c) => c.id === e.costCenterId) || {};
  const committed = pos.filter((p) => !['cancelled', 'rejected'].includes(p.status)).reduce((a, p) => a + p.amount, 0);
  const statusFor = (cat) => {
    const po = pos.find((p) => !['cancelled', 'rejected'].includes(p.status) && (state.listings.find((l) => l.partnerId === p.partnerId) || {}).category === cat);
    if (po) return { label: PO_LABEL[po.status], tone: po.status, to: '/corp/pos/' + po.id, vendor: pname(state, po.partnerId), amount: po.amount };
    const rfq = rfqs.find((r) => r.category === cat && r.status !== 'cancelled');
    if (rfq) return { label: `RFQ ${RFQ_LABEL[rfq.status]} - ${rfq.invites.filter((i) => i.status === 'responded').length} quotes`, tone: rfq.status, to: '/corp/rfqs/' + rfq.id };
    return null;
  };
  return (
    <>
      <RecordHeader back="/corp/events" title={e.title} subtitle={`${fmtDate(e.date)} - ${e.area} - ${e.guests} guests`} owner={e.owner} actions={<Link to={'/corp/rfqs/new?event=' + e.id} className="zc-btn zc-btn-primary">Create RFQ</Link>} />
      <DetailLayout nav={[{ id: 'einfo', label: 'Event Information' }, { id: 'needs', label: 'Vendors Needed', count: e.needs.length }, { id: 'erfq', label: 'RFQs', count: rfqs.length }, { id: 'epo', label: 'Purchase Orders', count: pos.length }]}>
        <Section id="einfo" title="Event Information">
          <FieldGrid
            fields={[
              ['Event', e.title],
              ['Date', fmtDate(e.date)],
              ['Location', e.area],
              ['Guests', e.guests],
              ['Cost Centre', `${cc.code} - ${cc.name}`],
              ['Budget', inr(e.budget)],
              ['Committed', <b className={committed > e.budget ? 'red' : ''}>{inr(committed)} ({Math.round((committed / (e.budget || 1)) * 100)}%)</b>],
              ['Owner', e.owner],
            ]}
          />
        </Section>
        <Section id="needs" title="Vendors Needed" count={e.needs.length}>
          <MiniTable
            rows={e.needs.map((c) => ({ id: c, c, st: statusFor(c) }))}
            columns={[
              { label: 'Category', render: (r) => categoryOf(state, r.c).name },
              { label: 'Status', render: (r) => (r.st ? <Badge status={r.st.tone}>{r.st.label}</Badge> : <Badge tone="gray">Not started</Badge>) },
              { label: 'Vendor', render: (r) => (r.st && r.st.vendor) || '-' },
              { label: 'Amount', align: 'right', render: (r) => (r.st && r.st.amount ? inr(r.st.amount) : '-') },
              { label: '', align: 'right', render: (r) => (r.st ? <Link to={r.st.to} className="zc-rl-link">Open</Link> : <Link to={`/corp/rfqs/new?event=${e.id}&cat=${r.c}`} className="zc-rl-link">Create RFQ</Link>) },
            ]}
          />
        </Section>
        <Section id="erfq" title="RFQs" count={rfqs.length}>
          <RfqTable rows={rfqs} base="/corp/rfqs" />
        </Section>
        <Section id="epo" title="Purchase Orders" count={pos.length}>
          <PoTable rows={pos} base="/corp/pos" />
        </Section>
      </DetailLayout>
    </>
  );
}

function RfqTable({ rows, base }) {
  return (
    <MiniTable
      rows={rows}
      onRow={(r) => navigate(base + '/' + r.id)}
      empty="No RFQs yet."
      columns={[
        { label: 'RFQ', render: (r) => r.number },
        { label: 'Title', render: (r) => r.title },
        { label: 'Status', render: (r) => <RfqBadge rfq={r} /> },
        { label: 'Quotes', render: (r) => `${r.invites.filter((i) => i.status === 'responded' || i.status === 'awarded' || i.status === 'not_awarded').length} of ${r.invites.length}` },
        { label: 'Due', render: (r) => fmtDate(r.dueDate) },
      ]}
    />
  );
}

function PoTable({ rows, base }) {
  const { state } = useStore();
  return (
    <MiniTable
      rows={rows}
      onRow={(p) => navigate(base + '/' + p.id)}
      empty="No purchase orders yet."
      columns={[
        { label: 'PO Number', render: (p) => p.number },
        { label: 'Vendor', render: (p) => pname(state, p.partnerId) },
        { label: 'Status', render: (p) => <PoBadge po={p} /> },
        { label: 'Amount', align: 'right', render: (p) => inr(p.amount) },
        { label: 'Event Date', render: (p) => fmtDate(p.eventDate) },
      ]}
    />
  );
}

// ---------- RFQs ----------
export function RfqList() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const rows = state.rfqs.filter((r) => r.buyerId === buyer.id).map((r) => ({ ...r, quotes: r.invites.filter((i) => ['responded', 'awarded', 'not_awarded'].includes(i.status)).length, ev: eventTitle(state, r.eventRef) }));
  return (
    <ListView
      module={{ singular: 'RFQ', plural: 'RFQs' }}
      rows={rows}
      onRow={(r) => navigate(P.rfqs + '/' + r.id)}
      onCreate={state.role === 'corp_approver' || state.role === 'corp_director' ? null : () => navigate(P.rfqs + '/new')}
      createLabel="Create RFQ"
      views={[
        { id: 'open', label: 'Open RFQs', filter: (r) => ['open', 'draft'].includes(r.status) },
        { id: 'all', label: 'All RFQs', filter: () => true },
        { id: 'awarded', label: 'Awarded', filter: (r) => r.status === 'awarded' },
      ]}
      filterFields={[
        { key: 'status', label: 'Status', type: 'select', get: (r) => r.status, options: RFQ_FLOW.map((x) => ({ value: x, label: RFQ_LABEL[x] })) },
        { key: 'category', label: 'Category', type: 'select', get: (r) => r.category, options: state.categories.map((c) => ({ value: c.id, label: c.name })) },
      ]}
      columns={[
        { key: 'number', label: 'RFQ Number' },
        { key: 'title', label: 'Title' },
        { key: 'ev', label: buyer.kind === 'corporate' ? 'Event' : 'Project' },
        { key: 'category', label: 'Category', render: (r) => categoryOf(state, r.category).name },
        { key: 'status', label: 'Status', render: (r) => <RfqBadge rfq={r} /> },
        { key: 'quotes', label: 'Quotes', align: 'right', render: (r) => `${r.quotes} / ${r.invites.length}` },
        { key: 'dueDate', label: 'Quotes Due', render: (r) => fmtDate(r.dueDate) },
        { key: 'eventDate', label: 'Event Date', render: (r) => fmtDate(r.eventDate) },
      ]}
    />
  );
}

export function RfqNew({ query = {} }) {
  const { state, actions } = useStore();
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const events = buyer.kind === 'corporate' ? state.corpEvents.filter((e) => e.orgId === buyer.id && e.date >= todayISO()) : state.projects.filter((p) => p.partnerId === buyer.id);
  const pick0 = events.find((e) => e.id === (query.event || query.project)) || events[0] || {};
  const [evId, setEvId] = useState(pick0.id || '');
  const ev = events.find((e) => e.id === evId) || {};
  const [category, setCategory] = useState(query.cat || (ev.needs ? ev.needs[0] : (ev.budgetLines || [])[0] && ev.budgetLines[0].category) || 'catering');
  const pack = packFor(category);
  const [details, setDetails] = useState(() => defaultsFor(pack.enquiry || []));
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 7));
  const [budget, setBudget] = useState('');
  const [vendors, setVendors] = useState([]);
  const preferred = state.preferredVendors.filter((v) => v.buyerId === buyer.id).map((v) => v.partnerId);
  const listings = state.listings.filter((l) => l.category === category && isListed(state, l) && l.partnerId !== buyer.id).sort((a, b) => (preferred.includes(b.partnerId) ? 1 : 0) - (preferred.includes(a.partnerId) ? 1 : 0) || b.rating - a.rating);
  const autoTitle = `${ev.title || 'Event'} - ${categoryOf(state, category).name}`;
  const submit = (send) => {
    const id = actions.createRfq(
      {
        eventRef: { type: buyer.kind === 'corporate' ? 'corp_event' : 'project', id: ev.id }, title: title || autoTitle, category, requirements, details, eventDate: ev.date || ev.eventDate, guests: ev.guests,
        dueDate, budget, costCenterId: ev.costCenterId, projectId: buyer.kind === 'planner' ? ev.id : null, parentBookingId: ev.clientBookingId || null, vendorIds: vendors,
      },
      send
    );
    navigate(P.rfqs + '/' + id);
  };
  if (!events.length) return <Empty title={buyer.kind === 'corporate' ? 'Create an event first' : 'Create a project first'} />;
  return (
    <>
      <RecordHeader back={P.rfqs} title="New Request for Quotation" subtitle="Describe what you need once. Every vendor you invite gets it as a lead in their CRM and quotes back here." />
      <div className="zc-detail">
        <div className="zc-dmain" style={{ maxWidth: 980 }}>
          <Section title="What do you need?">
            <div className="grid grid-2">
              <Field label={buyer.kind === 'corporate' ? 'Event' : 'Project'}>
                <select className="select" value={evId} onChange={(e) => setEvId(e.target.value)}>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} - {fmtDate(e.date || e.eventDate)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select
                  className="select"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setVendors([]);
                    setDetails(defaultsFor(packFor(e.target.value).enquiry || []));
                  }}
                >
                  {state.categories.filter((c) => !['event_management', 'wedding_planner'].includes(c.id)).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input className="input" value={title} placeholder={autoTitle} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Quotes due by">
                <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label="Budget (internal, not shown to vendors)">
                <input className="input" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </Field>
              <Field label="Event date and guests">
                <input className="input" disabled value={`${fmtDate(ev.date || ev.eventDate)} - ${ev.guests} guests`} />
              </Field>
            </div>
            <Field label="Scope and requirements">
              <textarea className="textarea" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Timings, quantities, quality expectations, delivery, anything the vendor must price." />
            </Field>
            {pack.enquiry && pack.enquiry.length > 0 && (
              <>
                <div className="zc-section-sub">{pack.label} details</div>
                <div className="grid grid-2">
                  <EnquiryFields fields={pack.enquiry} values={details} onChange={setDetails} listing={listings[0] || { attributes: {} }} />
                </div>
              </>
            )}
          </Section>
          <Section title="Invite vendors" count={vendors.length} actions={<span className="small muted">Your vendor network is listed first</span>}>
            <div className="stack-s">
              {listings.map((l) => (
                <label key={l.id} className="check row between" style={{ width: '100%' }}>
                  <span className="row gap-s">
                    <input type="checkbox" checked={vendors.includes(l.partnerId)} onChange={() => setVendors(vendors.includes(l.partnerId) ? vendors.filter((x) => x !== l.partnerId) : [...vendors, l.partnerId])} />
                    <b>{l.title}</b>
                    {preferred.includes(l.partnerId) && <Badge tone="green">Preferred</Badge>}
                    <span className="tiny muted">{l.area}</span>
                  </span>
                  <span className="row gap-s small">
                    <Stars value={l.rating} count={l.ratingCount} size={12} />
                    <span className="muted">from {inr(l.priceFrom)}</span>
                  </span>
                </label>
              ))}
              {listings.length === 0 && <div className="muted small">No live vendors in this category.</div>}
            </div>
          </Section>
          <div className="row gap-s" style={{ justifyContent: 'flex-end', padding: 16 }}>
            <button className="zc-btn" onClick={() => submit(false)}>
              Save as draft
            </button>
            <button className="zc-btn zc-btn-primary" disabled={!vendors.length} onClick={() => submit(true)}>
              Send RFQ to {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function RfqDetail({ id }) {
  const { state, actions } = useStore();
  const [award, setAward] = useState(null);
  const [inviteMore, setInviteMore] = useState(false);
  const [more, setMore] = useState([]);
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const rfq = state.rfqs.find((r) => r.id === id && r.buyerId === buyer.id);
  if (!rfq) return <Empty title="RFQ not found" />;
  const requester = !['corp_approver', 'corp_director'].includes(state.role);
  const rows = rfq.invites.map((i) => {
    const q = i.quoteId && state.quotes.find((x) => x.id === i.quoteId);
    const listing = state.listings.find((l) => l.partnerId === i.partnerId) || {};
    return { ...i, q, total: q ? quoteTotals(q).total : null, listing, preferred: state.preferredVendors.some((v) => v.buyerId === buyer.id && v.partnerId === i.partnerId) };
  });
  const quoted = rows.filter((r) => r.total != null);
  const lowest = quoted.length ? Math.min(...quoted.map((r) => r.total)) : null;
  const po = rfq.poId && state.pos.find((p) => p.id === rfq.poId);
  const transitions = [];
  if (requester && rfq.status === 'draft') transitions.push({ label: 'Send RFQ', primary: true, disabled: !(rfq.draftVendorIds || []).length, onClick: () => actions.sendRfq(rfq.id, rfq.draftVendorIds || []) });
  if (requester && rfq.status === 'open') transitions.push({ label: 'Invite More Vendors', onClick: () => setInviteMore(true) });
  if (requester && rfq.status === 'open') transitions.push({ label: 'Close for Quotes', onClick: () => actions.closeRfq(rfq.id) });
  if (requester && ['open', 'draft', 'closed'].includes(rfq.status)) transitions.push({ label: 'Cancel RFQ', onClick: () => actions.cancelRfq(rfq.id) });
  const candidates = state.listings.filter((l) => l.category === rfq.category && isListed(state, l) && !rfq.invites.some((i) => i.partnerId === l.partnerId) && l.partnerId !== buyer.id);
  return (
    <>
      <RecordHeader back={P.rfqs} title={`${rfq.number} - ${rfq.title}`} subtitle={`${categoryOf(state, rfq.category).name} - event ${fmtDate(rfq.eventDate)} - ${rfq.guests} guests - quotes due ${fmtDate(rfq.dueDate)}`} badges={<RfqBadge rfq={rfq} />} owner={rfq.createdBy} />
      <StagePath stages={RFQ_FLOW.map((x) => ({ id: x, label: RFQ_LABEL[x] }))} current={rfq.status === 'cancelled' ? 'draft' : rfq.status} lost={rfq.status === 'cancelled'} />
      <BlueprintBar state={RFQ_LABEL[rfq.status]} transitions={transitions} note={rfq.status === 'awarded' && po ? `Awarded to ${pname(state, po.partnerId)}. PO ${po.number} is ${PO_LABEL[po.status].toLowerCase()}.` : rfq.status === 'open' ? `${quoted.length} of ${rfq.invites.length} vendors have quoted.` : null} />
      <DetailLayout nav={[{ id: 'rinfo', label: 'RFQ Information' }, { id: 'compare', label: 'Quotes Comparison', count: quoted.length }, { id: 'invites', label: 'Invited Vendors', count: rfq.invites.length }, po && { id: 'rpo', label: 'Purchase Order' }].filter(Boolean)}>
        <Section id="rinfo" title="RFQ Information">
          <FieldGrid
            fields={[
              ['RFQ Number', rfq.number],
              [buyer.kind === 'corporate' ? 'Event' : 'Project', eventTitle(state, rfq.eventRef)],
              ['Category', categoryOf(state, rfq.category).name],
              ['Status', <RfqBadge rfq={rfq} />],
              ['Event Date', fmtDate(rfq.eventDate)],
              ['Guests', rfq.guests],
              ['Quotes Due', fmtDate(rfq.dueDate)],
              ['Internal Budget', rfq.budget ? inr(rfq.budget) : '-'],
              rfq.costCenterId && ['Cost Centre', (state.costCenters.find((c) => c.id === rfq.costCenterId) || {}).name],
              ['Created', `${rfq.createdBy} - ${fmtDateTime(rfq.createdAt)}`],
            ]}
          />
          <FieldGrid cols={1} fields={[['Scope and requirements', rfq.requirements]]} />
        </Section>
        <Section id="compare" title="Quotes Comparison" count={quoted.length}>
          {quoted.length === 0 ? (
            <div className="muted small zc-empty-rl">No quotes yet. Vendors see this RFQ as a lead in their CRM.</div>
          ) : (
            <MiniTable
              rows={quoted.sort((a, b) => a.total - b.total)}
              columns={[
                { label: 'Vendor', render: (r) => <span>{pname(state, r.partnerId)} {r.preferred && <Badge tone="green">Preferred</Badge>}</span> },
                { label: 'Rating', render: (r) => <Stars value={r.listing.rating || 0} size={11} /> },
                { label: 'Quote', render: (r) => `${r.q.number} v${r.q.version}` },
                { label: 'Items', render: (r) => r.q.items.length },
                { label: 'Total (incl. GST)', align: 'right', render: (r) => <b className={r.total === lowest ? 'green' : ''}>{inr(r.total)}</b> },
                { label: 'vs Budget', align: 'right', render: (r) => (rfq.budget ? <span className={r.total > rfq.budget ? 'red' : 'green'}>{Math.round((r.total / rfq.budget) * 100)}%</span> : '-') },
                { label: 'Valid Till', render: (r) => fmtDate(r.q.validUntil) },
                { label: 'Status', render: (r) => <Badge status={r.status}>{INVITE_LABEL[r.status]}</Badge> },
                {
                  label: '',
                  align: 'right',
                  render: (r) =>
                    requester && ['open', 'closed'].includes(rfq.status) && r.status === 'responded' && ['sent', 'viewed'].includes(quoteStatus(r.q)) ? (
                      <button className="zc-btn zc-btn-primary" onClick={() => setAward(r)}>
                        Award
                      </button>
                    ) : null,
                },
              ]}
            />
          )}
        </Section>
        <Section id="invites" title="Invited Vendors" count={rfq.invites.length}>
          <MiniTable
            rows={rows}
            empty={rfq.status === 'draft' ? `Draft. ${(rfq.draftVendorIds || []).length} vendors selected, not sent yet.` : 'No vendors invited.'}
            columns={[
              { label: 'Vendor', render: (r) => pname(state, r.partnerId) },
              { label: 'Area', render: (r) => r.listing.area || '-' },
              { label: 'Invited', render: (r) => fmtDateTime(r.invitedAt) },
              { label: 'Response', render: (r) => <Badge status={r.status}>{INVITE_LABEL[r.status]}</Badge> },
              { label: 'Responded', render: (r) => (r.respondedAt ? fmtDateTime(r.respondedAt) : r.viewedAt ? 'Viewed ' + fmtDate(r.viewedAt) : '-') },
            ]}
          />
        </Section>
        {po && (
          <Section id="rpo" title="Purchase Order">
            <PoTable rows={[po]} base={P.pos} />
          </Section>
        )}
      </DetailLayout>
      <Modal
        open={!!award}
        title="Award this RFQ?"
        onClose={() => setAward(null)}
        footer={
          <Button
            onClick={() => {
              const poId = actions.awardRfq(rfq.id, award.id);
              setAward(null);
              navigate(P.pos + '/' + poId);
            }}
          >
            Award and raise PO
          </Button>
        }
      >
        {award && (
          <div className="stack small">
            <p>
              Award <b>{rfq.title}</b> to <b>{pname(state, award.partnerId)}</b> for <b>{inr(award.total)}</b>.
            </p>
            <p className="muted">A purchase order is raised. {state.approvalRules.filter((r) => r.orgId === buyer.id).some((r) => award.total > r.above) ? 'This amount needs internal approval before the PO goes to the vendor.' : 'It goes to the vendor straight away.'} The other {rfq.invites.length - 1} vendors are told they were not selected.</p>
          </div>
        )}
      </Modal>
      <Modal
        open={inviteMore}
        title="Invite more vendors"
        onClose={() => setInviteMore(false)}
        footer={
          <Button
            disabled={!more.length}
            onClick={() => {
              actions.sendRfq(rfq.id, more);
              setInviteMore(false);
              setMore([]);
            }}
          >
            Invite {more.length}
          </Button>
        }
      >
        <div className="stack-s">
          {candidates.map((l) => (
            <label key={l.id} className="check">
              <input type="checkbox" checked={more.includes(l.partnerId)} onChange={() => setMore(more.includes(l.partnerId) ? more.filter((x) => x !== l.partnerId) : [...more, l.partnerId])} /> {l.title} <span className="tiny muted">{l.area}</span>
            </label>
          ))}
          {candidates.length === 0 && <p className="muted small">Every live vendor in this category is already invited.</p>}
        </div>
      </Modal>
    </>
  );
}

// ---------- Purchase orders (buyer side list) ----------
export function PoList() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const rows = state.pos.filter((p) => p.buyerId === buyer.id).map((p) => ({ ...p, vendor: pname(state, p.partnerId), ev: eventTitle(state, p.eventRef) }));
  return (
    <ListView
      module={{ singular: 'Purchase Order', plural: 'Purchase Orders' }}
      rows={rows}
      onRow={(p) => navigate(P.pos + '/' + p.id)}
      views={[
        { id: 'all', label: 'All Purchase Orders', filter: () => true },
        { id: 'approval', label: 'Pending Approval', filter: (p) => p.status === 'pending_approval' },
        { id: 'issued', label: 'Waiting for Vendor', filter: (p) => p.status === 'issued' },
        { id: 'accepted', label: 'Accepted', filter: (p) => p.status === 'accepted' },
        { id: 'fulfilled', label: 'Fulfilled', filter: (p) => p.status === 'fulfilled' },
      ]}
      filterFields={[
        { key: 'status', label: 'Status', type: 'select', get: (p) => p.status, options: PO_FLOW.map((x) => ({ value: x, label: PO_LABEL[x] })) },
        { key: 'vendor', label: 'Vendor', type: 'text', get: (p) => p.vendor },
      ]}
      columns={[
        { key: 'number', label: 'PO Number' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'title', label: 'Subject' },
        { key: 'ev', label: buyer.kind === 'corporate' ? 'Event' : 'Project' },
        { key: 'status', label: 'Status', render: (p) => <PoBadge po={p} /> },
        { key: 'amount', label: 'Amount', align: 'right', render: (p) => inr(p.amount) },
        { key: 'eventDate', label: 'Event Date', render: (p) => fmtDate(p.eventDate) },
        { key: 'raisedBy', label: 'Raised By' },
      ]}
    />
  );
}

// ---------- Purchase order detail (buyer or vendor view) ----------
export function PoDetail({ id, side }) {
  const { state, actions } = useStore();
  const [decline, setDecline] = useState(false);
  const po = state.pos.find((p) => p.id === id);
  if (!po) return <Empty title="Purchase order not found" />;
  const vendorView = side === 'vendor' || (side !== 'buyer' && po.partnerId === state.partnerId && po.buyerId !== state.partnerId);
  const P = b2bPaths(po.buyerKind);
  const ap = po.approvalId && state.approvals.find((a) => a.id === po.approvalId);
  const booking = po.bookingId && state.bookings.find((b) => b.id === po.bookingId);
  const sub = po.items.reduce((a, i) => a + i.qty * i.unitPrice, 0) - (po.discount || 0);
  const gst = po.gst ? Math.round(sub * 0.18) : 0;
  const org = state.orgs.find((o) => o.id === po.buyerId);
  const vendor = state.partners.find((p) => p.id === po.partnerId) || {};
  const transitions = [];
  if (vendorView && po.status === 'issued') {
    transitions.push({ label: 'Accept PO', primary: true, onClick: () => actions.acceptPo(po.id) });
    transitions.push({ label: 'Decline', onClick: () => setDecline(true) });
  }
  if (!vendorView && ['draft', 'pending_approval', 'issued'].includes(po.status) && !['corp_approver', 'corp_director'].includes(state.role)) transitions.push({ label: 'Cancel PO', onClick: () => actions.cancelPo(po.id) });
  if (ap && canApprove(state, ap) && !vendorView) {
    transitions.unshift({ label: 'Reject', onClick: () => actions.decideApproval(ap.id, 'rejected', 'Over budget for this event') });
    transitions.unshift({ label: 'Approve', primary: true, onClick: () => actions.decideApproval(ap.id, 'approved', 'Approved') });
  }
  const back = vendorView ? '/partner/purchase-orders' : P.pos;
  return (
    <>
      <RecordHeader back={back} title={`${po.number}`} subtitle={`${vendorView ? 'From ' + po.buyerName : 'To ' + vendor.name} - ${po.title} - event ${fmtDate(po.eventDate)}`} badges={<PoBadge po={po} />} owner={po.raisedBy} />
      <StagePath stages={PO_FLOW.map((x) => ({ id: x, label: PO_LABEL[x] }))} current={['cancelled', 'rejected'].includes(po.status) ? 'draft' : po.status} lost={['cancelled', 'rejected'].includes(po.status)} />
      <BlueprintBar
        state={PO_LABEL[po.status]}
        transitions={transitions}
        note={
          vendorView && po.status === 'issued'
            ? 'Accepting confirms the booking, blocks the date and creates an invoice on the PO terms.'
            : vendorView && po.status === 'pending_approval'
            ? 'The buyer is getting internal approval. You will be notified when the PO is issued.'
            : po.status === 'rejected'
            ? `Rejected in approval${po.rejectNote ? ': ' + po.rejectNote : ''}.`
            : po.declineReason
            ? `Declined by vendor: ${po.declineReason}`
            : null
        }
      />
      <DetailLayout nav={[{ id: 'pinfo', label: 'PO Information' }, { id: 'pitems', label: 'Line Items', count: po.items.length }, ap && { id: 'papp', label: 'Approval Chain', count: ap.levels.length }, booking && { id: 'pbook', label: 'Booking' }].filter(Boolean)}>
        <Section id="pinfo" title="PO Information">
          <FieldGrid
            fields={[
              ['PO Number', po.number],
              ['Status', <PoBadge po={po} />],
              ['Buyer', po.buyerName],
              ['Buyer GSTIN', org ? org.gstin : (state.partners.find((p) => p.id === po.buyerId) || {}).gstin],
              ['Vendor', vendor.name],
              ['Vendor GSTIN', vendor.gstin || 'Not registered'],
              [po.buyerKind === 'corporate' ? 'Event' : 'Project', eventTitle(state, po.eventRef)],
              ['Event Date', fmtDate(po.eventDate)],
              ['Payment Terms', po.paymentTerms],
              po.costCenterId && ['Cost Centre', (state.costCenters.find((c) => c.id === po.costCenterId) || {}).name],
              po.rfqId && ['From RFQ', (state.rfqs.find((r) => r.id === po.rfqId) || {}).number],
              ['Raised', `${po.raisedBy} - ${fmtDateTime(po.createdAt)}`],
              po.issuedAt && ['Issued', fmtDateTime(po.issuedAt)],
              po.acceptedAt && ['Accepted by Vendor', fmtDateTime(po.acceptedAt)],
              org && ['Bill To', org.address],
            ]}
          />
        </Section>
        <Section id="pitems" title="Line Items" count={po.items.length}>
          <MiniTable
            rows={po.items}
            columns={[
              { label: 'Description', render: (i) => i.description },
              { label: 'Qty', align: 'right', render: (i) => i.qty },
              { label: 'Rate', align: 'right', render: (i) => inr(i.unitPrice) },
              { label: 'Amount', align: 'right', render: (i) => inr(i.qty * i.unitPrice) },
            ]}
          />
          <div className="stack-s" style={{ maxWidth: 320, marginLeft: 'auto', marginTop: 10 }}>
            {po.discount > 0 && (
              <div className="row between small">
                <span className="muted">Discount</span>
                <span>-{inr(po.discount)}</span>
              </div>
            )}
            <div className="row between small">
              <span className="muted">Taxable value</span>
              <span>{inr(sub)}</span>
            </div>
            <div className="row between small">
              <span className="muted">GST 18% (CGST 9% + SGST 9%)</span>
              <span>{po.gst ? inr(gst) : 'Not applicable'}</span>
            </div>
            <div className="row between">
              <b>PO total</b>
              <b>{inr(po.amount)}</b>
            </div>
          </div>
        </Section>
        {ap && (
          <Section id="papp" title="Approval Chain" count={ap.levels.length} actions={<Badge status={ap.status}>{APPROVAL_LABEL[ap.status]}</Badge>}>
            <MiniTable
              rows={ap.levels.map((l) => ({ ...l, id: 'l' + l.level }))}
              columns={[
                { label: 'Level', render: (l) => 'Level ' + l.level },
                { label: 'Approver', render: (l) => `${l.approverName} (${l.title})` },
                { label: 'Decision', render: (l) => <Badge status={l.status}>{APPROVAL_LABEL[l.status]}</Badge> },
                { label: 'When', render: (l) => (l.at ? fmtDateTime(l.at) : '-') },
                { label: 'Note', render: (l) => l.note || '-' },
              ]}
            />
          </Section>
        )}
        {booking && (
          <Section id="pbook" title="Booking">
            <FieldGrid
              fields={[
                ['Booking', vendorView ? <Link to={'/partner/bookings/' + booking.id} className="zc-link">{booking.number}</Link> : booking.number],
                ['Status', <Badge status={booking.status} />],
                ['Event Date', fmtDate(booking.eventDate)],
                ['Invoice terms', po.paymentTerms],
              ]}
            />
          </Section>
        )}
      </DetailLayout>
      <Modal
        open={decline}
        title="Decline this purchase order?"
        onClose={() => setDecline(false)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.declinePo(po.id, 'Date no longer available');
              setDecline(false);
            }}
          >
            Decline PO
          </Button>
        }
      >
        <p className="small">The buyer is told straight away so they can award the next vendor.</p>
      </Modal>
    </>
  );
}

// ---------- Vendor side: POs received (every partner) + POs issued (planners) ----------
export function PartnerPurchaseOrders() {
  const { state } = useStore();
  const pid = state.partnerId;
  const rows = state.pos.filter((p) => p.partnerId === pid || p.buyerId === pid).map((p) => ({ ...p, dir: p.partnerId === pid ? 'Received' : 'Issued', other: p.partnerId === pid ? p.buyerName : pname(state, p.partnerId) }));
  return (
    <ListView
      module={{ singular: 'Purchase Order', plural: 'Purchase Orders' }}
      rows={rows}
      onRow={(p) => navigate('/partner/purchase-orders/' + p.id)}
      views={[
        { id: 'received', label: 'Received from Buyers', filter: (p) => p.dir === 'Received' },
        { id: 'toaccept', label: 'To Accept', filter: (p) => p.dir === 'Received' && p.status === 'issued' },
        { id: 'issued', label: 'Issued to Vendors', filter: (p) => p.dir === 'Issued' },
        { id: 'all', label: 'All Purchase Orders', filter: () => true },
      ]}
      columns={[
        { key: 'number', label: 'PO Number' },
        { key: 'dir', label: 'Direction' },
        { key: 'other', label: 'Buyer / Vendor' },
        { key: 'title', label: 'Subject' },
        { key: 'status', label: 'Status', render: (p) => <PoBadge po={p} /> },
        { key: 'amount', label: 'Amount', align: 'right', render: (p) => inr(p.amount) },
        { key: 'eventDate', label: 'Event Date', render: (p) => fmtDate(p.eventDate) },
        { key: 'paymentTerms', label: 'Terms' },
      ]}
    />
  );
}

// ---------- Approvals ----------
export function Approvals() {
  const { state, actions } = useStore();
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const [note, setNote] = useState({});
  const all = state.approvals.filter((a) => a.orgId === buyer.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const mine = all.filter((a) => canApprove(state, a));
  const rest = all.filter((a) => !mine.includes(a));
  return (
    <>
      <ModuleHeader title="Approvals" subtitle={mine.length ? `${mine.length} waiting for you` : 'Nothing waiting for you right now.'} />
      <div className="stack">
        {mine.map((a) => {
          const po = state.pos.find((p) => p.id === a.entityId);
          const lvl = a.levels.find((l) => l.status === 'pending');
          return (
            <Section key={a.id} title={a.title} actions={<Badge status="pending">Level {lvl.level} - you</Badge>}>
              <FieldGrid
                fields={[
                  ['Amount', <b>{inr(a.amount)}</b>],
                  ['Requested by', `${a.requestedBy} - ${fmtDateTime(a.requestedAt)}`],
                  po && ['Vendor', pname(state, po.partnerId)],
                  po && [buyer.kind === 'corporate' ? 'Event' : 'Project', eventTitle(state, po.eventRef)],
                  po && po.costCenterId && ['Cost Centre', (state.costCenters.find((c) => c.id === po.costCenterId) || {}).name],
                  ['Chain', a.levels.map((l) => `L${l.level} ${l.approverName}: ${APPROVAL_LABEL[l.status]}`).join(' / ')],
                ]}
              />
              <div className="row gap-s mt-s">
                <input className="input input-sm" placeholder="Note (optional)" value={note[a.id] || ''} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} />
                <button className="zc-btn zc-btn-primary" onClick={() => actions.decideApproval(a.id, 'approved', note[a.id] || 'Approved')}>
                  Approve
                </button>
                <button className="zc-btn" onClick={() => actions.decideApproval(a.id, 'rejected', note[a.id] || 'Rejected')}>
                  Reject
                </button>
                {po && (
                  <Link to={P.pos + '/' + po.id} className="zc-rl-link">
                    View PO
                  </Link>
                )}
              </div>
            </Section>
          );
        })}
        <Section title="All approval requests" count={all.length}>
          <MiniTable
            rows={rest}
            onRow={(a) => navigate(P.pos + '/' + a.entityId)}
            empty="No other requests."
            columns={[
              { label: 'Request', render: (a) => a.title },
              { label: 'Amount', align: 'right', render: (a) => inr(a.amount) },
              { label: 'Chain', render: (a) => a.levels.map((l) => `L${l.level} ${l.approverName.split(' ')[0]}: ${APPROVAL_LABEL[l.status]}`).join(' / ') },
              { label: 'Status', render: (a) => <Badge status={a.status}>{APPROVAL_LABEL[a.status]}</Badge> },
              { label: 'Requested', render: (a) => fmtDate(a.requestedAt) },
            ]}
          />
        </Section>
      </div>
    </>
  );
}

// ---------- Vendor network (preferred vendors) ----------
export function VendorNetwork() {
  const { state, actions } = useStore();
  const buyer = currentBuyer(state);
  const P = b2bPaths(buyer.kind);
  const [add, setAdd] = useState(false);
  const [cat, setCat] = useState('catering');
  const [po, setPo] = useState(null);
  const list = state.preferredVendors.filter((v) => v.buyerId === buyer.id).map((v) => {
    const listing = state.listings.find((l) => l.partnerId === v.partnerId) || {};
    const spend = state.pos.filter((p) => p.buyerId === buyer.id && p.partnerId === v.partnerId && ['accepted', 'fulfilled'].includes(p.status)).reduce((a, p) => a + p.amount, 0);
    return { ...v, listing, spend, orders: state.pos.filter((p) => p.buyerId === buyer.id && p.partnerId === v.partnerId).length };
  });
  const candidates = state.listings.filter((l) => l.category === cat && isListed(state, l) && !list.some((v) => v.partnerId === l.partnerId) && l.partnerId !== buyer.id);
  return (
    <>
      <ModuleHeader title="Vendor Network" subtitle="Vendors you trust, with the rates you agreed. They are invited first on every RFQ." actions={<button className="zc-btn zc-btn-primary" onClick={() => setAdd(true)}>Add Vendor</button>} />
      <div className="zc-list">
        <div className="zc-table-wrap">
          <table className="zc-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Agreed Terms</th>
                <th>Since</th>
                <th>Contract</th>
                <th style={{ textAlign: 'right' }}>Orders</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{pname(state, v.partnerId)}</b>
                    <div className="tiny muted">
                      <Stars value={v.listing.rating || 0} size={10} /> {v.listing.area}
                    </div>
                  </td>
                  <td>{categoryOf(state, v.listing.category).name}</td>
                  <td>{v.terms}</td>
                  <td>{fmtDate(v.since)}</td>
                  <td>{v.contract ? <span className="zc-link">{v.contract}</span> : <span className="muted">-</span>}</td>
                  <td style={{ textAlign: 'right' }}>{v.orders}</td>
                  <td style={{ textAlign: 'right' }}>{inr(v.spend)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                      {!['corp_approver', 'corp_director'].includes(state.role) && (
                        <button className="zc-rl-link" onClick={() => setPo(v)}>
                          Raise PO
                        </button>
                      )}
                      <button className="zc-rl-link" onClick={() => actions.removePreferredVendor(v.id)}>
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={add} title="Add a vendor to your network" onClose={() => setAdd(false)} wide>
        <Field label="Category">
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            {state.categories.filter((c) => !['event_management', 'wedding_planner'].includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="stack-s mt">
          {candidates.map((l) => (
            <div key={l.id} className="row between">
              <span>
                <b>{l.title}</b> <span className="tiny muted">{l.area} - from {inr(l.priceFrom)}</span>
              </span>
              <button className="zc-btn" onClick={() => actions.addPreferredVendor(l.partnerId, 'Listed rates; negotiate on first order')}>
                Add
              </button>
            </div>
          ))}
          {candidates.length === 0 && <p className="muted small">All live vendors in this category are already in your network.</p>}
        </div>
      </Modal>
      {po && <DirectPoModal vendor={po} onClose={() => setPo(null)} onDone={(id) => navigate(P.pos + '/' + id)} />}
    </>
  );
}

// Raise a PO directly to a preferred vendor at agreed rates.
export function DirectPoModal({ vendor, onClose, onDone, preset = {} }) {
  const { state, actions } = useStore();
  const buyer = currentBuyer(state);
  const events = buyer.kind === 'corporate' ? state.corpEvents.filter((e) => e.orgId === buyer.id && e.date >= todayISO()) : state.projects.filter((p) => p.partnerId === buyer.id);
  const [evId, setEvId] = useState(preset.eventId || (events[0] || {}).id || '');
  const ev = events.find((e) => e.id === evId) || {};
  const listing = state.listings.find((l) => l.partnerId === vendor.partnerId) || { packages: [] };
  const [items, setItems] = useState([{ description: (listing.packages[0] || {}).name || 'Service as agreed', qty: 1, unitPrice: (listing.packages[0] || {}).price || 0 }]);
  const setItem = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const total = items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
  return (
    <Modal
      open
      title={`Raise PO to ${pname(state, vendor.partnerId)}`}
      onClose={onClose}
      wide
      footer={
        <Button
          disabled={!evId || !total}
          onClick={() => {
            const id = actions.createDirectPo({
              partnerId: vendor.partnerId, title: `${ev.title} - ${categoryOf(state, listing.category).name}`, eventRef: { type: buyer.kind === 'corporate' ? 'corp_event' : 'project', id: ev.id }, eventDate: ev.date || ev.eventDate, guests: ev.guests,
              items, costCenterId: ev.costCenterId, projectId: buyer.kind === 'planner' ? ev.id : null, parentBookingId: ev.clientBookingId || null, lineId: preset.lineId, notes: `Agreed terms: ${vendor.terms || 'listed rates'}`,
            });
            onClose();
            onDone && onDone(id);
          }}
        >
          Raise PO ({inr(total)} + GST)
        </Button>
      }
    >
      <div className="stack">
        <Field label={buyer.kind === 'corporate' ? 'Event' : 'Project'}>
          <select className="select" value={evId} onChange={(e) => setEvId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} - {fmtDate(e.date || e.eventDate)}
              </option>
            ))}
          </select>
        </Field>
        <div className="small muted">Agreed terms: {vendor.terms || 'Listed rates'}</div>
        {items.map((it, i) => (
          <div key={i} className="row gap-s">
            <input className="input" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} aria-label="Description" />
            <input className="input" style={{ width: 90 }} type="number" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} aria-label="Quantity" />
            <input className="input" style={{ width: 130 }} type="number" value={it.unitPrice} onChange={(e) => setItem(i, 'unitPrice', e.target.value)} aria-label="Rate" />
          </div>
        ))}
        <button className="link small" onClick={() => setItems([...items, { description: '', qty: 1, unitPrice: 0 }])}>
          + Add line
        </button>
      </div>
    </Modal>
  );
}

// ---------- Cost centres ----------
export function CostCenters() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const rows = state.costCenters
    .filter((c) => c.orgId === buyer.id)
    .map((c) => {
      const pos = state.pos.filter((p) => p.costCenterId === c.id);
      const committed = pos.filter((p) => ['issued', 'accepted', 'fulfilled'].includes(p.status)).reduce((a, p) => a + p.amount, 0);
      const pending = pos.filter((p) => p.status === 'pending_approval').reduce((a, p) => a + p.amount, 0);
      const spent = pos.filter((p) => p.status === 'fulfilled').reduce((a, p) => a + p.amount, 0);
      return { ...c, committed, pending, spent, left: c.budget - committed - pending };
    });
  return (
    <>
      <ModuleHeader title="Cost Centres" subtitle="Event budgets by department for FY 2026-27. Committed = issued or accepted POs." />
      <div className="zc-list">
        <div className="zc-table-wrap">
          <table className="zc-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Cost Centre</th>
                <th>Owner</th>
                <th style={{ textAlign: 'right' }}>Annual Budget</th>
                <th style={{ textAlign: 'right' }}>Spent</th>
                <th style={{ textAlign: 'right' }}>Committed</th>
                <th style={{ textAlign: 'right' }}>In Approval</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                <th style={{ width: 160 }}>Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{c.owner}</td>
                  <td style={{ textAlign: 'right' }}>{inr(c.budget)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(c.spent)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(c.committed)}</td>
                  <td style={{ textAlign: 'right' }}>{inr(c.pending)}</td>
                  <td style={{ textAlign: 'right' }} className={c.left < 0 ? 'red' : 'green'}>
                    {inr(c.left)}
                  </td>
                  <td>
                    <div className="progress brand">
                      <span style={{ width: Math.min(100, ((c.committed + c.pending) / (c.budget || 1)) * 100) + '%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---------- Setup pages for the buyer ----------
export function ApprovalRulesPage() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const rules = state.approvalRules.filter((r) => r.orgId === buyer.id);
  return (
    <>
      <p className="muted small">Any RFQ award or PO above these amounts waits for every listed approver, in order. Below the lowest amount, POs go straight to the vendor.</p>
      <MiniTable
        rows={rules}
        columns={[
          { label: 'Rule', render: (r) => r.name },
          { label: 'Applies above', align: 'right', render: (r) => inr(r.above) },
          { label: 'Approvers (in order)', render: (r) => r.levels.map((l) => `L${l.level}: ${l.approverName} (${l.title})`).join(' then ') },
        ]}
      />
    </>
  );
}

export function CompanyProfile() {
  const { state } = useStore();
  const buyer = currentBuyer(state);
  const org = buyer.org;
  const users = state.corpUsers.filter((u) => u.orgId === org.id);
  return (
    <>
      <FieldGrid
        fields={[
          ['Company', org.name],
          ['GSTIN', org.gstin],
          ['PAN', org.pan],
          ['Billing address', org.address],
          ['Accounts payable', org.billingEmail],
          ['Credit terms with vendors', `Net ${org.creditDays} days after event`],
          ['PO number format', `PO/${org.poPrefix}/26-27/0001`],
          ['Employees', org.employees],
        ]}
      />
      <div className="zc-section-sub">Users</div>
      <MiniTable
        rows={users}
        columns={[
          { label: 'Name', render: (u) => u.name },
          { label: 'Title', render: (u) => u.title },
          { label: 'Role', render: (u) => (u.role === 'approver' ? 'Approver' : 'Requester (raises RFQs and POs)') },
          { label: 'Phone', render: (u) => u.phone },
        ]}
      />
    </>
  );
}

// ---------- Planner projects (inside the planner's Partner CRM) ----------
export function Projects() {
  const { state } = useStore();
  const rows = state.projects
    .filter((p) => p.partnerId === state.partnerId)
    .map((p) => {
      const committed = p.budgetLines.reduce((a, bl) => a + ((bl.subBookingId && (state.bookings.find((b) => b.id === bl.subBookingId) || {}).total) || 0), 0);
      const fee = (state.bookings.find((b) => b.id === p.clientBookingId) || {}).total || 0;
      return { ...p, committed, fee, lines: p.budgetLines.length, booked: p.budgetLines.filter((bl) => bl.subBookingId).length };
    });
  return (
    <ListView
      module={{ singular: 'Project', plural: 'Projects' }}
      rows={rows}
      onRow={(p) => navigate('/partner/projects/' + p.id)}
      views={[
        { id: 'active', label: 'Active Projects', filter: (p) => p.status !== 'completed' },
        { id: 'all', label: 'All Projects', filter: () => true },
      ]}
      columns={[
        { key: 'title', label: 'Project' },
        { key: 'clientName', label: 'Client' },
        { key: 'eventDate', label: 'Event Date', render: (p) => fmtDate(p.eventDate) },
        { key: 'guests', label: 'Guests', align: 'right' },
        { key: 'booked', label: 'Vendors Booked', render: (p) => `${p.booked} of ${p.lines}` },
        { key: 'clientBudget', label: 'Client Budget', align: 'right', render: (p) => inr(p.clientBudget) },
        { key: 'committed', label: 'Committed to Vendors', align: 'right', render: (p) => inr(p.committed) },
        { key: 'fee', label: 'Our Fee', align: 'right', render: (p) => inr(p.fee) },
        { key: 'manager', label: 'Manager' },
      ]}
    />
  );
}

export function ProjectDetail({ id }) {
  const { state, actions } = useStore();
  const [po, setPo] = useState(null);
  const p = state.projects.find((x) => x.id === id && x.partnerId === state.partnerId);
  if (!p) return <Empty title="Project not found" />;
  const client = state.bookings.find((b) => b.id === p.clientBookingId);
  const lines = p.budgetLines.map((bl) => {
    const sub = bl.subBookingId && state.bookings.find((b) => b.id === bl.subBookingId);
    const rfq = bl.rfqId && state.rfqs.find((r) => r.id === bl.rfqId);
    const linePo = (bl.poId && state.pos.find((x) => x.id === bl.poId)) || (sub && sub.poId && state.pos.find((x) => x.id === sub.poId));
    const actual = sub ? sub.total : linePo && !['cancelled', 'rejected'].includes(linePo.status) ? linePo.amount : 0;
    return { ...bl, sub, rfq, po: linePo, actual, vendor: sub ? pname(state, sub.partnerId) : linePo ? pname(state, linePo.partnerId) : rfq ? `RFQ ${rfq.number} (${rfq.invites.filter((i) => i.status === 'responded').length} quotes)` : null };
  });
  const budget = lines.reduce((a, l) => a + (l.budget || 0), 0);
  const actual = lines.reduce((a, l) => a + l.actual, 0);
  const fee = client ? client.total : 0;
  const preferred = state.preferredVendors.filter((v) => v.buyerId === state.partnerId);
  return (
    <>
      <RecordHeader back="/partner/projects" title={p.title} subtitle={`${p.clientName} - ${fmtDate(p.eventDate)} - ${p.area} - ${p.guests} guests`} owner={p.manager} badges={<Badge status={p.status} />} actions={<Link to={'/partner/rfqs/new?project=' + p.id} className="zc-btn zc-btn-primary">Send RFQ</Link>} />
      <BlueprintBar
        state={p.status.charAt(0).toUpperCase() + p.status.slice(1).replace('_', ' ')}
        transitions={[
          p.status === 'planning' && { label: 'Start Execution', onClick: () => actions.setProjectStatus(p.id, 'in_progress') },
          p.status === 'in_progress' && { label: 'Mark Completed', primary: true, onClick: () => actions.setProjectStatus(p.id, 'completed') },
        ].filter(Boolean)}
        note={`${lines.filter((l) => l.sub).length} of ${lines.length} vendors booked`}
      />
      <DetailLayout nav={[{ id: 'pjinfo', label: 'Project Information' }, { id: 'lines', label: 'Budget vs Actual', count: lines.length }]}>
        <Section id="pjinfo" title="Project Information">
          <FieldGrid
            fields={[
              ['Client', p.clientName],
              ['Phone', p.clientPhone],
              ['Client booking', client ? <Link to={'/partner/bookings/' + client.id} className="zc-link">{client.number}</Link> : '-'],
              ['Event Date', fmtDate(p.eventDate)],
              ['Client budget (vendors + fee)', inr(p.clientBudget)],
              ['Our planning fee', inr(fee)],
              ['Vendor budget planned', inr(budget)],
              ['Committed to vendors', <b className={actual > budget ? 'red' : ''}>{inr(actual)}</b>],
              ['Headroom left for client', <b className={p.clientBudget - actual - fee < 0 ? 'red' : 'green'}>{inr(p.clientBudget - actual - fee)}</b>],
            ]}
          />
        </Section>
        <Section id="lines" title="Budget vs Actual" count={lines.length}>
          <MiniTable
            rows={lines}
            columns={[
              { label: 'Category', render: (l) => categoryOf(state, l.category).name },
              {
                label: 'Budget',
                align: 'right',
                render: (l) => <input className="input input-sm right" style={{ width: 110 }} type="number" value={l.budget} onChange={(e) => actions.updateBudgetLine(p.id, l.id, { budget: Number(e.target.value) || 0 })} aria-label={'Budget for ' + l.category} />,
              },
              { label: 'Vendor', render: (l) => l.vendor || <span className="muted">Not sourced</span> },
              { label: 'Status', render: (l) => (l.sub ? <Badge status={l.sub.status} /> : l.po ? <PoBadge po={l.po} /> : l.rfq ? <RfqBadge rfq={l.rfq} /> : <Badge tone="gray">Open</Badge>) },
              { label: 'Actual', align: 'right', render: (l) => (l.actual ? inr(l.actual) : '-') },
              { label: 'Variance', align: 'right', render: (l) => (l.actual ? <span className={l.actual > l.budget ? 'red' : 'green'}>{inr(l.budget - l.actual)}</span> : '-') },
              {
                label: '',
                align: 'right',
                render: (l) =>
                  l.sub ? (
                    <Link to={'/partner/purchase-orders/' + (l.po ? l.po.id : '')} className="zc-rl-link">
                      PO
                    </Link>
                  ) : l.rfq ? (
                    <Link to={'/partner/rfqs/' + l.rfq.id} className="zc-rl-link">
                      Compare quotes
                    </Link>
                  ) : l.po ? null : (
                    <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                      <Link to={`/partner/rfqs/new?project=${p.id}&cat=${l.category}`} className="zc-rl-link">
                        RFQ
                      </Link>
                      {preferred.some((v) => (state.listings.find((x) => x.partnerId === v.partnerId) || {}).category === l.category) && (
                        <button className="zc-rl-link" onClick={() => setPo({ line: l, vendor: preferred.find((v) => (state.listings.find((x) => x.partnerId === v.partnerId) || {}).category === l.category) })}>
                          PO to preferred
                        </button>
                      )}
                    </span>
                  ),
              },
            ]}
          />
          <div className="row between mt-s small">
            <span className="muted">Totals</span>
            <span>
              Budget <b>{inr(budget)}</b> - Actual <b>{inr(actual)}</b> - Variance <b className={actual > budget ? 'red' : 'green'}>{inr(budget - actual)}</b>
            </span>
          </div>
        </Section>
      </DetailLayout>
      {po && <DirectPoModal vendor={po.vendor} preset={{ eventId: p.id, lineId: po.line.id }} onClose={() => setPo(null)} onDone={(pid) => navigate('/partner/purchase-orders/' + pid)} />}
    </>
  );
}

export function PlannerNoAccess() {
  return (
    <Empty icon="lock" title="Projects are part of the Planner pack">
      Switch the demo business to Royal Events Co. or Shubh Wedding Planners to plan events with sub-vendors.
    </Empty>
  );
}

