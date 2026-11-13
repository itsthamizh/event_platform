import './App.css';
import './crm.css';
import { APP_NAME } from './config';
import { StoreProvider, ROLES, isCorpRole, isPartnerRole, usePerms, useStore } from './store';
import { isPlanner } from './lifecycle';
import { navigate, resolve, useLocation } from './router';
import { ConsoleLayout, DemoBar, PublicLayout, SetupFrame } from './components/Layouts';
import { Button, Empty, Toasts } from './components/ui';

import { Article, Browse, Home, Ideas } from './pages/customer/Discover';
import { Compare, VendorProfile } from './pages/customer/Vendor';
import { Events, Login, Shortlist } from './pages/customer/Account';
import { EventDetail } from './pages/customer/EventPlan';
import { BookingDetail, Bookings, CustomerChat } from './pages/customer/Bookings';

import Onboarding from './pages/partner/Onboarding';
import Dashboard from './pages/partner/Dashboard';
import { LeadDetail, LeadsBoard, QuoteBuilder, QuoteDetail, QuotesList } from './pages/partner/Leads';
import { DealsBoard } from './pages/partner/Deals';
import { Equipments, StudioCrew, VendorPos, Vendors } from './pages/partner/Studio';
import { CrewTasks, MyJobs, PartnerBookingDetail, PartnerBookings, PartnerCalendar, PartnerInbox } from './pages/partner/Operations';
import { Expenses, InvoiceDetail, Invoices, PaymentsList } from './pages/partner/Finance';
import { Activity, ListingEditor, PartnerReviews, Subscription, Team } from './pages/partner/Business';

import { PACKS } from './categories/packs';
import {
  Approvals, ApprovalRulesPage, CompanyProfile, CorpEventDetail, CorpEvents, CorpHome, CostCenters, PartnerPurchaseOrders, PlannerNoAccess, PoDetail, PoList, ProjectDetail, Projects, RfqDetail, RfqList, RfqNew, VendorNetwork,
} from './pages/b2b/B2B';
import { Coupons, Ledger, AdminMoney } from './pages/admin/AdminFinance';
import { AvailabilitySetup, CreditNotes, FaqSetup, Inventory, Payouts, PricingSetup, ServiceSetup } from './pages/partner/Phase2';
import { Wallet } from './pages/customer/Wallet';
import { Help, Profile, Saved } from './pages/customer/Account2';
import { AddProduct, Branches, MyProducts } from './pages/partner/Products';
import { Organizations, OrgDetail } from './pages/admin/Orgs';
import { ResellerHome, ResellerOrgDetail, ResellerOrgs } from './pages/reseller/Reseller';
import { AccountHealth, Insights, PartnerHelp, PartnerNotifications, WhatsAppInbox } from './pages/partner/P3';
import { AdminUsersSetup, AuditLog, CategoriesSetup, CitiesSetup, EventTypesSetup, FlagsSetup, Marketing, Moderation, PlatformInsights, Support, TaxSetup, Trust } from './pages/admin/AdminP3';
import { AdminAnalytics, AdminPartners, AdminUsers, Content, Disputes, ReviewModeration, Settings, Verification } from './pages/admin/Admin';

// ---------- Route tables ----------
const publicRoutes = [
  { path: '/', render: () => <Home /> },
  { path: '/browse', render: (p, q) => <Browse query={q} /> },
  { path: '/vendor/:id', render: (p) => <VendorProfile key={p.id} id={p.id} /> },
  { path: '/compare', render: (p, q) => <Compare ids={q.ids} /> },
  { path: '/ideas', render: () => <Ideas /> },
  { path: '/ideas/:id', render: (p) => <Article id={p.id} /> },
  { path: '/login', render: (p, q) => <Login next={q.next} /> },
  { path: '/partner/onboarding', render: () => <Onboarding /> },
];

