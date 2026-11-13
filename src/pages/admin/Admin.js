import { useState } from 'react';
import { fmtDate, inr, inrShort } from '../../config';
import { useStore } from '../../store';
import { listingStatus } from '../../lifecycle';
import { Badge, Button, Card, ColumnChart, Empty, Field, Icon, KeyValue, Modal, Stars, Table, Tabs } from '../../components/ui';
import { categoryOf } from '../../components/Shared';
import { Component, Funnel, Kpis, ListView, ModuleHeader, Welcome } from '../../components/crm';
import { navigate } from '../../router';
import { ANALYTICS } from '../../data/mock';

export function AdminAnalytics() {
  const { state } = useStore();
  const a = ANALYTICS;
  const k = a.kpis;
  const pending = state.partners.filter((p) => p.verification === 'pending');
  const openDisputes = state.disputes.filter((d) => d.status !== 'decided');
  const refunds = state.refunds.filter((r) => r.status === 'requested');
  const holds = state.payouts.filter((p) => p.status !== 'paid');
  return (
    <>
      <Welcome name="Platform Admin" initials="VA" homeLabel="Marketplace Home" />
      <Kpis
        items={[
          { label: 'Active Customers', value: k.customers.toLocaleString('en-IN'), to: '/admin/users' },
          { label: 'Active Partners', value: k.partners.toLocaleString('en-IN'), to: '/admin/partners' },
          { label: 'Bookings (Last 30 Days)', value: k.bookings30d },
          { label: 'GMV (Last 30 Days)', value: inrShort(k.gmv30d) },
        ]}
      />
      <div className="zc-comps">
        <Component
          title="Partners Awaiting Verification"
          rows={pending}
          onRow={() => navigate('/admin/verification')}
          empty="Queue is clear"
          columns={[
            { label: 'Partner Name', render: (p) => p.name },
            { label: 'Category', render: (p) => categoryOf(state, p.category).name },
            { label: 'Signed Up', render: (p) => fmtDate(p.joined) },
            { label: 'Status', render: (p) => <Badge status={p.verification} /> },
          ]}
        />
        <Component title="Bookings By Month">
          <ColumnChart data={a.bookingsByMonth} height={230} />
        </Component>
        <Component
          title="Open Disputes"
          rows={openDisputes}
          onRow={() => navigate('/admin/disputes')}
          empty="No open disputes"
          columns={[
            { label: 'Booking', render: (d) => d.bookingNumber },
            { label: 'Partner', render: (d) => d.partner },
            { label: 'Reason', render: (d) => d.reason },
            { label: 'Status', render: (d) => <Badge status={d.status} /> },
          ]}
        />
        <Component title="Bookings By Category">
          <Funnel data={a.byCategory.slice(0, 6)} />
        </Component>
        <Component
          title="Refund Requests"
          rows={refunds}
          onRow={() => navigate('/admin/payments')}
          empty="No pending refunds"
          columns={[
            { label: 'Booking', render: (r) => r.bookingNumber },
            { label: 'Customer', render: (r) => r.customer },
            { label: 'Amount', align: 'right', render: (r) => inr(r.amount) },
            { label: 'Requested', render: (r) => fmtDate(r.requestedAt) },
          ]}
        />
        <Component
          title="Payouts Not Released"
          rows={holds}
          onRow={() => navigate('/admin/payments')}
          empty="All payouts released"
          columns={[
            { label: 'Partner', render: (p) => p.partner },
            { label: 'Period', render: (p) => p.period },
            { label: 'Net', align: 'right', render: (p) => inr(p.gross - p.commission - p.tds) },
            { label: 'Status', render: (p) => <Badge status={p.status} /> },
          ]}
        />
      </div>
    </>
  );
}

