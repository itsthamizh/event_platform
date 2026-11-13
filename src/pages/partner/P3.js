// Partner CRM: WhatsApp Business inbox, insights (views, enquiries, conversion,
// response time, exports), help & support tickets, account health (strikes) and
// notification preferences.
import { useEffect, useState } from 'react';
import { fmtDate, fmtDateTime, fmtTime } from '../../config';
import { navigate } from '../../router';
import { invoiceTotals, useStore } from '../../store';
import { downloadCsv } from '../../storeP3';
import { Avatar, Badge, BarList, Button, ColumnChart, Empty, Field, Icon, Modal } from '../../components/ui';
import { Component, FieldGrid, Kpis, MiniTable, ModuleHeader, Section } from '../../components/crm';
import { buildPayouts } from '../../ops';
import { inScope } from '../../accounts';

// ---------- WhatsApp Business ----------
export function WhatsAppInbox({ threadId }) {
  const { state, actions } = useStore();
  const [text, setText] = useState('');
  const threads = state.waThreads.filter((t) => t.partnerId === state.partnerId).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const cur = threads.find((t) => t.id === threadId) || threads[0];
  const partner = state.partners.find((p) => p.id === state.partnerId);
  const curId = cur && cur.id;
  useEffect(() => {
    if (curId) actions.readWa(curId);
  }, [curId, actions]);
  const templates = state.waTemplates.filter((t) => t.status === 'approved');
  if (!cur) return <Empty icon="whatsapp" title="No WhatsApp chats yet" />;
  return (
    <>
      <ModuleHeader title="WhatsApp Business" subtitle={`Connected number ${partner.name} (+91 98400 ${String(10000 + Number(partner.id.replace(/\D/g, '')) * 137).slice(0, 5)}) via WhatsApp Cloud API. Replies are logged on the lead.`} />
      <div className="zc-wa">
        <aside className="zc-wa-list">
          {threads.map((t) => (
            <button key={t.id} className={'zc-wa-item ' + (t.id === cur.id ? 'on' : '')} onClick={() => navigate('/partner/whatsapp/' + t.id)}>
              <Avatar name={t.name} size={32} />
              <span className="grow" style={{ minWidth: 0 }}>
                <b className="ellipsis">{t.name}</b>
                <span className="tiny muted ellipsis">{t.messages[t.messages.length - 1].body}</span>
              </span>
              <span className="tiny muted">{fmtTime(t.lastAt)}</span>
              {t.unread > 0 && <span className="zc-mi-count">{t.unread}</span>}
            </button>
          ))}
        </aside>
        <section className="zc-wa-chat">
          <header className="row between">
            <span>
              <b>{cur.name}</b> <span className="small muted">{cur.phone}</span>
            </span>
            {cur.leadId ? (
              <button className="zc-btn" onClick={() => navigate('/partner/leads/' + cur.leadId)}>
                Open Lead
              </button>
            ) : (
              <button className="zc-btn zc-btn-primary" onClick={() => navigate('/partner/leads/' + actions.waToLead(cur.id))}>
                Convert to Lead
              </button>
            )}
          </header>
          <div className="zc-wa-msgs">
            {cur.messages.map((m) => (
              <div key={m.id} className={'zc-wa-msg ' + m.side}>
                {m.body}
                <span className="tiny muted"> {fmtTime(m.at)} {m.side === 'partner' && (m.status === 'read' ? '✓✓' : '✓')}</span>
              </div>
            ))}
          </div>
          <div className="zc-wa-compose">
            <select className="select input-sm" style={{ width: 180 }} value="" onChange={(e) => e.target.value && setText(templates.find((t) => t.id === e.target.value).body)} aria-label="Template">
              <option value="">Use a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.language})
                </option>
              ))}
            </select>
            <input className="input" placeholder="Type a reply" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text && (actions.sendWa(cur.id, text), setText(''))} />
            <button
              className="zc-btn zc-btn-primary"
              disabled={!text}
              onClick={() => {
                actions.sendWa(cur.id, text);
                setText('');
              }}
            >
              Send
            </button>
          </div>
        </section>
      </div>
      <Section title="Message templates" count={state.waTemplates.length} actions={<span className="small muted">Approved by Meta before use outside the 24-hour window</span>}>
        <MiniTable
          rows={state.waTemplates}
          columns={[
            { label: 'Name', render: (t) => t.name },
            { label: 'Language', render: (t) => t.language },
            { label: 'Category', render: (t) => t.category },
            { label: 'Text', render: (t) => <span className="small">{t.body}</span> },
            { label: 'Status', render: (t) => <Badge status={t.status === 'approved' ? 'approved' : 'pending'} /> },
          ]}
        />
      </Section>
    </>
  );
}

