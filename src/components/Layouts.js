import { useState } from 'react';
import { APP_NAME, PARTNER_APP_NAME, fmtDateTime } from '../config';
import { Link, navigate, useLocation } from '../router';
import { ROLES, useCurrentMember, usePerms, useStore } from '../store';
import { Avatar, Icon } from './ui';
import { SetupShell } from './crm';
import { PACKS, packFor } from '../categories/packs';
import { isPlanner } from '../lifecycle';
import { CORP_ROLES } from '../storeExtra';
import { inScope } from '../accounts';
import { AccountSwitcher, UserMenu, productBrand } from '../pages/partner/Products';

// Zoho brand mark. Put the official Zoho logo at public/zoho-logo.png and it shows here and in
// every console; until then a "ZV" mark is shown.
export function BrandMark({ className }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className={className}>ZV</span>;
  return <img src="zoho-logo.png" alt="Zoho" className={className + ' brand-img'} onError={() => setOk(false)} />;
}

export function Logo({ sub }) {
  return (
    <span className="logo">
      <BrandMark className="logo-mark" />
      <span>
        {APP_NAME}
        {sub && <small>{sub}</small>}
      </span>
    </span>
  );
}

// Demo-only strip: switch between the user types (and partner businesses) to walk through every flow.
export function DemoBar() {
  const { state, actions } = useStore();
  // The product is built around the 11 businesses; corporate buyers book through the marketplace
  // like any customer, so the separate corporate console is not part of the demo.
  const groups = [...new Set(ROLES.filter((r) => !CORP_ROLES[r.id]).map((r) => r.group))];
  return (
    <div className="demobar">
      <span className="demobar-label">
        <Icon name="eye" size={14} /> Demo - viewing as
      </span>
      <select
        value={state.role}
        onChange={(e) => {
          const r = ROLES.find((x) => x.id === e.target.value);
          actions.setRole(r.id);
          navigate(r.home);
        }}
      >
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {ROLES.filter((r) => r.group === g && !CORP_ROLES[r.id]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {CORP_ROLES[state.role] && <span className="demobar-label">Zentech Solutions</span>}
      <button className="demobar-reset" onClick={actions.reset}>
        Reset data
      </button>
    </div>
  );
}

function Bell({ to }) {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const list = state.notifications.filter((n) => n.to === to && (to !== 'partner' || !n.partnerId || n.partnerId === state.partnerId) && (to !== 'corp' || n.orgId === 'org1')).sort((a, b) => b.at.localeCompare(a.at));
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="bell">
      <button
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => actions.markNotificationsRead(to), 1500);
        }}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="bell-dot">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown" onMouseLeave={() => setOpen(false)}>
          <div className="dropdown-title">Notifications</div>
          {list.length === 0 && <p className="muted small pad">You are all caught up.</p>}
          {list.slice(0, 8).map((n) => (
            <Link key={n.id} to={n.link || '#'} className={'notif ' + (n.read ? '' : 'unread')} onClick={() => setOpen(false)}>
              <span>{n.text}</span>
              <small className="muted">{fmtDateTime(n.at)}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Customer / guest shell ----------
export function PublicLayout({ children }) {
  const { state, actions } = useStore();
  const { path } = useLocation();
  const loggedIn = state.role === 'customer';
  const me = state.users.find((u) => u.id === state.customerId);
  const [menu, setMenu] = useState(false);
  const nav = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/browse', label: 'Explore', icon: 'search' },
    { to: '/events', label: 'My events', icon: 'calendar', auth: true },
    { to: '/bookings', label: 'Bookings', icon: 'briefcase', auth: true },
    { to: '/chat', label: 'Chat', icon: 'chat', auth: true },
  ];
  const active = (to) => (to === '/' ? path === '/' : path.startsWith(to));
  return (
    <div className="public">
      <header className="topnav">
        <div className="container topnav-inner">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="topnav-links">
            {nav
              .filter((n) => !n.auth || loggedIn)
              .map((n) => (
                <Link key={n.to} to={n.to} className={active(n.to) ? 'active' : ''}>
                  {n.label}
                </Link>
              ))}
            <Link to="/ideas" className={active('/ideas') ? 'active' : ''}>
              Ideas
            </Link>
          </nav>
          <div className="row gap-s">
            {loggedIn ? (
              <>
                <Link to="/shortlist" className="icon-btn" aria-label="Shortlist">
                  <Icon name="heart" />
                </Link>
                <Bell to="customer" />
                <div className="bell">
                  <button className="avatar-btn" onClick={() => setMenu(!menu)}>
                    <Avatar name={me.name} size={32} />
                  </button>
                  {menu && (
                    <div className="dropdown" onMouseLeave={() => setMenu(false)}>
                      <div className="dropdown-title">{me.name}</div>
                      <Link to="/events" className="notif" onClick={() => setMenu(false)}>My events</Link>
                      <Link to="/shortlist" className="notif" onClick={() => setMenu(false)}>Shortlist</Link>
                      <Link to="/bookings" className="notif" onClick={() => setMenu(false)}>Bookings and payments</Link>
                      <Link to="/wallet" className="notif" onClick={() => setMenu(false)}>Wallet and referrals</Link>
                      <Link to="/saved" className="notif" onClick={() => setMenu(false)}>Saved searches</Link>
                      <Link to="/profile" className="notif" onClick={() => setMenu(false)}>Profile and privacy</Link>
                      <Link to="/help" className="notif" onClick={() => setMenu(false)}>Help and support</Link>
                      <button
                        className="notif"
                        onClick={() => {
                          actions.setRole('guest');
                          setMenu(false);
                          navigate('/');
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/partner/onboarding" className="btn btn-ghost btn-sm hide-sm">
                  List your business
                </Link>
                <Link to={'/login?next=' + encodeURIComponent(path)} className="btn btn-primary btn-sm">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="public-main">{children}</main>
      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <Logo />
            <p className="muted small">Find, compare and book trusted event partners in one place.</p>
          </div>
          <div>
            <b>For customers</b>
            <Link to="/browse">Explore partners</Link>
            <Link to="/ideas">Event ideas</Link>
          </div>
          <div>
            <b>For partners</b>
            <Link to="/partner/onboarding">List your business</Link>
            <span className="muted small">{PARTNER_APP_NAME}: CRM from {'₹'}199 / month</span>
          </div>
        </div>
      </footer>
      <nav className="bottomnav">
        {nav
          .filter((n) => !n.auth || loggedIn)
          .map((n) => (
            <Link key={n.to} to={n.to} className={active(n.to) ? 'active' : ''}>
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
            </Link>
          ))}
        {!loggedIn && (
          <Link to="/login" className={active('/login') ? 'active' : ''}>
            <Icon name="user" size={20} />
            <span>Log in</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

// ---------- Partner + admin shell (Zoho CRM style) ----------
// Module tabs across a dark top bar; Setup (gear) holds team, roles, audit log and billing.
// Zoho CRM NextGen-style shell: dark left module menu (primary items, teamspace,
// module search, grouped modules) + white header with page title and utility icons.
export const PARTNER_PRIMARY = [
  { to: '/partner', label: 'Home', icon: 'home', perm: 'dashboard', exact: true, c: 'c1' },
  { to: '/partner/calendar', label: 'Calendar', icon: 'calendar', perm: 'calendar.view', c: 'c2' },
  { to: '/partner/inbox', label: 'Chats', icon: 'chat', perm: 'chat', c: 'c3' },
  { to: '/partner/jobs', label: 'My Jobs', icon: 'clipboard', perm: 'tasks.view_own', c: 'c4' },
  { to: '/partner/whatsapp', label: 'WhatsApp', icon: 'whatsapp', perm: 'chat', c: 'c1' },
];

export const PARTNER_GROUPS = [
  {
    label: 'Sales',
    items: [
      { to: '/partner/leads', label: 'Leads', icon: 'users', perm: 'leads.view' },
      { to: '/partner/quotes', label: 'Quotes', icon: 'file', perm: 'leads.view' },
      { to: '/partner/bookings', label: 'Bookings', icon: 'briefcase', perm: 'bookings.view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/partner/invoices', label: 'Invoices', icon: 'receipt', perm: 'invoices.view' },
      { to: '/partner/payments', label: 'Payments', icon: 'rupee', perm: 'invoices.view' },
      { to: '/partner/expenses', label: 'Expenses', icon: 'chart', perm: 'finance.view' },
      { to: '/partner/payouts', label: 'Payouts', icon: 'card', perm: 'invoices.view' },
      { to: '/partner/credit-notes', label: 'Credit Notes', icon: 'file', perm: 'invoices.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/partner/crew', label: 'Crew', icon: 'camera', perm: 'crew.assign' },
      { to: '/partner/inventory', label: 'Inventory', icon: 'grid', perm: 'crew.assign' },
      { to: '/partner/reviews', label: 'Reviews', icon: 'star', perm: 'reviews.reply' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/partner/insights', label: 'Insights', icon: 'chart', perm: 'leads.view' },
      { to: '/partner/health', label: 'Account Health', icon: 'shieldCheck', perm: 'team.manage' },
      { to: '/partner/help', label: 'Help & Support', icon: 'info' },
    ],
  },
];

export const PARTNER_SETUP = [
  {
    label: 'General',
    items: [
      { to: '/partner/listing', label: 'Business listing', perm: 'listing.edit' },
      { to: '/partner/setup/availability', label: 'Availability rules', perm: 'listing.edit' },
      { to: '/partner/setup/pricing', label: 'Pricing rules and add-ons', perm: 'listing.edit' },
      { to: '/partner/setup/service', label: 'Hours and service areas', perm: 'listing.edit' },
      { to: '/partner/setup/faqs', label: 'FAQs', perm: 'listing.edit' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/partner/products', label: 'My products', perm: 'team.manage' },
      { to: '/partner/setup/branches', label: 'Branches', perm: 'team.manage' },
    ],
  },
  {
    label: 'Users and Control',
    items: [
      { to: '/partner/team', label: 'Users', perm: 'team.manage' },
      { to: '/partner/roles', label: 'Profiles and permissions', perm: 'team.manage' },
      { to: '/partner/activity', label: 'Audit log', perm: 'team.manage' },
    ],
  },
  { label: 'Billing', items: [{ to: '/partner/subscription', label: 'Subscription', perm: 'billing.manage' }, { to: '/partner/setup/notifications', label: 'Notifications and payout account', perm: 'team.manage' }] },
];

export const ADMIN_PRIMARY = [
  { to: '/admin', label: 'Home', icon: 'home', exact: true, c: 'c1' },
  { to: '/admin/moderation', label: 'Moderation', icon: 'flag', c: 'c2' },
  { to: '/admin/support', label: 'Support', icon: 'chat', c: 'c3' },
];

export const ADMIN_GROUPS = [
  {
    label: 'Organizations',
    items: [{ to: '/admin/orgs', label: 'Customers & Partners', icon: 'building' }],
  },
  {
    label: 'Partners',
    items: [
      { to: '/admin/verification', label: 'Verification', icon: 'shieldCheck' },
      { to: '/admin/partners', label: 'Partners', icon: 'building' },
      { to: '/admin/reviews', label: 'Review Moderation', icon: 'flag' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/admin/users', label: 'Customers', icon: 'users' },
      { to: '/admin/disputes', label: 'Disputes', icon: 'scale' },
      { to: '/admin/trust', label: 'Trust & Safety', icon: 'shield' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/payments', label: 'Refunds & Payouts', icon: 'rupee' },
      { to: '/admin/coupons', label: 'Coupons', icon: 'tag' },
      { to: '/admin/ledger', label: 'Ledger', icon: 'receipt' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/content', label: 'Ideas & Banners', icon: 'megaphone' },
      { to: '/admin/marketing', label: 'Placements & Campaigns', icon: 'sparkles' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/insights', label: 'Insights', icon: 'chart' },
      { to: '/admin/audit', label: 'Audit Log', icon: 'activity' },
    ],
  },
];

export const ADMIN_SETUP = [
  {
    label: 'Platform',
    items: [
      { to: '/admin/settings', label: 'Fees, payouts and policies' },
      { to: '/admin/setup/flags', label: 'Feature flags and commission' },
      { to: '/admin/setup/admins', label: 'Admin users and roles' },
    ],
  },
  {
    label: 'Masters',
    items: [
      { to: '/admin/setup/cities', label: 'Cities and areas' },
      { to: '/admin/setup/categories', label: 'Categories' },
      { to: '/admin/setup/event-types', label: 'Event types and checklists' },
      { to: '/admin/setup/taxes', label: 'Taxes and numbering' },
    ],
  },
];

// Planner pack: shown inside the Partner CRM for Event Management and Wedding Planner businesses.
export const PLANNER_GROUP = {
  label: 'Planner',
  items: [
    { to: '/partner/projects', label: 'Projects', icon: 'clipboard', perm: 'bookings.view' },
    { to: '/partner/rfqs', label: 'RFQs', icon: 'file', perm: 'leads.view' },
    { to: '/partner/vendor-network', label: 'Vendor Network', icon: 'users', perm: 'leads.view' },
    { to: '/partner/approvals', label: 'Approvals', icon: 'shieldCheck', perm: 'team.manage' },
  ],
};

// Corporate buyer console ("Vizha for Business").
export const CORP_PRIMARY = [
  { to: '/corp', label: 'Home', icon: 'home', exact: true, c: 'c1' },
  { to: '/corp/approvals', label: 'Approvals', icon: 'shieldCheck', c: 'c2' },
];
export const CORP_GROUPS = [
  { label: 'Events', items: [{ to: '/corp/events', label: 'Events', icon: 'calendar' }] },
  {
    label: 'Procurement',
    items: [
      { to: '/corp/rfqs', label: 'RFQs', icon: 'file' },
      { to: '/corp/pos', label: 'Purchase Orders', icon: 'receipt' },
      { to: '/corp/vendors', label: 'Vendor Network', icon: 'users' },
    ],
  },
  { label: 'Finance', items: [{ to: '/corp/cost-centers', label: 'Cost Centres', icon: 'chart' }] },
];
export const CORP_SETUP = [
  {
    label: 'Company',
    items: [
      { to: '/corp/setup/company', label: 'Company profile and users' },
      { to: '/corp/setup/approval-rules', label: 'Approval rules' },
    ],
  },
];

const CONSOLE = {
  admin: { primary: ADMIN_PRIMARY, groups: ADMIN_GROUPS, setup: ADMIN_SETUP, brand: 'Super Admin', bell: 'admin' },
  partner: { primary: PARTNER_PRIMARY, groups: PARTNER_GROUPS, setup: PARTNER_SETUP, brand: 'Partner', bell: 'partner' },
  corp: { primary: CORP_PRIMARY, groups: CORP_GROUPS, setup: CORP_SETUP, brand: 'Business', bell: 'corp' },
  reseller: {
    primary: [
      { to: '/reseller', label: 'Home', icon: 'home', exact: true, c: 'c1' },
      { to: '/reseller/orgs', label: 'Businesses', icon: 'building', c: 'c2' },
    ],
    groups: [],
    setup: [],
    brand: 'Partner Hub',
    bell: 'reseller',
  },
};

const allItems = (kind) =>
  kind === 'partner'
    ? [...PARTNER_PRIMARY, ...PARTNER_GROUPS.flatMap((g) => g.items), ...Object.values(PACKS).map((p) => p.module), ...PLANNER_GROUP.items, { to: '/partner/purchase-orders', label: 'Purchase Orders' }, { to: '/partner/products', label: 'My products', exact: true }, { to: '/partner/products/add', label: 'Add a product' }]
    : [...CONSOLE[kind].primary, ...CONSOLE[kind].groups.flatMap((g) => g.items)];

export function ConsoleLayout({ kind, children }) {
  const { state, actions } = useStore();
  const { path } = useLocation();
  const { can } = usePerms();
  const member = useCurrentMember();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState({});
  const partner = state.partners.find((p) => p.id === state.partnerId);
  const cfg = CONSOLE[kind];
  const allowed = (i) => kind !== 'partner' || !i.perm || can(i.perm);
  const primary = cfg.primary.filter(allowed);
  const pack = packFor(partner ? partner.category : '');
  // Partner CRM: Sales gets Purchase Orders; category pack or Planner pack sits after Sales.
  const baseGroups = kind === 'partner' ? PARTNER_GROUPS.map((g, i) => (i === 0 ? { ...g, items: [...g.items, { to: '/partner/purchase-orders', label: 'Purchase Orders', icon: 'receipt', perm: 'leads.view' }] } : g)) : cfg.groups;
  const extraGroup = kind !== 'partner' ? null : isPlanner(partner) ? PLANNER_GROUP : pack.module ? { label: pack.label, items: [{ ...pack.module, perm: pack.module.perm || 'bookings.view' }] } : null;
  const withPack = extraGroup ? [...baseGroups.slice(0, 1), extraGroup, ...baseGroups.slice(1)] : baseGroups;
  const groups = withPack
    .map((g) => ({ ...g, items: g.items.filter(allowed).filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase())) }))
    .filter((g) => g.items.length);
  const setupItems = cfg.setup.flatMap((g) => g.items).filter(allowed);
  const isActive = (i) => (i.exact ? path === i.to : path === i.to || path.startsWith(i.to + '/'));
  const inSetup = setupItems.some((i) => path === i.to) && !path.startsWith('/partner/products');
  const current = allItems(kind).filter(isActive).sort((a, b) => b.to.length - a.to.length)[0];
  const title = inSetup ? 'Setup' : current ? current.label : '';
  const roleLabel = ROLES.find((r) => r.id === state.role);
  const corpUser = kind === 'corp' && state.corpUsers.find((u) => u.id === CORP_ROLES[state.role]);
  const counts = {
    '/partner/leads': state.leads.filter((l) => inScope(state, l) && l.status === 'new').length,
    '/partner/purchase-orders': state.pos.filter((p) => p.partnerId === state.partnerId && p.status === 'issued').length,
    '/partner/approvals': state.role === 'owner' ? state.approvals.filter((a) => a.orgId === state.partnerId && a.status === 'pending').length : 0,
    '/corp/approvals': corpUser ? state.approvals.filter((a) => a.orgId === corpUser.orgId && a.levels.some((l) => l.status === 'pending' && l.approverId === corpUser.id)).length : 0,
    '/corp/rfqs': kind === 'corp' ? state.rfqs.filter((r) => r.buyerId === 'org1' && r.status === 'open').length : 0,
    '/admin/verification': state.partners.filter((p) => p.verification === 'pending').length,
    '/admin/disputes': state.disputes.filter((d) => d.status !== 'decided').length,
    '/admin/support': state.tickets.filter((t) => t.status === 'open').length,
    '/admin/trust': state.reports.filter((r) => r.status === 'open').length + state.fraudFlags.filter((f) => f.status === 'open').length,
    '/admin/moderation': state.reviews.filter((r) => r.status === 'pending_moderation').length + state.partners.filter((p) => p.verification === 'pending').length,
    '/partner/whatsapp': state.waThreads.filter((t) => t.partnerId === state.partnerId && t.unread).length,
  };
  const reseller = kind === 'reseller' ? (state.accounts || []).find((a) => a.id === (state.resellerId || 'ac-res1')) || {} : null;
  const name = kind === 'admin' ? 'Super Admin' : kind === 'reseller' ? reseller.ownerName || 'Partner' : kind === 'corp' ? (corpUser ? corpUser.name : 'Buyer') : member ? member.name : 'Owner';
  const teamName = kind === 'admin' ? 'Marketplace' : kind === 'reseller' ? reseller.name || 'Partner' : kind === 'corp' ? (state.orgs.find((o) => o.id === (corpUser || {}).orgId) || {}).name || 'Company' : partner.name;
  const item = (i, top) => (
    <Link key={i.to} to={i.to} className={'zc-mi ' + (top ? 'zc-mi-top ' + i.c + ' ' : '') + (isActive(i) ? 'active' : '')} onClick={() => setOpen(false)}>
      <Icon name={i.icon} size={17} strokeWidth={1.8} />
      <span>{i.label}</span>
      {counts[i.to] > 0 && <span className="zc-mi-count">{counts[i.to]}</span>}
    </Link>
  );
  return (
    <div className="zc">
      <aside className={'zc-menu ' + (open ? 'open' : '')}>
        <div className="zc-menu-brand">
          <BrandMark className="zc-menu-logo" />
          <span className="zc-brand-text">
            {APP_NAME}
            <small>{kind === 'partner' ? productBrand(state) : cfg.brand}</small>
          </span>
          <button className="zc-menu-collapse" aria-label="Hide menu" onClick={() => setOpen(false)}>
            <Icon name="logout" size={16} />
          </button>
        </div>
        <nav>{primary.map((i) => item(i, true))}</nav>
        <div className="zc-menu-sep" />
        {kind === 'partner' ? (
          <AccountSwitcher />
        ) : (
          <div className="zc-team">
            <span className="zc-team-badge">{teamName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="ellipsis">{teamName}</span>
            <Icon name="chevronDown" size={13} />
            <span className="zc-team-more">...</span>
          </div>
        )}
        <div className="zc-menu-search">
          <Icon name="search" size={14} />
          <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <nav>
          {groups.map((g) => (
            <div key={g.label}>
              <button className={'zc-group ' + (closed[g.label] ? 'closed' : '')} onClick={() => setClosed({ ...closed, [g.label]: !closed[g.label] })}>
                <svg className="zc-folder" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <span>{g.label}</span>
                <Icon name="chevronDown" size={13} className="zc-caret" />
              </button>
              {!closed[g.label] && <div className="zc-sub">{g.items.map((i) => item(i, false))}</div>}
            </div>
          ))}
        </nav>
        <div className="zc-menu-foot">
          Signed in as <b>{name}</b>
          {kind === 'partner' && roleLabel && <div>Profile: {state.role.charAt(0).toUpperCase() + state.role.slice(1)}</div>}
          {kind === 'corp' && corpUser && <div>{corpUser.title}</div>}
        </div>
      </aside>
      {open && <div className="zc-scrim" onClick={() => setOpen(false)} />}
      <div className="zc-col">
        <header className="zc-head">
          <button className="zc-hbtn zc-mobile-btn" onClick={() => setOpen(true)} aria-label="Menu">
            <Icon name="menu" size={18} />
          </button>
          <span className="zc-head-title">{title}</span>
          <div className="zc-head-right">
            {kind === 'partner' && state.role !== 'owner' && (
              <span className="zc-profile-chip">
                <Icon name="lock" size={11} /> {state.role.charAt(0).toUpperCase() + state.role.slice(1)} profile
              </span>
            )}
            <div className="zc-gsearch">
              <Icon name="search" size={14} />
              <input placeholder="Search records" />
            </div>
            {kind === 'partner' && can('leads.edit') && (
              <Link to="/partner/leads?add=1" className="zc-hbtn zc-hbtn-plus" aria-label="Create" title="Create">
                <Icon name="plus" size={16} strokeWidth={2.2} />
              </Link>
            )}
            <Bell to={cfg.bell} />
            {kind === 'partner' && can('calendar.view') && (
              <Link to="/partner/calendar" className="zc-hbtn" aria-label="Calendar" title="Calendar">
                <Icon name="calendar" size={17} strokeWidth={1.8} />
              </Link>
            )}
            {kind === 'partner' && (
              <Link to={'/vendor/' + ((state.listings.find((l) => l.partnerId === state.partnerId) || {}).id || '')} className="zc-hbtn" aria-label="View public listing" title="View public listing">
                <Icon name="eye" size={17} strokeWidth={1.8} />
              </Link>
            )}
            {setupItems.length > 0 && (
              <Link to={setupItems[0].to} className={'zc-hbtn ' + (inSetup ? 'active' : '')} aria-label="Setup" title="Setup">
                <Icon name="settings" size={17} strokeWidth={1.8} />
              </Link>
            )}
            {kind === 'partner' ? (
              <UserMenu name={name} />
            ) : (
              <span title={name} style={{ marginLeft: 6 }}>
                <Avatar name={name} size={30} />
              </span>
            )}
          </div>
        </header>
        {kind === 'partner' && state.managedBy && (
          <div className="zc-imp zc-imp-partner">
            Managing {partner.name} for {((state.accounts || []).find((a) => a.id === state.managedBy) || {}).name}.{' '}
            <button
              onClick={() => {
                actions.stopManaging();
                navigate('/reseller');
              }}
            >
              Back to partner console
            </button>
          </div>
        )}
        {kind === 'partner' && state.impersonating && (
          <div className="zc-imp">
            Admin view of {partner.name}. Every action is logged.{' '}
            <button
              onClick={() => {
                actions.stopImpersonating();
                navigate('/admin/partners');
              }}
            >
              Back to admin
            </button>
          </div>
        )}
        <main className="zc-main">{children}</main>
      </div>
    </div>
  );
}

export function SetupFrame({ kind, path, title, children }) {
  const { can } = usePerms();
  const groups = CONSOLE[kind].setup
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(i.perm)) }))
    .filter((g) => g.items.length);
  return (
    <SetupShell groups={groups} current={path} title={title}>
      {children}
    </SetupShell>
  );
}
