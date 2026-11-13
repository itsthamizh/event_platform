// Admin money screens: refunds (full flow with credit notes), weekly vendor payouts
// computed from in-app collections, subscriptions, coupons and the double-entry ledger.
import { useState } from 'react';
import { fmtDate, fmtDateTime, inr, todayISO } from '../../config';
import { useStore } from '../../store';
import { Badge, Button, Field, Modal, Tabs } from '../../components/ui';
import { ListView, MiniTable, ModuleHeader } from '../../components/crm';
import { buildLedger, buildPayouts } from '../../ops';
import { SUB_LABEL } from '../../lifecycle';

const REFUND_LABEL = { requested: 'Requested', approved: 'Approved', processing: 'Processing', processed: 'Refunded', rejected: 'Rejected' };

export function AdminMoney() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState('refunds');
  const payouts = buildPayouts(state);
  const subs = state.partners.map((p) => ({ ...p, sub: state.subscriptions[p.id] || {} }));
  return (
    <>
      <ModuleHeader title="Refunds and payouts" subtitle="Money in, money out, and subscription revenue. Every movement is posted to the ledger." />
      <Tabs
        tabs={[
          { id: 'refunds', label: 'Refunds', count: state.refunds.filter((r) => ['requested', 'approved', 'processing'].includes(r.status)).length },
          { id: 'payouts', label: 'Vendor payouts', count: payouts.filter((p) => ['on_hold', 'processing', 'scheduled'].includes(p.status)).length },
          { id: 'cn', label: 'Credit notes', count: state.creditNotes.length },
          { id: 'subs', label: 'Subscriptions' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt">
        {tab === 'refunds' && (
          <ListView
            module={{ singular: 'Refund', plural: 'Refunds' }}
            rows={state.refunds}
            views={[
              { id: 'open', label: 'Open Refunds', filter: (r) => ['requested', 'approved', 'processing'].includes(r.status) },
              { id: 'all', label: 'All Refunds', filter: () => true },
              { id: 'done', label: 'Refunded', filter: (r) => r.status === 'processed' },
            ]}
            columns={[
              { key: 'bookingNumber', label: 'Booking' },
              { key: 'customer', label: 'Customer' },
              { key: 'partner', label: 'Partner' },
              { key: 'reason', label: 'Reason', render: (r) => <span className="small">{r.reason}</span> },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r.amount) },
              { key: 'to', label: 'Refund To', render: (r) => (r.to === 'wallet' ? 'Zoho for Vizhaa wallet' : 'Original method') },
              { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'processed' ? 'paid' : r.status}>{REFUND_LABEL[r.status]}</Badge> },
              { key: 'creditNote', label: 'Credit Note', render: (r) => r.creditNote || '-' },
              {
                key: 'act',
                label: '',
                sortable: false,
                align: 'right',
                render: (r) => (
                  <span className="row gap-s" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    {r.status === 'requested' && (
                      <>
                        <button className="zc-rl-link" onClick={() => actions.refundStep(r.id, 'reject')}>Reject</button>
                        <button className="zc-rl-link" onClick={() => actions.refundStep(r.id, 'approve', 'original')}>Approve</button>
                        <button className="zc-rl-link" onClick={() => actions.refundStep(r.id, 'approve', 'wallet')}>Approve to wallet</button>
                      </>
                    )}
                    {r.status === 'approved' && <button className="zc-btn zc-btn-primary" onClick={() => actions.refundStep(r.id, 'process')}>Send to gateway</button>}
                    {r.status === 'processing' && <button className="zc-btn zc-btn-primary" onClick={() => actions.refundStep(r.id, 'complete')}>Mark refunded</button>}
                  </span>
                ),
              },
            ]}
          />
        )}
        {tab === 'payouts' && <PayoutsTable rows={payouts} />}
        {tab === 'cn' && (
          <ListView
            module={{ singular: 'Credit Note', plural: 'Credit Notes' }}
            rows={state.creditNotes.map((c) => ({ ...c, partner: (state.partners.find((p) => p.id === c.partnerId) || {}).name }))}
            columns={[
              { key: 'number', label: 'Credit Note' },
              { key: 'partner', label: 'Partner' },
              { key: 'invoiceNumber', label: 'Against Invoice' },
              { key: 'customer', label: 'Customer' },
              { key: 'amount', label: 'Amount', align: 'right', render: (c) => inr(c.amount) },
              { key: 'gst', label: 'GST Reversed', align: 'right', render: (c) => (c.gst ? inr(c.gst) : '-') },
              { key: 'issuedAt', label: 'Issued', render: (c) => fmtDate(c.issuedAt) },
            ]}
          />
        )}
        {tab === 'subs' && (
          <ListView
            module={{ singular: 'Subscription', plural: 'Subscriptions' }}
            rows={subs}
            views={[
              { id: 'all', label: 'All Partners', filter: () => true },
              { id: 'risk', label: 'Past Due / Grace', filter: (p) => ['past_due', 'grace'].includes(p.subscription) },
              { id: 'lapsed', label: 'Expired / Cancelled', filter: (p) => ['expired', 'cancelled'].includes(p.subscription) },
              { id: 'trial', label: 'On Trial', filter: (p) => p.subscription === 'trial' },
            ]}
            columns={[
              { key: 'name', label: 'Partner' },
              { key: 'plan', label: 'Plan', render: () => 'Partner Basic - ' + inr(199), sortable: false },
              { key: 'subscription', label: 'Status', render: (p) => <Badge status={p.subscription}>{SUB_LABEL[p.subscription]}</Badge> },
              { key: 'end', label: 'Period Ends', render: (p) => fmtDate(p.sub.periodEnd), sortValue: (p) => p.sub.periodEnd },
              { key: 'auto', label: 'Auto-renew', render: (p) => (p.sub.autoRenew ? 'On' : 'Off') },
              { key: 'paid', label: 'Paid (lifetime)', align: 'right', render: (p) => inr((p.sub.history || []).filter((h) => h.status === 'paid').reduce((a, h) => a + h.amount, 0)) },
            ]}
          />
        )}
      </div>
    </>
  );
}

