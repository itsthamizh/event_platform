import { useState } from 'react';
import { fmtDate, fmtDateTime, inr, inrShort, todayISO } from '../../config';
import { Link, navigate } from '../../router';
import { invoiceTotals, usePerms, useStore } from '../../store';
import { receiptsOf } from '../../lifecycle';
import { Badge, Button, Card, Empty, Field, Icon, Modal, Stat, Table } from '../../components/ui';
import { InvoiceDoc } from '../../components/Shared';
import { DetailLayout, FieldGrid, ListView, MiniTable, ModuleHeader, RecordHeader, Section } from '../../components/crm';
import { inScope } from '../../accounts';

export function Invoices() {
  const { state } = useStore();
  const rows = state.invoices.filter((i) => inScope(state, i)).map((i) => ({ ...i, t: invoiceTotals(i) }));
  return (
    <>
      <ListView
        module={{ singular: 'Invoice', plural: 'Invoices' }}
        rows={rows}
        onRow={(i) => navigate('/partner/invoices/' + i.id)}
        views={[
          { id: 'all', label: 'All Invoices', filter: () => true },
          { id: 'open', label: 'Unpaid Invoices', filter: (i) => i.t.due > 0 },
          { id: 'overdue', label: 'Overdue Invoices', filter: (i) => i.t.status === 'overdue' },
          { id: 'paid', label: 'Paid Invoices', filter: (i) => i.t.status === 'paid' },
          { id: 'gst', label: 'GST Invoices', filter: (i) => i.gst },
        ]}
        filterFields={[
          { key: 'status', label: 'Status', type: 'select', get: (i) => i.t.status },
          { key: 'type', label: 'Invoice Type', type: 'select', get: (i) => (i.gst ? 'GST' : 'Regular') },
          { key: 'billTo', label: 'Customer', type: 'text', get: (i) => i.billTo },
        ]}
        columns={[
          { key: 'number', label: 'Invoice Number' },
          { key: 'billTo', label: 'Customer' },
          { key: 'type', label: 'Type', render: (i) => (i.gst ? 'GST' : 'Regular'), sortValue: (i) => (i.gst ? 1 : 0) },
          { key: 'issuedAt', label: 'Invoice Date', render: (i) => fmtDate(i.issuedAt) },
          { key: 'total', label: 'Grand Total', align: 'right', render: (i) => inr(i.t.total), sortValue: (i) => i.t.total },
          { key: 'paid', label: 'Received', align: 'right', render: (i) => inr(i.t.paid), sortValue: (i) => i.t.paid },
          { key: 'due', label: 'Balance', align: 'right', render: (i) => <b>{inr(i.t.due)}</b>, sortValue: (i) => i.t.due },
          { key: 'status', label: 'Status', render: (i) => <Badge status={i.t.status} />, sortValue: (i) => i.t.status },
        ]}
      />
    </>
  );
}

