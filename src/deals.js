// Enquiries and Deals (Zoho CRM style). An enquiry (lead) is a new request from a customer.
// Once it is qualified it is converted into a Deal, which carries the amount, closing date
// and its own pipeline. Quotes, bookings and payments then hang off the deal.
// Same record underneath (quotes, bookings and chats keep pointing at it); isDeal marks the conversion.
import { addDays, todayISO } from './config';

// Turned off for now (Photography asked to drop the Deals module); enquiries keep one pipeline.
export const DEAL_PRODUCTS = [];
export const dealsOn = (state) => {
  const p = state.partners.find((x) => x.id === state.partnerId);
  return !!p && DEAL_PRODUCTS.includes(p.category);
};

export const ENQUIRY_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
];
export const ENQUIRY_LABEL = { new: 'New', contacted: 'Contacted', lost: 'Junk / Lost' };

export const DEAL_STAGES = [
  { id: 'qualified', label: 'Qualified', prob: 20, color: '#7c8cf0' },
  { id: 'proposal', label: 'Quote Sent', prob: 50, color: '#f5a524' },
  { id: 'negotiation', label: 'Negotiation', prob: 70, color: '#e07b39' },
  { id: 'won', label: 'Closed Won', prob: 100, color: '#2e9e5b' },
  { id: 'lost', label: 'Closed Lost', prob: 0, color: '#8a8f98' },
];
export const DEAL_LABEL = Object.fromEntries(DEAL_STAGES.map((s) => [s.id, s.label]));
export const dealStage = (lead) => ({ quoted: 'proposal', negotiation: 'negotiation', won: 'won', lost: 'lost' }[lead.status] || 'qualified');
// Deal stage -> lead status kept underneath.
export const STATUS_FOR_STAGE = { qualified: 'contacted', proposal: 'quoted', negotiation: 'negotiation', won: 'won', lost: 'lost' };
export const probability = (lead) => (DEAL_STAGES.find((s) => s.id === dealStage(lead)) || {}).prob || 0;

// Seed: everything already quoted, booked or lost after a quote is a deal.
export function seedDeals(leads, quotes, totalOf) {
  let k = 0;
  return leads.map((l) => {
    const qs = quotes.filter((q) => q.leadId === l.id);
    // Some contacted enquiries were already qualified and converted, so the Qualified column isn't empty.
    const qualified = l.status === 'contacted' && (['hot', 'high'].includes(l.priority) || !!l.buyer || k++ % 2 === 0);
    const isDeal = qualified || !!l.bookingId || ['quoted', 'negotiation', 'won'].includes(l.status) || (l.status === 'lost' && qs.length > 0);
    if (!isDeal) return l;
    const latest = qs.sort((a, b) => b.version - a.version)[0];
    return { ...l, isDeal: true, deal: newDeal(l, latest ? { amount: totalOf(latest).total } : null, l.createdAt ? addDays(l.createdAt.slice(0, 10), 1) : todayISO(), 'Sales') };
  });
}

export function newDeal(lead, patch, convertedAt, by) {
  const closing = lead.eventDate ? addDays(lead.eventDate, -21) : addDays(todayISO(), 30);
  return {
    name: `${lead.buyer ? lead.buyer.orgName : lead.contactName} - ${lead.eventType}`,
    amount: Number(lead.budget) || 0,
    closingDate: closing < todayISO() && !['won', 'lost'].includes(lead.status) ? addDays(todayISO(), 7) : closing,
    convertedAt,
    convertedBy: by,
    ...(patch || {}),
  };
}
