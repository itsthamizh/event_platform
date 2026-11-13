// Partner CRM Home, laid out like the Zoho CRM NextGen Home page:
// welcome row, KPI tiles, then table/chart components.
import { fmtDate, fmtDateTime, inr, inrShort, todayISO, addDays } from '../../config';
import { navigate } from '../../router';
import { LEAD_STAGES, LEAD_STAGE_LABEL, invoiceTotals, useCurrentMember, usePerms, useStore } from '../../store';
import { Badge } from '../../components/ui';
import { Component, Funnel, Kpis, Welcome } from '../../components/crm';
import { activeBranch, activeBranches, inScope } from '../../accounts';
import { dealsOn } from '../../deals';
import { dealAmount } from './Deals';
import { PhotoHome } from './PhotoHome';

export function partnerData(state) {
  const leads = state.leads.filter((l) => inScope(state, l));
  const bookings = state.bookings.filter((b) => inScope(state, b));
  const invoices = state.invoices.filter((i) => inScope(state, i));
  return { leads, bookings, invoices };
}

export default function Dashboard() {
  const { state } = useStore();
  const { can } = usePerms();
  const me = useCurrentMember();
  const { leads, bookings, invoices } = partnerData(state);
  const today = todayISO();
  const month = today.slice(0, 7);
  const memberName = (id) => (state.members.find((m) => m.id === id) || {}).name || '-';
  const openLeads = leads.filter((l) => !['won', 'lost'].includes(l.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const myOpen = me && me.role !== 'owner' && me.role !== 'manager' ? openLeads.filter((l) => l.assignedTo === me.id) : openLeads;
  const followUps = openLeads.filter((l) => l.nextFollowUp && l.nextFollowUp <= addDays(today, 1));
  const upcoming = bookings.filter((b) => ['booked', 'accepted'].includes(b.status) && b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const collected = invoices.flatMap((i) => i.schedule).filter((s) => s.paidAt && s.paidAt.slice(0, 7) === month).reduce((a, s) => a + s.amount, 0);
  const pending = invoices.reduce((a, i) => a + invoiceTotals(i).due, 0);
  const quotesThisMonth = state.quotes.filter((q) => inScope(state, q) && q.sentAt.slice(0, 7) === month).length;
  const dues = invoices
    .flatMap((i) => i.schedule.filter((s) => !s.paidAt && !s.waived).map((s) => ({ ...s, id: i.id + s.id, inv: i })))
    .sort((a, b) => a.due.localeCompare(b.due));
  const tasks = state.tasks
    .map((t) => ({ ...t, booking: state.bookings.find((b) => b.id === t.bookingId) }))
    .filter((t) => !t.done && (!t.booking || inScope(state, t.booking)) && (can('crew.assign') || (me && t.memberId === me.id)))
    .sort((a, b) => a.due.localeCompare(b.due));
  const leadOf = (b) => state.leads.find((l) => l.id === b.leadId) || {};
  const partner = state.partners.find((p) => p.id === state.partnerId);
  const ownerMember = state.members.find((m) => inScope(state, m) && m.role === 'owner');
  const who = me || ownerMember || { name: partner.name };
  const enq = dealsOn(state);
  const isPhoto = partner.category === 'photography';
  const openEnq = leads.filter((l) => !l.isDeal && !['won', 'lost'].includes(l.status)).length;
  const pipeline = leads.filter((l) => l.isDeal && !['won', 'lost'].includes(l.status)).reduce((a, l) => a + dealAmount(state, l), 0);
  // Owner / manager looking at all branches: one row per branch.
  const branchRows =
    activeBranch(state) === 'all' && activeBranches(state).length > 1
      ? activeBranches(state).map((br) => {
          const bl = leads.filter((l) => l.branchId === br.id);
          const bb = bookings.filter((b) => b.branchId === br.id && b.status !== 'cancelled');
          const bi = invoices.filter((i) => i.branchId === br.id);
          return { ...br, open: bl.filter((l) => !['won', 'lost'].includes(l.status)).length, upcoming: bb.filter((b) => ['booked', 'accepted'].includes(b.status) && b.eventDate >= today).length, collected: bi.reduce((a, i) => a + invoiceTotals(i).paid, 0), due: bi.reduce((a, i) => a + invoiceTotals(i).due, 0) };
        })
      : [];
  const first = who.name.split(' ')[0];

  return (
    <>
      <Welcome name={who.name} initials={partner.name.split(' ').map((w) => w[0]).join('').slice(0, 2)} homeLabel={`${first}'s Home`} />
      {isPhoto ? (
        <PhotoHome />
      ) : (
        <Kpis
          items={[
            can('leads.view') && (enq ? { label: 'Open Enquiries', value: openEnq, to: '/partner/leads' } : { label: 'My Open Leads', value: myOpen.length, to: '/partner/leads' }),
            can('leads.view') && enq && { label: 'Deals Pipeline', value: inrShort(pipeline), to: '/partner/deals' },
            can('leads.view') && { label: 'Follow-ups Due', value: followUps.length, to: '/partner/leads' },
            can('bookings.view') && { label: 'Upcoming Bookings', value: upcoming.length, to: '/partner/bookings' },
            can('invoices.view') ? { label: 'Collected This Month', value: inr(collected), to: '/partner/payments' } : can('quotes.send') && { label: 'Quotes Sent This Month', value: quotesThisMonth, to: '/partner/quotes' },
            can('invoices.view') && !can('leads.view') && { label: 'Pending Payments', value: inrShort(pending), to: '/partner/invoices' },
          ]}
        />
      )}
      <div className="zc-comps">
        {branchRows.length > 0 && can('bookings.view') && (
          <Component
            title="Branches"
            rows={branchRows}
            columns={[
              { label: 'Branch', render: (b) => <b>{b.name}{b.isMain ? ' (main)' : ''}</b> },
              { label: 'City', render: (b) => b.city },
              { label: 'Open Leads', align: 'right', render: (b) => b.open },
              { label: 'Upcoming Bookings', align: 'right', render: (b) => b.upcoming },
              can('invoices.view') && { label: 'Collected', align: 'right', render: (b) => inr(b.collected) },
              can('invoices.view') && { label: 'Pending', align: 'right', render: (b) => inr(b.due) },
            ].filter(Boolean)}
          />
        )}
        {can('leads.view') && (
          <Component
            title="My Open Leads"
            rows={myOpen}
            onRow={(l) => navigate('/partner/leads/' + l.id)}
            columns={[
              { label: 'Lead Name', render: (l) => l.contactName },
              { label: 'Event Date', render: (l) => fmtDate(l.eventDate) },
              { label: 'Lead Status', render: (l) => <Badge status={l.status}>{LEAD_STAGE_LABEL[l.status]}</Badge> },
              { label: 'Lead Owner', render: (l) => memberName(l.assignedTo) },
            ]}
          />
        )}
        {can('leads.view') && (
          <Component title="Leads By Stage">
            <Funnel data={LEAD_STAGES.filter((s) => s !== 'lost').map((s) => ({ k: LEAD_STAGE_LABEL[s], v: leads.filter((l) => l.status === s).length }))} />
          </Component>
        )}
        {can('bookings.view') && (
          <Component
            title="Upcoming Bookings"
            rows={upcoming}
            onRow={(b) => navigate('/partner/bookings/' + b.id)}
            empty="No upcoming bookings"
            columns={[
              { label: 'Booking Number', render: (b) => b.number },
              { label: 'Customer', render: (b) => leadOf(b).contactName },
              { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
              { label: 'Status', render: (b) => <Badge status={b.status} /> },
            ]}
          />
        )}
        {can('invoices.view') && (
          <Component
            title="Payments Due"
            rows={dues}
            onRow={(d) => navigate('/partner/invoices/' + d.inv.id)}
            empty="Nothing pending"
            columns={[
              { label: 'Customer', render: (d) => d.inv.billTo },
              { label: 'Installment', render: (d) => d.label },
              { label: 'Amount', align: 'right', render: (d) => inr(d.amount) },
              { label: 'Due Date', render: (d) => <span className={d.due < today ? 'red' : ''}>{fmtDate(d.due)}</span> },
            ]}
          />
        )}
        {(can('crew.assign') || can('tasks.view_own')) && (
          <Component
            title="My Open Tasks"
            rows={tasks}
            onRow={(t) => t.booking && navigate(can('bookings.view') ? '/partner/bookings/' + t.booking.id : '/partner/jobs')}
            empty="No open tasks"
            columns={[
              { label: 'Subject', render: (t) => t.title },
              { label: 'Due Date', render: (t) => fmtDate(t.due) },
              { label: 'Status', render: () => 'Not Started' },
              { label: 'Assigned To', render: (t) => memberName(t.memberId) },
            ]}
          />
        )}
        {can('team.manage') && (
          <Component
            title="Recent Activity"
            rows={state.activity.filter((a) => a.partnerId === state.partnerId)}
            columns={[
              { label: 'User', render: (a) => a.actor },
              { label: 'Action', render: (a) => a.action },
              { label: 'Time', render: (a) => fmtDateTime(a.at) },
            ]}
          />
        )}
      </div>
    </>
  );
}
