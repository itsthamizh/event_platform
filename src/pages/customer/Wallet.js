// Customer wallet (refund and referral credit) and refer-a-friend.
import { useState } from 'react';
import { fmtDate, fmtDateTime, inr } from '../../config';
import { useStore } from '../../store';
import { Badge, Button, Card, Empty, PageHeader } from '../../components/ui';

export function Wallet() {
  const { state, toast } = useStore();
  const [copied, setCopied] = useState(false);
  const w = state.wallets[state.customerId] || { balance: 0, txns: [] };
  const refs = state.referrals.filter((r) => r.referrerId === state.customerId);
  const me = state.users.find((u) => u.id === state.customerId);
  const code = refs[0] ? refs[0].code : me.name.split(' ')[0].toUpperCase() + '26';
  const earned = refs.reduce((a, r) => a + r.reward, 0);
  const copy = () => {
    const text = `Plan your event on Zoho for Vizhaa with my code ${code} and get ₹500 off your first booking.`;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => {
        setCopied(true);
        toast('Invite message copied');
      })
      .catch(() => toast('Copy this code: ' + code));
  };
  return (
    <div className="container section">
      <PageHeader title="Wallet and referrals" subtitle="Refunds you choose to keep in Zoho for Vizhaa and referral rewards land here. Use the balance on any booking payment." />
      <div className="grid grid-side">
        <div className="stack">
          <Card title="Zoho for Vizhaa wallet">
            <div style={{ fontSize: 34, fontWeight: 800 }}>{inr(w.balance)}</div>
            <p className="small muted">Available to use on your next payment. Wallet credit never expires.</p>
          </Card>
          <Card title="Transactions" pad={false}>
            {w.txns.length === 0 ? (
              <Empty icon="rupee" title="No transactions yet" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {w.txns.map((t) => (
                      <tr key={t.id}>
                        <td>
                          {t.note}
                          <div className="tiny muted">{fmtDateTime(t.at)}</div>
                        </td>
                        <td className={'right ' + (t.type === 'credit' ? 'green' : '')}>
                          <b>
                            {t.type === 'credit' ? '+' : '-'}
                            {inr(t.amount)}
                          </b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Refer friends, earn ₹500">
            <p className="small muted">Your friend gets ₹500 off their first booking. You get ₹500 in your wallet when they pay their first advance.</p>
            <div className="row between mt" style={{ border: '1px dashed var(--line-2)', borderRadius: 10, padding: '10px 14px' }}>
              <b style={{ letterSpacing: 2, fontSize: 18 }}>{code}</b>
              <Button size="sm" variant="secondary" icon="copy" onClick={copy}>
                {copied ? 'Copied' : 'Copy invite'}
              </Button>
            </div>
            <p className="small mt">
              Earned so far: <b className="green">{inr(earned)}</b>
            </p>
          </Card>
          <Card title="Friends you invited">
            {refs.length === 0 ? (
              <p className="muted small">No one yet.</p>
            ) : (
              <div className="stack-s">
                {refs.map((r) => (
                  <div key={r.id} className="row between small">
                    <span>
                      <b>{r.name}</b>
                      <div className="tiny muted">Joined {fmtDate(r.joinedAt)}</div>
                    </span>
                    {r.status === 'booked' ? <Badge tone="green">+{inr(r.reward)}</Badge> : <Badge tone="gray">Signed up</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
