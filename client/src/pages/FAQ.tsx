/**
 * pages/FAQ.tsx — Frequently asked questions page with a contact section.
 *
 * Questions are organised into thematic sections (Mon compte, Les tokens, Catalogue,
 * Paiement, Sécurité) and rendered as accessible accordion items — each question expands
 * to show the answer when clicked. The contact section at the bottom includes an email link
 * and social media links.
 *
 * When navigated to with `{ state: { anchor: 'contact' } }`, the page scrolls the contact
 * section into view after a brief delay (to let the DOM paint). This is used by the Service
 * page to deep-link directly to the contact area.
 */
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
    title: 'Mon compte & profil',
    questions: [
      { q: 'Comment créer un compte ?', a: 'Rendez-vous sur la page d\'inscription, renseignez votre prénom, nom, email et mot de passe. Votre employeur peut également créer votre compte directement depuis son tableau de bord.' },
      { q: 'Comment modifier mes informations personnelles ?', a: 'Dans le menu "Voir plus", accédez à "Mes informations personnelles". Vous pouvez y modifier votre prénom, nom et adresse email. Cliquez sur "Enregistrer" pour valider.' },
      { q: 'Comment changer mon avatar ?', a: 'Sur votre page "Pour toi", appuyez sur votre photo de profil en haut. Une galerie de 6 avatars s\'ouvre. Sélectionnez celui que vous souhaitez — le changement est enregistré sur tous vos appareils.' },
      { q: 'Comment changer mon mot de passe ?', a: 'Dans le menu "Voir plus", accédez à "Changer mon mot de passe". Saisissez votre mot de passe actuel puis le nouveau. Il doit contenir au moins 8 caractères.' },
      { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres, faites défiler jusqu\'à "Supprimer mon compte". Cette action est irréversible — toutes vos données seront effacées définitivement.' },
      { q: 'Mon avatar est-il visible par les autres ?', a: 'Oui. Votre avatar apparaît dans les listes de collaborateurs, dans les tableaux de bord de votre manager et de votre employeur, ainsi que dans le menu de navigation.' },
    ],
  },
  {
    title: 'Les tokens',
    questions: [
      { q: 'Qu\'est-ce qu\'un token PRIM\'O ?', a: 'Un token est une unité de reconnaissance virtuelle attribuée par un employeur ou un manager pour récompenser une performance. Les tokens s\'accumulent dans votre portefeuille et sont échangeables contre des bons d\'achat dans le Catalogue.' },
      { q: 'Comment recevoir des tokens ?', a: 'Votre manager ou employeur vous en attribue directement depuis son tableau de bord. Chaque attribution apparaît dans votre historique et dans votre solde en temps réel.' },
      { q: 'Où voir mon solde de tokens ?', a: 'Votre solde est affiché en permanence en haut de la page "Pour toi" ainsi que dans la barre de navigation. Il est mis à jour en temps réel après chaque attribution ou échange.' },
      { q: 'Mes tokens ont-ils une date d\'expiration ?', a: 'Non, vos tokens n\'expirent pas.' },
      { q: 'Puis-je transférer mes tokens à un collègue ?', a: 'Non. Les tokens sont nominatifs et liés à votre compte. Seul un employeur ou un manager peut en distribuer.' },
      { q: 'Comment consulter mon historique de tokens ?', a: 'Accédez à la page "Historique" depuis la navigation. Vous y trouvez toutes vos transactions (tokens reçus et tokens utilisés), avec la date, le montant et le motif.' },
    ],
  },
  {
    title: 'Catalogue & bons d\'achat',
    questions: [
      { q: 'Comment naviguer dans le Catalogue ?', a: 'Le Catalogue affiche tous les bons d\'achat disponibles. Utilisez la barre de recherche pour trouver un partenaire, les filtres de catégorie pour naviguer par thème (Alimentaire, Tech, Loisirs…), et le menu de tri pour classer par nouveautés ou par prix.' },
      { q: 'Comment ajouter un bon au panier ?', a: 'Sur la fiche d\'un bon, appuyez sur l\'icône panier. Le bon est ajouté à votre panier sans être immédiatement échangé. Vous pouvez gérer votre panier avant de valider.' },
      { q: 'Comment échanger mes tokens contre un bon d\'achat ?', a: 'Depuis la fiche d\'un bon ou votre panier, cliquez sur "Échanger". Votre solde est vérifié, et si vous avez suffisamment de tokens, le code promo vous est remis immédiatement à l\'écran.' },
      { q: 'Que faire si mon code promo ne fonctionne pas ?', a: 'Vérifiez les conditions d\'utilisation indiquées sur la fiche du bon. Si le problème persiste, contactez-nous via le formulaire en bas de cette page.' },
      { q: 'Puis-je annuler un échange de bon ?', a: 'Non, un échange validé est définitif. Votre solde de tokens est immédiatement débité. Assurez-vous de bien vouloir utiliser vos tokens avant de confirmer.' },
      { q: 'Comment retrouver mes codes promo déjà échangés ?', a: 'Vos rachats sont visibles dans la page "Historique", section bons d\'achat. Chaque code promo obtenu y est conservé.' },
      { q: 'Les bons d\'achat sont-ils utilisables en ligne et en magasin ?', a: 'Cela dépend du partenaire. Les conditions d\'utilisation sont précisées sur chaque fiche dans le Catalogue.' },
    ],
  },
  {
    title: 'Pour les collaborateurs',
    questions: [
      { q: 'Comment savoir à quelle équipe j\'appartiens ?', a: 'Si vous êtes rattaché à une équipe, une fenêtre "Mon équipe" apparaît en haut de votre page "Pour toi" avec le nom de l\'équipe et votre manager.' },
      { q: 'Que signifie "Feedback instantané" ?', a: 'La section "Feedback instantané" sur votre page "Pour toi" affiche les 6 derniers tokens que vous avez reçus, avec la date, le montant et le motif indiqué par votre manager ou employeur.' },
      { q: 'Je ne vois pas de fenêtre "Mon équipe" — est-ce normal ?', a: 'Oui, cette fenêtre n\'apparaît que si vous avez été rattaché à une équipe. Si elle est absente, contactez votre manager ou votre employeur pour être ajouté.' },
      { q: 'Puis-je voir le profil de mon manager ?', a: 'Non, les collaborateurs n\'ont pas accès aux fiches des managers depuis l\'application. Vous voyez uniquement son nom et son avatar dans la fenêtre "Mon équipe".' },
    ],
  },
  {
    title: 'Pour les managers',
    questions: [
      { q: 'Comment attribuer des tokens à un collaborateur ?', a: 'Sur votre page "Pour toi", dans la liste "Mes collaborateurs", appuyez sur "Allouer" à côté du collaborateur concerné. Entrez le montant et un motif optionnel, puis confirmez.' },
      { q: 'Puis-je m\'attribuer des tokens à moi-même ?', a: 'Oui. En tant que manager, vous pouvez transférer des tokens depuis le stock de votre équipe vers votre propre compte via la section "M\'attribuer des tokens" sur votre page "Pour toi".' },
      { q: 'Comment ajouter un collaborateur à mon équipe ?', a: 'Sur votre page "Pour toi", appuyez sur "+ Ajouter à l\'équipe". Vous pouvez soit sélectionner un collaborateur existant sans équipe, soit créer un nouveau profil directement.' },
      { q: 'Comment créer un nouveau compte collaborateur ?', a: 'Dans la fenêtre "+ Ajouter à l\'équipe", choisissez "Créer un profil". Renseignez le prénom, nom, email et mot de passe. Le compte est créé et rattaché immédiatement à votre équipe.' },
      { q: 'Qu\'est-ce qu\'une attribution automatique ?', a: 'La section "Attributions automatiques" permet de programmer des transferts de tokens récurrents vers un collaborateur (mensuel ou annuel). Le système les effectue automatiquement à la date choisie.' },
      { q: 'Comment mettre en pause ou supprimer une attribution automatique ?', a: 'Dans la section "Attributions automatiques" de votre page "Pour toi", chaque règle peut être mise en pause (bouton on/off) ou supprimée.' },
      { q: 'Puis-je voir le solde de tokens de mes collaborateurs ?', a: 'Oui. Le solde de chaque collaborateur est visible directement dans la liste "Mes collaborateurs" sur votre page "Pour toi", ainsi que sur sa fiche détaillée.' },
      { q: 'Comment accéder à la fiche d\'un collaborateur ?', a: 'Appuyez sur le nom d\'un collaborateur dans la liste. Vous accédez à sa fiche avec son profil, son solde, et l\'historique de ses transactions.' },
    ],
  },
  {
    title: 'Pour les employeurs',
    questions: [
      { q: 'Comment voir tous mes collaborateurs et managers ?', a: 'Sur votre page "Pour toi", la section "Équipes & Managers" affiche deux onglets : "Managers" (liste des managers avec leur rôle et solde) et "Collaborateurs" (liste complète avec leur équipe de rattachement).' },
      { q: 'Comment promouvoir un collaborateur au rang de manager ?', a: 'Accédez à la fiche du collaborateur (depuis l\'onglet "Collaborateurs"), faites défiler jusqu\'à la section "Promotion". Définissez un nom d\'équipe et confirmez. Le collaborateur devient manager et une équipe lui est automatiquement créée.' },
      { q: 'Comment rétrograder un manager en collaborateur ?', a: 'Depuis la fiche du manager, faites défiler jusqu\'à la section "Rétrogradation" et confirmez. Son équipe est dissoute, ses membres deviennent des collaborateurs sans équipe, et ses attributions automatiques sont désactivées.' },
      { q: 'Comment attribuer des tokens à un manager ou une équipe ?', a: 'Sur votre page "Pour toi", vous pouvez envoyer des tokens à un individu, à toute l\'équipe d\'un manager, ou à toute l\'entreprise via les formulaires d\'attribution rapide.' },
      { q: 'Comment recharger le solde tokens de mon entreprise ?', a: 'Accédez à la page "Abonnement" via le menu. Choisissez un pack de tokens et procédez au paiement sécurisé via Stripe. Les tokens sont crédités immédiatement après confirmation du paiement.' },
      { q: 'Comment voir l\'historique des allocations ?', a: 'Sur votre page "Pour toi", la section "Flux d\'activité" affiche toutes les dernières attributions effectuées avec le destinataire, le montant et la date.' },
      { q: 'Puis-je activer un compte collaborateur en attente ?', a: 'Oui. Depuis votre tableau de bord, les comptes en attente d\'activation sont affichés. Cliquez sur "Activer" pour valider le compte et permettre à l\'employé de se connecter.' },
    ],
  },
  {
    title: 'Paiement & facturation',
    questions: [
      { q: 'Quels moyens de paiement sont acceptés ?', a: 'Carte bancaire (Visa, Mastercard, American Express) via Stripe. Aucune donnée de carte n\'est stockée sur nos serveurs — tout est géré par Stripe de façon sécurisée.' },
      { q: 'Où trouver mes factures ?', a: 'Les factures sont disponibles dans votre espace Stripe. Un email de confirmation est envoyé à chaque paiement réussi.' },
      { q: 'Que se passe-t-il en cas d\'échec du paiement ?', a: 'En cas d\'échec, aucun token n\'est crédité et votre solde reste inchangé. Vous pouvez réessayer avec une autre carte ou vérifier vos informations bancaires.' },
    ],
  },
  {
    title: 'Sécurité & confidentialité',
    questions: [
      { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Les mots de passe sont chiffrés avec bcrypt (12 rounds minimum). Les communications sont en HTTPS. Les tokens JWT expirent automatiquement. Nous ne revendons aucune donnée personnelle.' },
      { q: 'Qui a accès à mon solde de tokens ?', a: 'Votre solde est visible par vous-même, votre manager, et votre employeur. Les administrateurs PRIM\'O n\'accèdent aux données qu\'en cas de support technique.' },
      { q: 'Puis-je demander la suppression de mes données ?', a: 'Oui, conformément au RGPD. Utilisez le bouton "Supprimer mon compte" dans les Paramètres, ou contactez-nous à l\'adresse ci-dessous.' },
      { q: 'Mes informations de carte bancaire sont-elles stockées ?', a: 'Non. PRIM\'O ne stocke jamais vos données de carte. Tous les paiements sont traités directement par Stripe, qui est certifié PCI-DSS.' },
      { q: 'Que se passe-t-il si je me déconnecte d\'un autre appareil ?', a: 'Votre session est liée à un token d\'accès stocké localement. Se déconnecter invalide ce token. Si vous pensez que votre compte a été compromis, changez immédiatement votre mot de passe.' },
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
      <div className="faq-topbar faq-topbar--clean" style={{ justifyContent: 'space-between' }}>
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