const customerRoutes = [
  { path: '/events', render: () => <Events /> },
  { path: '/events/:id', render: (p) => <EventDetail id={p.id} /> },
  { path: '/shortlist', render: () => <Shortlist /> },
  { path: '/bookings', render: () => <Bookings /> },
  { path: '/bookings/:id', render: (p) => <BookingDetail key={p.id} id={p.id} /> },
  { path: '/chat', render: () => <CustomerChat /> },
  { path: '/chat/:id', render: (p) => <CustomerChat threadId={p.id} /> },
  { path: '/wallet', render: () => <Wallet /> },
  { path: '/profile', render: () => <Profile /> },
  { path: '/help', render: () => <Help /> },
  { path: '/saved', render: () => <Saved /> },
];

const partnerRoutes = [
  { path: '/partner', perm: 'dashboard', render: () => <Dashboard /> },
  { path: '/partner/leads', perm: 'leads.view', render: (p, q) => <LeadsBoard query={q} /> },
  { path: '/partner/deals', perm: 'leads.view', render: () => <DealsBoard /> },
  { path: '/partner/equipment', perm: 'crew.assign', render: () => <Equipments /> },
  { path: '/partner/studio-crew', perm: 'crew.assign', render: () => <StudioCrew /> },
  { path: '/partner/vendors', perm: 'crew.assign', render: () => <Vendors /> },
  { path: '/partner/vendor-pos', perm: 'crew.assign', render: () => <VendorPos /> },
  { path: '/partner/deals/:id', perm: 'leads.view', render: (p) => <LeadDetail key={p.id} id={p.id} /> },
  { path: '/partner/leads/:id', perm: 'leads.view', render: (p) => <LeadDetail key={p.id} id={p.id} /> },
  { path: '/partner/quotes', perm: 'leads.view', render: () => <QuotesList /> },
  { path: '/partner/quotes/new', perm: 'quotes.send', render: (p, q) => <QuoteBuilder key={q.lead} leadId={q.lead} /> },
  { path: '/partner/quotes/:id', perm: 'leads.view', render: (p) => <QuoteDetail key={p.id} id={p.id} /> },
  { path: '/partner/payments', perm: 'invoices.view', render: () => <PaymentsList /> },
  ...Object.values(PACKS).map((pk) => ({ path: pk.module.to, perm: 'bookings.view', render: () => <PackModule pack={pk} /> })),
  { path: '/partner/inbox', perm: 'chat', render: () => <PartnerInbox /> },
  { path: '/partner/inbox/:id', perm: 'chat', render: (p) => <PartnerInbox threadId={p.id} /> },
  { path: '/partner/bookings', perm: 'bookings.view', render: () => <PartnerBookings /> },
  { path: '/partner/bookings/:id', perm: 'bookings.view', render: (p) => <PartnerBookingDetail key={p.id} id={p.id} /> },
  { path: '/partner/calendar', perm: 'calendar.view', render: () => <PartnerCalendar /> },
  { path: '/partner/invoices', perm: 'invoices.view', render: () => <Invoices /> },
  { path: '/partner/invoices/:id', perm: 'invoices.view', render: (p) => <InvoiceDetail key={p.id} id={p.id} /> },
  { path: '/partner/expenses', perm: 'finance.view', render: () => <Expenses /> },
  { path: '/partner/crew', perm: 'crew.assign', render: () => <CrewTasks /> },
  { path: '/partner/jobs', perm: 'tasks.view_own', render: () => <MyJobs /> },
  { path: '/partner/listing', perm: 'listing.edit', render: () => <SetupFrame kind="partner" path="/partner/listing"><ListingEditor /></SetupFrame> },
  { path: '/partner/reviews', perm: 'reviews.reply', render: () => <PartnerReviews /> },
  { path: '/partner/team', perm: 'team.manage', render: () => <SetupFrame kind="partner" path="/partner/team"><Team mode="users" /></SetupFrame> },
  { path: '/partner/roles', perm: 'team.manage', render: () => <SetupFrame kind="partner" path="/partner/roles"><Team mode="roles" /></SetupFrame> },
  { path: '/partner/activity', perm: 'team.manage', render: () => <SetupFrame kind="partner" path="/partner/activity"><Activity /></SetupFrame> },
  { path: '/partner/subscription', perm: 'billing.manage', render: () => <SetupFrame kind="partner" path="/partner/subscription"><Subscription /></SetupFrame> },
  { path: '/partner/inventory', perm: 'crew.assign', render: () => <Inventory /> },
  { path: '/partner/whatsapp', perm: 'chat', render: () => <WhatsAppInbox /> },
  { path: '/partner/whatsapp/:id', perm: 'chat', render: (p) => <WhatsAppInbox threadId={p.id} /> },
  { path: '/partner/insights', perm: 'leads.view', render: () => <Insights /> },
  { path: '/partner/help', render: () => <PartnerHelp /> },
  { path: '/partner/health', perm: 'team.manage', render: () => <AccountHealth /> },
  { path: '/partner/setup/notifications', perm: 'team.manage', render: () => <SetupFrame kind="partner" path="/partner/setup/notifications" title="Notifications and payout account"><PartnerNotifications /></SetupFrame> },
  { path: '/partner/payouts', perm: 'invoices.view', render: () => <Payouts /> },
  { path: '/partner/products', perm: 'team.manage', render: () => <MyProducts /> },
  { path: '/partner/products/add', perm: 'billing.manage', render: () => <AddProduct /> },
  { path: '/partner/setup/branches', perm: 'team.manage', render: () => <SetupFrame kind="partner" path="/partner/setup/branches" title="Branches"><Branches /></SetupFrame> },
  { path: '/partner/credit-notes', perm: 'invoices.view', render: () => <CreditNotes /> },
  { path: '/partner/setup/availability', perm: 'listing.edit', render: () => <SetupFrame kind="partner" path="/partner/setup/availability" title="Availability rules"><AvailabilitySetup /></SetupFrame> },
  { path: '/partner/setup/pricing', perm: 'listing.edit', render: () => <SetupFrame kind="partner" path="/partner/setup/pricing" title="Pricing rules and add-ons"><PricingSetup /></SetupFrame> },
  { path: '/partner/setup/service', perm: 'listing.edit', render: () => <SetupFrame kind="partner" path="/partner/setup/service" title="Hours, service areas and categories"><ServiceSetup /></SetupFrame> },
  { path: '/partner/setup/faqs', perm: 'listing.edit', render: () => <SetupFrame kind="partner" path="/partner/setup/faqs" title="FAQs"><FaqSetup /></SetupFrame> },
  // B2B: every partner receives purchase orders; planners also run projects, RFQs and a vendor network.
  { path: '/partner/purchase-orders', perm: 'leads.view', render: () => <PartnerPurchaseOrders /> },
  { path: '/partner/purchase-orders/:id', perm: 'leads.view', render: (p) => <PoDetail key={p.id} id={p.id} /> },
  { path: '/partner/projects', perm: 'bookings.view', planner: true, render: () => <Projects /> },
  { path: '/partner/projects/:id', perm: 'bookings.view', planner: true, render: (p) => <ProjectDetail key={p.id} id={p.id} /> },
  { path: '/partner/rfqs', perm: 'leads.view', planner: true, render: () => <RfqList /> },
  { path: '/partner/rfqs/new', perm: 'leads.edit', planner: true, render: (p, q) => <RfqNew query={q} /> },
  { path: '/partner/rfqs/:id', perm: 'leads.view', planner: true, render: (p) => <RfqDetail key={p.id} id={p.id} /> },
  { path: '/partner/vendor-network', perm: 'leads.view', planner: true, render: () => <VendorNetwork /> },
  { path: '/partner/approvals', perm: 'team.manage', planner: true, render: () => <Approvals /> },
];

