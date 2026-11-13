import { useEffect, useState } from 'react';
import { fmtDate, fmtDateTime, inr } from '../../config';
import { Link, navigate } from '../../router';
import { CUSTOMER_STAGES, customerStage, invoiceTotals, quoteTotals, quotesForLead, refundPreview, useStore } from '../../store';
import { Badge, Button, Card, Cover, Empty, Field, Icon, Modal, PageHeader, StarInput, Stars, Steps, Tabs } from '../../components/ui';
import { ChatView, InvoiceDoc, QuoteDoc, categoryOf } from '../../components/Shared';
import { describeDetails, packFor } from '../../categories/packs';
import { QUOTE_STATUS_LABEL, REVIEW_LABEL, bookingStatus, contractStatus, quoteStatus, schedPaid, schedStatus } from '../../lifecycle';
import { BookingChanges, ScheduleBadge } from '../../components/Lifecycle';
import { availabilityDetail, holdExpired, muhurthamOf } from '../../ops';
import { CouponBox, RunSheet, ShipmentTracking, TrialsSection, TRIAL_TYPES } from '../../components/Ops';

const myDeals = (state) =>
  state.leads
    .filter((l) => l.customerId === state.customerId)
    .map((lead) => {
      const booking = state.bookings.find((b) => b.id === lead.bookingId);
      return { lead, booking, listing: state.listings.find((x) => x.id === lead.listingId), stage: customerStage(lead, booking) };
    })
    .sort((a, b) => b.lead.createdAt.localeCompare(a.lead.createdAt));

