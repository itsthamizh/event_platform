// Deals: qualified enquiries with an amount, closing date and a sales pipeline (Zoho CRM style).
// Enquiries live in the Leads screen; "Convert to Deal" (or sending a quote) moves one here.
import { useState } from 'react';
import { fmtDate, inr, todayISO } from '../../config';
import { navigate } from '../../router';
import { latestQuote, quoteTotals, useCurrentMember, usePerms, useStore } from '../../store';
import { Badge, Button, Field, Modal } from '../../components/ui';
import { ListView } from '../../components/crm';
import { inScope } from '../../accounts';
import { DEAL_LABEL, DEAL_STAGES, dealStage, probability } from '../../deals';

const STAGE_TONE = { qualified: 'brand', proposal: 'amber', negotiation: 'amber', won: 'green', lost: 'gray' };
export const DealStageBadge = ({ lead }) => <Badge tone={STAGE_TONE[dealStage(lead)]}>{DEAL_LABEL[dealStage(lead)]}</Badge>;
export const dealAmount = (state, l) => {
  const q = latestQuote(state, l.id);
  return q ? quoteTotals(q).total : (l.deal && l.deal.amount) || l.budget || 0;
};

export function DealsBoard() {
  const { state } = useStore();
  const me = useCurrentMember();
  const deals = state.leads.filter((l) => l.isDeal && inScope(state, l));
  const members = state.members.filter((m) => inScope(state, m));
  const memberName = (id) => (members.find((m) => m.id === id) || {}).name || '';
  const amount = (l) => dealAmount(state, l);
  const today = todayISO();
  const open = (l) => !['won', 'lost'].includes(dealStage(l));
  const monthEnd = today.slice(0, 7) + '-31';
  return (
    <ListView
      module={{ singular: 'Deal', plural: 'Deals' }}
      rows={deals}
      onRow={(l) => navigate('/partner/deals/' + l.id)}
      defaultMode="kanban"
      views={[
        { id: 'open', label: 'Open Deals', filter: open },
        { id: 'all', label: 'All Deals', filter: () => true },
        { id: 'mine', label: 'My Deals', filter: (l) => me && l.assignedTo === me.id },
        { id: 'month', label: 'Closing This Month', filter: (l) => open(l) && l.deal && l.deal.closingDate <= monthEnd },
        { id: 'overdue', label: 'Overdue Closing Date', filter: (l) => open(l) && l.deal && l.deal.closingDate < today },
        { id: 'b2b', label: 'Business Buyers', filter: (l) => !!l.buyer },
        { id: 'won', label: 'Closed Won', filter: (l) => dealStage(l) === 'won' },
        { id: 'lost', label: 'Closed Lost', filter: (l) => dealStage(l) === 'lost' },
      ]}
      filterFields={[
        { key: 'stage', label: 'Stage', type: 'select', get: (l) => dealStage(l), options: DEAL_STAGES.map((s) => ({ value: s.id, label: s.label })) },
        { key: 'owner', label: 'Deal Owner', type: 'select', get: (l) => l.assignedTo || '', options: members.map((m) => ({ value: m.id, label: m.name })) },
        { key: 'eventType', label: 'Event Type', type: 'select', get: (l) => l.eventType },
        { key: 'name', label: 'Deal Name', type: 'text', get: (l) => (l.deal || {}).name || l.contactName },
      ]}
      columns={[
        { key: 'name', label: 'Deal Name', render: (l) => (l.deal || {}).name || l.contactName, sortValue: (l) => (l.deal || {}).name || '' },
        { key: 'amount', label: 'Amount', align: 'right', render: (l) => inr(amount(l)), sortValue: amount },
        { key: 'stage', label: 'Stage', render: (l) => <DealStageBadge lead={l} />, sortValue: (l) => DEAL_STAGES.findIndex((s) => s.id === dealStage(l)) },
        { key: 'prob', label: 'Probability', align: 'right', render: (l) => probability(l) + '%', sortValue: probability },
        { key: 'closing', label: 'Closing Date', render: (l) => (l.deal ? <span className={open(l) && l.deal.closingDate < today ? 'red' : ''}>{fmtDate(l.deal.closingDate)}</span> : '-'), sortValue: (l) => (l.deal || {}).closingDate || '' },
        { key: 'contact', label: 'Contact', render: (l) => (l.buyer ? `${l.buyer.orgName} (${l.contactName})` : l.contactName) },
        { key: 'event', label: 'Event', render: (l) => `${l.eventType} - ${fmtDate(l.eventDate)}`, sortValue: (l) => l.eventDate },
        { key: 'owner', label: 'Deal Owner', render: (l) => memberName(l.assignedTo) || '-' },
      ]}
      kanban={{
        groups: DEAL_STAGES.map((s) => ({ id: s.id, label: `${s.label} (${s.prob}%)`, color: s.color })),
        groupOf: (l) => dealStage(l),
        total: (items) => inr(items.reduce((a, l) => a + amount(l), 0)),
        card: (l) => (
          <>
            <b>{(l.deal || {}).name || l.contactName}</b>
            <div className="kv-line">
              <span>{l.eventType}</span>
              <span>{fmtDate(l.eventDate)}</span>
            </div>
            <div className="kv-line">
              <span>Closing {l.deal ? fmtDate(l.deal.closingDate) : '-'}</span>
              <span className="zc-ink bold">{inr(amount(l))}</span>
            </div>
            {l.assignedTo && (
              <div className="kv-line">
                <span>Owner</span>
                <span>{memberName(l.assignedTo)}</span>
              </div>
            )}
          </>
        ),
      }}
    />
  );
}

// Convert a qualified enquiry into a deal.
export function ConvertDealModal({ lead, open, onClose }) {
  const { state, actions } = useStore();
  const { can } = usePerms();
  const members = state.members.filter((m) => inScope(state, m) && m.status === 'active' && ['owner', 'manager', 'sales'].includes(m.role));
  const def = () => ({
    name: `${lead.buyer ? lead.buyer.orgName : lead.contactName} - ${lead.eventType}`,
    amount: lead.budget || '',
    closingDate: lead.eventDate && lead.eventDate > todayISO() ? lead.eventDate : todayISO(),
    ownerId: lead.assignedTo || (members[0] || {}).id || '',
  });
  const [f, setF] = useState(def);
  if (!can('leads.edit')) return null;
  return (
    <Modal
      open={open}
      title="Convert to Deal"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.name.trim()}
            onClick={() => {
              actions.convertToDeal(lead.id, { ...f, name: f.name.trim() });
              onClose();
              navigate('/partner/deals/' + lead.id);
            }}
          >
            Convert
          </Button>
        </>
      }
    >
      <p className="small muted">
        {lead.contactName}'s enquiry becomes a deal. The contact, requirements, chats and notes move with it; send quotes and take bookings from the deal.
      </p>
      <Field label="Deal name">
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <div className="grid grid-2">
        <Field label="Amount (expected)">
          <input className="input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Closing date">
          <input className="input" type="date" value={f.closingDate} onChange={(e) => setF({ ...f, closingDate: e.target.value })} />
        </Field>
      </div>
      <Field label="Deal owner">
        <select className="select" value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}
