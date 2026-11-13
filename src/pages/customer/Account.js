import { useState } from 'react';
import { daysBetween, fmtDate, inrShort, todayISO } from '../../config';
import { AREAS, EVENT_TYPES } from '../../data/mock';
import { Link, navigate } from '../../router';
import { useStore } from '../../store';
import { Badge, Button, Cover, Empty, Field, Icon, LinkButton, Modal, PageHeader } from '../../components/ui';
import { VendorCard } from '../../components/Shared';
import { Logo } from '../../components/Layouts';

export function Login({ next }) {
  const { actions } = useStore();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('98400 11223');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const verify = () => {
    actions.setRole('customer');
    navigate(next && !next.startsWith('/login') ? next : '/');
  };
  return (
    <div className="container section">
      <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
        <div className="card-body stack">
          <Logo />
          {step === 'phone' ? (
            <>
              <div>
                <h2>Log in or sign up</h2>
                <p className="muted">Use your phone number. We will send a 6-digit OTP.</p>
              </div>
              <Field label="Phone number">
                <div className="row gap-s">
                  <span className="input" style={{ width: 70, display: 'grid', placeItems: 'center' }}>
                    +91
                  </span>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" />
                </div>
              </Field>
              <Button block size="lg" onClick={() => setStep('otp')} disabled={phone.replace(/\D/g, '').length < 10}>
                Send OTP
              </Button>
              <p className="tiny muted center">Prefer email? You can add it later in your profile.</p>
            </>
          ) : (
            <>
              <div>
                <h2>Enter OTP</h2>
                <p className="muted">Sent to +91 {phone}. For the demo, any 6 digits work.</p>
              </div>
              <div className="otp">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={'otp' + i}
                    className="input"
                    maxLength={1}
                    value={d}
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      const n = [...otp];
                      n[i] = v;
                      setOtp(n);
                      if (v && i < 5) document.getElementById('otp' + (i + 1)).focus();
                    }}
                  />
                ))}
              </div>
              <Button block size="lg" onClick={verify}>
                Verify and continue
              </Button>
              <button className="link small" onClick={() => setOtp(['1', '2', '3', '4', '5', '6'])}>
                Autofill demo OTP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventForm({ onSave, onCancel, initial }) {
  const [f, setF] = useState(initial || { title: '', type: 'Wedding', date: '', area: 'Mylapore', budget: 500000, guests: 200, needs: [] });
  const { state } = useStore();
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <div className="stack">
      <Field label="Event name">
        <input className="input" placeholder="e.g. Amma's 60th birthday" value={f.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <div className="grid grid-2">
        <Field label="Event type">
          <select className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Location">
          <select className="select" value={f.area} onChange={(e) => set('area', e.target.value)}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Guests">
          <input className="input" type="number" value={f.guests} onChange={(e) => set('guests', Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Budget">
        <input className="input" type="number" value={f.budget} onChange={(e) => set('budget', Number(e.target.value))} />
      </Field>
      <Field label="What do you need?">
        <div className="chips">
          {state.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={'chip ' + (f.needs.includes(c.id) ? 'active' : '')}
              onClick={() => set('needs', f.needs.includes(c.id) ? f.needs.filter((x) => x !== c.id) : [...f.needs, c.id])}
            >
              <Icon name={c.icon} size={14} /> {c.name}
            </button>
          ))}
        </div>
      </Field>
      <div className="row gap-s" style={{ justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={() => onSave(f)} disabled={!f.title || !f.date}>
          Save event
        </Button>
      </div>
    </div>
  );
}

const bookingsForEvent = (state, eventId) =>
  state.leads
    .filter((l) => l.eventId === eventId && l.customerId === state.customerId)
    .map((l) => ({ lead: l, booking: state.bookings.find((b) => b.id === l.bookingId), listing: state.listings.find((x) => x.id === l.listingId) }));

export function Events() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const events = state.events.filter((e) => e.customerId === state.customerId).sort((a, b) => a.date.localeCompare(b.date));
  const today = todayISO();
  return (
    <div className="container section">
      <PageHeader title="My events" subtitle="Plan several events at once. Each one tracks its own vendors, budget and bookings." actions={<Button icon="plus" onClick={() => setOpen(true)}>Create event</Button>} />
      <div className="grid grid-3">
        {events.map((e) => {
          const items = bookingsForEvent(state, e.id);
          const booked = items.filter((i) => i.booking && i.booking.status !== 'cancelled');
          const spent = booked.reduce((s, i) => s + i.booking.total, 0);
          const days = daysBetween(today, e.date);
          return (
            <Link key={e.id} to={'/events/' + e.id} className="card">
              <Cover seed={e.id + e.title} icon={e.type === 'Wedding' ? 'heart' : e.type === 'Birthday' ? 'gift' : 'sparkles'} height={110} className="no-radius">
                <span className="cover-label">
                  <Badge tone={days < 0 ? 'gray' : 'brand'}>{days < 0 ? 'Done' : days === 0 ? 'Today' : `In ${days} days`}</Badge>
                </span>
              </Cover>
              <div className="card-body stack-s">
                <h3>{e.title}</h3>
                <div className="small muted">
                  {e.type} - {fmtDate(e.date)} - {e.area} - {e.guests} guests
                </div>
                <div className="row between small">
                  <span>
                    {booked.length} of {e.needs.length || '-'} booked
                  </span>
                  <span>
                    {inrShort(spent)} / {inrShort(e.budget)}
                  </span>
                </div>
                <div className="progress brand">
                  <span style={{ width: Math.min(100, (spent / (e.budget || 1)) * 100) + '%' }} />
                </div>
              </div>
            </Link>
          );
        })}
        {events.length === 0 && <Empty icon="calendar" title="No events yet">Create your first event to start planning.</Empty>}
      </div>
      <Modal open={open} title="Create event" onClose={() => setOpen(false)} wide>
        <EventForm
          onCancel={() => setOpen(false)}
          onSave={(f) => {
            const id = actions.createEvent(f);
            setOpen(false);
            navigate('/events/' + id);
          }}
        />
      </Modal>
    </div>
  );
}

export function Shortlist() {
  const { state } = useStore();
  const list = state.favourites.map((f) => state.listings.find((l) => l.id === f.listingId)).filter(Boolean);
  return (
    <div className="container section">
      <PageHeader
        title="Shortlist"
        subtitle="Partners you saved. Select two or more on the Explore page to compare side by side."
        actions={list.length >= 2 && <LinkButton to={'/compare?ids=' + list.slice(0, 4).map((l) => l.id).join(',')} icon="compare">Compare shortlisted</LinkButton>}
      />
      {list.length === 0 ? (
        <Empty icon="heart" title="Nothing shortlisted yet" action={<LinkButton to="/browse">Explore partners</LinkButton>} />
      ) : (
        <div className="vgrid">
          {list.map((l) => (
            <VendorCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
