import { useState } from 'react';
import { fmtDate, fmtDateTime, fmtDay, inr, todayISO } from '../../config';
import { Link, navigate } from '../../router';
import { invoiceTotals, refundPreview, useCurrentMember, usePerms, useStore } from '../../store';
import { Avatar, Badge, Button, Card, Empty, Field, Icon, KeyValue, Legend, Modal, MonthCalendar, Table } from '../../components/ui';
import { ChatView, QuoteDoc } from '../../components/Shared';
import { packFor } from '../../categories/packs';
import { BlueprintBar, DetailLayout, FieldGrid, ListView, MiniTable, ModuleHeader, RecordHeader, Section, StagePath, Timeline } from '../../components/crm';
import { BOOKING_LABEL, BUYER_LABEL, CHANNEL_LABEL, CREW_LABEL, bookingFlags, bookingStatus, contractStatus, crewStatus, schedPaid } from '../../lifecycle';
import { BookingChanges, BuyerDetails, ContractBadge, ScheduleBadge } from '../../components/Lifecycle';
import { InventorySection, RunSheet, ShipmentsSection, TrialsSection } from '../../components/Ops';
import { holdExpired } from '../../ops';
import { LeaveCard } from './Phase2';
import { activeBranch, activeBranches, branchName, inScope } from '../../accounts';

const leadOf = (state, b) => state.leads.find((l) => l.id === b.leadId) || {};