function PayoutsTable({ rows }) {
  const { actions } = useStore();
  const [open, setOpen] = useState(null);
  return (
    <>
      <ListView
        module={{ singular: 'Payout', plural: 'Payouts' }}
        rows={rows}
        onRow={setOpen}
        views={[
          { id: 'due', label: 'To Release', filter: (p) => ['scheduled', 'processing', 'on_hold', 'failed'].includes(p.status) },
          { id: 'hold', label: 'On Hold', filter: (p) => p.status === 'on_hold' },
          { id: 'all', label: 'All Payouts', filter: () => true },
        ]}
        columns={[
          { key: 'partner', label: 'Partner' },
          { key: 'period', label: 'Week', sortValue: (p) => p.week },
          { key: 'gross', label: 'Collected', align: 'right', render: (p) => inr(p.gross) },
          { key: 'refunds', label: 'Refunds', align: 'right', render: (p) => (p.refunds ? inr(p.refunds) : '-') },
          { key: 'commission', label: 'Commission', align: 'right', render: (p) => inr(p.commission) },
          { key: 'tds', label: 'TDS 1%', align: 'right', render: (p) => inr(p.tds) },
          { key: 'net', label: 'Net', align: 'right', render: (p) => <b>{inr(p.net)}</b> },
          { key: 'payDate', label: 'Pay Date', render: (p) => fmtDate(p.payDate) },
          { key: 'status', label: 'Status', render: (p) => <span><Badge status={p.status} />{p.note && <div className="tiny muted">{p.note}</div>}</span> },
          {
            key: 'act',
            label: '',
            sortable: false,
            align: 'right',
            render: (p) =>
              p.status !== 'paid' && (
                <span className="row gap-s" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  {p.status !== 'on_hold' && <button className="zc-rl-link" onClick={() => actions.setPayoutState(p.id, p.partnerId, p.week, 'on_hold', 'Held by admin')}>Hold</button>}
                  <button className="zc-rl-link" onClick={() => actions.setPayoutState(p.id, p.partnerId, p.week, 'failed', 'Bank rejected: account name mismatch')}>Failed</button>
                  <button className="zc-btn zc-btn-primary" onClick={() => actions.setPayoutState(p.id, p.partnerId, p.week, 'paid')}>Release</button>
                </span>
              ),
          },
        ]}
      />
      <Modal open={!!open} title={open ? `${open.partner} - ${open.period}` : ''} onClose={() => setOpen(null)} wide>
        {open && (
          <MiniTable
            rows={open.items}
            columns={[
              { label: 'Invoice', render: (i) => i.invoiceNumber },
              { label: 'Installment', render: (i) => i.label },
              { label: 'Paid On', render: (i) => fmtDateTime(i.at) },
              { label: 'Method', render: (i) => i.method },
              { label: 'Amount', align: 'right', render: (i) => inr(i.amount) },
            ]}
          />
        )}
      </Modal>
    </>
  );
}