// ---------- Insights ----------
export function Insights() {
  const { state, actions } = useStore();
  const pid = state.partnerId;
  const stats = state.partnerStats[pid] || [];
  const sum = (k, from = 0) => stats.slice(from).reduce((a, d) => a + d[k], 0);
  const leads = state.leads.filter((l) => inScope(state, l));
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost');
  const decided = won + lost.length;
  const SRC = { app: 'Zoho for Vizhaa app', whatsapp: 'WhatsApp', manual: 'Walk-in / phone', website: 'Website', rfq: 'Corporate RFQ', corporate: 'Corporate PO', planner: 'Planner' };
  const bySource = Object.entries(leads.reduce((a, l) => ({ ...a, [SRC[l.source] || l.source]: (a[SRC[l.source] || l.source] || 0) + 1 }), {})).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const lostWhy = Object.entries(lost.reduce((a, l) => ({ ...a, [l.lostReason || 'Other']: (a[l.lostReason || 'Other'] || 0) + 1 }), {})).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const weeks = [0, 1, 2, 3].map((w) => {
    const sl = stats.slice(w * 7 + 2, w * 7 + 9);
    return { m: sl[0] ? fmtDate(sl[0].date).slice(0, 6) : 'Week ' + (w + 1), v: sl.reduce((a, d) => a + d.views, 0) };
  });
  const avgResp = stats.length ? Math.round(stats.reduce((a, d) => a + d.responseMins, 0) / stats.length) : 0;
  const invoices = state.invoices.filter((i) => inScope(state, i));
  const exportLeads = () => {
    const rows = leads.map((l) => ({ name: l.contactName, phone: l.contactPhone, source: l.source, event: l.eventType, date: l.eventDate, guests: l.guests, status: l.status, priority: l.priority || '', created: l.createdAt.slice(0, 10) }));
    downloadCsv('leads.csv', rows);
    actions.logExport('Leads (CSV)', rows.length);
  };
  const exportInvoices = () => {
    const rows = invoices.map((i) => ({ number: i.number, billTo: i.billTo, gstin: i.billToGstin || '', issued: i.issuedAt, total: invoiceTotals(i).total, paid: invoiceTotals(i).paid, due: invoiceTotals(i).due }));
    downloadCsv('invoices.csv', rows);
    actions.logExport('Invoices (CSV)', rows.length);
  };
  return (
    <>
      <ModuleHeader
        title="Insights"
        subtitle="Last 30 days of your listing and pipeline."
        actions={
          <>
            <button className="zc-btn" onClick={exportLeads}>
              <Icon name="download" size={14} /> Export leads
            </button>
            <button className="zc-btn" onClick={exportInvoices}>
              <Icon name="download" size={14} /> Export invoices
            </button>
          </>
        }
      />
      <Kpis
        items={[
          { label: 'Profile Views', value: sum('views').toLocaleString('en-IN') },
          { label: 'Date Checks', value: sum('dateChecks').toLocaleString('en-IN') },
          { label: 'Enquiries', value: sum('enquiries') },
          { label: 'View to Enquiry', value: (sum('views') ? ((sum('enquiries') / sum('views')) * 100).toFixed(1) : 0) + '%' },
          { label: 'Win Rate', value: (decided ? Math.round((won / decided) * 100) : 0) + '%' },
          { label: 'Avg First Reply', value: `${Math.floor(avgResp / 60)}h ${avgResp % 60}m` },
        ]}
      />
      <div className="zc-comps">
        <Component title="Profile views per week">
          <ColumnChart data={weeks} height={190} />
        </Component>
        <Component title="Leads by source">
          <BarList data={bySource} />
        </Component>
        <Component title="Why leads were lost">
          {lostWhy.length ? <BarList data={lostWhy} /> : <div className="muted small">No lost leads.</div>}
        </Component>
        <Component
          title="Recent exports (audited)"
          rows={state.exports.filter((e) => e.partnerId === pid)}
          empty="No exports yet"
          columns={[
            { label: 'Export', render: (e) => e.what },
            { label: 'Rows', render: (e) => e.rows },
            { label: 'By', render: (e) => e.by },
            { label: 'When', render: (e) => fmtDateTime(e.at) },
          ]}
        />
      </div>
    </>
  );
}

