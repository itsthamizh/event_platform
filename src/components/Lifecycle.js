// Shared lifecycle widgets used by both the customer app and the Partner CRM:
// booking change requests, payment schedule status, contract status, B2B buyer details.
import { useState } from 'react';
import { fmtDate, fmtDateTime, inr } from '../config';
import { Link } from '../router';
import { useStore } from '../store';
import { BUYER_LABEL, CHANNEL_LABEL, CONTRACT_LABEL, PO_LABEL, contractStatus, schedPaid, schedStatus } from '../lifecycle';
import { Badge, Button, Field, Modal } from './ui';

export const CHANGE_LABEL = { reschedule: 'Reschedule', guest_count: 'Guest count', scope: 'Scope change' };

export function ScheduleBadge({ s }) {
  const st = schedStatus(s);
  return <Badge status={st}>{st === 'partially_paid' ? `Part paid (${inr(schedPaid(s))})` : undefined}</Badge>;
}

export function ContractBadge({ booking }) {
  const st = contractStatus(booking);
  return <Badge status={st === 'sent' ? 'pending' : st}>{CONTRACT_LABEL[st]}</Badge>;
}

const describe = (c) =>
  c.type === 'reschedule' ? `Move from ${fmtDate(c.from)} to ${fmtDate(c.to)}` : c.type === 'guest_count' ? `Guests ${c.from} to ${c.to}` : c.note;

// List + request form. side = 'customer' | 'partner'.
export function BookingChanges({ booking, side }) {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('reschedule');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const list = state.bookingChanges.filter((c) => c.bookingId === booking.id).sort((a, b) => b.at.localeCompare(a.at));
  const canRequest = ['accepted', 'booked'].includes(booking.status);
  const theirs = (c) => c.requestedBy !== side;
  const body = (
    <div className="stack-s">
      {list.length === 0 && <div className="muted small">No change requests.</div>}
      {list.map((c) => (
        <div key={c.id} className="row between wrap gap-s" style={{ borderBottom: '1px solid var(--line, #e6e8ee)', paddingBottom: 8 }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <b>{CHANGE_LABEL[c.type]}</b> <Badge status={c.status} />
            <div className="small">{describe(c)}</div>
            {c.type !== 'scope' && c.note && <div className="small muted">"{c.note}"</div>}
            <div className="tiny muted">
              Requested by {c.requestedBy} - {fmtDateTime(c.at)}
              {c.reply ? ` - Reply: ${c.reply}` : ''}
            </div>
          </div>
          {c.status === 'requested' && theirs(c) && (
            <div className="row gap-s">
              <Button size="sm" onClick={() => actions.decideBookingChange(c.id, 'approved', c.type === 'guest_count' ? 'Updated. Revised quote will follow if the price changes.' : 'Done')}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => actions.decideBookingChange(c.id, 'declined', 'Not possible on this date')}>
                Decline
              </Button>
            </div>
          )}
          {c.status === 'requested' && !theirs(c) && <span className="small muted">Waiting for the {side === 'customer' ? 'partner' : 'customer'}</span>}
        </div>
      ))}
      {canRequest && (
        <div>
          <button className={side === 'partner' ? 'zc-rl-link' : 'link small'} onClick={() => setOpen(true)}>
            {side === 'partner' ? '+ Propose a change' : 'Request a change (date, guests or scope)'}
          </button>
        </div>
      )}
      <Modal
        open={open}
        title={side === 'partner' ? 'Propose a change' : 'Request a change'}
        onClose={() => setOpen(false)}
        footer={
          <Button
            disabled={(type !== 'scope' && !to) || (type === 'scope' && !note)}
            onClick={() => {
              actions.requestBookingChange({ bookingId: booking.id, type, to, note, by: side });
              setOpen(false);
              setTo('');
              setNote('');
            }}
          >
            Send request
          </Button>
        }
      >
        <div className="stack">
          <Field label="What should change?">
            <div className="chips">
              {Object.entries(CHANGE_LABEL).map(([k, v]) => (
                <button key={k} className={'chip ' + (type === k ? 'active' : '')} onClick={() => { setType(k); setTo(''); }}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
          {type === 'reschedule' && (
            <Field label="New date" hint={`Current date: ${fmtDate(booking.eventDate)}. The partner checks availability before approving.`}>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          )}
          {type === 'guest_count' && (
            <Field label="New guest count" hint="Price may change for per-plate or per-guest services.">
              <input className="input" type="number" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          )}
          <Field label={type === 'scope' ? 'Describe the change' : 'Note (optional)'}>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
  return body;
}

// B2B details on a lead or booking (corporate buyer or planner).
export function BuyerDetails({ lead, booking }) {
  const { state } = useStore();
  const b = lead.buyer;
  if (!b) return null;
  const rfq = lead.rfqId && state.rfqs.find((r) => r.id === lead.rfqId);
  const po = state.pos.find((p) => p.id === ((booking && booking.poId) || b.poId)) || state.pos.find((p) => p.leadId === lead.id);
  const parent = b.parentBookingId && state.bookings.find((x) => x.id === b.parentBookingId);
  const project = b.projectId && state.projects.find((p) => p.id === b.projectId);
  return (
    <div className="zc-fields cols-2">
      {[
        ['Buyer type', <Badge status={b.type}>{BUYER_LABEL[b.type]}</Badge>],
        ['Company', b.orgName],
        ['GSTIN', b.gstin || '-'],
        ['Contact', `${b.contact ? b.contact.name : lead.contactName}${b.contact && b.contact.phone ? ' - ' + b.contact.phone : ''}`],
        ['Credit terms', b.type === 'corporate' ? `Net ${b.creditDays} days after event` : '50% advance, balance in 15 days'],
        ['Channel', CHANNEL_LABEL[b.channel] || b.channel],
        rfq && ['RFQ', `${rfq.number} - quotes due ${fmtDate(rfq.dueDate)}`],
        po && ['Purchase order', <Link to={'/partner/purchase-orders/' + po.id} className="zc-link">{po.number} ({PO_LABEL[po.status]})</Link>],
        project && ['Planner project', project.title],
        parent && ['Planner client booking', parent.number],
      ]
        .filter(Boolean)
        .map(([k, v]) => (
          <div key={k} className="zc-field">
            <span className="zc-flabel">{k}</span>
            <span className="zc-fvalue">{v}</span>
          </div>
        ))}
    </div>
  );
}
