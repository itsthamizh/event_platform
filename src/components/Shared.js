// Components shared between the customer app and the partner CRM.
import { useEffect, useRef, useState } from 'react';
import { fmtDate, fmtTime, inr } from '../config';
import { gstSplit } from '../ops';
import { Link } from '../router';
import { invoiceTotals, quoteTotals, useStore } from '../store';
import { Avatar, Badge, Button, Cover, Empty, Icon, Stars } from './ui';

export function categoryOf(state, id) {
  return state.categories.find((c) => c.id === id) || { name: id, icon: 'tag' };
}

export function VendorCard({ listing, compare, onCompare }) {
  const { state, actions } = useStore();
  const cat = categoryOf(state, listing.category);
  const fav = state.favourites.some((f) => f.listingId === listing.id);
  const loggedIn = state.role === 'customer';
  return (
    <div className="vcard">
      {loggedIn && (
        <button className={'fav-btn ' + (fav ? 'on' : '')} onClick={() => actions.toggleFavourite(listing.id)} aria-label="Shortlist">
          <Icon name="heart" size={16} />
        </button>
      )}
      {onCompare && (
        <label className="compare-check check">
          <input type="checkbox" checked={compare} onChange={() => onCompare(listing.id)} /> Compare
        </label>
      )}
      <Link to={'/vendor/' + listing.id}>
        <Cover seed={listing.id + listing.title} icon={cat.icon} height={150} />
      </Link>
      <Link to={'/vendor/' + listing.id} className="vcard-body">
        <div className="row between gap-s">
          <span className="vcard-title ellipsis">{listing.title}</span>
          {listing.verified && <Icon name="shieldCheck" size={16} className="green" />}
        </div>
        <div className="vcard-meta">
          <span>{cat.name}</span>
          <span className="row gap-xs">
            <Icon name="pin" size={12} /> {listing.area} - {listing.distanceKm} km
          </span>
        </div>
        <div className="vcard-meta">
          <Stars value={listing.rating} count={listing.ratingCount} />
          {listing.featured && <Badge tone="gold">Featured</Badge>}
        </div>
        <div className="vcard-price">
          <span className="small muted">Starts at</span>
          <span>
            <b>{inr(listing.priceFrom)}</b> <span className="small muted">{listing.priceUnit}</span>
          </span>
        </div>
      </Link>
    </div>
  );
}

