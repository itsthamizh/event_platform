// Customer account: profile (addresses, privacy consents under the DPDP Act,
// logged-in devices, notification preferences), help & support tickets,
// saved searches with alerts and recently viewed partners.
import { useState } from 'react';
import { fmtDateTime } from '../../config';
import { Link } from '../../router';
import { useStore } from '../../store';
import { Badge, Button, Card, Empty, Field, PageHeader } from '../../components/ui';
import { VendorCard } from '../../components/Shared';
import { NotificationPrefs, Tickets } from '../partner/P3';

export function Profile() {
  const { state, actions } = useStore();
  const me = state.users.find((u) => u.id === state.customerId);
  const [a, setA] = useState({ label: '', line: '', city: 'Chennai', pin: '' });
  const consents = state.consents[state.customerId] || [];
  const sessions = state.sessions[state.customerId] || [];
  const addresses = state.addresses[state.customerId] || [];
  return (
    <div className="container section">
      <PageHeader title="Profile and privacy" subtitle={`${me.name} - ${me.phone}${me.email ? ' - ' + me.email : ''}`} />
      <div className="grid grid-2">
        <Card title="Saved addresses" subtitle="Used for vendor visits, deliveries and travel charges.">
          <div className="stack-s">
            {addresses.map((x) => (
              <div key={x.id} className="row between">
                <span>
                  <b>{x.label}</b> {x.isDefault && <Badge tone="green">Default</Badge>}
                  <div className="small muted">
                    {x.line}, {x.city} {x.pin}
                  </div>
                </span>
                {!x.isDefault && (
                  <button className="link small" onClick={() => actions.removeAddress(x.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-2 mt">
            <Field label="Label">
              <input className="input" value={a.label} onChange={(e) => setA({ ...a, label: e.target.value })} placeholder="e.g. Reception hall" />
            </Field>
            <Field label="PIN code">
              <input className="input" value={a.pin} onChange={(e) => setA({ ...a, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
            </Field>
          </div>
          <Field label="Address">
            <input className="input" value={a.line} onChange={(e) => setA({ ...a, line: e.target.value })} />
          </Field>
          <Button
            size="sm"
            className="mt-s"
            disabled={!a.label || !a.line || a.pin.length !== 6}
            onClick={() => {
              actions.saveAddress(a);
              setA({ label: '', line: '', city: 'Chennai', pin: '' });
            }}
          >
            Add address
          </Button>
        </Card>
        <Card title="Privacy and consent" subtitle="Your choices under India's Digital Personal Data Protection Act. Change them any time.">
          <div className="stack-s">
            {consents.map((c) => (
              <label key={c.key} className="check row between" style={{ width: '100%' }}>
                <span>
                  {c.label}
                  <div className="tiny muted">Last changed {fmtDateTime(c.at)}</div>
                </span>
                <input type="checkbox" checked={c.on} disabled={c.required} onChange={() => actions.toggleConsent(c.key)} />
              </label>
            ))}
          </div>
          <div className="row gap-s mt">
            <Button size="sm" variant="secondary" icon="download" onClick={() => actions.requestPrivacy('export')}>
              Download my data
            </Button>
            <Button size="sm" variant="ghost" onClick={() => actions.requestPrivacy('delete')}>
              Delete my account
            </Button>
          </div>
        </Card>
        <Card title="Logged-in devices" actions={sessions.length > 1 && <button className="link small" onClick={actions.endOtherSessions}>Log out of all others</button>}>
          <div className="stack-s">
            {sessions.map((x) => (
              <div key={x.id} className="row between">
                <span>
                  <b>{x.device}</b> {x.current && <Badge tone="green">This device</Badge>}
                  <div className="small muted">
                    {x.place} - active {fmtDateTime(x.lastActive)}
                  </div>
                </span>
                {!x.current && (
                  <button className="link small" onClick={() => actions.endSession(x.id)}>
                    Log out
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Notifications" subtitle="OTPs and payment receipts are always sent by SMS.">
          <NotificationPrefs who="customer" />
        </Card>
      </div>
    </div>
  );
}

const FAQ = [
  ['When do I pay?', 'Only after you accept a quote: 30% advance to confirm, 50% one week before, 20% on the event day. You can pay part of an installment too.'],
  ['What if I cancel?', 'More than 30 days before: full refund. 7 to 30 days: 50%. Less than 7 days: no refund. If the partner cancels, you always get 100% back.'],
  ['Is my money safe?', 'Payments in the app are held by Zoho for Vizhaa and released to the partner after the event, so you are covered if something goes wrong.'],
  ['How do I raise a complaint?', 'Open the booking and tap "Raise a complaint". Our team reviews evidence from both sides within 24 hours.'],
];

export function Help() {
  return (
    <div className="container section">
      <PageHeader title="Help and support" subtitle="Answers to common questions, and a direct line to our team." />
      <div className="grid grid-side">
        <Tickets side="customer" />
        <Card title="Common questions">
          <div className="stack-s">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>
                  <b>{q}</b>
                </summary>
                <p className="small muted mt-s">{a}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function Saved() {
  const { state, actions } = useStore();
  const searches = state.savedSearches.filter((x) => x.userId === state.customerId);
  const viewed = (state.recentlyViewed[state.customerId] || []).map((id) => state.listings.find((l) => l.id === id)).filter(Boolean);
  return (
    <div className="container section">
      <PageHeader title="Saved searches and history" subtitle="Get an alert when a new partner matches a saved search." />
      <Card title="Saved searches">
        {searches.length === 0 ? (
          <p className="muted">Save a search from the Explore page.</p>
        ) : (
          <div className="stack-s">
            {searches.map((x) => (
              <div key={x.id} className="row between wrap gap-s">
                <span>
                  <Link to={'/browse' + x.query} className="link">
                    <b>{x.label}</b>
                  </Link>{' '}
                  {x.newMatches > 0 && <Badge tone="brand">{x.newMatches} new</Badge>}
                </span>
                <span className="row gap-s">
                  <label className="check small">
                    <input type="checkbox" checked={x.alerts} onChange={() => actions.toggleSearchAlert(x.id)} /> Alerts
                  </label>
                  <button className="link small" onClick={() => actions.removeSearch(x.id)}>
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <h3 className="mt-l mb">Recently viewed</h3>
      {viewed.length === 0 ? (
        <Empty icon="eye" title="Nothing viewed yet" />
      ) : (
        <div className="vgrid">
          {viewed.map((l) => (
            <VendorCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
