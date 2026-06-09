import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ── Icons ── */
function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 18, height: 18, flexShrink: 0, transition: 'transform 0.22s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function IconTwitter() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ── FAQ data ── */
const sections = [
  {
    title: 'Mon compte',
    questions: [
      { q: 'Comment créer un compte ?', a: 'Rendez-vous sur la page d\'inscription, renseignez votre email et choisissez votre rôle (employeur ou employé). Un email de confirmation vous sera envoyé.' },
      { q: 'Comment modifier mes informations personnelles ?', a: 'Dans le menu "Voir plus", accédez à "Mes informations personnelles". Modifiez les champs souhaités et cliquez sur "Enregistrer".' },
      { q: 'Comment changer mon mot de passe ?', a: 'Dans le menu "Voir plus", accédez à "Changer mon mot de passe". Saisissez votre ancien mot de passe puis le nouveau. Il doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.' },
      { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres, faites défiler jusqu\'à "Supprimer mon compte". Cette action est irréversible — toutes vos données seront effacées définitivement.' },
    ],
  },
  {
    title: 'Les tokens',
    questions: [
      { q: 'Qu\'est-ce qu\'un token PRIM\'O ?', a: 'Un token est une unité de reconnaissance virtuelle attribuée par un employeur à un employé pour récompenser une performance. Les tokens s\'accumulent dans votre portefeuille et sont échangeables contre des bons d\'achat.' },
      { q: 'Comment recevoir des tokens ?', a: 'Votre employeur vous en attribue directement depuis son tableau de bord, en sélectionnant votre nom et le montant. Vous recevez une notification dès le crédit.' },
      { q: 'Mes tokens ont-ils une date d\'expiration ?', a: 'Non, vos tokens ne expirent pas dans la version actuelle de PRIM\'O.' },
      { q: 'Puis-je transférer mes tokens à un collègue ?', a: 'Non, les tokens sont nominatifs et liés à votre compte. Seul un employeur peut en distribuer.' },
    ],
  },
  {
    title: 'Catalogue & bons d\'achat',
    questions: [
      { q: 'Comment échanger mes tokens contre un bon d\'achat ?', a: 'Dans le Catalogue, parcourez les offres disponibles. Cliquez sur un bon, vérifiez que votre solde est suffisant, puis confirmez l\'échange. Le code promo vous est remis immédiatement.' },
      { q: 'Que faire si mon code promo ne fonctionne pas ?', a: 'Vérifiez la date de validité du bon et les conditions d\'utilisation chez le partenaire. Si le problème persiste, contactez-nous via le formulaire ci-dessous.' },
      { q: 'Puis-je annuler un échange de bon ?', a: 'Non, un échange validé est définitif. Assurez-vous de bien vouloir utiliser vos tokens avant de confirmer.' },
      { q: 'Les bons d\'achat sont-ils utilisables en ligne et en magasin ?', a: 'Cela dépend du partenaire. Les conditions sont indiquées sur la fiche de chaque bon dans le Catalogue.' },
    ],
  },
  {
    title: 'Paiement & facturation',
    questions: [
      { q: 'Comment recharger le solde tokens de mon entreprise ?', a: 'En tant qu\'employeur, accédez à la page Abonnement. Choisissez un pack de tokens et procédez au paiement sécurisé via Stripe. Les tokens sont crédités immédiatement après confirmation.' },
      { q: 'Quels moyens de paiement sont acceptés ?', a: 'Carte bancaire (Visa, Mastercard, American Express) via Stripe. Aucune donnée de carte n\'est stockée sur nos serveurs.' },
      { q: 'Où trouver mes factures ?', a: 'Les factures sont disponibles directement dans votre espace Stripe. Un email de confirmation est envoyé à chaque paiement.' },
    ],
  },
  {
    title: 'Sécurité & confidentialité',
    questions: [
      { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Les mots de passe sont chiffrés avec bcrypt. Les communications sont en HTTPS. Nous ne revendons aucune donnée personnelle.' },
      { q: 'Puis-je demander la suppression de mes données ?', a: 'Oui, conformément au RGPD. Utilisez le bouton "Supprimer mon compte" dans les Paramètres, ou contactez-nous à l\'adresse ci-dessous.' },
      { q: 'Qui a accès à mon solde de tokens ?', a: 'Votre employeur peut voir les allocations effectuées. Votre solde est visible uniquement par vous et par les administrateurs de votre entreprise.' },
    ],
  },
];

/* ── AccordionItem ── */
function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <IconChevronDown open={open} />
      </button>
      {open && <p className="faq-answer">{a}</p>}
    </div>
  );
}

/* ── Page ── */
export default function FAQ() {
  const navigate = useNavigate();
  const location = useLocation();
  const contactRef = useRef<HTMLDivElement>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/service';
  const anchor = (location.state as { anchor?: string } | null)?.anchor;

  useEffect(() => {
    if (anchor === 'contact' && contactRef.current) {
      setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [anchor]);

  return (
    <div>
      {/* Top bar with back button */}
      <div className="faq-topbar" style={{ justifyContent: 'space-between' }}>
        <h1 className="faq-topbar-title">FAQ</h1>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div className="faq-content">
        {sections.map((section) => (
          <div key={section.title} className="faq-section">
            <h2 className="faq-section-title">{section.title}</h2>
            <div className="faq-section-body">
              {section.questions.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        {/* Contact section */}
        <div className="faq-section" ref={contactRef} id="contact">
          <h2 className="faq-section-title">Nous contacter</h2>
          <div className="faq-contact-card">
            <p className="faq-contact-text">
              Vous n'avez pas trouvé réponse à votre question ? Notre équipe est disponible du lundi au vendredi, 9h – 18h.
            </p>

            <a href="mailto:support@primo.app" className="faq-contact-email">
              <IconMail />
              support@primo.app
            </a>

            <div className="faq-social-row">
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="faq-social-btn" aria-label="LinkedIn">
                <IconLinkedIn />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="faq-social-btn" aria-label="Instagram">
                <IconInstagram />
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className="faq-social-btn" aria-label="X / Twitter">
                <IconTwitter />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
