// Super Admin: every organization on the platform and which of the 11 products each may use.
//   Direct customer org -> its businesses (one per enabled product)
//   Partner (reseller) org -> sub-organizations, each a business of its own
import { useState } from 'react';
import { fmtDate } from '../../config';
import { navigate } from '../../router';
import { useStore } from '../../store';
import { Badge, Button, Card, Field, Icon, Modal, Tabs } from '../../components/ui';
import { MiniTable, ModuleHeader } from '../../components/crm';
import { listingStatus } from '../../lifecycle';
import { orgBusinesses, subOrgs } from '../../accounts';
import { CORE_PRODUCTS } from '../partner/Products';

const catOf = (state, id) => state.categories.find((c) => c.id === id) || { name: id, icon: 'grid' };
const TYPE = { direct: ['brand', 'Customer'], reseller: ['violet', 'Partner'], sub: ['teal', 'Sub-org'] };

export function Organizations() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('orgs');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const top = (state.accounts || []).filter((a) => !a.parentId && (a.enabledProducts || []).some((c) => CORE_PRODUCTS.includes(c)) && (!q || a.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (a.type === 'reseller' ? 0 : 1) - (b.type === 'reseller' ? 0 : 1));
  const n = (k, one, many) => { const c = (state.accounts || []).filter((a) => a.type === k).length; return `${c} ${c === 1 ? one : many}`; };
  const requests = (state.productRequests || []).filter((r) => r.to === 'admin');
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const rows = [];
  top.forEach((a) => {
    rows.push({ ...a, depth: 0 });
    if (a.type === 'reseller') subOrgs(state, a.id).forEach((c) => rows.push({ ...c, depth: 1 }));
  });
  const accName = (id) => ((state.accounts || []).find((a) => a.id === id) || {}).name || id;
  return (
    <div className="stack">
      <ModuleHeader
        title="Organizations"
        subtitle={`${n('direct', 'customer', 'customers')}, ${n('reseller', 'partner', 'partners')}, ${n('sub', 'sub-organization', 'sub-organizations')}. You decide which products each one can use.`}
        actions={<Button icon="plus" onClick={() => setCreating(true)}>New organization</Button>}
      />
      <Tabs tabs={[{ id: 'orgs', label: 'All organizations' }, { id: 'requests', label: `Product requests${pendingCount ? ` (${pendingCount})` : ''}` }]} value={tab} onChange={setTab} />
      {tab === 'orgs' ? (
        <Card pad={false}>
          <div className="pad-s">
            <input className="input" style={{ maxWidth: 280 }} placeholder="Search organizations" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <MiniTable
            rows={rows}
            onRow={(a) => navigate('/admin/orgs/' + a.id)}
            columns={[
              { label: 'Organization', render: (a) => <span style={{ paddingLeft: a.depth * 22 }}>{a.depth ? '└ ' : ''}<b>{a.name}</b></span> },
              { label: 'Type', render: (a) => <Badge tone={TYPE[a.type][0]}>{TYPE[a.type][1]}</Badge> },
              { label: 'Owner', render: (a) => a.ownerName || '-' },
              { label: 'Products', render: (a) => <span className="row gap-xs wrap">{(a.enabledProducts || []).map((c) => <Badge key={c}>{catOf(state, c).name}</Badge>)}</span> },
              { label: 'Businesses', align: 'right', render: (a) => (a.type === 'reseller' ? subOrgs(state, a.id).length + ' sub-orgs' : orgBusinesses(state, a.id).length) },
              { label: 'Status', render: (a) => <Badge tone={a.status === 'active' ? 'green' : 'red'}>{a.status === 'active' ? 'Active' : 'Suspended'}</Badge> },
            ]}
          />
        </Card>
      ) : (
        <Card pad={false}>
          <MiniTable
            rows={requests}
            empty="No product requests"
            columns={[
              { label: 'Organization', render: (r) => <b>{accName(r.accountId)}</b> },
              { label: 'Product', render: (r) => catOf(state, r.category).name },
              { label: 'Asked by', render: (r) => r.by },
              { label: 'Date', render: (r) => fmtDate(r.at.slice(0, 10)) },
              { label: 'Status', render: (r) => <Badge tone={r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'green' : 'gray'}>{r.status}</Badge> },
              {
                label: '',
                render: (r) =>
                  r.status === 'pending' && (
                    <span className="row gap-s">
                      <Button size="sm" onClick={() => actions.decideProductRequest(r.id, true)}>Enable</Button>
                      <Button size="sm" variant="ghost" onClick={() => actions.decideProductRequest(r.id, false)}>Decline</Button>
                    </span>
                  ),
              },
            ]}
          />
        </Card>
      )}
      <NewOrg open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export function OrgDetail({ id }) {
  const { state, actions } = useStore();
  const acc = (state.accounts || []).find((a) => a.id === id);
  if (!acc) return <p className="muted">Organization not found.</p>;
  const parent = acc.parentId && state.accounts.find((a) => a.id === acc.parentId);
  const biz = orgBusinesses(state, acc.id);
  const children = subOrgs(state, acc.id);
  // A sub-org can only use what its partner has.
  const allowed = parent ? parent.enabledProducts || [] : CORE_PRODUCTS;
  return (
    <div className="stack">
      <ModuleHeader
        title={acc.name}
        subtitle={`${TYPE[acc.type][1]}${parent ? ' of ' + parent.name : ''} - owner ${acc.ownerName || '-'} - ${acc.city}${acc.gstin ? ' - GSTIN ' + acc.gstin : ''}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/admin/orgs')}>All organizations</Button>
            <Button variant={acc.status === 'active' ? 'ghost' : 'primary'} onClick={() => actions.setOrgStatus(acc.id, acc.status === 'active' ? 'suspended' : 'active')}>
              {acc.status === 'active' ? 'Suspend' : 'Reactivate'}
            </Button>
          </>
        }
      />
      <Card title="Enabled products" subtitle={acc.type === 'reseller' ? 'The partner can give these to its sub-organizations.' : 'Only enabled products appear in this organization\'s CRM and on the marketplace. Turning one off hides it but keeps the data.'}>
        <div className="grid grid-4">
          {CORE_PRODUCTS.map((c) => {
            const on = (acc.enabledProducts || []).includes(c);
            const can = allowed.includes(c);
            return (
              <label key={c} className={'org-prod ' + (on ? 'on' : '') + (can ? '' : ' off')}>
                <input type="checkbox" checked={on} disabled={!can} onChange={() => actions.setProductEnabled(acc.id, c, !on)} />
                <Icon name={catOf(state, c).icon} size={15} />
                <span>{catOf(state, c).name}</span>
              </label>
            );
          })}
        </div>
        {parent && <p className="tiny muted mt-s">Greyed-out products are not enabled for {parent.name}.</p>}
      </Card>
      {acc.type === 'reseller' ? (
        <Card title={`Sub-organizations (${children.length} of ${acc.maxSubOrgs || 10})`} pad={false}>
          <MiniTable
            rows={children}
            onRow={(c) => navigate('/admin/orgs/' + c.id)}
            columns={[
              { label: 'Business', render: (c) => <b>{c.name}</b> },
              { label: 'Owner', render: (c) => c.ownerName || '-' },
              { label: 'Products', render: (c) => (c.enabledProducts || []).map((x) => catOf(state, x).name).join(', ') },
              { label: 'Status', render: (c) => <Badge tone={c.status === 'active' ? 'green' : 'red'}>{c.status}</Badge> },
            ]}
          />
        </Card>
      ) : (
        <Card title="Businesses" subtitle="One business per enabled product, each working as its own app." pad={false}>
          <MiniTable
            rows={biz}
            columns={[
              { label: 'Business', render: (p) => <b>{p.name}</b> },
              { label: 'Product', render: (p) => catOf(state, p.category).name },
              { label: 'Branches', align: 'right', render: (p) => (state.branches || []).filter((b) => b.partnerId === p.id).length },
              { label: 'Listing', render: (p) => (p.productStatus === 'disabled' ? <Badge tone="gray">Disabled</Badge> : <Badge status={listingStatus(p) === 'live' ? 'active' : 'pending'}>{listingStatus(p)}</Badge>) },
              {
                label: '',
                render: (p) =>
                  p.productStatus !== 'disabled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        actions.impersonate(p.id);
                        navigate('/partner');
                      }}
                    >
                      View as owner
                    </Button>
                  ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

function NewOrg({ open, onClose }) {
  const { state, actions } = useStore();
  const blank = { type: 'direct', name: '', ownerName: '', ownerPhone: '', city: 'Chennai', area: '', gstin: '', products: ['photography'] };
  const [f, setF] = useState(blank);
  const toggle = (c) => setF({ ...f, products: f.products.includes(c) ? f.products.filter((x) => x !== c) : [...f.products, c] });
  return (
    <Modal
      open={open}
      title="New organization"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!f.name.trim() || !f.ownerName.trim() || f.products.length === 0}
            onClick={() => {
              const id = actions.createOrg({ ...f, name: f.name.trim() });
              setF(blank);
              onClose();
              navigate('/admin/orgs/' + id);
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <Field label="Type">
        <div className="row gap">
          <label className="check"><input type="radio" checked={f.type === 'direct'} onChange={() => setF({ ...f, type: 'direct' })} /> <b>Customer</b> <span className="small muted">a business that uses the products itself</span></label>
          <label className="check"><input type="radio" checked={f.type === 'reseller'} onChange={() => setF({ ...f, type: 'reseller' })} /> <b>Partner</b> <span className="small muted">manages several businesses under it</span></label>
        </div>
      </Field>
      <div className="grid grid-2">
        <Field label="Organization name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="GSTIN"><input className="input" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></Field>
        <Field label="Owner name"><input className="input" value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></Field>
        <Field label="Owner phone"><input className="input" value={f.ownerPhone} onChange={(e) => setF({ ...f, ownerPhone: e.target.value })} /></Field>
        <Field label="Area"><input className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
        <Field label="City"><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
      </div>
      <Field label="Products to enable" hint={f.type === 'reseller' ? 'The partner can use these for its sub-organizations.' : 'A business is created for each product.'}>
        <div className="chips">
          {CORE_PRODUCTS.map((c) => (
            <button key={c} type="button" className={'chip ' + (f.products.includes(c) ? 'active' : '')} onClick={() => toggle(c)}>
              {catOf(state, c).name}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
}
