import { useEffect, useState } from 'react';
import { addDays, fmtDate, fmtDateTime, inr, todayISO } from '../../config';
import { EVENT_TYPES } from '../../data/mock';
import { Link, navigate } from '../../router';
import { LEAD_STAGES, LEAD_STAGE_LABEL, quoteTotals, quotesForLead, useCurrentMember, usePerms, useStore } from '../../store';
import { Badge, Button, Card, Empty, Field, Icon, Modal, Tabs } from '../../components/ui';
import { BlueprintBar, DetailLayout, FieldGrid, ListView, MiniTable, RecordHeader, Section, StagePath, Timeline } from '../../components/crm';
import { QuoteDoc } from '../../components/Shared';
import { describeDetails, packFor } from '../../categories/packs';
import { BUYER_LABEL, LEAD_PRIORITY, LOST_REASONS, PO_LABEL, PRIORITY_LABEL, QUOTE_STATUS_LABEL, quoteStatus } from '../../lifecycle';
import { BuyerDetails } from '../../components/Lifecycle';
import { enrichQuote } from '../../ops';
import { TrialsSection } from '../../components/Ops';
import { activeBranch, activeBranches, branchName, inScope, lockedBranch } from '../../accounts';

const SOURCE_ICON = { app: 'phone', whatsapp: 'whatsapp', manual: 'edit', website: 'search', rfq: 'file', corporate: 'building', planner: 'clipboard' };
const SOURCE_LABEL = { app: 'App', whatsapp: 'WhatsApp', manual: 'Manual', website: 'Website', rfq: 'RFQ', corporate: 'Corporate PO', planner: 'Planner' };
const PRIORITY_TONE = { low: 'gray', medium: 'blue', high: 'orange', hot: 'red' };
const QBadge = ({ q }) => {
  const st = quoteStatus(q);
  return <Badge status={st}>{QUOTE_STATUS_LABEL[st]}</Badge>;
};

