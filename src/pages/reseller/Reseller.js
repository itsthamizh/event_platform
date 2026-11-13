// Partner (reseller) console. A partner buys products from Vizha and runs several businesses
// (sub-organizations) under its parent organization, e.g. 4 photography studios.
// Each sub-organization is its own business; the partner oversees all of them.
import { useState } from 'react';
import { fmtDate, inr } from '../../config';
import { navigate } from '../../router';
import { LEAD_STAGE_LABEL, invoiceTotals, useStore } from '../../store';
import { Badge, Button, Card, Field, Icon, Modal, Tabs } from '../../components/ui';
import { Kpis, MiniTable, ModuleHeader, Welcome } from '../../components/crm';
import { listingStatus } from '../../lifecycle';
import { orgBusinesses, resellerAccount, subOrgs } from '../../accounts';
import { CORE_PRODUCTS } from '../partner/Products';

const catOf = (state, id) => state.categories.find((c) => c.id === id) || { name: id, icon: 'grid' };
const LIVE = { live: ['green', 'Live'], draft: ['amber', 'In review'], hidden: ['gray', 'Hidden'], blocked: ['red', 'Blocked'] };

const orgStats = (state, acc) => {
  const biz = orgBusinesses(state, acc.id);
  const ids = biz.map((p) => p.id);
  const leads = state.leads.filter((l) => ids.includes(l.partnerId));
  const bookings = state.bookings.filter((b) => ids.includes(b.partnerId) && b.status !== 'cancelled');
  const invoices = state.invoices.filter((i) => ids.includes(i.partnerId));
  return {
    biz,
    open: leads.filter((l) => !['won', 'lost'].includes(l.status)).length,
    upcoming: bookings.filter((b) => ['accepted', 'booked'].includes(b.status)).length,
    collected: invoices.reduce((a, i) => a + invoiceTotals(i).paid, 0),
    due: invoices.reduce((a, i) => a + invoiceTotals(i).due, 0),
    branches: (state.branches || []).filter((b) => ids.includes(b.partnerId) && b.status === 'active').length,
  };
};