export function Bookings() {
  const { state } = useStore();
  const [tab, setTab] = useState('All');
  const deals = myDeals(state);
  const tabs = ['All', 'Enquiry', 'Quoted', 'Accepted', 'Booked', 'Completed', 'Cancelled'].map((t) => ({
    id: t,
    label: t,
    count: t === 'All' ? deals.length : deals.filter((d) => (t === 'Completed' ? ['Completed', 'Reviewed'].includes(d.stage) : d.stage === t)).length,
  }));
  const list = deals.filter((d) => tab === 'All' || d.stage === tab || (tab === 'Completed' && d.stage === 'Reviewed'));
  // Next payment across all bookings
  const dues = deals
    .filter((d) => d.booking && ['accepted', 'booked'].includes(d.booking.status))
    .flatMap((d) => {
      const inv = state.invoices.find((i) => i.id === d.booking.invoiceId);
      return inv ? inv.schedule.filter((s) => !s.paidAt && !s.waived).map((s) => ({ ...s, deal: d })) : [];
    })
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="container section">
      <PageHeader title="Bookings" subtitle="Track every enquiry, quote, booking and payment in one place." />
      {dues[0] && (
        <div className="notice notice-warning mb">
          <Icon name="rupee" />
          <div className="grow">
            Next payment: <b>{inr(dues[0].amount)}</b> ({dues[0].label}) to {dues[0].deal.listing.title}, due {fmtDate(dues[0].due)}
          </div>
          <Link to={'/bookings/' + dues[0].deal.lead.id} className="btn btn-primary btn-sm">
            Pay now
          </Link>
        </div>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="stack mt">
        {list.length === 0 && <Empty icon="briefcase" title="Nothing here yet">Send a booking request from any partner profile.</Empty>}
        {list.map(({ lead, booking, listing, stage }) => {
          const q = quotesForLead(state, lead.id)[0];
          const amount = booking ? booking.total : q ? quoteTotals(q).total : null;
          const inv = booking && state.invoices.find((i) => i.id === booking.invoiceId);
          const t = inv && invoiceTotals(inv);
          return (
            <Link key={lead.id} to={'/bookings/' + lead.id} className="card">
              <div className="card-body row gap wrap">
                <Cover seed={listing.id + listing.title} icon={categoryOf(state, listing.category).icon} height={64} className="thumb-l" />
                <div className="grow">
                  <div className="row gap-s wrap">
                    <h3>{listing.title}</h3>
                    <Badge status={stage} />
                  </div>
                  <div className="small muted">
                    {categoryOf(state, listing.category).name} - {lead.eventType} on {fmtDate(lead.eventDate)} - {lead.guests} guests
                  </div>
                  {t && (
                    <div className="row gap-s mt-s small">
                      <div className="progress" style={{ width: 160 }}>
                        <span style={{ width: (t.paid / (t.total || 1)) * 100 + '%' }} />
                      </div>
                      <span className="muted">
                        {inr(t.paid)} of {inr(t.total)} paid
                      </span>
                    </div>
                  )}
                </div>
                <div className="right">
                  {amount != null ? <b>{inr(amount)}</b> : <span className="muted small">Awaiting quote</span>}
                  <div className="small muted">{booking ? booking.number : 'Requested ' + fmtDate(lead.createdAt)}</div>
                </div>
                <Icon name="chevronRight" className="muted" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PayModal({ open, onClose, item, onPay }) {
  const [method, setMethod] = useState('UPI');
  const [stage, setStage] = useState('choose');
  if (!item) return null;
  return (
    <Modal open={open} title="Secure payment" onClose={onClose}>
      {stage === 'choose' ? (
        <div className="stack">
          <div className="notice">
            <Icon name="lock" />
            <span>
              Paying <b>{inr(item.amount)}</b> ({item.label}). Money is held safely and released to the partner after the event.
            </span>
          </div>
          <div className="chips">
            {['UPI', 'Card', 'Net banking'].map((m) => (
              <button key={m} className={'chip ' + (method === m ? 'active' : '')} onClick={() => setMethod(m)}>
                {m}
              </button>
            ))}
          </div>
          {method === 'UPI' && (
            <Field label="UPI ID">
              <input className="input" defaultValue="priya@okaxis" />
            </Field>
          )}
          {method === 'Card' && (
            <div className="grid grid-2">
              <Field label="Card number">
                <input className="input" defaultValue="4111 1111 1111 1111" />
              </Field>
              <Field label="Expiry / CVV">
                <input className="input" defaultValue="12/29  123" />
              </Field>
            </div>
          )}
          {method === 'Net banking' && (
            <Field label="Bank">
              <select className="select">
                <option>Indian Bank</option>
                <option>SBI</option>
                <option>HDFC</option>
              </select>
            </Field>
          )}
          <Button block size="lg" onClick={() => setStage('done')}>
            Pay {inr(item.amount)}
          </Button>
          <p className="tiny muted center">Demo checkout. In production this opens Razorpay.</p>
        </div>
      ) : (
        <div className="empty">
          <span className="cat-icon" style={{ background: 'var(--green-50)', color: 'var(--green)' }}>
            <Icon name="check" size={24} />
          </span>
          <h3>Payment successful</h3>
          <p className="muted">{inr(item.amount)} paid via {method}</p>
          <Button
            onClick={() => {
              onPay(method);
              setStage('choose');
              onClose();
            }}
          >
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

export function BookingDetail({ id }) {
  const { state, actions, toast } = useStore();
  const [payItem, setPayItem] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [agree, setAgree] = useState(false);
  const [changes, setChanges] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [cancel, setCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [complaint, setComplaint] = useState(false);
  const [cReason, setCReason] = useState('Service not as promised');
  const [cText, setCText] = useState('');
  const [rating, setRating] = useState(5);
  const [rTitle, setRTitle] = useState('');
  const [rBody, setRBody] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [decline, setDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('Price too high');
  const leadForEffect = state.leads.find((l) => l.id === id);
  const currentForEffect = leadForEffect && quotesForLead(state, leadForEffect.id)[0];
  const currentId = currentForEffect && currentForEffect.id;
  // Opening the booking counts as the customer viewing the latest quote.
  useEffect(() => {
    if (currentId) actions.markQuoteViewed(currentId);
  }, [currentId, actions]);

  const lead = state.leads.find((l) => l.id === id && l.customerId === state.customerId);
  if (!lead) return <div className="container section"><Empty title="Booking not found" /></div>;
  const booking = state.bookings.find((b) => b.id === lead.bookingId);
  const listing = state.listings.find((l) => l.id === lead.listingId);
  const partner = state.partners.find((p) => p.id === lead.partnerId);
  const stage = customerStage(lead, booking);
  const quotes = quotesForLead(state, lead.id);
  const current = quotes[0];
  const invoice = booking && state.invoices.find((i) => i.id === booking.invoiceId);
  const totals = invoice && invoiceTotals(invoice);
  const thread = state.threads.find((t) => t.leadId === lead.id || (t.customerId === state.customerId && t.listingId === listing.id));
  const review = booking && state.reviews.find((r) => r.bookingId === booking.id);
  const dispute = booking && state.disputes.find((d) => d.bookingNumber === booking.number);
  const canCancel = booking && ['accepted', 'booked'].includes(booking.status);
  const preview = booking && refundPreview(state, booking, 'customer');
  const nextDue = invoice && invoice.schedule.find((s) => !s.paidAt && !s.waived);
  const qs = current && quoteStatus(current);
  const cs = booking && contractStatus(booking);

  return (
    <div className="container section">
      <PageHeader
        back="/bookings"
        title={listing.title}
        subtitle={`${lead.eventType} on ${fmtDate(lead.eventDate)} - ${lead.guests} guests${booking ? ' - ' + booking.number : ''}`}
        actions={
          <>
            {thread && (
              <Link to={'/chat/' + thread.id} className="btn btn-secondary">
                <Icon name="chat" size={16} /> Chat
              </Link>
            )}
            <Link to={'/vendor/' + listing.id} className="btn btn-ghost">
              View profile
            </Link>
          </>
        }
      />
      <Card>
        <Steps steps={CUSTOMER_STAGES} current={stage === 'Cancelled' ? (booking ? 'Accepted' : 'Enquiry') : stage} cancelled={stage === 'Cancelled'} />
        {stage === 'Cancelled' && (
          <div className="notice notice-danger mt">
            <Icon name="x" />
            <span>
              This booking was cancelled{booking && booking.cancelledBy ? ` by the ${booking.cancelledBy}` : ''}. {booking && booking.cancelReason}
              {lead.lostReason && !booking ? lead.lostReason : ''}
            </span>
          </div>
        )}
      </Card>

      <div className="grid grid-side mt">
        <div className="stack">
          {stage === 'Enquiry' && (
            <Card title="Waiting for a quote">
              <div className="notice">
                <Icon name="clock" />
                <span>
                  {partner.name} usually replies {listing.responseTime}. You will get a notification when the quote arrives.
                </span>
              </div>
              <p className="mt">
                <b>Your request:</b> {lead.requirements || 'No extra details'}
              </p>
              {describeDetails(listing.category, lead.details, listing).length > 0 && (
                <dl className="kv mt">
                  {describeDetails(listing.category, lead.details, listing).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          )}

          {current && (
            <Card
              title={`Quote ${current.number} v${current.version}`}
              actions={<Badge status={qs}>{QUOTE_STATUS_LABEL[qs]}</Badge>}
              subtitle={`Sent ${fmtDateTime(current.sentAt)} - valid until ${fmtDate(current.validUntil)}`}
            >
              <QuoteDoc quote={current} partner={partner} lead={lead} compact />
              {['sent', 'viewed'].includes(qs) && !booking && (
                <div className="row gap-s mt wrap">
                  <Button
                    icon="check"
                    onClick={() => {
                      const av = availabilityDetail(state, listing, lead.eventDate);
                      if (['taken', 'closed'].includes(av.status)) toast(`Sorry, ${fmtDate(lead.eventDate)} is no longer free (${av.reason}). Ask ${partner.name} for another date.`, 'warning');
                      else actions.acceptQuote(current.id);
                    }}
                  >
                    Accept quote
                  </Button>
                  <Button variant="secondary" onClick={() => setChanges(true)}>
                    Request changes
                  </Button>
                  <Button variant="ghost" onClick={() => setDecline(true)}>
                    Decline
                  </Button>
                </div>
              )}
              {qs === 'expired' && !booking && (
                <div className="notice notice-warning mt">
                  <Icon name="clock" />
                  <span className="grow">This quote expired on {fmtDate(current.validUntil)}. Prices and dates are no longer held.</span>
                  <Button size="sm" onClick={() => actions.askToRenew(current.id)}>
                    Ask to renew
                  </Button>
                </div>
              )}
              {qs === 'withdrawn' && (
                <div className="notice notice-danger mt">
                  <Icon name="x" />
                  <span>The partner withdrew this quote{current.withdrawReason ? `: ${current.withdrawReason}` : ''}.</span>
                </div>
              )}
              {qs === 'rejected' && (
                <div className="notice mt">
                  <Icon name="info" />
                  <span>You declined this quote{current.rejectReason ? ` (${current.rejectReason})` : ''}.</span>
                </div>
              )}
              {current.status === 'changes_requested' && (
                <div className="notice notice-warning mt">
                  <Icon name="clock" />
                  <span>You asked for changes: "{current.changeNote}". Waiting for a revised quote.</span>
                </div>
              )}
              {quotes.length > 1 && (
                <div className="mt">
                  <button className="link small" onClick={() => setShowOld(!showOld)}>
                    {showOld ? 'Hide' : 'Show'} {quotes.length - 1} earlier version{quotes.length > 2 ? 's' : ''}
                  </button>
                  {showOld &&
                    quotes.slice(1).map((q) => (
                      <div key={q.id} className="row between small mt-s">
                        <span>
                          v{q.version} - {fmtDate(q.sentAt)}
                        </span>
                        <span>{inr(quoteTotals(q).total)}</span>
                        <Badge status={q.status} />
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {TRIAL_TYPES[listing.category] && !['Cancelled', 'Completed', 'Reviewed'].includes(stage) && (
            <Card title={TRIAL_TYPES[listing.category] + 's and visits'} subtitle="Meet the partner before or after booking.">
              <TrialsSection lead={lead} side="customer" />
            </Card>
          )}

          {booking && state.shipments.some((x) => x.bookingId === booking.id) && (
            <Card title="Delivery tracking">
              <ShipmentTracking booking={booking} />
            </Card>
          )}

          {booking && booking.status === 'booked' && (state.runSheets[booking.id] || []).length > 0 && (
            <Card title="Plan for the day" subtitle={`Shared by ${partner.name}${muhurthamOf(booking.eventDate) ? ' - muhurtham day' : ''}`}>
              <RunSheet booking={booking} compact />
            </Card>
          )}

          {booking && booking.status !== 'cancelled' && packFor(listing.category).CustomerPanel && (() => {
            const Panel = packFor(listing.category).CustomerPanel;
            return <Panel booking={booking} lead={lead} listing={listing} />;
          })()}

          {booking && booking.status !== 'cancelled' && (
            <Card title="Contract" actions={cs === 'signed' ? <Badge tone="green">Signed by both</Badge> : cs === 'partially_signed' ? <Badge tone="amber">Waiting for partner</Badge> : <Badge tone="amber">Awaiting your signature</Badge>}>
              {booking.contractSigned ? (
                <p className="muted">
                  You e-signed {partner.name}'s terms{booking.signedAt ? ' on ' + fmtDate(booking.signedAt) : ''}.{' '}
                  {cs === 'signed' ? `${partner.name} countersigned${booking.partnerSignedAt ? ' on ' + fmtDate(booking.partnerSignedAt) : ''}.` : `${partner.name} will countersign shortly.`} Cancellation follows the platform policy.
                </p>
              ) : (
                <div className="row between wrap gap">
                  <p className="muted grow">Review and e-sign the partner's terms. The date is held for you{booking.holdUntil ? ` until ${fmtDate(booking.holdUntil)}` : ' for 48 hours'}.</p>
                  <Button icon="edit" onClick={() => setShowContract(true)}>
                    Review and sign
                  </Button>
                </div>
              )}
            </Card>
          )}

          {invoice && (
            <Card
              title="Payments"
              subtitle={`${inr(totals.paid)} of ${inr(totals.total)} paid`}
              actions={
                <Button size="sm" variant="secondary" icon="download" onClick={() => setShowInvoice(true)}>
                  Invoice
                </Button>
              }
            >
              <div className="progress mb">
                <span style={{ width: (totals.paid / (totals.total || 1)) * 100 + '%' }} />
              </div>
              <div className="sched">
                {invoice.schedule.map((s) => (
                  <div key={s.id} className={'sched-row ' + (s.paidAt ? 'paid' : s.waived ? 'waived' : '')}>
                    <div className="grow">
                      <b>{s.label}</b> <ScheduleBadge s={s} />
                      <div className="small muted">
                        {s.paidAt ? `Paid ${fmtDate(s.paidAt)} via ${s.method}` : s.waived ? 'Not payable' : 'Due ' + fmtDate(s.due)}
                        {!s.paidAt && schedPaid(s) > 0 && ` - ${inr(schedPaid(s))} paid, ${inr(s.amount - schedPaid(s))} left`}
                      </div>
                    </div>
                    <b>{inr(s.amount)}</b>
                    {!s.paidAt && !s.waived && booking.status !== 'cancelled' && (
                      <Button size="sm" variant={schedStatus(s) === 'overdue' ? 'danger' : 'primary'} disabled={nextDue && nextDue.id !== s.id} onClick={() => setPayItem({ ...s, amount: s.amount - schedPaid(s) })}>
                        Pay
                      </Button>
                    )}
                    {s.paidAt && <Icon name="check" className="green" />}
                  </div>
                ))}
              </div>
              {booking.status === 'accepted' && !booking.contractSigned && (
                <p className="small muted mt">Your booking is confirmed once the contract is signed and the advance is paid.</p>
              )}
              {booking.status === 'accepted' && state.blocks.some((bl) => bl.bookingId === booking.id && holdExpired(state, bl)) && (
                <div className="notice notice-warning mt">
                  <Icon name="clock" />
                  <span>Your 48-hour date hold has lapsed. Pay the advance soon; another customer can now book this date.</span>
                </div>
              )}
              {['accepted', 'booked'].includes(booking.status) && totals.paid === 0 && (
                <div className="mt">
                  <span className="field-label">Have a coupon?</span>
                  <CouponBox booking={booking} />
                </div>
              )}
              {['accepted', 'booked'].includes(booking.status) && nextDue && (state.wallets[state.customerId] || {}).balance > 0 && (
                <div className="row between mt small">
                  <span>
                    Wallet balance <b>{inr(state.wallets[state.customerId].balance)}</b>
                  </span>
                  <button className="link small" onClick={() => actions.payFromWallet(invoice.id, nextDue.id)}>
                    Use wallet for {nextDue.label}
                  </button>
                </div>
              )}
            </Card>
          )}

          {booking && ['accepted', 'booked'].includes(booking.status) && (
            <Card title="Changes to this booking" subtitle="Move the date, change the guest count or ask for something extra. The partner approves each change.">
              <BookingChanges booking={booking} side="customer" />
            </Card>
          )}

          {booking && booking.status === 'completed' && !review && (
            <Card title="How was your experience?">
              <div className="stack">
                <StarInput value={rating} onChange={setRating} />
                <Field label="Title">
                  <input className="input" value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Sum it up in a line" />
                </Field>
                <Field label="Review">
                  <textarea className="textarea" value={rBody} onChange={(e) => setRBody(e.target.value)} placeholder="What went well? What could be better?" />
                </Field>
                <Button onClick={() => actions.submitReview(booking.id, rating, rTitle || 'Great experience', rBody)}>Submit review</Button>
              </div>
            </Card>
          )}
          {review && (
            <Card title="Your review" actions={review.status !== 'published' && <Badge status={review.status}>{REVIEW_LABEL[review.status]}</Badge>}>
              <Stars value={review.rating} />
              <h4 className="mt-s">{review.title}</h4>
              <p className="muted">{review.body}</p>
              {review.reply && (
                <div className="reply">
                  <b>Reply from {partner.name}:</b> {review.reply}
                </div>
              )}
            </Card>
          )}
        </div>

        <aside className="stack">
          <Card title="Summary">
            <div className="stack-s">
              <div className="row between">
                <span className="muted">Partner</span>
                <b>{partner.name}</b>
              </div>
              <div className="row between">
                <span className="muted">Date</span>
                <b>{fmtDate(lead.eventDate)}</b>
              </div>
              <div className="row between">
                <span className="muted">Status</span>
                {booking && bookingStatus(booking) === 'in_progress' ? <Badge tone="blue">Happening today</Badge> : <Badge status={stage} />}
              </div>
              {booking && booking.rescheduledFrom && (
                <div className="row between">
                  <span className="muted">Rescheduled from</span>
                  <span>{fmtDate(booking.rescheduledFrom)}</span>
                </div>
              )}
              {booking && (
                <div className="row between">
                  <span className="muted">Total</span>
                  <b>{inr(booking.total)}</b>
                </div>
              )}
              {totals && (
                <div className="row between">
                  <span className="muted">Balance</span>
                  <b>{inr(totals.due)}</b>
                </div>
              )}
            </div>
          </Card>
          {(canCancel || (booking && ['completed', 'reviewed', 'booked'].includes(booking.status))) && (
            <Card title="Need help?">
              <div className="stack-s">
                {canCancel && (
                  <Button variant="danger" block onClick={() => setCancel(true)}>
                    Cancel booking
                  </Button>
                )}
                {dispute ? (
                  <div className="notice notice-warning">
                    <Icon name="flag" />
                    <span>
                      Complaint {dispute.status === 'decided' ? 'resolved: ' + dispute.decision : 'under review'}
                    </span>
                  </div>
                ) : (
                  <Button variant="secondary" block icon="flag" onClick={() => setComplaint(true)}>
                    Raise a complaint
                  </Button>
                )}
              </div>
            </Card>
          )}
        </aside>
      </div>

      <PayModal open={!!payItem} item={payItem} onClose={() => setPayItem(null)} onPay={(m) => actions.payInstallment(invoice.id, payItem.id, m, 'online')} />

      <Modal open={showInvoice} title="Invoice" onClose={() => setShowInvoice(false)} wide footer={<Button icon="download" onClick={() => window.print()}>Download PDF</Button>}>
        {invoice && <InvoiceDoc invoice={invoice} partner={partner} />}
      </Modal>

      <Modal
        open={showContract}
        title="Service agreement"
        onClose={() => setShowContract(false)}
        wide
        footer={
          <Button
            disabled={!agree}
            onClick={() => {
              actions.signContract(booking.id);
              setShowContract(false);
            }}
          >
            E-sign with OTP
          </Button>
        }
      >
        <div className="stack small">
          <p>
            This agreement is between <b>{lead.contactName}</b> ("Customer") and <b>{partner.name}</b> ("Partner") for {lead.eventType} services on {fmtDate(lead.eventDate)}.
          </p>
          <ol>
            <li>The partner will deliver the services listed in quote {current && current.number} v{current && current.version}.</li>
            <li>Payments follow the schedule on the invoice: 30% advance, 50% one week before, 20% on the event day.</li>
            <li>Cancellation by the customer: 100% refund more than 30 days before, 50% between 7 and 30 days, none within 7 days.</li>
            <li>Cancellation by the partner: full refund of all amounts paid.</li>
            <li>Disputes are handled by the platform team based on evidence from both sides.</li>
          </ol>
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read and agree to these terms
          </label>
        </div>
      </Modal>

      <Modal
        open={changes}
        title="Request changes"
        onClose={() => setChanges(false)}
        footer={
          <Button
            disabled={!changeNote}
            onClick={() => {
              actions.requestChanges(current.id, changeNote);
              setChanges(false);
              setChangeNote('');
            }}
          >
            Send request
          </Button>
        }
      >
        <Field label="What would you like changed?">
          <textarea className="textarea" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="e.g. Can you include the pre-wedding shoot within 1 lakh?" />
        </Field>
      </Modal>

      <Modal
        open={decline}
        title="Decline this quote?"
        onClose={() => setDecline(false)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.declineQuote(current.id, declineReason);
              setDecline(false);
            }}
          >
            Decline quote
          </Button>
        }
      >
        <Field label="Tell the partner why (optional, helps them improve)">
          <select className="select" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
            <option>Price too high</option>
            <option>Booked another partner</option>
            <option>Event cancelled</option>
            <option>Not what I was looking for</option>
          </select>
        </Field>
      </Modal>

      <Modal
        open={cancel}
        title="Cancel booking"
        onClose={() => setCancel(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancel(false)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.cancelBooking(booking.id, 'customer', cancelReason);
                setCancel(false);
              }}
            >
              Confirm cancellation
            </Button>
          </>
        }
      >
        {preview && (
          <div className="stack">
            <div className="notice notice-warning">
              <Icon name="alert" />
              <span>
                Your event is {preview.days} days away. {preview.rule}.
              </span>
            </div>
            <div className="row between">
              <span className="muted">Paid so far</span>
              <b>{inr(preview.paid)}</b>
            </div>
            <div className="row between">
              <span className="muted">Refund ({preview.pct}%)</span>
              <b className="green">{inr(preview.refund)}</b>
            </div>
            <Field label="Reason">
              <select className="select" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                <option>Change of plans</option>
                <option>Found another partner</option>
                <option>Event postponed</option>
                <option>Budget</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={complaint}
        title="Raise a complaint"
        onClose={() => setComplaint(false)}
        footer={
          <Button
            disabled={!cText}
            onClick={() => {
              actions.raiseDispute({ bookingId: booking.id, reason: cReason, description: cText, amount: 0 });
              setComplaint(false);
            }}
          >
            Submit
          </Button>
        }
      >
        <div className="stack">
          <Field label="Issue">
            <select className="select" value={cReason} onChange={(e) => setCReason(e.target.value)}>
              <option>Service not as promised</option>
              <option>No-show or late arrival</option>
              <option>Payment issue</option>
              <option>Behaviour of staff</option>
            </select>
          </Field>
          <Field label="Describe what happened" hint="You can attach photos after submitting.">
            <textarea className="textarea" value={cText} onChange={(e) => setCText(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export function CustomerChat({ threadId }) {
  const { state } = useStore();
  const [quote, setQuote] = useState(null);
  const lead = quote && state.leads.find((l) => l.id === quote.leadId);
  const partner = quote && state.partners.find((p) => p.id === quote.partnerId);
  return (
    <div className="container section">
      <PageHeader title="Chat" subtitle="Message partners directly and share your requirements." />
      <ChatView side="customer" threadId={threadId} basePath="/chat" onOpenQuote={setQuote} />
      <Modal open={!!quote} title="Quote" onClose={() => setQuote(null)} wide footer={lead && <Button onClick={() => navigate('/bookings/' + lead.id)}>Open booking</Button>}>
        {quote && <QuoteDoc quote={quote} partner={partner} lead={lead} />}
      </Modal>
    </div>
  );
}