function AddLeadModal({ open, onClose }) {
  const { actions } = useStore();
  const [f, setF] = useState({ contactName: '', contactPhone: '', source: 'whatsapp', eventType: 'Wedding', eventDate: '', guests: 100, budget: 50000, requirements: '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal
      open={open}
      title="Add lead"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.contactName || !f.eventDate}
            onClick={() => {
              const id = actions.addLead({ ...f, guests: Number(f.guests), budget: Number(f.budget), nextFollowUp: addDays(todayISO(), 1) });
              onClose();
              navigate('/partner/leads/' + id);
            }}
          >
            Add lead
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Source">
          <div className="chips">
            {['whatsapp', 'manual', 'website'].map((s) => (
              <button key={s} type="button" className={'chip ' + (f.source === s ? 'active' : '')} onClick={() => set('source', s)}>
                <Icon name={SOURCE_ICON[s]} size={14} /> {SOURCE_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-2">
          <Field label="Customer name">
            <input className="input" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+91" />
          </Field>
          <Field label="Event type">
            <select className="select" value={f.eventType} onChange={(e) => set('eventType', e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Event date">
            <input className="input" type="date" value={f.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
          </Field>
          <Field label="Guests">
            <input className="input" type="number" value={f.guests} onChange={(e) => set('guests', e.target.value)} />
          </Field>
          <Field label="Budget">
            <input className="input" type="number" value={f.budget} onChange={(e) => set('budget', e.target.value)} />
          </Field>
        </div>
        <Field label="Requirements">
          <textarea className="textarea" value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder="Paste the WhatsApp message or notes from the call" />
        </Field>
      </div>
    </Modal>
  );
}

const STAGE_COLORS = { new: '#4d9bff', contacted: '#8b5cf6', quoted: '#f0a020', negotiation: '#f97316', won: '#16a34a', lost: '#9aa3b2' };

export function LeadsBoard({ query }) {
  const { state } = useStore();
  const { can } = usePerms();
  const me = useCurrentMember();
  const [adding, setAdding] = useState(query.add === '1');
  const members = state.members.filter((m) => inScope(state, m));
  const memberName = (id) => (members.find((m) => m.id === id) || {}).name || '';
  const leads = state.leads.filter((l) => inScope(state, l));
  const showBranch = activeBranch(state) === 'all' && activeBranches(state).length > 1;
  const quoteValue = (l) => {
    const q = quotesForLead(state, l.id)[0];
    return q ? quoteTotals(q).total : l.budget;
  };
  const today = todayISO();
  const weekAgo = addDays(today, -7);
  return (
    <>
      <ListView
        module={{ singular: 'Lead', plural: 'Leads' }}
        rows={leads}
        onRow={(l) => navigate('/partner/leads/' + l.id)}
        onCreate={can('leads.edit') ? () => setAdding(true) : null}
        defaultMode="list"
        views={[
          { id: 'all', label: 'All Leads', filter: () => true },
          { id: 'open', label: 'Open Leads', filter: (l) => !['won', 'lost'].includes(l.status) },
          { id: 'mine', label: 'My Leads', filter: (l) => me && l.assignedTo === me.id },
          { id: 'week', label: 'Leads Created This Week', filter: (l) => l.createdAt.slice(0, 10) >= weekAgo },
          { id: 'due', label: 'Follow-ups Due', filter: (l) => l.nextFollowUp && l.nextFollowUp <= today && !['won', 'lost'].includes(l.status) },
          { id: 'hot', label: 'Hot & High Priority', filter: (l) => ['hot', 'high'].includes(l.priority) && !['won', 'lost'].includes(l.status) },
          { id: 'b2b', label: 'B2B Leads (RFQ / Corporate / Planner)', filter: (l) => !!l.buyer },
          { id: 'won', label: 'Won Leads', filter: (l) => l.status === 'won' },
          { id: 'lost', label: 'Lost Leads', filter: (l) => l.status === 'lost' },
        ]}
        filterFields={[
          { key: 'status', label: 'Lead Status', type: 'select', get: (l) => l.status, options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] })) },
          { key: 'source', label: 'Lead Source', type: 'select', get: (l) => l.source, options: Object.keys(SOURCE_LABEL).map((s) => ({ value: s, label: SOURCE_LABEL[s] })) },
          { key: 'eventType', label: 'Event Type', type: 'select', get: (l) => l.eventType },
          { key: 'priority', label: 'Priority', type: 'select', get: (l) => l.priority || 'medium', options: LEAD_PRIORITY.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })) },
          { key: 'buyerType', label: 'Buyer Type', type: 'select', get: (l) => l.buyerType || 'individual', options: Object.entries(BUYER_LABEL).map(([value, label]) => ({ value, label })) },
          { key: 'lostReason', label: 'Lost Reason', type: 'select', get: (l) => l.lostReason || '' },
          { key: 'owner', label: 'Lead Owner', type: 'select', get: (l) => l.assignedTo || '', options: members.map((m) => ({ value: m.id, label: m.name })) },
          ...(showBranch ? [{ key: 'branch', label: 'Branch', type: 'select', get: (l) => l.branchId || '', options: activeBranches(state).map((b) => ({ value: b.id, label: b.name })) }] : []),
          { key: 'name', label: 'Lead Name', type: 'text', get: (l) => l.contactName },
          { key: 'phone', label: 'Phone', type: 'text', get: (l) => l.contactPhone },
        ]}
        columns={[
          { key: 'contactName', label: 'Lead Name', render: (l) => (l.buyer ? `${l.buyer.orgName} (${l.contactName})` : l.contactName) },
          { key: 'priority', label: 'Priority', render: (l) => <Badge tone={PRIORITY_TONE[l.priority || 'medium']}>{PRIORITY_LABEL[l.priority || 'medium']}</Badge>, sortValue: (l) => LEAD_PRIORITY.indexOf(l.priority || 'medium') },
          { key: 'eventType', label: 'Event Type' },
          { key: 'eventDate', label: 'Event Date', render: (l) => fmtDate(l.eventDate) },
          { key: 'contactPhone', label: 'Phone' },
          { key: 'source', label: 'Lead Source', render: (l) => SOURCE_LABEL[l.source] },
          { key: 'status', label: 'Lead Status', render: (l) => <Badge status={l.status}>{LEAD_STAGE_LABEL[l.status]}</Badge> },
          { key: 'value', label: 'Expected Value', align: 'right', render: (l) => inr(quoteValue(l)), sortValue: quoteValue },
          { key: 'assignedTo', label: 'Lead Owner', render: (l) => memberName(l.assignedTo) || '-', sortValue: (l) => memberName(l.assignedTo) },
          ...(showBranch ? [{ key: 'branchId', label: 'Branch', render: (l) => branchName(state, l.branchId) || '-', sortValue: (l) => branchName(state, l.branchId) }] : []),
          { key: 'nextFollowUp', label: 'Next Follow-up', render: (l) => (l.nextFollowUp && !['won', 'lost'].includes(l.status) ? <span className={l.nextFollowUp <= today ? 'red' : ''}>{fmtDate(l.nextFollowUp)}</span> : '-') },
          { key: 'createdAt', label: 'Created Time', render: (l) => fmtDateTime(l.createdAt) },
        ]}
        kanban={{
          groups: LEAD_STAGES.map((s) => ({ id: s, label: LEAD_STAGE_LABEL[s], color: STAGE_COLORS[s] })),
          groupOf: (l) => l.status,
          total: (items) => inr(items.reduce((a, l) => a + quoteValue(l), 0)),
          card: (l) => (
            <>
              <b>{l.buyer ? l.buyer.orgName : l.contactName}</b>
              {(l.priority === 'hot' || l.buyer) && (
                <div className="kv-line">
                  {l.buyer ? <Badge status={l.buyer.type}>{BUYER_LABEL[l.buyer.type]}</Badge> : <span />}
                  {l.priority === 'hot' && <Badge tone="red">Hot</Badge>}
                </div>
              )}
              <div className="kv-line">
                <span>{l.eventType}</span>
                <span>{fmtDate(l.eventDate)}</span>
              </div>
              <div className="kv-line">
                <span>{SOURCE_LABEL[l.source]}</span>
                <span className="zc-ink bold">{inr(quoteValue(l))}</span>
              </div>
              {l.assignedTo && <div className="kv-line"><span>Owner</span><span>{memberName(l.assignedTo)}</span></div>}
            </>
          ),
        }}
      />
      <AddLeadModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

export function LeadDetail({ id }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const [tab, setTab] = useState('Overview');
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [due, setDue] = useState('');
  const [lost, setLost] = useState(false);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0].label);
  const [viewQuote, setViewQuote] = useState(null);
  const [declineRfq, setDeclineRfq] = useState(false);
  // Opening an RFQ lead tells the buyer the vendor has seen it.
  useEffect(() => {
    actions.markRfqViewed(id);
  }, [id, actions]);
  const lead = state.leads.find((l) => l.id === id && inScope(state, l));
  if (!lead) return <Empty title="Lead not found" />;
  const rfq = lead.rfqId && state.rfqs.find((r) => r.id === lead.rfqId);
  const invite = rfq && rfq.invites.find((i) => i.id === lead.rfqInviteId);
  const po = state.pos.find((p) => p.leadId === lead.id && p.partnerId === state.partnerId);
  const partner = state.partners.find((p) => p.id === lead.partnerId);
  const listingOfLead = state.listings.find((l) => l.id === lead.listingId) || { category: '' };
  const quotes = quotesForLead(state, lead.id);
  const acts = state.leadActivities.filter((a) => a.leadId === lead.id);
  const booking = lead.bookingId && state.bookings.find((b) => b.id === lead.bookingId);
  const thread = state.threads.find((t) => t.leadId === lead.id);
  const messages = thread ? state.messages.filter((m) => m.threadId === thread.id) : [];
  const members = state.members.filter((m) => inScope(state, m) && m.status === 'active' && ['owner', 'manager', 'sales'].includes(m.role));
  const owner = members.find((m) => m.id === lead.assignedTo);
  const latest = quotes[0];
  const waText = encodeURIComponent(`Hi ${lead.contactName}, thanks for your enquiry for ${lead.eventType} on ${fmtDate(lead.eventDate)}.` + (latest ? ` Our quote ${latest.number} comes to ${inr(quoteTotals(latest).total)}.` : ''));
  const editable = can('leads.edit') && !booking && lead.status !== 'lost';
  const quoteLink = '/partner/quotes/new?lead=' + lead.id;

  const transitions = [];
  if (editable && lead.status === 'new') transitions.push({ label: 'Mark as Contacted', primary: true, onClick: () => actions.setLeadStatus(lead.id, 'contacted') });
  if (editable && can('quotes.send') && ['new', 'contacted'].includes(lead.status)) transitions.push({ label: 'Send Quote', primary: lead.status === 'contacted', onClick: () => navigate(quoteLink) });
  if (editable && can('quotes.send') && ['quoted', 'negotiation'].includes(lead.status)) transitions.push({ label: 'Revise Quote', primary: true, onClick: () => navigate(quoteLink) });
  if (po && po.status === 'issued' && can('quotes.send')) transitions.unshift({ label: 'Review Purchase Order', primary: true, onClick: () => navigate('/partner/purchase-orders/' + po.id) });
  if (editable && rfq && invite && ['invited', 'viewed'].includes(invite.status) && rfq.status === 'open') transitions.push({ label: 'Decline RFQ', onClick: () => setDeclineRfq(true) });
  if (editable && !(rfq && invite && ['invited', 'viewed'].includes(invite.status))) transitions.push({ label: 'Mark as Lost', onClick: () => setLost(true) });
  const bpNote = po && !booking
    ? `Purchase order ${po.number} - ${PO_LABEL[po.status]}${po.status === 'pending_approval' ? ' (waiting for the buyer\'s internal approval)' : po.status === 'issued' ? '. Accept it to confirm the booking.' : ''}`
    : rfq && invite && !booking && ['invited', 'viewed', 'responded'].includes(invite.status)
    ? `RFQ ${rfq.number} from ${rfq.buyerName}. Quotes due ${fmtDate(rfq.dueDate)}.${invite.status === 'responded' ? ' Your quote is with the buyer.' : ''}`
    : booking
    ? booking.status === 'accepted'
      ? 'Quote accepted. Waiting for contract signature and advance payment.'
      : `Converted to booking ${booking.number}.`
    : lead.status === 'lost'
    ? 'Reason: ' + lead.lostReason
    : null;

  const timeline = [
    ...acts.map((a) => ({ id: a.id, at: a.at, icon: a.type === 'call' ? 'phone' : a.type === 'reminder' ? 'clock' : a.type === 'status' ? 'activity' : 'edit', body: a.body, meta: `${a.by} - ${fmtDateTime(a.at)}` })),
    ...messages.map((m) => ({ id: m.id, at: m.at, icon: 'chat', body: (m.side === 'partner' ? 'You: ' : lead.contactName + ': ') + (m.type === 'quote' ? 'sent ' + m.body : m.body), meta: 'Chat - ' + fmtDateTime(m.at) })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <RecordHeader
        back="/partner/leads"
        avatar={lead.contactName}
        title={lead.buyer ? `${lead.buyer.orgName}` : lead.contactName}
        subtitle={`${lead.buyer ? lead.contactName + ' - ' : ''}${lead.eventType} - ${fmtDate(lead.eventDate)} - via ${SOURCE_LABEL[lead.source] || lead.source}`}
        owner={owner ? owner.name : 'Unassigned'}
        badges={
          <>
            <Badge status={lead.status}>{LEAD_STAGE_LABEL[lead.status]}</Badge>
            {lead.buyer && <Badge status={lead.buyer.type}>{BUYER_LABEL[lead.buyer.type]}</Badge>}
            {lead.priority && lead.priority !== 'medium' && <Badge tone={PRIORITY_TONE[lead.priority]}>{PRIORITY_LABEL[lead.priority]}</Badge>}
          </>
        }
        actions={
          <>
            <a className="zc-btn" href={'https://wa.me/' + (lead.contactPhone || '').replace(/\D/g, '') + '?text=' + waText} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={14} /> WhatsApp
            </a>
            {thread && can('chat') && (
              <Link to={'/partner/inbox/' + thread.id} className="zc-btn">
                <Icon name="chat" size={14} /> Chat
              </Link>
            )}
            {booking && (
              <Link to={'/partner/bookings/' + booking.id} className="zc-btn zc-btn-primary">
                Open Booking
              </Link>
            )}
          </>
        }
      />
      <StagePath
        stages={LEAD_STAGES.filter((s) => s !== 'lost').map((s) => ({ id: s, label: LEAD_STAGE_LABEL[s] }))}
        current={lead.status === 'lost' ? 'lost' : lead.status}
        lost={lead.status === 'lost'}
        onPick={editable ? (s) => actions.setLeadStatus(lead.id, s) : null}
      />
      <BlueprintBar state={LEAD_STAGE_LABEL[lead.status]} transitions={transitions} note={bpNote} />

      <DetailLayout
        tab={tab}
        onTab={setTab}
        nav={[
          { id: 'info', label: 'Lead Information' },
          lead.buyer && { id: 'buyer', label: 'Business Buyer' },
          { id: 'req', label: 'Requirements' },
          { id: 'trials', label: 'Tastings & Visits', count: state.trials.filter((t) => t.leadId === lead.id).length },
          { id: 'notes', label: 'Notes', count: acts.filter((a) => a.type !== 'status').length },
          { id: 'quotes', label: 'Quotes', count: quotes.length },
          { id: 'booking', label: 'Bookings', count: booking ? 1 : 0 },
          { id: 'chats', label: 'Chats', count: messages.length },
        ].filter(Boolean)}
      >
        {tab === 'Timeline' ? (
          <Section title="Timeline">
            <Timeline items={timeline} />
          </Section>
        ) : (
          <>
            <Section id="info" title="Lead Information">
              <FieldGrid
                fields={[
                  ['Lead Name', lead.contactName],
                  ['Lead Owner', can('leads.edit') ? (
                    <select className="select input-sm" style={{ maxWidth: 220 }} value={lead.assignedTo || ''} onChange={(e) => actions.updateLead(lead.id, { assignedTo: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  ) : owner ? owner.name : ''],
                  activeBranches(state).length > 1 && ['Branch', can('leads.edit') && !lockedBranch(state) ? (
                    <select className="select input-sm" style={{ maxWidth: 200 }} value={lead.branchId || ''} onChange={(e) => actions.moveLeadBranch(lead.id, e.target.value)} aria-label="Branch">
                      {activeBranches(state).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : branchName(state, lead.branchId)],
                  ['Priority', can('leads.edit') ? (
                    <select className="select input-sm" style={{ maxWidth: 160 }} value={lead.priority || 'medium'} onChange={(e) => actions.updateLead(lead.id, { priority: e.target.value })} aria-label="Priority">
                      {LEAD_PRIORITY.map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                      ))}
                    </select>
                  ) : PRIORITY_LABEL[lead.priority || 'medium']],
                  ['Phone', lead.contactPhone],
                  ['Lead Source', SOURCE_LABEL[lead.source] || lead.source],
                  ['Event Type', lead.eventType],
                  ['Event Date', fmtDate(lead.eventDate)],
                  ['No. of Guests', lead.guests],
                  ['Budget', inr(lead.budget)],
                  ['Lead Status', LEAD_STAGE_LABEL[lead.status]],
                  ['Next Follow-up', lead.nextFollowUp ? fmtDate(lead.nextFollowUp) : ''],
                  ['Created Time', fmtDateTime(lead.createdAt)],
                  ['Customer on App', lead.buyer ? 'No (business buyer)' : lead.customerId ? 'Yes' : 'No (offline lead)'],
                  lead.status === 'lost' && ['Lost Reason', lead.lostReason],
                ]}
              />
              <div className="zc-section-sub">Requirements</div>
              <FieldGrid cols={1} fields={[['Description', lead.requirements]]} />
            </Section>

            {lead.buyer && (
              <Section id="buyer" title="Business Buyer">
                <BuyerDetails lead={lead} booking={booking} />
                {rfq && (
                  <>
                    <div className="zc-section-sub">RFQ scope</div>
                    <FieldGrid cols={1} fields={[['Requirements', rfq.requirements], ['Your response', invite ? <Badge status={invite.status} /> : '-']]} />
                  </>
                )}
              </Section>
            )}

            <Section id="req" title={`${packFor(listingOfLead.category).generic ? 'Event' : packFor(listingOfLead.category).label} Requirements`}>
              {describeDetails(listingOfLead.category, lead.details, listingOfLead).length ? (
                <FieldGrid fields={describeDetails(listingOfLead.category, lead.details, listingOfLead)} />
              ) : (
                <div className="muted small zc-empty-rl">No category details captured. Ask the customer and add them to the notes.</div>
              )}
            </Section>

            <TrialsSection lead={lead} side="partner" />

            <Section id="notes" title="Notes" count={acts.filter((a) => a.type !== 'status').length}>
              {can('leads.edit') && (
                <div className="stack-s mb">
                  <div className="row gap-s">
                    {[['note', 'Note'], ['call', 'Log a call'], ['reminder', 'Follow-up task']].map(([k, l]) => (
                      <button key={k} className={'chip ' + (noteType === k ? 'active' : '')} onClick={() => setNoteType(k)}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={noteType === 'reminder' ? 'What to follow up on' : 'Add a note'} />
                  <div className="row gap-s">
                    {noteType === 'reminder' && <input type="date" className="input input-sm" style={{ width: 170 }} value={due} onChange={(e) => setDue(e.target.value)} />}
                    <button
                      className="zc-btn zc-btn-primary"
                      disabled={!note || (noteType === 'reminder' && !due)}
                      onClick={() => {
                        actions.addLeadActivity(lead.id, noteType, note, noteType === 'reminder' ? due : null);
                        setNote('');
                        setDue('');
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
              <Timeline items={acts.filter((a) => a.type !== 'status').map((a) => ({ id: a.id, icon: a.type === 'call' ? 'phone' : a.type === 'reminder' ? 'clock' : 'edit', body: a.body, meta: `${a.by} - ${fmtDateTime(a.at)}${a.due ? ' - due ' + fmtDate(a.due) : ''}` }))} />
            </Section>

            <Section id="quotes" title="Quotes" count={quotes.length} actions={editable && can('quotes.send') && <Link to={quoteLink} className="zc-rl-link">+ New Quote</Link>}>
              <MiniTable
                rows={quotes}
                onRow={setViewQuote}
                empty="No quotes yet."
                columns={[
                  { label: 'Quote Number', render: (q) => `${q.number} v${q.version}` },
                  { label: 'Quote Stage', render: (q) => <QBadge q={q} /> },
                  { label: 'Grand Total', align: 'right', render: (q) => inr(quoteTotals(q).total) },
                  { label: 'Valid Till', render: (q) => fmtDate(q.validUntil) },
                  { label: 'Sent On', render: (q) => fmtDate(q.sentAt) },
                  { label: 'Viewed', render: (q) => (q.viewedAt ? fmtDateTime(q.viewedAt) : '-') },
                ]}
              />
              {latest && latest.status === 'changes_requested' && (
                <div className="notice notice-warning mt-s">
                  <Icon name="chat" />
                  <span>Customer asked: "{latest.changeNote}"</span>
                </div>
              )}
            </Section>

            <Section id="booking" title="Bookings" count={booking ? 1 : 0}>
              <MiniTable
                rows={booking ? [booking] : []}
                onRow={(b) => navigate('/partner/bookings/' + b.id)}
                empty="Not converted yet. A booking is created when the customer accepts a quote."
                columns={[
                  { label: 'Booking Number', render: (b) => b.number },
                  { label: 'Status', render: (b) => <Badge status={b.status} /> },
                  { label: 'Event Date', render: (b) => fmtDate(b.eventDate) },
                  { label: 'Amount', align: 'right', render: (b) => inr(b.total) },
                ]}
              />
            </Section>

            <Section id="chats" title="Chats" count={messages.length} actions={thread && can('chat') && <Link to={'/partner/inbox/' + thread.id} className="zc-rl-link">Open chat</Link>}>
              {messages.length === 0 ? (
                <div className="muted small zc-empty-rl">No chat with this lead. Offline leads are contacted by phone or WhatsApp.</div>
              ) : (
                <Timeline items={messages.slice(-4).reverse().map((m) => ({ id: m.id, icon: 'chat', body: (m.side === 'partner' ? 'You: ' : lead.contactName + ': ') + (m.type === 'quote' ? 'sent ' + m.body : m.body), meta: fmtDateTime(m.at) }))} />
              )}
            </Section>
          </>
        )}
      </DetailLayout>

      <Modal
        open={lost}
        title="Mark lead as lost"
        onClose={() => setLost(false)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.setLeadStatus(lead.id, 'lost', lostReason);
              setLost(false);
            }}
          >
            Mark lost
          </Button>
        }
      >
        <Field label="Reason">
          <select className="select" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
            {LOST_REASONS.map((r) => (
              <option key={r.id}>{r.label}</option>
            ))}
          </select>
        </Field>
      </Modal>
      <Modal
        open={declineRfq}
        title="Decline this RFQ?"
        onClose={() => setDeclineRfq(false)}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.declineRfq(lead.id, 'Date not available');
              setDeclineRfq(false);
            }}
          >
            Decline
          </Button>
        }
      >
        <p className="small">The buyer is told you cannot quote for {rfq && rfq.number}. Declining quickly keeps your response rate high.</p>
      </Modal>
      <Modal open={!!viewQuote} title="Quote" onClose={() => setViewQuote(null)} wide>
        {viewQuote && <QuoteDoc quote={viewQuote} partner={partner} lead={lead} />}
      </Modal>
    </>
  );
}

export function QuotesList() {
  const { state } = useStore();
  const leads = state.leads.filter((l) => inScope(state, l));
  const rows = state.quotes
    .filter((q) => inScope(state, q))
    .map((q) => ({ ...q, lead: leads.find((l) => l.id === q.leadId) || {}, total: quoteTotals(q).total, stage: quoteStatus(q) }));
  return (
    <ListView
      module={{ singular: 'Quote', plural: 'Quotes' }}
      rows={rows}
      onRow={(q) => navigate('/partner/quotes/' + q.id)}
      onCreate={() => navigate('/partner/leads')}
      createLabel="Create Quote"
      views={[
        { id: 'all', label: 'All Quotes', filter: () => true },
        { id: 'open', label: 'Open Quotes', filter: (q) => ['sent', 'viewed', 'changes_requested'].includes(q.stage) },
        { id: 'unseen', label: 'Sent, Not Viewed', filter: (q) => q.stage === 'sent' && q.lead.customerId },
        { id: 'expired', label: 'Expired Quotes', filter: (q) => q.stage === 'expired' },
        { id: 'accepted', label: 'Accepted Quotes', filter: (q) => q.status === 'accepted' },
        { id: 'latest', label: 'Latest Versions Only', filter: (q) => q.status !== 'superseded' },
      ]}
      filterFields={[
        { key: 'status', label: 'Quote Stage', type: 'select', get: (q) => q.stage, options: Object.entries(QUOTE_STATUS_LABEL).map(([value, label]) => ({ value, label })) },
        { key: 'customer', label: 'Customer', type: 'text', get: (q) => q.lead.contactName },
        { key: 'gst', label: 'GST Applied', type: 'select', get: (q) => (q.gst ? 'Yes' : 'No') },
      ]}
      columns={[
        { key: 'number', label: 'Quote Number', render: (q) => `${q.number} v${q.version}`, sortValue: (q) => q.number + q.version },
        { key: 'subject', label: 'Subject', render: (q) => `${q.lead.eventType} - ${q.lead.contactName}`, sortValue: (q) => q.lead.contactName },
        { key: 'status', label: 'Quote Stage', render: (q) => <QBadge q={q} />, sortValue: (q) => q.stage },
        { key: 'total', label: 'Grand Total', align: 'right', render: (q) => inr(q.total) },
        { key: 'validUntil', label: 'Valid Till', render: (q) => fmtDate(q.validUntil) },
        { key: 'eventDate', label: 'Event Date', render: (q) => fmtDate(q.lead.eventDate), sortValue: (q) => q.lead.eventDate },
        { key: 'sentAt', label: 'Sent On', render: (q) => fmtDate(q.sentAt) },
      ]}
    />
  );
}

const QUOTE_STAGES = [
  { id: 'sent', label: 'Sent' },
  { id: 'viewed', label: 'Viewed' },
  { id: 'changes_requested', label: 'Revision requested' },
  { id: 'accepted', label: 'Accepted' },
];

export function QuoteDetail({ id }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const q = state.quotes.find((x) => x.id === id && inScope(state, x));
  if (!q) return <Empty title="Quote not found" />;
  const lead = state.leads.find((l) => l.id === q.leadId);
  const partner = state.partners.find((p) => p.id === q.partnerId);
  const versions = quotesForLead(state, q.leadId);
  const t = quoteTotals(q);
  const st = quoteStatus(q);
  const open = ['sent', 'viewed', 'changes_requested'].includes(st) && !lead.bookingId;
  return (
    <>
      <RecordHeader
        back="/partner/quotes"
        title={`${q.number} v${q.version}`}
        subtitle={`${lead.eventType} - ${lead.contactName} - ${fmtDate(lead.eventDate)}`}
        badges={<QBadge q={q} />}
        actions={
          <>
            <button className="zc-btn" onClick={() => window.print()}>
              <Icon name="download" size={14} /> Print / PDF
            </button>
            {(open || st === 'expired') && can('quotes.send') && (
              <button className="zc-btn" onClick={() => actions.extendQuote(q.id, 7)}>
                Extend validity 7 days
              </button>
            )}
            {open && can('quotes.send') && (
              <button className="zc-btn" onClick={() => actions.withdrawQuote(q.id, 'Prices revised for the season')}>
                Withdraw
              </button>
            )}
            {open && can('quotes.send') && (
              <Link to={'/partner/quotes/new?lead=' + lead.id} className="zc-btn zc-btn-primary">
                Revise Quote
              </Link>
            )}
          </>
        }
      />
      <StagePath stages={QUOTE_STAGES} current={['superseded', 'expired', 'withdrawn', 'rejected'].includes(st) ? (q.viewedAt ? 'viewed' : 'sent') : st} lost={['expired', 'withdrawn', 'rejected'].includes(st)} />
      {['expired', 'withdrawn', 'rejected'].includes(st) && (
        <div className="zc-blueprint">
          <span className="small">
            This quote is <b>{QUOTE_STATUS_LABEL[st]}</b>
            {st === 'expired' ? ` since ${fmtDate(q.validUntil)}. Extend it or send a revised quote.` : st === 'rejected' && q.rejectReason ? `: ${q.rejectReason}` : st === 'withdrawn' && q.withdrawReason ? `: ${q.withdrawReason}` : '.'}
          </span>
        </div>
      )}
      <DetailLayout
        nav={[
          { id: 'qinfo', label: 'Quote Information' },
          { id: 'items', label: 'Quoted Items', count: q.items.length },
          { id: 'versions', label: 'Versions', count: versions.length },
        ]}
      >
        <Section id="qinfo" title="Quote Information">
          <FieldGrid
            fields={[
              ['Quote Number', q.number],
              ['Version', 'v' + q.version],
              ['Lead', <Link to={'/partner/leads/' + lead.id} className="zc-link">{lead.contactName}</Link>],
              ['Quote Stage', <QBadge q={q} />],
              ['Valid Till', fmtDate(q.validUntil)],
              ['Sent On', fmtDateTime(q.sentAt)],
              ['Viewed by Customer', q.viewedAt ? fmtDateTime(q.viewedAt) : lead.customerId ? 'Not yet' : 'Shared outside the app'],
              ['Sub Total', inr(t.subtotal)],
              ['Discount', inr(t.discount)],
              ['Tax (GST 18%)', q.gst ? inr(t.gst) : 'Not applied'],
              ['Grand Total', <b>{inr(t.total)}</b>],
            ]}
          />
          {q.notes && <FieldGrid cols={1} fields={[['Terms and Conditions', q.notes]]} />}
        </Section>
        <Section id="items" title="Quoted Items" count={q.items.length}>
          <QuoteDoc quote={q} partner={partner} lead={lead} compact />
        </Section>
        <Section id="versions" title="Versions" count={versions.length}>
          <MiniTable
            rows={versions}
            onRow={(v) => navigate('/partner/quotes/' + v.id)}
            columns={[
              { label: 'Version', render: (v) => 'v' + v.version },
              { label: 'Stage', render: (v) => <QBadge q={v} /> },
              { label: 'Total', align: 'right', render: (v) => inr(quoteTotals(v).total) },
              { label: 'Sent On', render: (v) => fmtDate(v.sentAt) },
            ]}
          />
        </Section>
      </DetailLayout>
    </>
  );
}

export function QuoteBuilder({ leadId }) {
  const { state, actions } = useStore();
  const lead = state.leads.find((l) => l.id === leadId);
  const listing = lead && state.listings.find((l) => l.id === lead.listingId);
  const prev = lead ? quotesForLead(state, lead.id)[0] : null;
  const pack = packFor(listing ? listing.category : '');
  // Category pricing + chosen add-ons + travel to the event area + muhurtham / weekend / season rules.
  const fromEnquiry = () => (lead && listing ? enrichQuote(pack.quote(lead, listing, state), lead, listing).map((r, i) => ({ id: 'qi' + Date.now() + i, ...r })) : []);
  const [items, setItems] = useState(prev ? prev.items.map((i) => ({ ...i })) : fromEnquiry);
  const [discount, setDiscount] = useState(prev ? prev.discount : 0);
  const [gst, setGst] = useState(prev ? prev.gst : true);
  const [validUntil, setValidUntil] = useState(addDays(todayISO(), 10));
  const [notes, setNotes] = useState(prev ? prev.notes : pack.quoteNote || 'Includes travel within Chennai.');
  const [tab, setTab] = useState('edit');
  if (!lead) return <Empty title="Lead not found" />;
  const partner = state.partners.find((p) => p.id === lead.partnerId);
  const draft = { number: prev ? prev.number : 'Q-NEW', version: prev ? prev.version + 1 : 1, items, discount, gst, validUntil, notes, sentAt: new Date().toISOString() };
  const t = quoteTotals(draft);
  const addPkg = (p) => setItems([...items, { id: 'qi' + Date.now(), description: `${p.name} package`, qty: 1, unitPrice: p.price }]);
  const setItem = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: k === 'description' ? v : Number(v) } : x)));
  const send = (via) => {
    actions.sendQuote({ leadId: lead.id, items, discount, gst, validUntil, notes });
    if (via === 'whatsapp') {
      const text = encodeURIComponent(`Hi ${lead.contactName}, here is our quote for your ${lead.eventType} on ${fmtDate(lead.eventDate)}: ${inr(t.total)}. ${notes}`);
      window.open('https://wa.me/' + (lead.contactPhone || '').replace(/\D/g, '') + '?text=' + text, '_blank');
    }
    navigate('/partner/leads/' + lead.id);
  };
  return (
    <>
      <RecordHeader back={'/partner/leads/' + lead.id} title={prev ? `Edit Quote - ${prev.number} (v${prev.version + 1})` : 'Create Quote'} subtitle={`Lead: ${lead.contactName} - ${lead.eventType} on ${fmtDate(lead.eventDate)}`} />
      <div style={{ height: 12 }} />
      <Tabs tabs={[{ id: 'edit', label: 'Edit' }, { id: 'preview', label: 'Preview' }]} value={tab} onChange={setTab} />
      <div className="grid grid-side mt">
        {tab === 'edit' ? (
          <Card
            title="Line items"
            actions={
              !pack.generic && (
                <Button size="sm" variant="secondary" icon="sparkles" onClick={() => setItems(fromEnquiry())}>
                  Fill from enquiry
                </Button>
              )
            }
          >
            {!pack.generic && (
              <div className="notice small mb">
                <Icon name="info" size={16} />
                <span>
                  {pack.label} pricing: {pack.pricingNote}. Based on the customer's answers:{' '}
                  {describeDetails(listing.category, lead.details, listing).map(([k, v]) => `${k}: ${v}`).join(' - ') || 'none captured'}.
                </span>
              </div>
            )}
            <div className="chips mb">
              {listing.packages.map((p) => (
                <button key={p.id} className="chip" onClick={() => addPkg(p)}>
                  <Icon name="plus" size={12} /> {p.name} ({inr(p.price)})
                </button>
              ))}
              {listing.addons.map((a) => (
                <button key={a.id} className="chip" onClick={() => setItems([...items, { id: 'qi' + Date.now(), description: a.name, qty: 1, unitPrice: a.price }])}>
                  <Icon name="plus" size={12} /> {a.name}
                </button>
              ))}
            </div>
            <div className="table-wrap line-items">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: 80 }}>Qty</th>
                    <th style={{ width: 130 }}>Rate</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id}>
                      <td>
                        <input className="input" value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
                      </td>
                      <td>
                        <input className="input" type="number" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <input className="input" type="number" value={it.unitPrice} onChange={(e) => setItem(i, 'unitPrice', e.target.value)} />
                      </td>
                      <td className="right">{inr(it.qty * it.unitPrice)}</td>
                      <td>
                        <button className="icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove">
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setItems([...items, { id: 'qi' + Date.now(), description: '', qty: 1, unitPrice: 0 }])}>
              Custom line
            </Button>
            <div className="grid grid-2 mt">
              <Field label="Discount">
                <input className="input" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </Field>
              <Field label="Valid until">
                <input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </Field>
            </div>
            <label className="check mt">
              <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} disabled={!partner.gstin} /> Add GST 18% {!partner.gstin && '(add GSTIN in your profile first)'}
            </label>
            <Field label="Notes and terms">
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </Card>
        ) : (
          <QuoteDoc quote={draft} partner={partner} lead={lead} />
        )}
        <aside className="sticky">
          <Card title="Summary">
            <div className="stack-s">
              <div className="row between">
                <span className="muted">Subtotal</span>
                <span>{inr(t.subtotal)}</span>
              </div>
              <div className="row between">
                <span className="muted">Discount</span>
                <span>- {inr(t.discount)}</span>
              </div>
              {gst && (
                <div className="row between">
                  <span className="muted">GST 18%</span>
                  <span>{inr(t.gst)}</span>
                </div>
              )}
              <div className="row between" style={{ fontSize: 18 }}>
                <b>Total</b>
                <b>{inr(t.total)}</b>
              </div>
              <div className="small muted">Customer budget: {inr(lead.budget)}</div>
              <hr className="divider" />
              {lead.customerId ? (
                <Button block icon="send" disabled={!items.length} onClick={() => send('app')}>
                  Send in app
                </Button>
              ) : (
                <div className="notice small">
                  <Icon name="info" size={16} />
                  <span>This lead is not on the app yet. Send on WhatsApp; it is still saved here.</span>
                </div>
              )}
              <Button block variant="secondary" icon="whatsapp" disabled={!items.length} onClick={() => send('whatsapp')}>
                Send on WhatsApp
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