// ---------- Account health ----------
export function AccountHealth() {
  const { state } = useStore();
  const pid = state.partnerId;
  const strikes = state.strikes.filter((x) => x.partnerId === pid);
  const bookings = state.bookings.filter((b) => b.partnerId === pid);
  const partnerCancels = bookings.filter((b) => b.status === 'cancelled' && b.cancelledBy === 'partner').length;
  const reviews = state.reviews.filter((r) => state.listings.some((l) => l.id === r.listingId && l.partnerId === pid) && r.status === 'published');
  const replied = reviews.filter((r) => r.reply).length;
  const stats = state.partnerStats[pid] || [];
  const avgResp = stats.length ? Math.round(stats.reduce((a, d) => a + d.responseMins, 0) / stats.length) : 0;
  const active = strikes.filter((x) => x.severity === 'strike').length;
  return (
    <>
      <ModuleHeader title="Account health" subtitle="How customers and Zoho for Vizhaa see your reliability. 3 active strikes trigger a listing review." />
      <Kpis
        items={[
          { label: 'Active Strikes', value: `${active} / 3` },
          { label: 'Warnings', value: strikes.filter((x) => x.severity === 'warning').length },
          { label: 'Partner Cancellations', value: partnerCancels },
          { label: 'Avg First Reply', value: `${Math.floor(avgResp / 60)}h ${avgResp % 60}m` },
          { label: 'Reviews Replied', value: reviews.length ? Math.round((replied / reviews.length) * 100) + '%' : '-' },
        ]}
      />
      <Section title="Strikes and warnings" count={strikes.length}>
        <MiniTable
          rows={strikes}
          empty="Clean record. Keep it up!"
          columns={[
            { label: 'Type', render: (x) => <Badge tone={x.severity === 'strike' ? 'red' : 'amber'}>{x.severity === 'strike' ? 'Strike' : 'Warning'}</Badge> },
            { label: 'Reason', render: (x) => x.reason },
            { label: 'Issued', render: (x) => `${fmtDate(x.at)} by ${x.by}` },
            { label: 'Expires', render: (x) => fmtDate(x.expiresAt) },
          ]}
        />
        <p className="tiny muted mt-s">Strikes expire after 90 days. Raise a support ticket if you think a strike is wrong.</p>
      </Section>
    </>
  );
}

// ---------- Help & support (partner) ----------
export function PartnerHelp() {
  return <Tickets side="partner" />;
}

