// B2B account screens in the partner CRM:
//  - My products: the products this account has bought, each its own business.
//  - Add a product: the other products of the 11, shown only here.
//  - Branches: the branches of the current business.
import { useState } from 'react';
import { CORE_PRODUCTS, fmtDate } from '../../config';
import { navigate } from '../../router';
import { usePerms, useStore } from '../../store';
import { Avatar, Badge, Button, Card, Field, Icon, Modal } from '../../components/ui';
import { MiniTable, ModuleHeader } from '../../components/crm';
import { PACKS } from '../../categories/packs';
import { listingStatus } from '../../lifecycle';
import { accountBusinesses, accountOf, activeBranch, branchesOf, lockedBranch, mainBranch, parentOrg, productEnabled } from '../../accounts';

export { CORE_PRODUCTS };
const catOf = (state, id) => state.categories.find((c) => c.id === id) || { name: id, icon: 'grid' };
const STATUS = { live: ['green', 'Live'], draft: ['amber', 'In review'], hidden: ['gray', 'Hidden'], blocked: ['red', 'Blocked'] };

export function MyProducts() {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const acc = accountOf(state);
  const owned = accountBusinesses(state, state.partnerId, true);
  const parent = parentOrg(state, acc);
  const left = CORE_PRODUCTS.filter((c) => !owned.some((p) => p.category === c && p.productStatus !== 'disabled')).length;
  return (
    <div className="stack">
      <ModuleHeader
        title="My products"
        subtitle={`${acc ? acc.name : ''}${parent ? ` (managed by ${parent.name})` : ''} - ${owned.filter((p) => p.productStatus !== 'disabled').length} of 11 products enabled. Each product works on its own, with its own listing, CRM module, team and branches.`}
        actions={can('billing.manage') && left > 0 && <Button icon="plus" onClick={() => navigate('/partner/products/add')}>Add a product</Button>}
      />
      <div className="grid grid-3">
        {owned.map((p) => {
          const cat = catOf(state, p.category);
          const pack = PACKS[p.category] || {};
          const st = p.productStatus === 'disabled' ? ['gray', 'Disabled'] : STATUS[listingStatus(p)] || STATUS.hidden;
          const br = branchesOf(state, p.id).filter((b) => b.status === 'active');
          const open = state.leads.filter((l) => l.partnerId === p.id && !['won', 'lost'].includes(l.status)).length;
          const upcoming = state.bookings.filter((b) => b.partnerId === p.id && ['accepted', 'booked'].includes(b.status)).length;
          const current = p.id === state.partnerId;
          const off = p.productStatus === 'disabled';
          // Click anywhere on the card to open that product (or one of its pages).
          const openAt = (to) => {
            if (off) return;
            if (!current) actions.setPartner(p.id);
            navigate(to);
          };
          const listing = state.listings.find((l) => l.partnerId === p.id);
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={'prod-card ' + (off ? 'off' : '')}
              onClick={() => openAt('/partner')}
              onKeyDown={(e) => e.key === 'Enter' && openAt('/partner')}
              title={off ? '' : `Open ${p.name}`}
            >
            <Card className={current ? 'card-current' : ''}>
              <div className="row between">
                <span className="row gap-s">
                  <span className="zc-team-badge">
                    <Icon name={cat.icon} size={15} />
                  </span>
                  <b>{cat.name}</b>
                </span>
                <Badge tone={st[0]}>{st[1]}</Badge>
              </div>
              <h3 className="mt-s">{p.name}</h3>
              <div className="small muted">
                {br.length} {br.length === 1 ? 'branch' : 'branches'}: {br.map((b) => b.name).join(', ')}
              </div>
              <div className="small mt-s">
                {open} open leads - {upcoming} upcoming bookings
              </div>
              <div className="tiny muted mt-s">
                CRM module: {pack.module ? pack.module.label : '-'} - added {fmtDate((p.productAddedAt || p.joined || '').slice(0, 10))}
              </div>
              <div className="mt">
                {off ? (
                  <span className="small muted">Disabled by {parent ? parent.name : 'Zoho for Vizhaa'}. Your data is kept; ask to enable it again.</span>
                ) : (
                  <div className="row between wrap gap-s" onClick={(e) => e.stopPropagation()}>
                    <span className="row gap-s small">
                      <button className="link" onClick={() => openAt('/partner/leads')}>Leads</button>
                      <button className="link" onClick={() => openAt('/partner/bookings')}>Bookings</button>
                      {pack.module && <button className="link" onClick={() => openAt(pack.module.to)}>{pack.module.label}</button>}
                      {listing && <button className="link" onClick={() => navigate('/vendor/' + listing.id)}>Listing</button>}
                    </span>
                    <Button size="sm" variant={current ? 'ghost' : 'secondary'} onClick={() => openAt('/partner')}>
                      {current ? 'Go to home' : 'Open'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AddProduct() {
  const { state, actions } = useStore();
  const acc = accountOf(state);
  const owned = accountBusinesses(state);
  const main = mainBranch(state) || {};
  const parent = parentOrg(state, acc);
  const grantor = parent ? parent.name : 'Zoho for Vizhaa';
  const available = CORE_PRODUCTS.filter((c) => !owned.some((p) => p.category === c));
  const pending = (c) => (state.productRequests || []).some((r) => r.accountId === (acc || {}).id && r.category === c && r.status === 'pending');
  const [pick, setPick] = useState(null);
  const [f, setF] = useState({ name: '', area: '', city: '' });
  const start = (c) => {
    setPick(c);
    setF({ name: `${(acc || {}).name || ''} ${catOf(state, c).name}`.trim(), area: main.area || '', city: main.city || 'Chennai' });
  };
  return (
    <div className="stack">
      <ModuleHeader title="Add a product" subtitle={`Products are enabled for your organization by ${grantor}. Ask for one here; once enabled, set it up and it works as its own app.`} actions={<Button variant="secondary" onClick={() => navigate('/partner/products')}>My products</Button>} />
      {available.length === 0 ? (
        <Card>
          <p className="muted">Your account already has all 11 products.</p>
        </Card>
      ) : (
        <div className="grid grid-3">
          {available.map((c) => {
            const cat = catOf(state, c);
            const pack = PACKS[c] || {};
            return (
              <Card key={c}>
                <span className="row gap-s">
                  <span className="zc-team-badge">
                    <Icon name={cat.icon} size={15} />
                  </span>
                  <b>{cat.name}</b>
                </span>
                <p className="small muted mt-s">CRM module: {pack.module ? pack.module.label : '-'}</p>
                {pack.pricingNote && <p className="tiny muted">Quotes priced as {pack.pricingNote}.</p>}
                {productEnabled(state, acc, c) ? (
                  <Button size="sm" className="mt" icon="plus" onClick={() => start(c)}>
                    Set up {cat.name}
                  </Button>
                ) : pending(c) ? (
                  <Badge tone="amber">Requested - waiting for {grantor}</Badge>
                ) : parent && !(parent.enabledProducts || []).includes(c) ? (
                  <span className="small muted">Not offered by {parent.name}</span>
                ) : (
                  <Button size="sm" variant="secondary" className="mt" onClick={() => actions.requestProduct(c)}>
                    Request {cat.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <Modal
        open={!!pick}
        title={pick ? `Set up ${catOf(state, pick).name}` : ''}
        onClose={() => setPick(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPick(null)}>
              Cancel
            </Button>
            <Button
              disabled={!f.name.trim()}
              onClick={() => {
                actions.addProduct({ category: pick, name: f.name.trim(), area: f.area.trim(), city: f.city.trim() });
                setPick(null);
                navigate('/partner/listing');
              }}
            >
              Set up product
            </Button>
          </>
        }
      >
        <Field label="Business name for this product" hint="Customers see this name on the listing.">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-2">
          <Field label="Main branch area">
            <input className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
          </Field>
          <Field label="City">
            <input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </Field>
        </div>
        <p className="small muted">You can open more branches later. The new listing goes live after you add packages and our team reviews it.</p>
      </Modal>
    </div>
  );
}

export function Branches() {
  const { state, actions } = useStore();
  const partner = state.partners.find((p) => p.id === state.partnerId);
  const rows = branchesOf(state);
  const [edit, setEdit] = useState(null);
  const count = (list, b) => list.filter((x) => x.partnerId === state.partnerId && x.branchId === b.id).length;
  return (
    <div className="stack">
      <div className="row between wrap gap-s">
        <p className="small muted">
          Branches of {partner.name}. Each branch has its own leads, bookings, calendar, inventory and staff. Owners and managers can see all branches together.
        </p>
        <Button size="sm" icon="plus" onClick={() => setEdit({ name: '', area: '', city: 'Chennai', phone: '', address: '' })}>
          Add branch
        </Button>
      </div>
      <Card pad={false}>
        <MiniTable
          rows={rows}
          columns={[
            { label: 'Branch', render: (b) => <b>{b.name}</b> },
            { label: 'Area / city', render: (b) => `${b.area || '-'}, ${b.city}` },
            { label: 'Phone', render: (b) => b.phone || '-' },
            { label: 'Staff', align: 'right', render: (b) => state.members.filter((m) => m.partnerId === state.partnerId && m.branchId === b.id && m.status !== 'removed').length },
            { label: 'Leads', align: 'right', render: (b) => count(state.leads, b) },
            { label: 'Bookings', align: 'right', render: (b) => count(state.bookings, b) },
            { label: 'Status', render: (b) => (b.isMain ? <Badge tone="brand">Main</Badge> : <Badge tone={b.status === 'active' ? 'green' : 'gray'}>{b.status === 'active' ? 'Open' : 'Closed'}</Badge>) },
            {
              label: '',
              render: (b) => (
                <span className="row gap-s">
                  <button className="link small" onClick={() => setEdit(b)}>
                    Edit
                  </button>
                  {!b.isMain && b.status === 'active' && (
                    <button className="link small" onClick={() => actions.setMainBranch(b.id)}>
                      Make main
                    </button>
                  )}
                  {!b.isMain && (
                    <button className="link small" onClick={() => actions.setBranchStatus(b.id, b.status === 'active' ? 'closed' : 'active')}>
                      {b.status === 'active' ? 'Close' : 'Reopen'}
                    </button>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={!!edit}
        title={edit && edit.id ? 'Edit branch' : 'Add branch'}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              disabled={!edit || !edit.name.trim()}
              onClick={() => {
                actions.saveBranch({ ...edit, name: edit.name.trim() });
                setEdit(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {edit && (
          <>
            <div className="grid grid-2">
              <Field label="Branch name">
                <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Velachery" />
              </Field>
              <Field label="Phone">
                <input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="Area">
                <input className="input" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} />
              </Field>
              <Field label="City">
                <input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Address">
              <input className="input" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
}

// Sidebar: the business you are in and its branch picker. Switching business lives in the user menu.
export function AccountSwitcher() {
  const { state, actions } = useStore();
  const partner = state.partners.find((p) => p.id === state.partnerId);
  const branches = branchesOf(state).filter((b) => b.status === 'active');
  const current = activeBranch(state);
  const locked = !!lockedBranch(state);
  const cat = catOf(state, partner.category);
  return (
    <div className="zc-acct">
      <div className="zc-team">
        <span className="zc-team-badge">
          <Icon name={cat.icon} size={14} />
        </span>
        <span className="ellipsis">
          {partner.name}
          <span className="zc-team-sub">{cat.name}</span>
        </span>
      </div>
      {branches.length > 1 && (
        <div className="zc-branch">
          <Icon name="building" size={13} />
          {locked ? (
            <span className="small">{(branches.find((b) => b.id === current) || {}).name} branch</span>
          ) : (
            <select value={current} onChange={(e) => actions.setBranch(e.target.value)} aria-label="Branch">
              <option value="all">All branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.isMain ? ' (main)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// Demo only: sign in as the owner of another demo business (one per product).
export const DEMO_BUSINESSES = [
  ['p1', 'Photography'], ['p8', 'Return Gifts'], ['p4', 'Venue'], ['p2', 'Catering'], ['p3', 'Decoration'], ['p6', 'Pandit'], ['p7', 'Melam'],
  ['p5', 'Makeup'], ['p9', 'Invitation'], ['p10', 'Mehendi'], ['p11', 'Music & DJ'],
];

// Top-right user menu in the CRM: who you are, your organization, and the businesses
// (products) it has. Pick one to switch; only enabled products are listed.
export function UserMenu({ name }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [open, setOpen] = useState(false);
  const acc = accountOf(state);
  const parent = parentOrg(state, acc);
  const owned = accountBusinesses(state);
  const canSwitch = ['owner', 'manager'].includes(state.role) && !state.managedBy && !state.impersonating;
  const mine = canSwitch ? owned : owned.filter((p) => p.id === state.partnerId);
  const go = (to) => {
    setOpen(false);
    navigate(to);
  };
  const switchTo = (pid) => {
    setOpen(false);
    if (pid !== state.partnerId) {
      actions.setPartner(pid);
      navigate(state.role === 'crew' ? '/partner/jobs' : '/partner');
    }
  };
  const others = DEMO_BUSINESSES.filter(([pid]) => !owned.some((p) => p.id === pid) && state.partners.some((p) => p.id === pid));
  return (
    <div className="zc-user">
      <button className="zc-user-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="User menu" title={name}>
        <Avatar name={name} size={30} />
        <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <>
          <div className="zc-user-scrim" onClick={() => setOpen(false)} />
          <div className="zc-user-menu">
            <div className="zc-user-head">
              <Avatar name={name} size={40} />
              <span>
                <b>{name}</b>
                <div className="small muted" style={{ textTransform: 'capitalize' }}>{state.role} profile</div>
                <div className="tiny muted">
                  {acc ? acc.name : ''}
                  {parent ? ` - managed by ${parent.name}` : ''}
                </div>
              </span>
            </div>
            <div className="zc-user-sec">
              {canSwitch ? `Your businesses (${owned.length} of 11 products)` : 'Your business'}
            </div>
            {mine.map((p) => {
              const c = catOf(state, p.category);
              return (
                <button key={p.id} className={'zc-acct-item ' + (p.id === state.partnerId ? 'active' : '')} onClick={() => switchTo(p.id)}>
                  <span className="zc-team-badge">
                    <Icon name={c.icon} size={13} />
                  </span>
                  <span className="ellipsis">
                    {p.name}
                    <span className="zc-team-sub">{c.name}</span>
                  </span>
                  {p.id === state.partnerId && <Icon name="check" size={14} />}
                </button>
              );
            })}
            <div className="zc-user-links">
              {can('team.manage') && <button className="link small" onClick={() => go('/partner/products')}>My products</button>}
              {can('billing.manage') && owned.length < CORE_PRODUCTS.length && <button className="link small" onClick={() => go('/partner/products/add')}>+ Add a product</button>}
              {can('team.manage') && <button className="link small" onClick={() => go('/partner/setup/branches')}>Branches</button>}
            </div>
            {state.role === 'owner' && !state.managedBy && !state.impersonating && others.length > 0 && (
              <>
                <div className="zc-user-sec">Demo: sign in as another business</div>
                <select
                  className="select input-sm zc-user-demo"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) switchTo(e.target.value);
                  }}
                >
                  <option value="">Pick a business...</option>
                  {others.map(([pid, label]) => (
                    <option key={pid} value={pid}>
                      {label} - {(state.partners.find((p) => p.id === pid) || {}).name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Sidebar sub-brand under "Zoho for Vizhaa": Photography, Catering, ... each product looks like its own app.
export const productBrand = (state) => {
  const p = state.partners.find((x) => x.id === state.partnerId);
  return p ? catOf(state, p.category).name : 'Partner';
};