const BOOKING_STAGES = [
  { id: 'accepted', label: 'Accepted' },
  { id: 'booked', label: 'Confirmed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'reviewed', label: 'Reviewed' },
];
const StatusBadge = ({ b }) => {
  const st = bookingStatus(b);
  return <Badge status={st}>{BOOKING_LABEL[st]}</Badge>;
};
const BOOKING_COLORS = { accepted: '#8b5cf6', booked: '#16a34a', completed: '#0f766e', reviewed: '#9aa3b2', cancelled: '#d9453b' };

export function PartnerBookings() {
  const { state } = useStore();
  const today = todayISO();
  const rows = state.bookings
    .filter((b) => inScope(state, b))
    .map((b) => {
      const inv = state.invoices.find((i) => i.id === b.invoiceId);
      const t = inv ? invoiceTotals(inv) : { paid: 0, due: 0 };
      return { ...b, lead: leadOf(state, b), paid: t.paid, balance: t.due, crewCount: state.crew.filter((c) => c.bookingId === b.id).length, flags: bookingFlags(b, state), contract: contractStatus(b) };
    });
  return (
    <ListView
      module={{ singular: 'Booking', plural: 'Bookings' }}
      rows={rows}
      onRow={(b) => navigate('/partner/bookings/' + b.id)}
      views={[
        { id: 'upcoming', label: 'Upcoming Bookings', filter: (b) => ['accepted', 'booked'].includes(b.status) && b.eventDate >= today },
        { id: 'all', label: 'All Bookings', filter: () => true },
        { id: 'advance', label: 'Advance Pending', filter: (b) => b.status === 'accepted' },
        { id: 'nocrew', label: 'No Crew Assigned', filter: (b) => ['accepted', 'booked'].includes(b.status) && b.crewCount === 0 },
        { id: 'changes', label: 'Change Requests', filter: (b) => b.flags.includes('change_requested') },
        { id: 'countersign', label: 'Contract to Countersign', filter: (b) => b.contract === 'partially_signed' },
        { id: 'b2b', label: 'B2B Bookings', filter: (b) => b.buyerType && b.buyerType !== 'individual' },
        { id: 'completed', label: 'Completed Bookings', filter: (b) => ['completed', 'reviewed'].includes(b.status) },
        { id: 'cancelled', label: 'Cancelled Bookings', filter: (b) => b.status === 'cancelled' },
      ]}
      filterFields={[
        { key: 'status', label: 'Booking Status', type: 'select', get: (b) => b.status },
        { key: 'eventType', label: 'Event Type', type: 'select', get: (b) => b.lead.eventType },
        { key: 'contract', label: 'Contract', type: 'select', get: (b) => b.contract },
        { key: 'buyerType', label: 'Buyer Type', type: 'select', get: (b) => b.buyerType || 'individual', options: Object.entries(BUYER_LABEL).map(([value, label]) => ({ value, label })) },
        { key: 'customer', label: 'Customer Name', type: 'text', get: (b) => b.lead.contactName },
      ]}
      columns={[
        { key: 'number', label: 'Booking Number' },
        { key: 'customer', label: 'Customer', render: (b) => (b.buyerOrgName ? b.buyerOrgName : b.lead.contactName), sortValue: (b) => b.buyerOrgName || b.lead.contactName },
        { key: 'eventType', label: 'Event Type', render: (b) => b.lead.eventType, sortValue: (b) => b.lead.eventType },
        { key: 'eventDate', label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
        ...(activeBranch(state) === 'all' && activeBranches(state).length > 1 ? [{ key: 'branchId', label: 'Branch', render: (b) => branchName(state, b.branchId) || '-', sortValue: (b) => branchName(state, b.branchId) }] : []),
        { key: 'status', label: 'Status', render: (b) => (
          <span className="row gap-xs">
            <StatusBadge b={b} />
            {b.flags.includes('change_requested') && <Badge status="change_requested" />}
            {b.flags.includes('disputed') && <Badge status="disputed" />}
          </span>
        ) },
        { key: 'total', label: 'Amount', align: 'right', render: (b) => inr(b.total) },
        { key: 'paid', label: 'Received', align: 'right', render: (b) => inr(b.paid) },
        { key: 'balance', label: 'Balance', align: 'right', render: (b) => inr(b.balance) },
        { key: 'crewCount', label: 'Crew', align: 'right' },
        { key: 'contractSigned', label: 'Contract', render: (b) => <ContractBadge booking={b} />, sortValue: (b) => b.contract },
      ]}
      kanban={{
        groups: [...BOOKING_STAGES, { id: 'cancelled', label: 'Cancelled' }].map((s) => ({ ...s, color: BOOKING_COLORS[s.id] })),
        groupOf: (b) => b.status,
        total: (items) => inr(items.reduce((a, b) => a + b.total, 0)),
        card: (b) => (
          <>
            <b>{b.buyerOrgName || b.lead.contactName}</b>
            <div className="kv-line">
              <span>{b.number}</span>
              <span>{fmtDate(b.eventDate)}</span>
            </div>
            <div className="kv-line">
              <span>Balance</span>
              <span className="zc-ink bold">{inr(b.balance)}</span>
            </div>
          </>
        ),
      }}
    />
  );
}

export function PartnerBookingDetail({ id }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [tab, setTab] = useState('Overview');
  const [assign, setAssign] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('Photographer');
  const [callTime, setCallTime] = useState('06:00');
  const [record, setRecord] = useState(null);
  const [method, setMethod] = useState('Cash');
  const [cancel, setCancel] = useState(false);
  const [task, setTask] = useState('');
  const [taskMember, setTaskMember] = useState('');
  const [partAmount, setPartAmount] = useState('');
  const b = state.bookings.find((x) => x.id === id && inScope(state, x));
  if (!b) return <Empty title="Booking not found" />;
  const lead = leadOf(state, b);
  const partner = state.partners.find((p) => p.id === b.partnerId);
  const quote = state.quotes.find((q) => q.id === b.quoteId);
  const inv = state.invoices.find((i) => i.id === b.invoiceId);
  const t = inv && invoiceTotals(inv);
  const crew = state.crew.filter((c) => c.bookingId === b.id);
  const tasks = state.tasks.filter((x) => x.bookingId === b.id);
  const members = state.members.filter((m) => inScope(state, m) && m.status === 'active');
  const expenses = state.expenses.filter((x) => x.bookingId === b.id);
  const cost = expenses.reduce((a, x) => a + x.amount, 0);
  const memberName = (mid) => (members.find((m) => m.id === mid) || {}).name || '-';
  const active = ['accepted', 'booked'].includes(b.status);
  const preview = refundPreview(state, b, 'partner');
  const showMoney = can('invoices.view') || can('payments.record');
  const listing = state.listings.find((l) => l.id === b.listingId) || { category: '', attributes: {} };
  const pack = packFor(listing.category);
  const PackPanel = pack.PartnerPanel;

  const st = bookingStatus(b);
  const flags = bookingFlags(b, state);
  const cs = contractStatus(b);
  const po = b.poId && state.pos.find((p) => p.id === b.poId);
  const transitions = [];
  if (cs === 'partially_signed' && can('quotes.send')) transitions.push({ label: 'Countersign Contract', primary: true, onClick: () => actions.countersignContract(b.id) });
  if (b.status === 'booked' && can('crew.assign')) transitions.push({ label: 'Mark as Completed', primary: cs !== 'partially_signed', onClick: () => actions.completeBooking(b.id) });
  if (b.status === 'booked' && b.eventDate <= todayISO() && !b.noShow && can('crew.assign')) transitions.push({ label: 'Customer No-show', onClick: () => actions.markNoShow(b.id, 'customer') });
  const holdLapsed = b.status === 'accepted' && state.blocks.some((bl) => bl.bookingId === b.id && holdExpired(state, bl));
  if (b.status === 'accepted' && can('quotes.send')) transitions.push({ label: holdLapsed ? 'Re-hold Date (2 days)' : 'Extend Hold', onClick: () => actions.extendHold(b.id, 2) });
  if (active && can('crew.assign')) transitions.push({ label: 'Assign Crew', onClick: () => setAssign(true) });
  if (active && can('crew.assign')) transitions.push({ label: 'Cancel Booking', onClick: () => setCancel(true) });
  const bpNote = holdLapsed
    ? `Date hold expired on ${fmtDate(b.holdUntil)} without the advance. The date is free for other customers until you re-hold it.`
    : b.noShow
    ? `Marked as ${b.noShow} no-show.`
    : flags.includes('change_requested')
    ? 'The customer asked for a change. Review it under Change Requests.'
    : cs === 'partially_signed'
    ? 'Customer signed the contract. Countersign to complete it.'
    : b.status === 'accepted'
      ? `Waiting for the customer to ${b.contractSigned ? '' : 'sign the contract and '}pay the advance. Date is held as tentative${b.holdUntil ? ' until ' + fmtDate(b.holdUntil) : ''}.`
      : b.status === 'cancelled'
      ? `Cancelled by ${b.cancelledBy}: ${b.cancelReason}`
      : b.status === 'completed'
      ? 'Review request sent to the customer.'
      : null;

  return (
    <>
      <RecordHeader
        back="/partner/bookings"
        title={`${b.number} - ${b.buyerOrgName || lead.contactName}`}
        subtitle={`${lead.eventType} on ${fmtDay(b.eventDate)} - ${lead.guests} guests${b.rescheduledFrom ? ' - moved from ' + fmtDate(b.rescheduledFrom) : ''}`}
        badges={
          <>
            <StatusBadge b={b} />
            {flags.map((f) => (
              <Badge key={f} status={f} />
            ))}
            {b.buyerType && b.buyerType !== 'individual' && <Badge status={b.buyerType}>{BUYER_LABEL[b.buyerType]}</Badge>}
          </>
        }
        actions={
          <>
            {can('leads.view') && (
              <Link to={'/partner/leads/' + lead.id} className="zc-btn">
                View Lead
              </Link>
            )}
            {inv && can('invoices.view') && (
              <Link to={'/partner/invoices/' + inv.id} className="zc-btn">
                View Invoice
              </Link>
            )}
          </>
        }
      />
      <StagePath stages={BOOKING_STAGES} current={b.status === 'cancelled' || st === 'no_show' ? 'accepted' : st} lost={b.status === 'cancelled' || st === 'no_show'} />
      <BlueprintBar state={BOOKING_LABEL[st]} transitions={transitions} note={bpNote} />

      <DetailLayout
        tab={tab}
        onTab={setTab}
        nav={[
          { id: 'binfo', label: 'Booking Information' },
          lead.buyer && { id: 'buyer', label: 'Business Buyer' },
          { id: 'changes', label: 'Change Requests', count: state.bookingChanges.filter((c) => c.bookingId === b.id).length },
          { id: 'runsheet', label: 'Run Sheet', count: (state.runSheets[b.id] || []).length },
          state.inventory.some((i) => i.partnerId === b.partnerId) && { id: 'inventory', label: 'Equipment & Inventory', count: state.reservations.filter((r) => r.bookingId === b.id).length },
          state.shipments.some((x) => x.bookingId === b.id) && { id: 'shipments', label: 'Shipments', count: state.shipments.filter((x) => x.bookingId === b.id).length },
          ...(pack.cfg
            ? [{ id: pack.id + '-details', label: pack.cfg.partnerTitle }, ...((b.details && b.details.sections) || []).map((s) => ({ id: pack.id + '-' + s.id, label: s.title }))]
            : pack.id === 'venue'
            ? [{ id: 'venue', label: 'Hall & Session' }]
            : pack.id === 'catering'
            ? [{ id: 'catering', label: 'Menu & Headcount' }]
            : pack.id === 'photography'
            ? [{ id: 'shoots', label: 'Shoot Schedule' }, { id: 'deliverables', label: 'Deliverables' }]
            : []),
          showMoney && { id: 'payments', label: 'Payment Schedule', count: inv ? inv.schedule.length : 0 },
          { id: 'crew', label: 'Crew Assignments', count: crew.length },
          { id: 'tasks', label: 'Tasks', count: tasks.length },
          can('finance.view') && { id: 'expenses', label: 'Expenses', count: expenses.length },
          quote && can('leads.view') && { id: 'quote', label: 'Accepted Quote' },
        ].filter(Boolean)}
      >
        {tab === 'Timeline' ? (
          <Section title="Timeline">
            <Timeline
              items={[
                b.cancelledAt && { id: 'c', icon: 'x', body: `Cancelled by ${b.cancelledBy}`, meta: fmtDateTime(b.cancelledAt) },
                b.completedAt && { id: 'd', icon: 'check', body: 'Marked as completed', meta: fmtDateTime(b.completedAt) },
                ...(inv ? inv.schedule.filter((s) => s.paidAt).map((s) => ({ id: s.id, icon: 'rupee', body: `${s.label} of ${inr(s.amount)} received (${s.method})`, meta: fmtDateTime(s.paidAt) })) : []),
                b.signedAt && { id: 's', icon: 'edit', body: 'Contract e-signed by customer', meta: fmtDateTime(b.signedAt) },
                { id: 'cr', icon: 'briefcase', body: 'Booking created from accepted quote', meta: fmtDateTime(b.createdAt) },
              ].filter(Boolean)}
            />
          </Section>
        ) : (
          <>
            <Section id="binfo" title="Booking Information">
              <FieldGrid
                fields={[
                  ['Booking Number', b.number],
                  ['Status', <Badge status={b.status} />],
                  ['Customer', lead.contactName],
                  ['Phone', lead.contactPhone],
                  ['Event Type', lead.eventType],
                  ['Event Date', fmtDay(b.eventDate)],
                  ['No. of Guests', lead.guests],
                  ['Contract', <span><ContractBadge booking={b} />{b.signedAt ? <span className="tiny muted"> customer {fmtDate(b.signedAt)}</span> : null}{b.partnerSignedAt ? <span className="tiny muted">, you {fmtDate(b.partnerSignedAt)}</span> : null}</span>],
                  ['Channel', CHANNEL_LABEL[b.channel] || 'App request'],
                  po && ['Purchase Order', <Link to={'/partner/purchase-orders/' + po.id} className="zc-link">{po.number}</Link>],
                  b.rescheduledFrom && ['Original Date', fmtDate(b.rescheduledFrom)],
                  showMoney && ['Booking Amount', inr(b.total)],
                  showMoney && t && ['Balance Due', inr(t.due)],
                  can('finance.view') && ['Profit', <b className={b.total - cost >= 0 ? 'green' : 'red'}>{inr(b.total - cost)} ({b.total ? Math.round(((b.total - cost) / b.total) * 100) : 0}%)</b>],
                  ['Created Time', fmtDateTime(b.createdAt)],
                ]}
              />
              <div className="zc-section-sub">Requirements</div>
              <FieldGrid cols={1} fields={[['Description', lead.requirements]]} />
            </Section>

            {lead.buyer && (
              <Section id="buyer" title="Business Buyer">
                <BuyerDetails lead={lead} booking={b} />
              </Section>
            )}

            <Section id="changes" title="Change Requests" count={state.bookingChanges.filter((c) => c.bookingId === b.id).length}>
              <BookingChanges booking={b} side="partner" />
            </Section>

            {PackPanel && <PackPanel booking={b} lead={lead} listing={listing} />}

            <RunSheet booking={b} editable={can('crew.assign') && active} />
            <InventorySection booking={b} editable={can('crew.assign') && active} />
            <ShipmentsSection booking={b} editable={can('crew.assign') && b.status !== 'cancelled'} />
            <TrialsSection lead={lead} side="partner" />

            {showMoney && inv && (
              <Section id="payments" title="Payment Schedule" count={inv.schedule.length} actions={<span className="small muted">{inr(t.paid)} of {inr(t.total)} received</span>}>
                <MiniTable
                  rows={inv.schedule}
                  columns={[
                    { label: 'Installment', render: (s) => s.label },
                    { label: 'Amount', align: 'right', render: (s) => inr(s.amount) },
                    { label: 'Due Date', render: (s) => fmtDate(s.due) },
                    { label: 'Status', render: (s) => <ScheduleBadge s={s} /> },
                    { label: 'Received', render: (s) => (s.paidAt ? `${fmtDate(s.paidAt)} - ${s.method}${s.channel === 'online' ? ' (app)' : ''}` : '-') },
                    {
                      label: '',
                      align: 'right',
                      render: (s) =>
                        !s.paidAt && !s.waived && can('payments.record') && b.status !== 'cancelled' ? (
                          <button className="zc-rl-link" onClick={() => setRecord(s)}>
                            Record payment
                          </button>
                        ) : null,
                    },
                  ]}
                />
              </Section>
            )}

            <Section id="crew" title="Crew Assignments" count={crew.length} actions={can('crew.assign') && active && <button className="zc-rl-link" onClick={() => setAssign(true)}>+ Assign</button>}>
              <MiniTable
                rows={crew}
                empty="No crew assigned yet."
                columns={[
                  { label: 'Member', render: (c) => memberName(c.memberId) },
                  { label: 'Role on the day', render: (c) => c.role },
                  { label: 'Call Time', render: (c) => c.callTime },
                  { label: 'Status', render: (c) => <Badge status={crewStatus(c)}>{CREW_LABEL[crewStatus(c)]}</Badge> },
                  { label: 'Check-in', render: (c) => (c.checkInAt ? fmtDateTime(c.checkInAt).split(', ')[1] + (c.checkOutAt ? ' - ' + fmtDateTime(c.checkOutAt).split(', ')[1] : '') : '-') },
                  {
                    label: '',
                    align: 'right',
                    render: (c) =>
                      can('crew.assign') ? (
                        <span className="row gap-s" style={{ justifyContent: 'flex-end' }}>
                          {b.eventDate <= todayISO() && ['accepted', 'assigned'].includes(crewStatus(c)) && (
                            <button className="zc-rl-link" onClick={() => actions.setCrewStatus(c.id, 'no_show')}>
                              No-show
                            </button>
                          )}
                          <button className="zc-rl-link" onClick={() => actions.removeCrew(c.id)}>
                            Remove
                          </button>
                        </span>
                      ) : null,
                  },
                ]}
              />
            </Section>

            <Section id="tasks" title="Tasks" count={tasks.length}>
              <div className="stack-s">
                {tasks.length === 0 && <div className="muted small">No tasks.</div>}
                {tasks.map((x) => (
                  <label key={x.id} className="check">
                    <input type="checkbox" checked={x.done} onChange={() => actions.toggleTask(x.id)} />
                    <span className={x.done ? 'muted' : ''} style={{ textDecoration: x.done ? 'line-through' : 'none' }}>
                      {x.title}
                    </span>
                    <span className="tiny muted">
                      {memberName(x.memberId)} - due {fmtDate(x.due)}
                    </span>
                  </label>
                ))}
                {can('crew.assign') && (
                  <div className="row gap-s">
                    <input className="input input-sm" placeholder="New task" value={task} onChange={(e) => setTask(e.target.value)} />
                    <select className="select input-sm" style={{ width: 160 }} value={taskMember} onChange={(e) => setTaskMember(e.target.value)}>
                      <option value="">Assign to</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="zc-btn zc-btn-primary"
                      disabled={!task || !taskMember}
                      onClick={() => {
                        actions.addTask({ bookingId: b.id, memberId: taskMember, title: task, due: b.eventDate });
                        setTask('');
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </Section>

            {can('finance.view') && (
              <Section id="expenses" title="Expenses" count={expenses.length} actions={<Link to="/partner/expenses" className="zc-rl-link">+ New Expense</Link>}>
                <MiniTable
                  rows={expenses}
                  empty="No expenses recorded for this booking."
                  columns={[
                    { label: 'Category', render: (x) => x.category },
                    { label: 'Paid To', render: (x) => x.paidTo },
                    { label: 'Date', render: (x) => fmtDate(x.date) },
                    { label: 'Amount', align: 'right', render: (x) => inr(x.amount) },
                  ]}
                />
              </Section>
            )}

            {quote && can('leads.view') && (
              <Section id="quote" title={`Accepted Quote - ${quote.number} v${quote.version}`}>
                <QuoteDoc quote={quote} partner={partner} lead={lead} compact />
              </Section>
            )}
          </>
        )}
      </DetailLayout>

      <Modal
        open={assign}
        title="Assign crew"
        onClose={() => setAssign(false)}
        footer={
          <Button
            disabled={!memberId}
            onClick={() => {
              actions.assignCrew(b.id, memberId, role, callTime);
              setAssign(false);
            }}
          >
            Assign
          </Button>
        }
      >
        <div className="stack">
          <Field label="Team member">
            <select className="select" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select</option>
              {members.map((m) => {
                const busy = state.crew.some((c) => c.memberId === m.id && c.bookingId !== b.id && (state.bookings.find((x) => x.id === c.bookingId) || {}).eventDate === b.eventDate);
                const leave = state.leaves.find((l) => l.memberId === m.id && l.date === b.eventDate);
                return (
                  <option key={m.id} value={m.id} disabled={busy || !!leave}>
                    {m.name} - {m.title} {leave ? `(on leave: ${leave.reason})` : busy ? '(busy that day)' : ''}
                  </option>
                );
              })}
            </select>
          </Field>
          <div className="grid grid-2">
            <Field label="Role on the day">
              <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>
            <Field label="Call time">
              <input className="input" type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!record}
        title="Record payment"
        onClose={() => setRecord(null)}
        footer={
          <Button
            onClick={() => {
              actions.payInstallment(inv.id, record.id, method, 'offline', partAmount ? Number(partAmount) : undefined);
              setRecord(null);
              setPartAmount('');
            }}
          >
            Mark as received
          </Button>
        }
      >
        {record && (
          <div className="stack">
            <p>
              {record.label}: <b>{inr(record.amount - schedPaid(record))}</b> {schedPaid(record) > 0 && <span className="muted small">({inr(schedPaid(record))} already received)</span>}
            </p>
            <Field label="Amount received" hint="Leave empty for the full amount. A smaller amount is saved as a part payment.">
              <input className="input" type="number" value={partAmount} placeholder={String(record.amount - schedPaid(record))} onChange={(e) => setPartAmount(e.target.value)} />
            </Field>
            <Field label="Received via">
              <div className="chips">
                {['Cash', 'UPI', 'Bank transfer', 'Cheque'].map((m) => (
                  <button key={m} className={'chip ' + (method === m ? 'active' : '')} onClick={() => setMethod(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={cancel}
        title="Cancel this booking?"
        onClose={() => setCancel(false)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.cancelBooking(b.id, 'partner', 'Partner unavailable');
              setCancel(false);
            }}
          >
            Cancel booking
          </Button>
        }
      >
        <div className="notice notice-danger">
          <Icon name="alert" />
          <span>When a partner cancels, the customer gets a full refund of {inr(preview.paid)} and your listing gets a cancellation strike.</span>
        </div>
      </Modal>
    </>
  );
}

export function PartnerCalendar() {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [picked, setPicked] = useState(null);
  const listing = state.listings.find((l) => l.partnerId === state.partnerId);
  const blocks = state.blocks.filter((b) => inScope(state, b));
  const bookings = state.bookings.filter((b) => inScope(state, b) && b.status !== 'cancelled');
  const cap = listing.capacity || 1;
  const dayInfo = (iso) => {
    const bl = blocks.filter((b) => b.date === iso);
    const bk = bookings.filter((b) => b.eventDate === iso);
    const used = bl.length;
    const status = used >= cap ? 'taken' : used > 0 ? 'limited' : null;
    return {
      status,
      allowPast: true,
      content: (
        <>
          {bk.map((b) => (
            <span key={b.id} className={'cal-chip ' + (b.status === 'accepted' ? 'tentative' : 'booked')}>
              {leadOf(state, b).contactName}
            </span>
          ))}
          {bl
            .filter((x) => x.source === 'manual')
            .slice(0, 1)
            .map((x) => (
              <span key={x.id} className="cal-chip manual">
                {x.note || 'Blocked'}
              </span>
            ))}
        </>
      ),
    };
  };
  const pickedBlocks = picked ? blocks.filter((b) => b.date === picked) : [];
  const pickedBookings = picked ? bookings.filter((b) => b.eventDate === picked) : [];
  const manual = pickedBlocks.find((b) => b.source === 'manual');
  return (
    <>
      <ModuleHeader title="Calendar" subtitle={`You can take ${cap} event${cap > 1 ? 's' : ''} a day. Dates fill up automatically from bookings; block dates for offline work.`} />
      <div className="grid grid-side">
        <Card>
          <MonthCalendar getDay={dayInfo} onPick={setPicked} selected={picked} />
          <Legend items={[['limited', 'Partly booked'], ['taken', 'Fully booked'], ['booked', 'Confirmed booking'], ['tentative', 'Tentative (advance due)']]} />
        </Card>
        <aside className="sticky">
          <Card title={picked ? fmtDay(picked) : 'Pick a date'}>
            {!picked ? (
              <p className="muted">Select a day to see bookings or block it.</p>
            ) : (
              <div className="stack-s">
                <div className="small muted">
                  {pickedBlocks.length} of {cap} slots used
                </div>
                {pickedBookings.map((b) => (
                  <Link key={b.id} to={'/partner/bookings/' + b.id} className="row gap-s">
                    <Icon name="briefcase" className="brand" />
                    <span className="grow">
                      {leadOf(state, b).contactName} - {b.number}
                    </span>
                    <Badge status={b.status} />
                  </Link>
                ))}
                {pickedBlocks
                  .filter((x) => x.source === 'manual')
                  .map((x) => (
                    <div key={x.id} className="row gap-s">
                      <Icon name="lock" className="muted" />
                      <span className="grow">{x.note || 'Blocked manually'}</span>
                    </div>
                  ))}
                {can('calendar.manage') && (
                  <Button variant={manual ? 'secondary' : 'primary'} block onClick={() => actions.toggleBlock(picked, 'Offline booking')} disabled={!manual && pickedBlocks.length >= cap}>
                    {manual ? 'Remove one manual block' : 'Block a slot'}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

export function CrewTasks() {
  const { state, actions } = useStore();
  const members = state.members.filter((m) => inScope(state, m) && m.status === 'active');
  const today = todayISO();
  const upcoming = state.bookings.filter((b) => inScope(state, b) && ['accepted', 'booked'].includes(b.status) && b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return (
    <>
      <ModuleHeader title="Crew" subtitle="Who is working which event, and what is still open." />
      <div className="grid grid-2">
        {upcoming.map((b) => {
          const crew = state.crew.filter((c) => c.bookingId === b.id);
          const tasks = state.tasks.filter((t) => t.bookingId === b.id);
          return (
            <Card key={b.id} title={`${leadOf(state, b).contactName} - ${fmtDay(b.eventDate)}`} subtitle={b.number} actions={<Link to={'/partner/bookings/' + b.id} className="link small">Manage</Link>}>
              <div className="row gap-s wrap mb">
                {crew.length === 0 && <Badge tone="red">No crew assigned</Badge>}
                {crew.map((c) => {
                  const m = members.find((x) => x.id === c.memberId);
                  return (
                    <span key={c.id} className="chip">
                      <Avatar name={m ? m.name : '?'} size={20} /> {m ? m.name : '?'} - {c.role}
                    </span>
                  );
                })}
              </div>
              {tasks.map((t) => (
                <label key={t.id} className="check small">
                  <input type="checkbox" checked={t.done} onChange={() => actions.toggleTask(t.id)} />
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                </label>
              ))}
            </Card>
          );
        })}
        {upcoming.length === 0 && <Empty title="No upcoming events" />}
      </div>
      <Card title="Team availability" className="mt">
        <Table
          rows={members}
          columns={[
            { label: 'Member', render: (m) => <span className="row gap-s"><Avatar name={m.name} size={26} /> {m.name}</span> },
            { label: 'Title', key: 'title' },
            { label: 'Upcoming events', render: (m) => state.crew.filter((c) => c.memberId === m.id && upcoming.some((b) => b.id === c.bookingId)).length },
            { label: 'Open tasks', render: (m) => state.tasks.filter((t) => t.memberId === m.id && !t.done).length },
          ]}
        />
      </Card>
      <LeaveCard />
    </>
  );
}

// What a crew member (photographer, decorator...) sees: only their assigned events and tasks.
export function MyJobs() {
  const { state, actions } = useStore();
  const me = useCurrentMember();
  if (!me) return <Empty title="Switch to a team member role" />;
  const mine = state.crew.filter((c) => c.memberId === me.id && crewStatus(c) !== 'declined').map((c) => ({ c, b: state.bookings.find((b) => b.id === c.bookingId) })).filter((x) => x.b && x.b.status !== 'cancelled');
  const today = todayISO();
  mine.sort((a, b) => a.b.eventDate.localeCompare(b.b.eventDate));
  return (
    <>
      <ModuleHeader title="My Jobs" subtitle={`Hi ${me.name.split(' ')[0]}, here are the events you are assigned to.`} />
      <div className="stack">
        {mine.length === 0 && <Empty icon="camera" title="No jobs assigned yet" />}
        {mine.map(({ c, b }) => {
          const lead = leadOf(state, b);
          const tasks = state.tasks.filter((t) => t.bookingId === b.id && t.memberId === me.id);
          const past = b.eventDate < today;
          const cst = crewStatus(c);
          const eventDay = b.eventDate === today || (b.eventDate <= today && cst === 'checked_in');
          return (
            <Card key={c.id} title={`${lead.eventType} - ${b.buyerOrgName || lead.contactName}`} subtitle={fmtDay(b.eventDate)} actions={<Badge status={cst}>{CREW_LABEL[cst]}</Badge>}>
              {cst === 'assigned' && (
                <div className="notice notice-warning mb">
                  <Icon name="clock" />
                  <span className="grow">You have been assigned to this event. Can you make it?</span>
                  <Button size="sm" onClick={() => actions.setCrewStatus(c.id, 'accepted')}>
                    Accept
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => actions.setCrewStatus(c.id, 'declined')}>
                    Decline
                  </Button>
                </div>
              )}
              {(eventDay || (!past && cst === 'accepted' && b.eventDate <= today)) && cst === 'accepted' && (
                <div className="notice mb">
                  <Icon name="pin" />
                  <span className="grow">Event day. Check in when you reach the venue (call time {c.callTime}).</span>
                  <Button size="sm" onClick={() => actions.setCrewStatus(c.id, 'checked_in')}>
                    Check in
                  </Button>
                </div>
              )}
              {cst === 'checked_in' && (
                <div className="notice mb">
                  <Icon name="check" />
                  <span className="grow">Checked in at {fmtDateTime(c.checkInAt).split(', ')[1]}.</span>
                  <Button size="sm" onClick={() => actions.setCrewStatus(c.id, 'checked_out')}>
                    Check out
                  </Button>
                </div>
              )}
              <KeyValue
                rows={[
                  ['Your role', c.role],
                  ['Call time', c.callTime],
                  ['Guests', lead.guests],
                  ['Customer phone', lead.contactPhone],
                ]}
              />
              <p className="small muted mt">{lead.requirements}</p>
              <h4 className="mt">My tasks</h4>
              <div className="stack-s mt-s">
                {tasks.length === 0 && <p className="muted small">No tasks.</p>}
                {tasks.map((t) => (
                  <label key={t.id} className="check">
                    <input type="checkbox" checked={t.done} onChange={() => actions.toggleTask(t.id)} />
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                    <span className="tiny muted">due {fmtDate(t.due)}</span>
                  </label>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function PartnerInbox({ threadId }) {
  const { state } = useStore();
  const [quote, setQuote] = useState(null);
  const lead = quote && state.leads.find((l) => l.id === quote.leadId);
  const partner = state.partners.find((p) => p.id === state.partnerId);
  return (
    <>
      <ModuleHeader title="Chats" subtitle="Conversations with customers from the app. A new chat creates a lead automatically." />
      <ChatView side="partner" threadId={threadId} basePath="/partner/inbox" onOpenQuote={setQuote} />
      <Modal open={!!quote} title="Quote" onClose={() => setQuote(null)} wide>
        {quote && <QuoteDoc quote={quote} partner={partner} lead={lead} />}
      </Modal>
    </>
  );
}
