import { useState } from 'react';
import { PARTNER_APP_NAME, SUBSCRIPTION_PRICE, fmtDateTime, inr } from '../../config';
import { AREAS } from '../../data/mock';
import { navigate } from '../../router';
import { useStore } from '../../store';
import { Badge, Button, Card, Cover, Field, Icon, Steps } from '../../components/ui';

const STEPS = ['Business', 'Portfolio', 'Documents', 'Subscribe', 'Bank account', 'Review'];
const DOCS = ['GST certificate', 'Owner ID (Aadhaar or PAN)', 'Business proof'];

export default function Onboarding() {
  const { state, actions } = useStore();
  const app = state.application;
  const [step, setStep] = useState(0);
  const [f, setF] = useState(
    (app && !app.submittedAt && app) || {
      phone: '', businessName: '', category: 'decoration', area: 'Anna Nagar', radius: 25, gstin: '', about: '',
      packageName: 'Basic', packagePrice: 25000, photos: 0, documents: [], paid: false,
      bank: { holder: '', account: '', ifsc: '', bankName: '', verified: false },
    }
  );
  const set = (k, v) => {
    const n = { ...f, [k]: v };
    setF(n);
    actions.saveApplication(n);
  };

  if (app && app.submittedAt) {
    const partner = state.partners.find((p) => p.id === app.partnerId);
    const status = partner ? partner.verification : app.status;
    return (
      <div className="onboard container">
        <Card>
          <div className="empty">
            <span className="cat-icon" style={status === 'verified' ? { background: 'var(--green-50)', color: 'var(--green)' } : undefined}>
              <Icon name={status === 'verified' ? 'shieldCheck' : 'clock'} size={24} />
            </span>
            <h2>{status === 'verified' ? 'You are live!' : status === 'rejected' ? 'Application needs changes' : 'Application under review'}</h2>
            <p className="muted">
              {app.businessName} - submitted {fmtDateTime(app.submittedAt)}
            </p>
            <Badge status={status} />
            <p className="muted small" style={{ maxWidth: 440 }}>
              {status === 'verified'
                ? 'Your listing is visible to customers. Open the Partner CRM to manage leads.'
                : 'Our team checks documents within 24 hours. Demo tip: switch to "Platform admin" in the demo bar and approve it from the Verification queue.'}
            </p>
            <div className="row gap-s">
              {status === 'verified' && (
                <Button
                  onClick={() => {
                    actions.setRole('owner');
                    navigate('/partner');
                  }}
                >
                  Open {PARTNER_APP_NAME}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  actions.saveApplication(null);
                  setStep(0);
                }}
              >
                Start a new application
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const next = () => setStep(Math.min(step + 1, STEPS.length - 1));
  const back = () => setStep(Math.max(step - 1, 0));
  const bank = f.bank || { holder: '', account: '', ifsc: '', bankName: '', verified: false };
  const setBank = (k, v) => set('bank', { ...bank, [k]: v, verified: k === 'verified' ? v : false });
  const canNext = [f.businessName && f.phone, f.photos >= 3, f.documents.length >= 2, f.paid, bank.verified, true][step];

  return (
    <div className="onboard container">
      <h1>List your business</h1>
      <p className="muted mb">Get a CRM for leads, quotes, invoices and crew, plus a listing in front of customers. {inr(SUBSCRIPTION_PRICE)} per 30 days.</p>
      <Card>
        <Steps steps={STEPS} current={STEPS[step]} />
      </Card>
      <Card className="mt">
        {step === 0 && (
          <div className="stack">
            <h3>Tell us about your business</h3>
            <div className="grid grid-2">
              <Field label="Your phone number">
                <input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91" />
              </Field>
              <Field label="Business name">
                <input className="input" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </Field>
              <Field label="Category">
                <select className="select" value={f.category} onChange={(e) => set('category', e.target.value)}>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Area">
                <select className="select" value={f.area} onChange={(e) => set('area', e.target.value)}>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Service radius (km)">
                <input className="input" type="number" value={f.radius} onChange={(e) => set('radius', e.target.value)} />
              </Field>
              <Field label="GSTIN" hint="Optional. Needed for GST invoices.">
                <input className="input" value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="33ABCDE1234F1Z5" />
              </Field>
            </div>
            <Field label="About your work">
              <textarea className="textarea" value={f.about} onChange={(e) => set('about', e.target.value)} />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="stack">
            <h3>Show your best work</h3>
            <p className="muted">Add at least 3 photos and one package. You can add more later.</p>
            <div className="thumbs">
              {Array.from({ length: f.photos }).map((_, i) => (
                <Cover key={i} seed={f.businessName + i} icon="image" height={100} />
              ))}
              <button className="upload" style={{ justifyContent: 'center', height: 100, cursor: 'pointer' }} onClick={() => set('photos', f.photos + 1)}>
                <Icon name="plus" /> Add photo
              </button>
            </div>
            <div className="grid grid-2">
              <Field label="Package name">
                <input className="input" value={f.packageName} onChange={(e) => set('packageName', e.target.value)} />
              </Field>
              <Field label="Price">
                <input className="input" type="number" value={f.packagePrice} onChange={(e) => set('packagePrice', e.target.value)} />
              </Field>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="stack">
            <h3>Verification documents</h3>
            <p className="muted">We verify every partner so customers can book with confidence.</p>
            {DOCS.map((d) => {
              const done = f.documents.includes(d);
              return (
                <div key={d} className={'upload ' + (done ? 'done' : '')}>
                  <Icon name={done ? 'check' : 'file'} className={done ? 'green' : 'muted'} />
                  <div className="grow">
                    <b>{d}</b>
                    <div className="small muted">{done ? 'Uploaded' : 'PDF or photo, up to 5 MB'}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => set('documents', done ? f.documents.filter((x) => x !== d) : [...f.documents, d])}>
                    {done ? 'Remove' : 'Upload'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {step === 3 && (
          <div className="stack">
            <h3>Subscribe to {PARTNER_APP_NAME}</h3>
            <div className="card">
              <div className="card-body row between wrap gap">
                <div>
                  <b>Partner Basic</b>
                  <div className="muted small">CRM + listing + 5 team logins</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {inr(SUBSCRIPTION_PRICE)} <span className="small muted">/ 30 days</span>
                </div>
              </div>
            </div>
            {f.paid ? (
              <div className="notice notice-success">
                <Icon name="check" />
                <span>Payment of {inr(SUBSCRIPTION_PRICE + 36)} (incl. GST) received.</span>
              </div>
            ) : (
              <Button size="lg" onClick={() => set('paid', true)}>
                Pay {inr(SUBSCRIPTION_PRICE + 36)} with UPI
              </Button>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="stack">
            <h3>Where should we send your payouts?</h3>
            <p className="muted">Money customers pay in the app is settled to this account after each event, minus TDS.</p>
            <div className="grid grid-2">
              <Field label="Account holder name">
                <input className="input" value={bank.holder} onChange={(e) => setBank('holder', e.target.value)} placeholder="As per bank records" />
              </Field>
              <Field label="Account number">
                <input className="input" value={bank.account} onChange={(e) => setBank('account', e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
              </Field>
              <Field label="IFSC" hint="e.g. IOBA0001234">
                <input className="input" value={bank.ifsc} onChange={(e) => setBank('ifsc', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Bank">
                <input className="input" value={bank.bankName} onChange={(e) => setBank('bankName', e.target.value)} placeholder="Indian Overseas Bank, Adyar" />
              </Field>
            </div>
            {bank.verified ? (
              <div className="notice notice-success">
                <Icon name="check" />
                <span>Account verified. We deposited ₹1 and the name matched: {bank.holder}.</span>
              </div>
            ) : (
              <Button variant="secondary" disabled={!bank.holder || bank.account.length < 9 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc)} onClick={() => setBank('verified', true)}>
                Verify with a ₹1 deposit
              </Button>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="stack">
            <h3>Review and submit</h3>
            <div className="kv">
              <div>
                <dt>Business</dt>
                <dd>{f.businessName}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{(state.categories.find((c) => c.id === f.category) || {}).name}</dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>
                  {f.area} ({f.radius} km)
                </dd>
              </div>
              <div>
                <dt>Photos</dt>
                <dd>{f.photos}</dd>
              </div>
              <div>
                <dt>Documents</dt>
                <dd>{f.documents.length} uploaded</dd>
              </div>
              <div>
                <dt>Subscription</dt>
                <dd>{f.paid ? 'Paid' : 'Not paid'}</dd>
              </div>
              <div>
                <dt>Payout account</dt>
                <dd>{bank.verified ? `${bank.bankName || 'Bank'} - XXXX${bank.account.slice(-4)}` : 'Not added'}</dd>
              </div>
            </div>
            <div className="notice">
              <Icon name="info" />
              <span>Your listing goes live after our team verifies your documents.</span>
            </div>
          </div>
        )}
        <div className="row between mt-l">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canNext}>
              Continue
            </Button>
          ) : (
            <Button onClick={() => actions.submitApplication(f)}>Submit for verification</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