export function InvoiceDetail({ id }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [record, setRecord] = useState(null);
  const [method, setMethod] = useState('UPI');
  const inv = state.invoices.find((i) => i.id === id && inScope(state, i));
  if (!inv) return <Empty title="Invoice not found" />;
  const partner = state.partners.find((p) => p.id === inv.partnerId);
  const booking = state.bookings.find((b) => b.id === inv.bookingId);
  const t = invoiceTotals(inv);
  const open = inv.schedule.filter((s) => !s.paidAt && !s.waived);
  const paid = inv.schedule.filter((s) => s.paidAt);
  const gstAmt = inv.gst ? Math.round((inv.subtotal * 18) / 100) : 0;
  return (
    <>
      <RecordHeader
        back="/partner/invoices"
        title={inv.number}
        subtitle={`${inv.billTo}${booking ? ' - Booking ' + booking.number : ''}`}
        badges={<Badge status={t.status} />}
        actions={
          <>
            {t.due > 0 && (
              <button className="zc-btn" onClick={() => actions.sendReminder(inv.id)}>
                <Icon name="whatsapp" size={14} /> Send Reminder
              </button>
            )}
            <button className="zc-btn" onClick={() => window.print()}>
              <Icon name="download" size={14} /> Print / PDF
            </button>
            {can('payments.record') && open[0] && (
              <button className="zc-btn zc-btn-primary" onClick={() => setRecord(open[0])}>
                Record Payment
              </button>
            )}
          </>
        }
      />
      <div style={{ height: 0 }} />
      <DetailLayout
        nav={[
          { id: 'iinfo', label: 'Invoice Information' },
          { id: 'sched', label: 'Payment Schedule', count: inv.schedule.length },
          { id: 'paid', label: 'Payments Received', count: paid.length },
          { id: 'preview', label: 'Invoice Preview' },
        ]}
      >
        <Section id="iinfo" title="Invoice Information">
          <FieldGrid
            fields={[
              ['Invoice Number', inv.number],
              ['Invoice Type', inv.gst ? 'Tax invoice (GST)' : 'Regular'],
              ['Customer', inv.billTo],
              ['Booking', booking ? <Link to={'/partner/bookings/' + booking.id} className="zc-link">{booking.number}</Link> : '-'],
              ['Invoice Date', fmtDate(inv.issuedAt)],
              ['Status', <Badge status={t.status} />],
              ['Sub Total', inr(inv.subtotal)],
              inv.gst && ['CGST 9% + SGST 9%', `${inr(gstAmt / 2)} + ${inr(gstAmt / 2)}`],
              ['Grand Total', <b>{inr(t.total)}</b>],
              ['Received', <span className="green">{inr(t.paid)}</span>],
              ['Balance Due', <b>{inr(t.due)}</b>],
              ['Overdue', t.overdue ? <span className="red">{inr(t.overdue)}</span> : '-'],
            ]}
          />
        </Section>
        <Section id="sched" title="Payment Schedule" count={inv.schedule.length}>
          <MiniTable
            rows={inv.schedule}
            columns={[
              { label: 'Installment', render: (s) => s.label },
              { label: 'Amount', align: 'right', render: (s) => inr(s.amount) },
              { label: 'Due Date', render: (s) => fmtDate(s.due) },
              { label: 'Status', render: (s) => (s.paidAt ? <Badge status="paid" /> : s.waived ? <Badge status="waived" /> : <Badge status={s.due < todayISO() ? 'overdue' : 'due'} />) },
              {
                label: '',
                align: 'right',
                render: (s) =>
                  !s.paidAt && !s.waived && can('payments.record') ? (
                    <button className="zc-rl-link" onClick={() => setRecord(s)}>
                      Record payment
                    </button>
                  ) : null,
              },
            ]}
          />
        </Section>
        <Section id="paid" title="Payments Received" count={paid.length}>
          <MiniTable
            rows={paid}
            empty="No payments yet."
            columns={[
              { label: 'Installment', render: (s) => s.label },
              { label: 'Amount', align: 'right', render: (s) => inr(s.amount) },
              { label: 'Mode', render: (s) => s.method },
              { label: 'Channel', render: (s) => (s.channel === 'online' ? 'Online (app)' : 'Offline') },
              { label: 'Received On', render: (s) => fmtDateTime(s.paidAt) },
            ]}
          />
        </Section>
        <Section id="preview" title="Invoice Preview">
          <InvoiceDoc invoice={inv} partner={partner} />
        </Section>
      </DetailLayout>
      <Modal
        open={!!record}
        title="Record payment"
        onClose={() => setRecord(null)}
        footer={
          <Button
            onClick={() => {
              actions.payInstallment(inv.id, record.id, method, 'offline');
              setRecord(null);
            }}
          >
            Mark as received
          </Button>
        }
      >
        {record && (
          <div className="stack">
            <Field label="Installment">
              <select className="select" value={record.id} onChange={(e) => setRecord(open.find((s) => s.id === e.target.value))}>
                {open.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} - {inr(s.amount)} (due {fmtDate(s.due)})
                  </option>
                ))}
              </select>
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
    </>
  );
}

export function PaymentsList() {
  const { state } = useStore();
  const rows = state.invoices
    .filter((i) => inScope(state, i))
    .flatMap((i) => receiptsOf(i).map((r) => ({ ...r, paidAt: r.at, inv: i })))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  return (
    <ListView
      module={{ singular: 'Payment', plural: 'Payments' }}
      rows={rows}
      onRow={(p) => navigate('/partner/invoices/' + p.inv.id)}
      views={[
        { id: 'all', label: 'All Payments', filter: () => true },
        { id: 'online', label: 'Online (via app)', filter: (p) => p.channel === 'online' },
        { id: 'offline', label: 'Recorded offline', filter: (p) => p.channel === 'offline' },
        { id: 'part', label: 'Part Payments', filter: (p) => p.label.includes('(part)') },
      ]}
      filterFields={[
        { key: 'method', label: 'Payment Mode', type: 'select', get: (p) => p.method },
        { key: 'label', label: 'Installment', type: 'select', get: (p) => p.label },
        { key: 'customer', label: 'Customer', type: 'text', get: (p) => p.inv.billTo },
      ]}
      columns={[
        { key: 'invoice', label: 'Invoice', render: (p) => p.inv.number, sortValue: (p) => p.inv.number },
        { key: 'customer', label: 'Customer', render: (p) => p.inv.billTo, sortValue: (p) => p.inv.billTo },
        { key: 'label', label: 'Installment' },
        { key: 'amount', label: 'Amount', align: 'right', render: (p) => inr(p.amount) },
        { key: 'method', label: 'Mode' },
        { key: 'channel', label: 'Channel', render: (p) => ({ online: 'Online (app)', coupon: 'Zoho for Vizhaa coupon', wallet: 'Customer wallet' }[p.channel] || 'Offline') },
        { key: 'paidAt', label: 'Received On', render: (p) => fmtDateTime(p.paidAt) },
      ]}
    />
  );
}

