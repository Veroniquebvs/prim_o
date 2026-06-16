import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Plan {
  id: string;
  label: string;
  tokens: number;
  price: number;
  popular?: boolean;
  description: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    label: 'Starter',
    tokens: 500,
    price: 29,
    description: 'Idéal pour les petites équipes jusqu\'à 5 personnes.',
  },
  {
    id: 'growth',
    label: 'Growth',
    tokens: 1500,
    price: 79,
    popular: true,
    description: 'Le plus choisi — parfait pour une équipe de 10 à 20 personnes.',
  },
  {
    id: 'scale',
    label: 'Scale',
    tokens: 4000,
    price: 179,
    description: 'Pour les entreprises avec de grandes équipes (50+ personnes).',
  },
];

export default function Abonnement() {
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [selected, setSelected] = useState<string>('growth');
  const [loading, setLoading] = useState(false);

  const plan = PLANS.find(p => p.id === selected)!;

  async function handleSubscribe() {
    setLoading(true);
    // TODO: appel Stripe PaymentIntent / Checkout Session
    // Pour le MVP, simuler un délai
    setTimeout(() => {
      setLoading(false);
      alert(`Abonnement ${plan.label} sélectionné — intégration Stripe à venir.`);
    }, 800);
  }

  return (
    <div>
      <style>{`
        .page-header .back-btn {
          position: absolute !important;
          right: 24px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background-color: transparent !important;
          color: white !important;
          border-color: white !important;
        }
        @media (min-width: 768px) {
          .page-header .back-btn {
            right: 32px !important;
          }
        }
        @media (min-width: 1024px) {
          .page-header .back-btn {
            right: 40px !important;
          }
        }
        .page-header .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <div className="page-header">
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Abonnement tokens</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: 4 }}>
            recharger le solde de votre entreprise chaque mois
          </p>
        </div>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      {/* Solde actuel */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 2 }}>Solde actuel</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
            {company?.token_balance ?? 0}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>tokens</span>
          </p>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--primary-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              border: `2px solid ${selected === p.id ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '16px 18px',
              background: selected === p.id ? 'var(--primary-light)' : 'var(--card-bg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left',
              position: 'relative',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Radio */}
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${selected === p.id ? 'var(--primary)' : 'var(--border)'}`,
              background: selected === p.id ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selected === p.id && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.label}</span>
                {p.popular && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                    borderRadius: 999, background: 'var(--primary)', color: '#fff',
                  }}>Populaire</span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{p.description}</p>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '1.05rem', color: selected === p.id ? 'var(--primary)' : 'var(--text)' }}>
                {p.price} €
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {p.tokens.toLocaleString('fr-FR')} tokens/mois
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Récapitulatif + CTA */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Plan sélectionné</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{plan.label}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tokens reçus / mois</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
            {plan.tokens.toLocaleString('fr-FR')}
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 700 }}>Total / mois</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{plan.price} €</span>
        </div>
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Redirection…' : `S'abonner — ${plan.price} €/mois`}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Résiliable à tout moment · Paiement sécurisé via Stripe
      </p>
    </div>
  );
}