export function Tickets({ side }) {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(null);
  const [f, setF] = useState(null);
  const [reply, setReply] = useState('');
  const mine = state.tickets.filter((t) => t.raisedBy === side && t.raisedById === (side === 'customer' ? state.customerId : state.partnerId));
  const cur = open && state.tickets.find((t) => t.id === open);
  const cats = side === 'customer' ? ['Booking', 'Payments', 'Refunds', 'Account', 'Other'] : ['Payouts', 'Subscription', 'Invoices', 'Reviews', 'Leads', 'Other'];
  const partnerStyle = side === 'partner';
  const body = (
    <>
      <div className={partnerStyle ? 'zc-section' : 'card'}>
        <div className={partnerStyle ? 'zc-section-body' : 'card-body'}>
          <div className="row between mb">
            <b>Your tickets</b>
            <Button size="sm" icon="plus" onClick={() => setF({ subject: '', category: cats[0], body: '' })}>
              New ticket
            </Button>
          </div>
          <MiniTable
            rows={mine}
            onRow={(t) => setOpen(t.id)}
            empty="No tickets. Need help? Raise one."
            columns={[
              { label: 'Ticket', render: (t) => t.number },
              { label: 'Subject', render: (t) => t.subject },
              { label: 'Category', render: (t) => t.category },
              { label: 'Status', render: (t) => <Badge status={t.status === 'resolved' || t.status === 'closed' ? 'completed' : t.status === 'pending' ? 'sent' : 'requested'}>{{ open: 'Open', pending: 'Waiting for you', resolved: 'Resolved', closed: 'Closed' }[t.status]}</Badge> },
              { label: 'Updated', render: (t) => fmtDateTime(t.messages[t.messages.length - 1].at) },
            ]}
          />
        </div>
      </div>
      <Modal open={!!cur} title={cur ? `${cur.number} - ${cur.subject}` : ''} onClose={() => setOpen(null)} wide>
        {cur && (
          <div className="stack">
            {cur.messages.map((m) => (
              <div key={m.id} className={'zc-wa-msg ' + (m.side === 'agent' ? 'customer' : 'partner')} style={{ maxWidth: '85%' }}>
                <b className="tiny">{m.side === 'agent' ? 'Zoho for Vizhaa Support' : 'You'}</b>
                <div>{m.body}</div>
                <span className="tiny muted">{fmtDateTime(m.at)}</span>
              </div>
            ))}
            {!['closed'].includes(cur.status) && (
              <div className="row gap-s">
                <input className="input" placeholder="Reply" value={reply} onChange={(e) => setReply(e.target.value)} />
                <Button
                  disabled={!reply}
                  onClick={() => {
                    actions.replyTicket(cur.id, side, reply);
                    setReply('');
                  }}
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={!!f}
        title="New support ticket"
        onClose={() => setF(null)}
        footer={
          <Button
            disabled={!f || !f.subject || !f.body}
            onClick={() => {
              const id = actions.createTicket(f, side);
              setF(null);
              setOpen(id);
            }}
          >
            Submit
          </Button>
        }
      >
        {f && (
          <div className="stack">
            <Field label="Topic">
              <div className="chips">
                {cats.map((c) => (
                  <button key={c} className={'chip ' + (f.category === c ? 'active' : '')} onClick={() => setF({ ...f, category: c })}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Subject">
              <input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            </Field>
            <Field label="Booking number (optional)">
              <input className="input" value={f.bookingRef || ''} onChange={(e) => setF({ ...f, bookingRef: e.target.value })} placeholder="BK-" />
            </Field>
            <Field label="What happened?">
              <textarea className="textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
  if (!partnerStyle) return body;
  return (
    <>
      <ModuleHeader title="Help & Support" subtitle="Payout, subscription, invoice or review problems. Typical reply within 12 hours." />
      {body}
    </>
  );
}

// ---------- Notification preferences (shared) ----------
export function NotificationPrefs({ who }) {
  const { state, actions } = useStore();
  const rows = state.notifPrefs[who] || [];
  return (
    <MiniTable
      rows={rows.map((r, i) => ({ id: 'np' + i, i, r }))}
      columns={[
        { label: 'Notification', render: (x) => x.r[0] },
        ...['Push', 'WhatsApp', 'Email'].map((ch, j) => ({ label: ch, render: (x) => <input type="checkbox" checked={x.r[j + 1]} onChange={() => actions.toggleNotifPref(who, x.i, j + 1)} aria-label={`${x.r[0]} by ${ch}`} /> })),
      ]}
    />
  );
}

export function PartnerNotifications() {
  const { state } = useStore();
  const payouts = buildPayouts(state).filter((p) => p.partnerId === state.partnerId).length;
  return (
    <>
      <p className="small muted">Choose how your team hears about leads, payments and reviews. SMS for OTPs and payment receipts cannot be turned off.</p>
      <NotificationPrefs who="partner" />
      <div className="zc-section-sub">Payout bank account</div>
      <FieldGrid fields={[['Bank', 'Indian Overseas Bank, Adyar'], ['Account', 'XXXX XXXX 4417'], ['IFSC', 'IOBA0001234'], ['Verified', 'Yes, ₹1 penny drop on 12 Jun 2025'], ['Payouts so far', payouts + ' weekly settlements']]} />
      <div className="small muted mt-s">Changing the bank account puts the next payout on hold for a 48-hour security check.</div>
    </>
  );
}