const corpRoutes = [
  { path: '/corp', render: () => <CorpHome /> },
  { path: '/corp/events', render: () => <CorpEvents /> },
  { path: '/corp/events/:id', render: (p) => <CorpEventDetail key={p.id} id={p.id} /> },
  { path: '/corp/rfqs', render: () => <RfqList /> },
  { path: '/corp/rfqs/new', render: (p, q) => <RfqNew query={q} /> },
  { path: '/corp/rfqs/:id', render: (p) => <RfqDetail key={p.id} id={p.id} /> },
  { path: '/corp/pos', render: () => <PoList /> },
  { path: '/corp/pos/:id', render: (p) => <PoDetail key={p.id} id={p.id} side="buyer" /> },
  { path: '/corp/approvals', render: () => <Approvals /> },
  { path: '/corp/vendors', render: () => <VendorNetwork /> },
  { path: '/corp/cost-centers', render: () => <CostCenters /> },
  { path: '/corp/setup/company', render: () => <SetupFrame kind="corp" path="/corp/setup/company" title="Company profile and users"><CompanyProfile /></SetupFrame> },
  { path: '/corp/setup/approval-rules', render: () => <SetupFrame kind="corp" path="/corp/setup/approval-rules" title="Approval rules"><ApprovalRulesPage /></SetupFrame> },
];