export function Coupons() {
  const { state, actions } = useStore();
  const [f, setF] = useState(null);
  const redemptions = (id) => state.redemptions.filter((r) => r.couponId === id);
  return (
    <>
      <ModuleHeader title="Coupons" subtitle="Platform-funded coupons are paid by Zoho for Vizhaa as part of the advance. Partner-funded coupons reduce the partner's price." actions={<button className="zc-btn zc-btn-primary" onClick={() => setF({ code: '', title: '', type: 'flat', value: 500, minAmount: 20000, maxDiscount: 500, funded: 'platform', partnerId: null, validTill: '2027-03-31', maxUses: 1000 })}>Create Coupon</button>} />
      <ListView
        module={{ singular: 'Coupon', plural: 'Coupons' }}
        rows={state.coupons}
        views={[
          { id: 'active', label: 'Active', filter: (c) => c.active && c.validTill >= todayISO() },
          { id: 'all', label: 'All Coupons', filter: () => true },
        ]}
        columns={[
          { key: 'code', label: 'Code', render: (c) => <b>{c.code}</b> },
          { key: 'title', label: 'Offer' },
          { key: 'value', label: 'Discount', render: (c) => (c.type === 'percent' ? `${c.value}% (max ${inr(c.maxDiscount)})` : inr(c.value)) },
          { key: 'minAmount', label: 'Min Booking', align: 'right', render: (c) => inr(c.minAmount) },
          { key: 'funded', label: 'Funded By', render: (c) => (c.funded === 'platform' ? 'Zoho for Vizhaa' : (state.partners.find((p) => p.id === c.partnerId) || {}).name) },
          { key: 'used', label: 'Used', align: 'right', render: (c) => `${c.used} / ${c.maxUses}` },
          { key: 'spend', label: 'Discount Given (demo bookings)', align: 'right', render: (c) => inr(redemptions(c.id).reduce((a, r) => a + r.amount, 0)), sortValue: (c) => redemptions(c.id).length },
          { key: 'validTill', label: 'Valid Till', render: (c) => fmtDate(c.validTill) },
          { key: 'active', label: 'Status', render: (c) => <span onClick={(e) => e.stopPropagation()}><Badge status={c.active && c.validTill >= todayISO() ? 'active' : 'expired'} /> <button className="zc-rl-link" onClick={() => actions.toggleCoupon(c.id)}>{c.active ? 'Pause' : 'Activate'}</button></span> },
        ]}
      />
      <Modal
        open={!!f}
        title="Create coupon"
        onClose={() => setF(null)}
        wide
        footer={
          <Button
            disabled={!f || !f.code}
            onClick={() => {
              actions.saveCoupon({ ...f, code: f.code.toUpperCase() });
              setF(null);
            }}
          >
            Save
          </Button>
        }
      >
        {f && (
          <div className="grid grid-3">
            <Field label="Code">
              <input className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Offer title">
              <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </Field>
            <Field label="Type">
              <select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="flat">Flat amount</option>
                <option value="percent">Percent</option>
              </select>
            </Field>
            <Field label={f.type === 'percent' ? 'Percent' : 'Amount'}>
              <input className="input" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
            </Field>
            <Field label="Max discount">
              <input className="input" type="number" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} />
            </Field>
            <Field label="Minimum booking">
              <input className="input" type="number" value={f.minAmount} onChange={(e) => setF({ ...f, minAmount: e.target.value })} />
            </Field>
            <Field label="Valid till">
              <input className="input" type="date" value={f.validTill} onChange={(e) => setF({ ...f, validTill: e.target.value })} />
            </Field>
            <Field label="Max uses">
              <input className="input" type="number" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} />
            </Field>
            <Field label="Funded by">
              <select className="select" value={f.funded} onChange={(e) => setF({ ...f, funded: e.target.value, partnerId: e.target.value === 'platform' ? null : 'p1' })}>
                <option value="platform">Zoho for Vizhaa (marketing)</option>
                <option value="partner">A partner</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

export function Ledger() {
  const { state } = useStore();
  const rows = buildLedger(state);
  const accounts = {};
  rows.forEach((r) => {
    accounts[r.dr] = accounts[r.dr] || { dr: 0, cr: 0 };
    accounts[r.cr] = accounts[r.cr] || { dr: 0, cr: 0 };
    accounts[r.dr].dr += r.amount;
    accounts[r.cr].cr += r.amount;
  });
  const tb = Object.entries(accounts).map(([name, v]) => ({ id: name, name, ...v, bal: v.dr - v.cr }));
  return (
    <>
      <ModuleHeader title="Ledger" subtitle={`Double-entry record of every in-app money movement (${rows.length} entries). Offline payments recorded by partners are not platform money and are not posted.`} />
      <div className="zc-section mb">
        <header>
          <h3>Trial balance</h3>
        </header>
        <div className="zc-section-body">
          <MiniTable
            rows={tb}
            columns={[
              { label: 'Account', render: (a) => a.name },
              { label: 'Debit', align: 'right', render: (a) => inr(a.dr) },
              { label: 'Credit', align: 'right', render: (a) => inr(a.cr) },
              { label: 'Balance', align: 'right', render: (a) => <b>{inr(Math.abs(a.bal))} {a.bal >= 0 ? 'Dr' : 'Cr'}</b> },
            ]}
          />
          <div className="row between small mt-s">
            <span className="muted">Totals must match</span>
            <b>
              {inr(tb.reduce((a, x) => a + x.dr, 0))} Dr = {inr(tb.reduce((a, x) => a + x.cr, 0))} Cr
            </b>
          </div>
        </div>
      </div>
      <ListView
        module={{ singular: 'Entry', plural: 'Entries' }}
        rows={rows.map((r) => ({ ...r, partner: (state.partners.find((p) => p.id === r.partnerId) || {}).name }))}
        filterFields={[
          { key: 'dr', label: 'Debit account', type: 'select', get: (r) => r.dr },
          { key: 'cr', label: 'Credit account', type: 'select', get: (r) => r.cr },
          { key: 'partner', label: 'Partner', type: 'text', get: (r) => r.partner },
        ]}
        columns={[
          { key: 'at', label: 'Date', render: (r) => fmtDate(r.at) },
          { key: 'ref', label: 'Reference' },
          { key: 'memo', label: 'Narration' },
          { key: 'dr', label: 'Debit' },
          { key: 'cr', label: 'Credit' },
          { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r.amount) },
          { key: 'partner', label: 'Partner' },
        ]}
      />
    </>
  );
}