export function QuoteDoc({ quote, partner, lead, compact }) {
  const t = quoteTotals(quote);
  return (
    <div className={compact ? '' : 'doc'}>
      {!compact && (
        <div className="doc-head">
          <div>
            <h2>{partner.name}</h2>
            <p className="muted small">{partner.gstin ? 'GSTIN ' + partner.gstin : 'Unregistered under GST'}</p>
          </div>
          <div className="right">
            <h3>
              Quote {quote.number} <span className="muted">v{quote.version}</span>
            </h3>
            <p className="small muted">Sent {fmtDate(quote.sentAt)} - valid until {fmtDate(quote.validUntil)}</p>
            <p className="small">For: {lead.contactName} - {lead.eventType} on {fmtDate(lead.eventDate)}</p>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td>
                <td className="right">{i.qty}</td>
                <td className="right">{inr(i.unitPrice)}</td>
                <td className="right">{inr(i.qty * i.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="totals">
        <div>
          <span className="muted">Subtotal</span>
          <span>{inr(t.subtotal)}</span>
        </div>
        {t.discount > 0 && (
          <div>
            <span className="muted">Discount</span>
            <span className="green">- {inr(t.discount)}</span>
          </div>
        )}
        {quote.gst && (
          <div>
            <span className="muted">GST 18%</span>
            <span>{inr(t.gst)}</span>
          </div>
        )}
        <div className="grand">
          <span>Total</span>
          <span>{inr(t.total)}</span>
        </div>
      </div>
      {quote.notes && <p className="small muted mt">Notes: {quote.notes}</p>}
    </div>
  );
}

export function InvoiceDoc({ invoice, partner }) {
  const { state } = useStore();
  const t = invoiceTotals(invoice);
  const booking = state.bookings.find((b) => b.id === invoice.bookingId);
  const quote = booking ? state.quotes.find((q) => q.id === booking.quoteId) : null;
  return (
    <div className="doc">
      <div className="doc-head">
        <div>
          <h2>{partner.name}</h2>
          <p className="muted small">{partner.gstin ? 'GSTIN ' + partner.gstin : 'Unregistered under GST'}</p>
          <p className="small muted">Chennai, Tamil Nadu</p>
        </div>
        <div className="right">
          <h3>{invoice.gst ? 'Tax invoice' : 'Invoice'}</h3>
          <p className="small">{invoice.number}</p>
          <p className="small muted">Issued {fmtDate(invoice.issuedAt)}</p>
        </div>
      </div>
      <p className="small">
        <b>Bill to:</b> {invoice.billTo} {invoice.billToGstin && <span className="muted">(GSTIN {invoice.billToGstin})</span>} {booking && <span className="muted">- Booking {booking.number}, event on {fmtDate(booking.eventDate)}</span>}
        {invoice.poNumber && <span className="muted"> - against PO {invoice.poNumber}</span>}
      </p>
      {quote && (
        <div className="mt">
          <QuoteDoc quote={quote} partner={partner} lead={{}} compact />
        </div>
      )}
      {invoice.gst && (() => {
        const g = gstSplit(partner, invoice);
        return (
          <p className="small muted">
            Place of supply: {g.place} ({g.inter ? 'inter-state' : 'intra-state'}). {g.inter ? `IGST 18% ${inr(g.igst)}` : `CGST 9% ${inr(g.cgst)} + SGST 9% ${inr(g.sgst)}`}.
          </p>
        );
      })()}
      <h4 className="mt">Payment schedule</h4>
      <div className="sched mt-s">
        {invoice.schedule.map((s) => (
          <div key={s.id} className={'sched-row ' + (s.paidAt ? 'paid' : s.waived ? 'waived' : '')}>
            <div className="grow">
              <b>{s.label}</b>
              <div className="small muted">Due {fmtDate(s.due)}</div>
            </div>
            <b>{inr(s.amount)}</b>
            {s.paidAt ? <Badge status="paid">Paid {fmtDate(s.paidAt)}</Badge> : s.waived ? <Badge status="waived" /> : <Badge status="due">Due</Badge>}
          </div>
        ))}
      </div>
      <div className="totals">
        <div>
          <span className="muted">Total</span>
          <span>{inr(t.total)}</span>
        </div>
        <div>
          <span className="muted">Paid</span>
          <span className="green">{inr(t.paid)}</span>
        </div>
        <div className="grand">
          <span>Balance</span>
          <span>{inr(t.due)}</span>
        </div>
      </div>
    </div>
  );
}

// Two-pane chat used by customers (side='customer') and partners (side='partner').
export function ChatView({ side, threadId, basePath, onOpenQuote }) {
  const { state, actions } = useStore();
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  const threads = state.threads
    .filter((t) => (side === 'customer' ? t.customerId === state.customerId : t.partnerId === state.partnerId))
    .map((t) => {
      const msgs = state.messages.filter((m) => m.threadId === t.id);
      return { ...t, last: msgs[msgs.length - 1] };
    })
    .sort((a, b) => ((b.last && b.last.at) || '').localeCompare((a.last && a.last.at) || ''));
  const active = threads.find((t) => t.id === threadId) || threads[0];
  const messages = active ? state.messages.filter((m) => m.threadId === active.id) : [];
  const titleFor = (t) => {
    if (side === 'customer') return state.listings.find((l) => l.id === t.listingId).title;
    const lead = state.leads.find((l) => l.id === t.leadId);
    const u = state.users.find((x) => x.id === t.customerId);
    return (lead && lead.contactName) || (u && u.name) || 'Customer';
  };

  const activeId = active ? active.id : null;
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length, activeId]);

  if (!threads.length) return <Empty icon="chat" title="No conversations yet">Start a chat from any partner profile.</Empty>;

  const send = () => {
    if (!text.trim()) return;
    actions.sendMessage(active.id, side, text.trim());
    setText('');
  };
  const lead = active && state.leads.find((l) => l.id === active.leadId);

  return (
    <div className="chat">
      <div className="chat-list">
        {threads.map((t) => (
          <Link key={t.id} to={basePath + '/' + t.id} className={'chat-item ' + (active && t.id === active.id ? 'active' : '')}>
            <Avatar name={titleFor(t)} size={38} />
            <div className="grow">
              <div className="row between">
                <b className="ellipsis">{titleFor(t)}</b>
                <small className="muted">{t.last ? fmtDate(t.last.at) : ''}</small>
              </div>
              <div className="small muted ellipsis">{t.last ? (t.last.type === 'quote' ? 'Sent a quote' : t.last.type === 'booking_request' ? 'Booking request' : t.last.body) : 'No messages yet'}</div>
            </div>
          </Link>
        ))}
      </div>
      {active && (
        <div className="chat-main">
          <div className="chat-head">
            <div className="row gap-s">
              <Avatar name={titleFor(active)} size={34} />
              <div>
                <b>{titleFor(active)}</b>
                {lead && (
                  <div className="small muted">
                    {lead.eventType} - {fmtDate(lead.eventDate)} - {lead.guests} guests
                  </div>
                )}
              </div>
            </div>
            {lead && (
              <Link to={side === 'customer' ? '/bookings/' + lead.id : '/partner/leads/' + lead.id} className="btn btn-secondary btn-sm">
                {side === 'customer' ? 'View booking' : 'Open lead'}
              </Link>
            )}
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m) => {
              const mine = m.side === side;
              if (m.type === 'quote') {
                const q = state.quotes.find((x) => x.id === m.refId);
                if (!q) return null;
                const t = quoteTotals(q);
                return (
                  <div key={m.id} className={'bubble-card ' + (mine ? 'me' : '')}>
                    <div className="card">
                      <div className="card-body stack-s">
                        <div className="row between">
                          <b>
                            <Icon name="file" size={14} /> Quote {q.number} v{q.version}
                          </b>
                          <Badge status={q.status} />
                        </div>
                        <div className="small muted">{q.items.map((i) => i.description).join(', ')}</div>
                        <div className="row between">
                          <b>{inr(t.total)}</b>
                          <Button size="sm" variant="secondary" onClick={() => onOpenQuote && onOpenQuote(q)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                    <small className="muted tiny">{fmtTime(m.at)}</small>
                  </div>
                );
              }
              if (m.type === 'booking_request') {
                return (
                  <div key={m.id} className={'bubble-card ' + (mine ? 'me' : '')}>
                    <div className="card">
                      <div className="card-body stack-s">
                        <b>
                          <Icon name="calendar" size={14} /> Booking request
                        </b>
                        {m.meta && (
                          <div className="small">
                            {m.meta.eventType} - {fmtDate(m.meta.date)} - {m.meta.guests} guests
                          </div>
                        )}
                        <div className="small muted">{m.body}</div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className={'bubble ' + (mine ? 'me' : '')}>
                  {m.body}
                  <small>{fmtTime(m.at)}</small>
                </div>
              );
            })}
          </div>
          <div className="chat-input">
            <input className="input" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <Button icon="send" onClick={send}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