export function Expenses() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bookingId: '', category: 'Crew', amount: '', paidTo: '', date: todayISO() });
  const bookings = state.bookings.filter((b) => inScope(state, b) && b.status !== 'cancelled');
  const expenses = state.expenses.filter((x) => {
    if (x.bookingId) return inScope(state, state.bookings.find((b) => b.id === x.bookingId));
    return inScope(state, x);
  });
  const leadName = (bid) => {
    const b = state.bookings.find((x) => x.id === bid);
    const l = b && state.leads.find((x) => x.id === b.leadId);
    return b ? `${b.number} - ${l.contactName}` : 'General (overheads)';
  };
  const perEvent = bookings.map((b) => {
    const cost = expenses.filter((x) => x.bookingId === b.id).reduce((a, x) => a + x.amount, 0);
    return { id: b.id, b, cost, profit: b.total - cost };
  });
  const totalRevenue = perEvent.reduce((a, x) => a + x.b.total, 0);
  const totalCost = expenses.reduce((a, x) => a + x.amount, 0);
  return (
    <>
      <ModuleHeader title="Expenses" subtitle="Track costs per event to see what you really earn." actions={<button className="zc-btn zc-btn-primary" onClick={() => setOpen(true)}>Create Expense</button>} />
      <div className="grid grid-3 mb">
        <Stat label="Booked revenue" value={inrShort(totalRevenue)} icon="briefcase" />
        <Stat label="Total costs" value={inrShort(totalCost)} icon="receipt" />
        <Stat label="Net profit" value={inrShort(totalRevenue - totalCost)} icon="chart" tone="gold" hint={totalRevenue ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) + '% margin' : ''} />
      </div>
      <div className="grid grid-2">
        <Card title="Profit per event" pad={false}>
          <Table
            rows={perEvent}
            columns={[
              { label: 'Booking', render: (x) => leadName(x.b.id) },
              { label: 'Revenue', align: 'right', render: (x) => inr(x.b.total) },
              { label: 'Costs', align: 'right', render: (x) => inr(x.cost) },
              { label: 'Profit', align: 'right', render: (x) => <b className={x.profit >= 0 ? 'green' : 'red'}>{inr(x.profit)}</b> },
            ]}
          />
        </Card>
        <Card title="All expenses" pad={false}>
          <Table
            rows={expenses}
            columns={[
              { label: 'Date', render: (x) => fmtDate(x.date) },
              { label: 'For', render: (x) => <span className="small">{leadName(x.bookingId)}</span> },
              { label: 'Category', key: 'category' },
              { label: 'Paid to', key: 'paidTo' },
              { label: 'Amount', align: 'right', render: (x) => inr(x.amount) },
              {
                label: '',
                render: (x) => (
                  <button className="icon-btn" onClick={() => actions.removeExpense(x.id)} aria-label="Delete">
                    <Icon name="trash" size={14} />
                  </button>
                ),
              },
            ]}
          />
        </Card>
      </div>
      <Modal
        open={open}
        title="Add expense"
        onClose={() => setOpen(false)}
        footer={
          <Button
            disabled={!f.amount}
            onClick={() => {
              actions.addExpense({ ...f, bookingId: f.bookingId || null });
              setOpen(false);
              setF({ ...f, amount: '', paidTo: '' });
            }}
          >
            Save
          </Button>
        }
      >
        <div className="stack">
          <Field label="For booking">
            <select className="select" value={f.bookingId} onChange={(e) => setF({ ...f, bookingId: e.target.value })}>
              <option value="">General (overheads)</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {leadName(b.id)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-2">
            <Field label="Category">
              <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {['Crew', 'Travel', 'Material', 'Rent', 'Equipment', 'Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input className="input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </Field>
            <Field label="Paid to">
              <input className="input" value={f.paidTo} onChange={(e) => setF({ ...f, paidTo: e.target.value })} />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