const adminRoutes = [
  { path: '/admin', render: () => <AdminAnalytics /> },
  { path: '/admin/verification', render: () => <Verification /> },
  { path: '/admin/partners', render: () => <AdminPartners /> },
  { path: '/admin/users', render: () => <AdminUsers /> },
  { path: '/admin/disputes', render: () => <Disputes /> },
  { path: '/admin/payments', render: () => <AdminMoney /> },
  { path: '/admin/coupons', render: () => <Coupons /> },
  { path: '/admin/ledger', render: () => <Ledger /> },
  { path: '/admin/support', render: () => <Support /> },
  { path: '/admin/trust', render: () => <Trust /> },
  { path: '/admin/moderation', render: () => <Moderation /> },
  { path: '/admin/marketing', render: () => <Marketing /> },
  { path: '/admin/insights', render: () => <PlatformInsights /> },
  { path: '/admin/audit', render: () => <AuditLog /> },
  { path: '/admin/setup/cities', render: () => <SetupFrame kind="admin" path="/admin/setup/cities" title="Cities and areas"><CitiesSetup /></SetupFrame> },
  { path: '/admin/setup/categories', render: () => <SetupFrame kind="admin" path="/admin/setup/categories" title="Categories"><CategoriesSetup /></SetupFrame> },
  { path: '/admin/setup/event-types', render: () => <SetupFrame kind="admin" path="/admin/setup/event-types" title="Event types and checklist templates"><EventTypesSetup /></SetupFrame> },
  { path: '/admin/setup/taxes', render: () => <SetupFrame kind="admin" path="/admin/setup/taxes" title="Taxes and document numbering"><TaxSetup /></SetupFrame> },
  { path: '/admin/setup/flags', render: () => <SetupFrame kind="admin" path="/admin/setup/flags" title="Feature flags and commission"><FlagsSetup /></SetupFrame> },
  { path: '/admin/setup/admins', render: () => <SetupFrame kind="admin" path="/admin/setup/admins" title="Admin users and roles"><AdminUsersSetup /></SetupFrame> },
  { path: '/admin/reviews', render: () => <ReviewModeration /> },
  { path: '/admin/orgs', render: () => <Organizations /> },
  { path: '/admin/orgs/:id', render: (p) => <OrgDetail key={p.id} id={p.id} /> },
  { path: '/admin/content', render: () => <Content /> },
  { path: '/admin/settings', render: () => <SetupFrame kind="admin" path="/admin/settings"><Settings /></SetupFrame> },
];

// A category's own CRM module (Halls & Sessions, Menus & Headcount, Shoots & Deliverables).
function PackModule({ pack }) {
  const { state } = useStore();
  const partner = state.partners.find((p) => p.id === state.partnerId);
  if (!partner || partner.category !== pack.id)
    return (
      <Empty icon="lock" title={`${pack.module.label} is part of the ${pack.label} pack`}>
        Switch the demo business to a {pack.label.toLowerCase()} partner to use it.
      </Empty>
    );
  const Page = pack.ModulePage;
  return <Page />;
}