export function ResellerHome() {
  const { state, actions } = useStore();
  const me = resellerAccount(state);
  const orgs = subOrgs(state, me.id);
  const rows = orgs.map((a) => ({ ...a, ...orgStats(state, a) }));
  const sum = (k) => rows.reduce((t, r) => t + r[k], 0);
  const requests = (state.productRequests || []).filter((r) => r.to === 'reseller' && r.status === 'pending' && orgs.some((o) => o.id === r.accountId));
  const [creating, setCreating] = useState(false);
  const open = (a) => {
    const biz = orgBusinesses(state, a.id).find((p) => p.productStatus !== 'disabled');
    if (!biz) return;
    actions.manageSubOrg(biz.id);
    navigate('/partner');
  };
  return (
    <>
      <Welcome name={me.ownerName} initials={me.name.split(' ').map((w) => w[0]).join('').slice(0, 2)} homeLabel={me.name} />
      <Kpis
        items={[
          { label: 'Businesses', value: `${orgs.length} of ${me.maxSubOrgs || 10}`, to: '/reseller/orgs' },
          { label: 'Open Leads', value: sum('open') },
          { label: 'Upcoming Bookings', value: sum('upcoming') },
          { label: 'Collected (all businesses)', value: inr(sum('collected')) },
        ]}
      />
      <div className="stack mt">
        <Card
          title="Your businesses"
          subtitle="Click a business to see its leads, bookings, payments and team here. Use Open CRM to work inside it with owner rights."
          actions={<Button size="sm" icon="plus" onClick={() => setCreating(true)}>New business</Button>}
          pad={false}
        >
          <MiniTable
            rows={rows}
            onRow={(a) => navigate('/reseller/orgs/' + a.id)}
            columns={[
              { label: 'Business', render: (a) => <b>{a.name}</b> },
              { label: 'Owner', render: (a) => a.ownerName || '-' },
              { label: 'Products', render: (a) => <span className="row gap-xs wrap">{a.biz.map((p) => <Badge key={p.id} tone={p.productStatus === 'disabled' ? 'gray' : 'brand'}>{catOf(state, p.category).name}</Badge>)}</span> },
              { label: 'Listing', render: (a) => { const st = LIVE[listingStatus(a.biz[0])] || LIVE.hidden; return a.biz[0] ? <Badge tone={st[0]}>{st[1]}</Badge> : '-'; } },
              { label: 'Branches', align: 'right', render: (a) => a.branches },
              { label: 'Open Leads', align: 'right', render: (a) => a.open },
              { label: 'Upcoming', align: 'right', render: (a) => a.upcoming },
              { label: 'Collected', align: 'right', render: (a) => inr(a.collected) },
              { label: '', render: (a) => (a.status !== 'active' ? <Badge tone="red">Suspended</Badge> : <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); open(a); }} title="Work inside this business's CRM">Open CRM</Button>) },
            ]}
          />
        </Card>
        <div className="grid grid-2">
          <Card title="Products from Zoho for Vizhaa" subtitle="Your businesses can use only these. Ask Zoho for Vizhaa to enable more.">
            <div className="chips">
              {CORE_PRODUCTS.map((c) => (
                <span key={c} className={'chip ' + ((me.enabledProducts || []).includes(c) ? 'active' : '')}>
                  <Icon name={catOf(state, c).icon} size={13} /> {catOf(state, c).name}
                </span>
              ))}
            </div>
          </Card>
          <Card title="Requests from your businesses">
            {requests.length === 0 ? (
              <p className="small muted">No pending requests.</p>
            ) : (
              <div className="stack-s">
                {requests.map((r) => (
                  <div key={r.id} className="row between wrap gap-s">
                    <span>
                      <b>{(orgs.find((o) => o.id === r.accountId) || {}).name}</b> wants {catOf(state, r.category).name}
                      <div className="tiny muted">{fmtDate(r.at.slice(0, 10))}</div>
                    </span>
                    <span className="row gap-s">
                      <Button size="sm" disabled={!(me.enabledProducts || []).includes(r.category)} onClick={() => actions.decideProductRequest(r.id, true)}>
                        Enable
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => actions.decideProductRequest(r.id, false)}>
                        Decline
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <NewSubOrg open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

export function ResellerOrgs() {
  const { state, actions } = useStore();
  const me = resellerAccount(state);
  const orgs = subOrgs(state, me.id);
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack">
      <ModuleHeader title="Businesses" subtitle={`Sub-organizations of ${me.name}. Turn products on or off for each one from the products Zoho for Vizhaa enabled for you.`} actions={<Button icon="plus" onClick={() => setCreating(true)}>New business</Button>} />
      {orgs.map((a) => {
        const biz = orgBusinesses(state, a.id);
        return (
          <Card key={a.id} title={<button className="link" onClick={() => navigate('/reseller/orgs/' + a.id)}>{a.name}</button>} subtitle={`Owner ${a.ownerName || '-'} ${a.ownerPhone ? '- ' + a.ownerPhone : ''} - ${a.city}`}>
            <div className="chips">
              {(me.enabledProducts || []).map((c) => {
                const on = (a.enabledProducts || []).includes(c) && biz.some((p) => p.category === c && p.productStatus !== 'disabled');
                return (
                  <button key={c} className={'chip ' + (on ? 'active' : '')} onClick={() => actions.setProductEnabled(a.id, c, !on, me.name)} title={on ? 'Turn off' : 'Turn on'}>
                    <Icon name={catOf(state, c).icon} size={13} /> {catOf(state, c).name} {on ? 'on' : 'off'}
                  </button>
                );
              })}
            </div>
            <div className="row gap-s mt">
              {biz
                .filter((p) => p.productStatus !== 'disabled')
                .map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      actions.manageSubOrg(p.id);
                      navigate('/partner');
                    }}
                  >
                    Open {catOf(state, p.category).name}
                  </Button>
                ))}
            </div>
          </Card>
        );
      })}
      <NewSubOrg open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewSubOrg({ open, onClose }) {
  const { state, actions } = useStore();
  const me = resellerAccount(state);
  const used = subOrgs(state, me.id).length;
  const blank = { name: '', ownerName: '', ownerPhone: '', area: '', city: 'Chennai', category: (me.enabledProducts || [])[0] || 'photography', gstin: '' };
  const [f, setF] = useState(blank);
  const full = used >= (me.maxSubOrgs || 10);
  return (
    <Modal
      open={open}
      title="New business"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={full || !f.name.trim() || !f.ownerName.trim()}
            onClick={() => {
              actions.createSubOrg({ ...f, name: f.name.trim(), ownerName: f.ownerName.trim() });
              setF(blank);
              onClose();
            }}
          >
            Create
          </Button>
        </>
      }
    >
      {full && <p className="notice">You have used all {me.maxSubOrgs} businesses in your plan. Ask Zoho for Vizhaa to raise the limit.</p>}
      <div className="grid grid-2">
        <Field label="Business name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Click Studio Tambaram" />
        </Field>
        <Field label="Product">
          <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {(me.enabledProducts || []).map((c) => (
              <option key={c} value={c}>
                {catOf(state, c).name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner name">
          <input className="input" value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} />
        </Field>
        <Field label="Owner phone">
          <input className="input" value={f.ownerPhone} onChange={(e) => setF({ ...f, ownerPhone: e.target.value })} />
        </Field>
        <Field label="Area">
          <input className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
        </Field>
        <Field label="City">
          <input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
      </div>
      <Field label="GSTIN (optional)">
        <input className="input" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
      </Field>
      <p className="small muted">The owner gets their own login. You can open the business any time from your console.</p>
    </Modal>
  );
}

// One business seen from the partner console: everything at a glance without leaving the Partner Hub.
export function ResellerOrgDetail({ id }) {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('overview');
  const me = resellerAccount(state);
  const acc = (state.accounts || []).find((a) => a.id === id && a.parentId === me.id);
  if (!acc) return <p className="muted">This business is not under {me.name}.</p>;
  const st = orgStats(state, acc);
  const ids = st.biz.map((p) => p.id);
  const leads = state.leads.filter((l) => ids.includes(l.partnerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bookings = state.bookings.filter((b) => ids.includes(b.partnerId)).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const invoices = state.invoices.filter((i) => ids.includes(i.partnerId));
  const team = state.members.filter((m) => ids.includes(m.partnerId) && m.status !== 'removed');
  const branches = (state.branches || []).filter((b) => ids.includes(b.partnerId));
  const reviews = state.reviews.filter((r) => state.listings.some((l) => ids.includes(l.partnerId) && l.id === r.listingId) && r.status === 'published');
  const rating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '-';
  const leadName = (b) => (state.leads.find((l) => l.id === b.leadId) || {}).contactName || b.buyerOrgName || '-';
  const biz = st.biz.find((p) => p.productStatus !== 'disabled');
  const openCrm = () => {
    if (!biz) return;
    actions.manageSubOrg(biz.id);
    navigate('/partner');
  };
  return (
    <div className="stack">
      <ModuleHeader
        title={acc.name}
        subtitle={`Owner ${acc.ownerName || '-'}${acc.ownerPhone ? ' - ' + acc.ownerPhone : ''} - ${acc.city} - ${st.biz.map((p) => catOf(state, p.category).name).join(', ')}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/reseller')}>All businesses</Button>
            {acc.status === 'active' && biz && <Button icon="eye" onClick={openCrm}>Open CRM</Button>}
          </>
        }
      />
      <Kpis
        items={[
          { label: 'Open Leads', value: st.open },
          { label: 'Upcoming Bookings', value: st.upcoming },
          { label: 'Collected', value: inr(st.collected) },
          { label: 'Pending', value: inr(st.due) },
          { label: 'Rating', value: rating + (reviews.length ? ` (${reviews.length})` : '') },
        ]}
      />
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'leads', label: 'Leads', count: leads.length },
          { id: 'bookings', label: 'Bookings', count: bookings.length },
          { id: 'payments', label: 'Payments', count: invoices.length },
          { id: 'team', label: 'Team', count: team.length },
          { id: 'branches', label: 'Branches', count: branches.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'overview' && (
        <div className="grid grid-2">
          <Card title="Products">
            <div className="chips">
              {(me.enabledProducts || []).map((c) => {
                const on = (acc.enabledProducts || []).includes(c) && st.biz.some((p) => p.category === c && p.productStatus !== 'disabled');
                return (
                  <button key={c} className={'chip ' + (on ? 'active' : '')} onClick={() => actions.setProductEnabled(acc.id, c, !on, me.name)}>
                    <Icon name={catOf(state, c).icon} size={13} /> {catOf(state, c).name} {on ? 'on' : 'off'}
                  </button>
                );
              })}
            </div>
            <div className="stack-s mt">
              {st.biz.map((p) => {
                const ls = LIVE[listingStatus(p)] || LIVE.hidden;
                return (
                  <div key={p.id} className="row between">
                    <span>
                      <b>{p.name}</b> <span className="small muted">{catOf(state, p.category).name}</span>
                    </span>
                    <span className="row gap-s">
                      <Badge tone={p.productStatus === 'disabled' ? 'gray' : ls[0]}>{p.productStatus === 'disabled' ? 'Off' : ls[1]}</Badge>
                      <a className="link small" href={'#/vendor/' + ((state.listings.find((l) => l.partnerId === p.id) || {}).id || '')}>Public listing</a>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Coming up">
            <MiniTable
              rows={bookings.filter((b) => ['accepted', 'booked'].includes(b.status)).slice(0, 6)}
              empty="No upcoming bookings"
              columns={[
                { label: 'Booking', render: (b) => b.number },
                { label: 'Customer', render: leadName },
                { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
                { label: 'Amount', align: 'right', render: (b) => inr(b.total) },
              ]}
            />
          </Card>
        </div>
      )}
      {tab === 'leads' && (
        <Card pad={false}>
          <MiniTable
            rows={leads}
            columns={[
              { label: 'Lead', render: (l) => (l.buyer ? `${l.buyer.orgName} (${l.contactName})` : l.contactName) },
              { label: 'Event', render: (l) => l.eventType },
              { label: 'Event Date', render: (l) => fmtDate(l.eventDate) },
              { label: 'Status', render: (l) => <Badge status={l.status}>{LEAD_STAGE_LABEL[l.status]}</Badge> },
              { label: 'Owner', render: (l) => (state.members.find((m) => m.id === l.assignedTo) || {}).name || '-' },
              { label: 'Created', render: (l) => fmtDate(l.createdAt.slice(0, 10)) },
            ]}
          />
        </Card>
      )}
      {tab === 'bookings' && (
        <Card pad={false}>
          <MiniTable
            rows={bookings}
            columns={[
              { label: 'Booking', render: (b) => b.number },
              { label: 'Customer', render: leadName },
              { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
              { label: 'Status', render: (b) => <Badge status={b.status} /> },
              { label: 'Amount', align: 'right', render: (b) => inr(b.total) },
            ]}
          />
        </Card>
      )}
      {tab === 'payments' && (
        <Card pad={false}>
          <MiniTable
            rows={invoices}
            columns={[
              { label: 'Invoice', render: (i) => i.number },
              { label: 'Bill To', render: (i) => i.billTo },
              { label: 'Total', align: 'right', render: (i) => inr(invoiceTotals(i).total) },
              { label: 'Paid', align: 'right', render: (i) => inr(invoiceTotals(i).paid) },
              { label: 'Due', align: 'right', render: (i) => inr(invoiceTotals(i).due) },
              { label: 'Status', render: (i) => <Badge status={invoiceTotals(i).status} /> },
            ]}
          />
        </Card>
      )}
      {tab === 'team' && (
        <Card pad={false}>
          <MiniTable
            rows={team}
            columns={[
              { label: 'Name', render: (m) => <b>{m.name}</b> },
              { label: 'Title', render: (m) => m.title },
              { label: 'Role', render: (m) => <span style={{ textTransform: 'capitalize' }}>{m.role}</span> },
              { label: 'Phone', render: (m) => m.phone },
              { label: 'Status', render: (m) => <Badge status={m.status} /> },
            ]}
          />
        </Card>
      )}
      {tab === 'branches' && (
        <Card pad={false}>
          <MiniTable
            rows={branches}
            columns={[
              { label: 'Branch', render: (b) => <b>{b.name}</b> },
              { label: 'Area / city', render: (b) => `${b.area || '-'}, ${b.city}` },
              { label: 'Leads', align: 'right', render: (b) => leads.filter((l) => l.branchId === b.id).length },
              { label: 'Bookings', align: 'right', render: (b) => bookings.filter((x) => x.branchId === b.id).length },
              { label: 'Status', render: (b) => (b.isMain ? <Badge tone="brand">Main</Badge> : <Badge tone={b.status === 'active' ? 'green' : 'gray'}>{b.status === 'active' ? 'Open' : 'Closed'}</Badge>) },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
