/**
 * pages/Abonnement.tsx — Subscription management page for employers.
 *
 * Handles four sequential states:
 * 1. loading — checks whether an active subscription already exists via tokenService.getSubscription.
 * 2. subscribed — displays the current plan details and lets the employer switch to a different plan.
 * 3. select — shows the three subscription plans (starter/growth/scale) for a first-time subscriber
 *    or when switching plans.
 * 4. checkout — renders the Stripe Elements PaymentElement inside a CheckoutForm component.
 *    CheckoutForm calls stripe.confirmPayment() and invokes onSuccess on approval.
 * 5. success — shows a confirmation screen and polls refreshCompany every 2 seconds for up to
 *    8 attempts while waiting for the Stripe webhook to credit the tokens asynchronously.
 *
 * Raw card data is handled entirely by Stripe.js (PaymentElement) — it never reaches the backend.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { tokenService } from '../services/token.service';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '');

interface Plan { id: string; label: string; tokens: number; price: number; popular?: boolean; description: string; }

const PLANS: Plan[] = [
  { id: 'starter', label: 'Starter', tokens: 500,  price: 29,  description: "Idéal pour les petites équipes jusqu'à 5 personnes." },
  { id: 'growth',  label: 'Growth',  tokens: 1500, price: 79,  popular: true, description: 'Le plus choisi — parfait pour une équipe de 10 à 20 personnes.' },
  { id: 'scale',   label: 'Scale',   tokens: 4000, price: 179, description: 'Pour les entreprises avec de grandes équipes (50+ personnes).' },
];

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', growth: 'Growth', scale: 'Scale' };
const PLAN_TOKENS: Record<string, number> = { starter: 500, growth: 1500, scale: 4000 };
const PLAN_PRICES: Record<string, number> = { starter: 29, growth: 79, scale: 179 };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Formulaire paiement ─────────────────────────────────── */
function CheckoutForm({ plan, onSuccess }: { plan: Plan; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError('');
    const result = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (result.error) {
      setPayError(result.error.message ?? 'Erreur de paiement.');
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Plan</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{plan.label}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tokens / mois</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
            {plan.tokens.toLocaleString('fr-FR')}
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 700 }}>Total / mois</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{plan.price} €</span>
        </div>
        <PaymentElement options={{ wallets: { link: 'never' } }} />
        {payError && <p className="form-error" style={{ marginTop: 12 }}>{payError}</p>}
        <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 20 }} disabled={paying || !stripe}>
          {paying ? 'Paiement en cours…' : `Payer ${plan.price} €/mois`}
        </button>
      </div>
    </form>
  );
}

/* ── Page principale ─────────────────────────────────────── */
type Step = 'loading' | 'subscribed' | 'select' | 'checkout' | 'success';

interface Subscription { plan: string; status: string; next_billing: string; }

export default function Abonnement() {
  const navigate = useNavigate();
  const { refreshCompany } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selected, setSelected] = useState<string>('growth');
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');

  const plan = PLANS.find(p => p.id === selected)!;

  useEffect(() => {
    tokenService.getSubscription()
      .then(sub => {
        if (sub && sub.status === 'active') {
          setSubscription(sub);
          setStep('subscribed');
        } else {
          setStep('select');
        }
      })
      .catch(() => setStep('select'));
  }, []);

  async function handleSubscribe() {
    setLoadingIntent(true);
    setIntentError('');
    try {
      const { clientSecret: secret } = await tokenService.subscribe(plan.id);
      setClientSecret(secret);
      setStep('checkout');
    } catch {
      setIntentError("Impossible d'initier le paiement. Réessayez.");
    } finally {
      setLoadingIntent(false);
    }
  }

  async function handleSuccess() {
    setStep('success');
    // Polling du solde — le webhook crédite les tokens de façon asynchrone
    let attempts = 0;
    const poll = setInterval(async () => {
      await refreshCompany();
      attempts++;
      if (attempts >= 8) clearInterval(poll);
    }, 2000);
    // Rafraîchir aussi l'abonnement
    const sub = await tokenService.getSubscription();
    if (sub) setSubscription(sub);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 28px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Abonnez-vous</h1>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      {/* ── Chargement ── */}
      {step === 'loading' && (
        <div style={{ padding: 32, color: 'var(--text-muted)' }}>Chargement…</div>
      )}

      {/* ── Abonnement actif ── */}
      {step === 'subscribed' && subscription && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Abonnement actif
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{PLAN_LABELS[subscription.plan]}</span>
              <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>Actif</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>
              {PLAN_TOKENS[subscription.plan]?.toLocaleString('fr-FR')} tokens · {PLAN_PRICES[subscription.plan]} €/mois
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Prochain prélèvement : <strong>{fmtDate(subscription.next_billing)}</strong>
            </p>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Changer de plan :
          </p>
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                border: `2px solid ${selected === p.id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 14, padding: '14px 18px', marginBottom: 10,
                background: selected === p.id ? 'var(--primary-light)' : 'var(--card-bg)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                textAlign: 'left', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.label}</span>
                {p.id === subscription.plan && (
                  <span style={{ marginLeft: 8, fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>actuel</span>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{p.tokens.toLocaleString('fr-FR')} tokens</p>
              </div>
              <span style={{ fontWeight: 800, color: selected === p.id ? 'var(--primary)' : 'var(--text)' }}>{p.price} €</span>
            </button>
          ))}

          {selected !== subscription.plan && (
            <>
              {intentError && <p className="form-error" style={{ marginBottom: 8 }}>{intentError}</p>}
              <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={handleSubscribe} disabled={loadingIntent}>
                {loadingIntent ? 'Préparation…' : `Passer au plan ${PLAN_LABELS[selected]}`}
              </button>
            </>
          )}
        </>
      )}

      {/* ── Sélection du plan ── */}
      {step === 'select' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {PLANS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{
                  border: `2px solid ${selected === p.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '16px 18px',
                  background: selected === p.id ? 'var(--primary-light)' : 'var(--card-bg)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected === p.id ? 'var(--primary)' : 'var(--border)'}`, background: selected === p.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected === p.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.label}</span>
                    {p.popular && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--primary)', color: '#fff' }}>Populaire</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{p.description}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: '1.05rem', color: selected === p.id ? 'var(--primary)' : 'var(--text)' }}>{p.price} €</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{p.tokens.toLocaleString('fr-FR')} tokens/mois</p>
                </div>
              </button>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Plan sélectionné</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{plan.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tokens / mois</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>{plan.tokens.toLocaleString('fr-FR')}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700 }}>Total / mois</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{plan.price} €</span>
            </div>
            {intentError && <p className="form-error" style={{ marginBottom: 12 }}>{intentError}</p>}
            <button className="btn btn-primary btn-full" onClick={handleSubscribe} disabled={loadingIntent}>
              {loadingIntent ? 'Préparation…' : `S'abonner — ${plan.price} €/mois`}
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Résiliable à tout moment · Paiement sécurisé via Stripe
          </p>
        </>
      )}

      {/* ── Paiement ── */}
      {step === 'checkout' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret, locale: 'fr' }}>
          <CheckoutForm plan={plan} onSuccess={handleSuccess} />
        </Elements>
      )}

      {/* ── Succès ── */}
      {step === 'success' && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Abonnement activé !</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 4 }}>
            {plan.tokens.toLocaleString('fr-FR')} tokens ont été crédités sur votre compte.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 24 }}>
            Votre solde se met à jour automatiquement…
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/employer/dashboard')}>
            Retour au dashboard
          </button>
        </div>
      )}
    </div>
  );
}