export function Verification() {
  const { state, actions } = useStore();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('Document unclear');
  const pending = state.partners.filter((p) => p.verification === 'pending');
  const recent = state.partners.filter((p) => p.verification !== 'pending').slice(-5).reverse();
  return (
    <>
      <ModuleHeader title="Partner verification" subtitle="Check GST, ID and business proof before a listing goes live." />
      {pending.length === 0 && <Empty icon="shieldCheck" title="Queue is clear" />}
      <div className="stack">
        {pending.map((p) => {
          const docs = state.documents.filter((d) => d.partnerId === p.id);
          return (
            <Card
              key={p.id}
              title={p.name}
              subtitle={`${categoryOf(state, p.category).name} - ${p.city} - signed up ${fmtDate(p.joined)}`}
              actions={
                <>
                  <Button variant="danger" size="sm" onClick={() => setRejecting(p)}>
                    Reject
                  </Button>
                  <Button size="sm" icon="check" onClick={() => actions.verifyPartner(p.id, 'verified')}>
                    Approve
                  </Button>
                </>
              }
            >
              <div className="grid grid-3">
                {docs.map((d) => (
                  <div key={d.type} className="upload">
                    <Icon name="file" className="muted" />
                    <div className="grow">
                      <b className="small">{d.type}</b>
                      <div className="tiny muted">{d.file}</div>
                    </div>
                    <button className="link small">View</button>
                  </div>
                ))}
                {docs.length === 0 && <p className="muted">No documents uploaded.</p>}
              </div>
              <div className="row gap-s mt small">
                <span className="muted">GSTIN:</span> <b>{p.gstin || 'Not provided'}</b>
                {p.gstin && <Badge tone="green">Format valid</Badge>}
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Recently decided" className="mt" pad={false}>
        <Table
          rows={recent}
          columns={[
            { label: 'Partner', key: 'name' },
            { label: 'Category', render: (p) => categoryOf(state, p.category).name },
            { label: 'Status', render: (p) => <Badge status={p.verification} /> },
          ]}
        />
      </Card>
      <Modal
        open={!!rejecting}
        title={rejecting ? 'Reject ' + rejecting.name : ''}
        onClose={() => setRejecting(null)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.verifyPartner(rejecting.id, 'rejected', reason);
              setRejecting(null);
            }}
          >
            Reject and notify
          </Button>
        }
      >
        <Field label="Reason (sent to the partner)">
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Document unclear</option>
            <option>GSTIN does not match business name</option>
            <option>ID proof missing</option>
            <option>Duplicate account</option>
          </select>
        </Field>
      </Modal>
    </>
  );
}

export function AdminPartners() {
  const { state, actions } = useStore();
  const rows = state.listings.map((l) => ({ ...l, partner: state.partners.find((p) => p.id === l.partnerId) }));
  return (
    <ListView
      module={{ singular: 'Partner', plural: 'Partners' }}
      rows={rows}
      views={[
        { id: 'all', label: 'All Partners', filter: () => true },
        { id: 'featured', label: 'Featured Partners', filter: (l) => l.featured },
        { id: 'pastdue', label: 'Subscription Past Due', filter: (l) => ['past_due', 'grace'].includes(l.partner.subscription) },
        { id: 'hidden', label: 'Hidden from App', filter: (l) => listingStatus(l.partner) !== 'live' },
        { id: 'low', label: 'Rating Below 4.5', filter: (l) => l.rating < 4.5 },
        { id: 'suspended', label: 'Suspended', filter: (l) => l.partner.verification === 'suspended' },
      ]}
      filterFields={[
        { key: 'category', label: 'Category', type: 'select', get: (l) => l.category, options: state.categories.map((c) => ({ value: c.id, label: c.name })) },
        { key: 'area', label: 'Area', type: 'select', get: (l) => l.area },
        { key: 'sub', label: 'Subscription', type: 'select', get: (l) => l.partner.subscription },
        { key: 'name', label: 'Partner Name', type: 'text', get: (l) => l.title },
      ]}
      columns={[
        { key: 'title', label: 'Partner Name' },
        { key: 'category', label: 'Category', render: (l) => categoryOf(state, l.category).name },
        { key: 'area', label: 'Area' },
        { key: 'rating', label: 'Rating', render: (l) => <Stars value={l.rating} count={l.ratingCount} /> },
        { key: 'sub', label: 'Subscription', render: (l) => <Badge status={l.partner.subscription} />, sortValue: (l) => l.partner.subscription },
        { key: 'live', label: 'Listing', render: (l) => <Badge status={listingStatus(l.partner)} />, sortValue: (l) => listingStatus(l.partner) },
        { key: 'strikes', label: 'Strikes', align: 'right', render: (l) => state.strikes.filter((x) => x.partnerId === l.partnerId).length || '-', sortValue: (l) => state.strikes.filter((x) => x.partnerId === l.partnerId).length },
        { key: 'ver', label: 'Verification', render: (l) => <Badge status={l.partner.verification} />, sortValue: (l) => l.partner.verification },
        {
          key: 'featured',
          label: 'Featured',
          sortable: false,
          render: (l) => (
            <label className="check" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={!!l.featured} onChange={() => actions.toggleFeatured(l.id)} />
            </label>
          ),
        },
        {
          key: 'act',
          label: '',
          sortable: false,
          render: (l) => (
            <span className="row gap-s" onClick={(e) => e.stopPropagation()}>
              {l.partner.verification === 'suspended' ? (
                <button className="zc-rl-link" onClick={() => actions.verifyPartner(l.partnerId, 'verified')}>Restore</button>
              ) : (
                <button className="zc-rl-link red" onClick={() => actions.verifyPartner(l.partnerId, 'suspended')}>Suspend</button>
              )}
              {['p1', 'p8', 'p4', 'p2', 'p3', 'p6', 'p7', 'p5', 'p9', 'p10', 'p11', 'p12', 'p13'].includes(l.partnerId) && (
                <button
                  className="zc-rl-link"
                  title="Open this partner's CRM to help them (logged)"
                  onClick={() => {
                    actions.impersonate(l.partnerId);
                    navigate('/partner');
                  }}
                >
                  View as partner
                </button>
              )}
            </span>
          ),
        },
      ]}
    />
  );
}

export function AdminUsers() {
  const { state, actions } = useStore();
  const rows = state.users.map((u) => ({ ...u, bookingCount: state.bookings.filter((b) => b.customerId === u.id).length }));
  return (
    <ListView
      module={{ singular: 'Customer', plural: 'Customers' }}
      rows={rows}
      views={[
        { id: 'all', label: 'All Customers', filter: () => true },
        { id: 'booked', label: 'Customers With Bookings', filter: (u) => u.bookingCount > 0 },
        { id: 'blocked', label: 'Blocked Customers', filter: (u) => u.status === 'blocked' },
      ]}
      filterFields={[
        { key: 'status', label: 'Status', type: 'select', get: (u) => u.status },
        { key: 'name', label: 'Name', type: 'text', get: (u) => u.name },
        { key: 'phone', label: 'Phone', type: 'text', get: (u) => u.phone },
      ]}
      columns={[
        { key: 'name', label: 'Customer Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', render: (u) => u.email || '-' },
        { key: 'city', label: 'City' },
        { key: 'joined', label: 'Joined On', render: (u) => fmtDate(u.joined) },
        { key: 'bookingCount', label: 'Bookings', align: 'right' },
        { key: 'status', label: 'Status', render: (u) => <Badge status={u.status} /> },
        {
          key: 'act',
          label: '',
          sortable: false,
          render: (u) => (
            <button className={'zc-rl-link ' + (u.status === 'blocked' ? '' : 'red')} onClick={() => actions.toggleUserBlock(u.id)}>
              {u.status === 'blocked' ? 'Unblock' : 'Block'}
            </button>
          ),
        },
      ]}
    />
  );
}

export function Disputes() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(null);
  const [decision, setDecision] = useState('Full refund');
  const d = open && state.disputes.find((x) => x.id === open);
  return (
    <>
      <ListView
        module={{ singular: 'Dispute', plural: 'Disputes' }}
        rows={state.disputes}
        onRow={(x) => setOpen(x.id)}
        views={[
          { id: 'open', label: 'Open Disputes', filter: (x) => x.status !== 'decided' },
          { id: 'all', label: 'All Disputes', filter: () => true },
          { id: 'decided', label: 'Decided', filter: (x) => x.status === 'decided' },
        ]}
        filterFields={[
          { key: 'status', label: 'Status', type: 'select', get: (x) => x.status },
          { key: 'reason', label: 'Reason', type: 'select', get: (x) => x.reason },
          { key: 'partner', label: 'Partner', type: 'text', get: (x) => x.partner },
        ]}
        columns={[
          { key: 'bookingNumber', label: 'Booking' },
          { key: 'customer', label: 'Customer' },
          { key: 'partner', label: 'Partner' },
          { key: 'reason', label: 'Reason' },
          { key: 'amountClaimed', label: 'Claimed', align: 'right', render: (x) => (x.amountClaimed ? inr(x.amountClaimed) : '-') },
          { key: 'openedAt', label: 'Opened On', render: (x) => fmtDate(x.openedAt) },
          { key: 'status', label: 'Status', render: (x) => <Badge status={x.status} /> },
        ]}
      />
      <Modal
        open={!!d}
        title={d ? `Dispute on ${d.bookingNumber}` : ''}
        onClose={() => setOpen(null)}
        wide
        footer={
          d &&
          d.status !== 'decided' && (
            <>
              {d.status === 'open' && (
                <Button variant="secondary" onClick={() => actions.advanceDispute(d.id)}>
                  Request evidence from partner
                </Button>
              )}
              <Button
                onClick={() => {
                  actions.decideDispute(d.id, decision);
                  setOpen(null);
                }}
              >
                Record decision
              </Button>
            </>
          )
        }
      >
        {d && (
          <div className="stack">
            <KeyValue
              rows={[
                ['Customer', d.customer],
                ['Partner', d.partner],
                ['Reason', d.reason],
                ['Claimed', d.amountClaimed ? inr(d.amountClaimed) : '-'],
                ['Status', <Badge status={d.status} />],
              ]}
            />
            <p>{d.description}</p>
            <h4>Evidence</h4>
            <div className="grid grid-2">
              {['customer', 'partner'].map((side) => (
                <Card key={side} title={side === 'customer' ? 'Customer side' : 'Partner side'}>
                  {d.evidence.filter((e) => e.side === side).length === 0 && <p className="muted small">Nothing submitted yet.</p>}
                  {d.evidence
                    .filter((e) => e.side === side)
                    .map((e, i) => (
                      <div key={i} className="stack-s">
                        <p className="small">{e.note}</p>
                        <span className="chip">
                          <Icon name="file" size={14} /> {e.file}
                        </span>
                      </div>
                    ))}
                </Card>
              ))}
            </div>
            {d.status === 'decided' ? (
              <div className="notice notice-success">
                <Icon name="check" />
                <span>Decision: {d.decision}</span>
              </div>
            ) : (
              <Field label="Decision">
                <select className="select" value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <option>Full refund</option>
                  <option>Partial refund (50%)</option>
                  <option>Warning to partner</option>
                  <option>Suspend partner</option>
                  <option>Reject complaint</option>
                </select>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export function AdminPayments() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('refunds');
  const subs = state.partners.map((p) => ({ id: p.id, name: p.name, status: p.subscription }));
  return (
    <>
      <ModuleHeader title="Refunds and payouts" subtitle="Money in, money out, and subscription revenue." />
      <Tabs
        tabs={[
          { id: 'refunds', label: 'Refunds', count: state.refunds.filter((r) => r.status === 'requested').length },
          { id: 'payouts', label: 'Vendor payouts', count: state.payouts.filter((p) => p.status !== 'paid').length },
          { id: 'subs', label: 'Subscriptions' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Card pad={false} className="mt">
        {tab === 'refunds' && (
          <Table
            rows={state.refunds}
            columns={[
              { label: 'Booking', render: (r) => <b>{r.bookingNumber}</b> },
              { label: 'Customer', key: 'customer' },
              { label: 'Partner', key: 'partner' },
              { label: 'Reason', render: (r) => <span className="small">{r.reason}</span> },
              { label: 'Amount', align: 'right', render: (r) => inr(r.amount) },
              { label: 'Status', render: (r) => <Badge status={r.status} /> },
              {
                label: '',
                align: 'right',
                render: (r) =>
                  r.status === 'requested' && (
                    <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" onClick={() => actions.setRefundStatus(r.id, 'rejected')}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => actions.setRefundStatus(r.id, 'processed')}>
                        Approve
                      </Button>
                    </span>
                  ),
              },
            ]}
          />
        )}
        {tab === 'payouts' && (
          <Table
            rows={state.payouts}
            columns={[
              { label: 'Partner', render: (p) => <b>{p.partner}</b> },
              { label: 'Period', key: 'period' },
              { label: 'Gross', align: 'right', render: (p) => inr(p.gross) },
              { label: 'Commission', align: 'right', render: (p) => inr(p.commission) },
              { label: 'TDS 1%', align: 'right', render: (p) => inr(p.tds) },
              { label: 'Net', align: 'right', render: (p) => <b>{inr(p.gross - p.commission - p.tds)}</b> },
              { label: 'Status', render: (p) => <span><Badge status={p.status} /> {p.note && <div className="tiny muted">{p.note}</div>}</span> },
              {
                label: '',
                align: 'right',
                render: (p) =>
                  p.status !== 'paid' && (
                    <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                      {p.status !== 'on_hold' && (
                        <Button size="sm" variant="ghost" onClick={() => actions.setPayoutStatus(p.id, 'on_hold')}>
                          Hold
                        </Button>
                      )}
                      <Button size="sm" onClick={() => actions.setPayoutStatus(p.id, 'paid')}>
                        Release
                      </Button>
                    </span>
                  ),
              },
            ]}
          />
        )}
        {tab === 'subs' && (
          <Table
            rows={subs}
            columns={[
              { label: 'Partner', key: 'name' },
              { label: 'Plan', render: () => 'Partner Basic - ' + inr(199) },
              { label: 'Status', render: (s) => <Badge status={s.status} /> },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export function ReviewModeration() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('reported');
  const list = state.reviews.filter((r) => (tab === 'reported' ? r.status === 'reported' : tab === 'hidden' ? r.status === 'hidden' : true));
  return (
    <>
      <ModuleHeader title="Review moderation" subtitle="Reported and suspicious reviews. Only reviews from completed bookings are marked verified." />
      <Tabs
        tabs={[
          { id: 'reported', label: 'Reported', count: state.reviews.filter((r) => r.status === 'reported').length },
          { id: 'hidden', label: 'Hidden' },
          { id: 'all', label: 'All' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="stack mt">
        {list.length === 0 && <Empty title="Nothing to review" />}
        {list.map((r) => {
          const l = state.listings.find((x) => x.id === r.listingId);
          return (
            <Card
              key={r.id}
              title={`${r.customerName} on ${l.title}`}
              subtitle={`${fmtDate(r.at)} - ${r.bookingId ? 'Verified booking' : 'No booking linked'}`}
              actions={
                <>
                  <Badge status={r.status} />
                  {r.status !== 'hidden' && (
                    <Button size="sm" variant="danger" onClick={() => actions.moderateReview(r.id, 'hidden')}>
                      Hide
                    </Button>
                  )}
                  {r.status !== 'published' && (
                    <Button size="sm" variant="secondary" onClick={() => actions.moderateReview(r.id, 'published')}>
                      Keep published
                    </Button>
                  )}
                </>
              }
            >
              <Stars value={r.rating} />
              <h4 className="mt-s">{r.title}</h4>
              <p className="muted">{r.body}</p>
              {r.reportReason && (
                <div className="notice notice-warning mt">
                  <Icon name="flag" />
                  <span>Reported: {r.reportReason}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function Content() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('articles');
  return (
    <>
      <ModuleHeader title="Content" subtitle="Event ideas, guides, banners and categories shown in the customer app." actions={<Button icon="plus">New {tab === 'articles' ? 'article' : tab === 'banners' ? 'banner' : 'category'}</Button>} />
      <Tabs tabs={[{ id: 'articles', label: 'Ideas and guides' }, { id: 'banners', label: 'Banners' }, { id: 'categories', label: 'Categories' }]} value={tab} onChange={setTab} />
      <Card pad={false} className="mt">
        {tab === 'articles' && (
          <Table
            rows={state.articles}
            columns={[
              { label: 'Title', render: (a) => <b>{a.title}</b> },
              { label: 'Category', key: 'category' },
              { label: 'Read time', render: (a) => a.read + ' min' },
              { label: 'Status', render: (a) => <Badge status={a.status} /> },
              {
                label: '',
                align: 'right',
                render: (a) => (
                  <Button size="sm" variant="secondary" onClick={() => actions.toggleArticle(a.id)}>
                    {a.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                ),
              },
            ]}
          />
        )}
        {tab === 'banners' && (
          <Table
            rows={state.banners}
            columns={[
              { label: 'Banner', render: (b) => <b>{b.title}</b> },
              { label: 'Placement', key: 'placement' },
              { label: 'Ends', render: (b) => fmtDate(b.ends) },
              { label: 'Status', render: (b) => <Badge status={b.status} /> },
            ]}
          />
        )}
        {tab === 'categories' && (
          <Table
            rows={state.categories}
            columns={[
              { label: 'Category', render: (c) => <span className="row gap-s"><span className="cat-icon" style={{ width: 30, height: 30 }}><Icon name={c.icon} size={14} /></span><b>{c.name}</b></span> },
              { label: 'Slug', key: 'id' },
              { label: 'Listings', render: (c) => state.listings.filter((l) => l.category === c.id).length },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export function Settings() {
  const { state, actions } = useStore();
  const s = state.settings;
  const [tab, setTab] = useState('general');
  return (
    <>
      <ModuleHeader title="Platform settings" subtitle="Pricing, cities, policies, taxes and notification templates." />
      <Tabs tabs={[{ id: 'general', label: 'Fees and taxes' }, { id: 'cities', label: 'Cities' }, { id: 'plans', label: 'Plans' }, { id: 'policy', label: 'Cancellation policy' }, { id: 'templates', label: 'Notifications' }]} value={tab} onChange={setTab} />
      <div className="mt">
        {tab === 'general' && (
          <Card>
            <div className="grid grid-2">
              <Field label="Booking commission (%)" hint="0 = subscription-only model">
                <input className="input" type="number" value={s.commissionPct} onChange={(e) => actions.updateSettings({ commissionPct: Number(e.target.value) })} />
              </Field>
              <Field label="GST on subscription (%)">
                <input className="input" type="number" value={s.gstPct} onChange={(e) => actions.updateSettings({ gstPct: Number(e.target.value) })} />
              </Field>
              <Field label="TDS on payouts (%)" hint="Section 194-O">
                <input className="input" type="number" value={s.tdsPct} onChange={(e) => actions.updateSettings({ tdsPct: Number(e.target.value) })} />
              </Field>
              <Field label="Payout hold after event (days)">
                <input className="input" type="number" value={s.payoutHoldDays} onChange={(e) => actions.updateSettings({ payoutHoldDays: Number(e.target.value) })} />
              </Field>
            </div>
          </Card>
        )}
        {tab === 'cities' && (
          <Card pad={false}>
            <Table
              rows={s.cities.map((c) => ({ ...c, id: c.name }))}
              columns={[
                { label: 'City', render: (c) => <b>{c.name}</b> },
                { label: 'Status', render: (c) => <Badge status={c.active ? 'active' : 'draft'}>{c.active ? 'Live' : 'Not launched'}</Badge> },
                {
                  label: '',
                  align: 'right',
                  render: (c) => (
                    <Button size="sm" variant="secondary" onClick={() => actions.updateSettings({ cities: s.cities.map((x) => (x.name === c.name ? { ...x, active: !x.active } : x)) })}>
                      {c.active ? 'Turn off' : 'Launch'}
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        )}
        {tab === 'plans' && (
          <Card pad={false}>
            <Table
              rows={s.plans.map((p) => ({ ...p, id: p.code }))}
              columns={[
                { label: 'Plan', render: (p) => <b>{p.name}</b> },
                { label: 'Code', key: 'code' },
                { label: 'Price', render: (p) => `${inr(p.price)} / ${p.days} days` },
                { label: 'Team seats', key: 'seats' },
                { label: 'Status', render: (p) => <Badge status={p.active ? 'active' : 'draft'} /> },
              ]}
            />
          </Card>
        )}
        {tab === 'policy' && (
          <Card subtitle="Default policy for customer cancellations. Partner cancellations always refund 100%.">
            <div className="stack-s">
              {s.policy.map((p, i) => (
                <div key={p.window} className="row gap">
                  <span className="grow">{p.window}</span>
                  <input
                    className="input input-sm"
                    type="number"
                    style={{ width: 90 }}
                    value={p.refund}
                    onChange={(e) => actions.updateSettings({ policy: s.policy.map((x, j) => (j === i ? { ...x, refund: Number(e.target.value) } : x)) })}
                  />
                  <span className="muted">% refund</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {tab === 'templates' && (
          <Card pad={false}>
            <Table
              rows={s.templates.map((t) => ({ ...t, id: t.key }))}
              columns={[
                { label: 'Event', render: (t) => <code>{t.key}</code> },
                { label: 'Channel', key: 'channel' },
                { label: 'Message', render: (t) => <span className="small">{t.text}</span> },
              ]}
            />
          </Card>
        )}
      </div>
    </>
  );
}