function SwitchRole({ title, body, role }) {
  const { actions } = useStore();
  const r = ROLES.find((x) => x.id === role);
  return (
    <div className="container section">
      <Empty icon="lock" title={title} action={<Button onClick={() => { actions.setRole(role); navigate(r.home); }}>Continue as {r.label}</Button>}>
        {body}
      </Empty>
    </div>
  );
}

function Shell() {
  const loc = useLocation();
  const { state } = useStore();
  const { can } = usePerms();
  const path = loc.path;

  if (path.startsWith('/admin')) {
    if (state.role !== 'admin') return <SwitchRole title="Admin console" body="This area is for the platform team." role="admin" />;
    return <ConsoleLayout kind="admin">{resolve(adminRoutes, loc) || <Empty title="Page not found" />}</ConsoleLayout>;
  }

  if (path.startsWith('/reseller')) {
    if (state.role !== 'reseller') return <SwitchRole title="Zoho for Vizhaa Partner Hub" body="Partners (resellers) run several businesses under one parent organization." role="reseller" />;
    const resellerRoutes = [
      { path: '/reseller', render: () => <ResellerHome /> },
      { path: '/reseller/orgs', render: () => <ResellerOrgs /> },
      { path: '/reseller/orgs/:id', render: (p) => <ResellerOrgDetail key={p.id} id={p.id} /> },
    ];
    return <ConsoleLayout kind="reseller">{resolve(resellerRoutes, loc) || <Empty title="Page not found" />}</ConsoleLayout>;
  }

  if (path.startsWith('/corp')) {
    if (!isCorpRole(state.role)) return <SwitchRole title="Zoho for Vizhaa Business" body="Corporate buyers raise RFQs, approve spend and issue purchase orders here." role="corp" />;
    return <ConsoleLayout kind="corp">{resolve(corpRoutes, loc) || <Empty title="Page not found" />}</ConsoleLayout>;
  }

  if (path.startsWith('/partner') && path !== '/partner/onboarding') {
    if (!isPartnerRole(state.role)) return <SwitchRole title="Partner CRM" body="Log in as a partner to manage leads, quotes, bookings and payments." role="owner" />;
    const route = partnerRoutes.find((r) => resolve([r], loc) !== null);
    const currentBiz = state.partners.find((p) => p.id === state.partnerId);
    let content;
    if (!route) content = <Empty title="Page not found" />;
    else if (route.perm && !can(route.perm))
      content = (
        <Empty icon="lock" title="You don't have access to this page">
          Ask the owner to change your role permissions.
        </Empty>
      );
    else if (currentBiz && (currentBiz.productStatus === 'disabled' || currentBiz.orgSuspended) && !path.startsWith('/partner/products'))
      content = (
        <Empty icon="lock" title={currentBiz.orgSuspended ? 'This organization is suspended' : 'This product is not enabled'} action={<Button onClick={() => navigate('/partner/products')}>My products</Button>}>
          {currentBiz.orgSuspended ? 'Contact Zoho for Vizhaa support to reactivate your account.' : 'It was turned off for your organization. Your data is kept and comes back when it is enabled again.'}
        </Empty>
      );
    else if (route.planner && !isPlanner(state.partners.find((p) => p.id === state.partnerId))) content = <PlannerNoAccess />;
    else content = resolve([route], loc);
    // Crew members land on their jobs list instead of the dashboard.
    if (path === '/partner' && !can('dashboard') && can('tasks.view_own')) content = <MyJobs />;
    return <ConsoleLayout kind="partner">{content}</ConsoleLayout>;
  }

  const custom = resolve(customerRoutes, loc);
  if (custom) {
    if (state.role !== 'customer') return <PublicLayout><Login next={path} /></PublicLayout>;
    return <PublicLayout>{custom}</PublicLayout>;
  }
  return <PublicLayout>{resolve(publicRoutes, loc) || <div className="container section"><Empty title="Page not found" /></div>}</PublicLayout>;
}

export default function App() {
  if (typeof document !== 'undefined') document.title = `${APP_NAME} - Event planning and booking`;
  return (
    <StoreProvider>
      <DemoBar />
      <Shell />
      <Toasts />
    </StoreProvider>
  );
}
