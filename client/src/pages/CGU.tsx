/**
 * pages/CGU.tsx — Terms of use and sale (CGU-CGV) page.
 *
 * Renders 17 legal articles covering the platform's object, contact details, user capacities,
 * token rules, marketplace terms, payment and billing, data protection (RGPD), intellectual
 * property, and jurisdiction. Content is statically defined in the articles array and rendered
 * as paragraphs split on double newlines. Article numbers and titles form a readable heading
 * hierarchy. The contact section mirrors the one in FAQ.
 */
import { useNavigate, useLocation } from 'react-router-dom';

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

const LAST_UPDATE = '5 juin 2026';

const articles = [
  {
    num: '1',
    title: 'Objet',
    content: `Les présentes Conditions Générales d'Utilisation et de Vente (ci-après « CGU-CGV ») ont pour objet de définir les modalités et conditions dans lesquelles la société éditrice de PRIM'O (ci-après « l'Éditeur ») met à disposition de ses utilisateurs la plateforme PRIM'O accessible via l'application mobile et le site web associé (ci-après « la Plateforme »).

PRIM'O est une solution SaaS B2B2C de reconnaissance méritocratique en temps réel, permettant aux employeurs d'allouer des tokens à leurs employés en récompense de performances observées, et aux employés de convertir ces tokens en bons d'achat (codes promo) via un catalogue partenaire intégré.

Toute utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU-CGV.`,
  },
  {
    num: '2',
    title: 'Identité et contact',
    content: `Éditeur : PRIM'O SAS
Représentant légal : Loïc Cerqueira
Adresse : France
Email : support@primo.app
Site web : primo.app

Pour toute question relative aux présentes CGU-CGV ou à l'utilisation de la Plateforme, vous pouvez contacter l'Éditeur à l'adresse email ci-dessus ou via le formulaire de contact disponible dans la section « Aide » de l'application.`,
  },
  {
    num: '3',
    title: 'Capacité juridique et acceptation des conditions générales',
    content: `L'accès et l'utilisation de la Plateforme sont réservés aux personnes physiques majeures capables juridiquement ou aux personnes morales régulièrement constituées.

En créant un compte sur la Plateforme, l'Utilisateur déclare :
• Avoir pris connaissance des présentes CGU-CGV et les accepter sans réserve ;
• Être majeur et disposer de la capacité juridique nécessaire pour contracter ;
• Agir pour son propre compte ou, s'il représente une personne morale, disposer des pouvoirs nécessaires pour engager celle-ci.

L'Éditeur se réserve le droit de demander tout justificatif permettant de vérifier la capacité juridique de l'Utilisateur.`,
  },
  {
    num: '4',
    title: 'Caractéristiques des produits et services',
    content: `La Plateforme PRIM'O propose les services suivants :

4.1 Pour les Employeurs (rôle « employer »)
• Achat de tokens via un système de paiement sécurisé (Stripe) ;
• Distribution de tokens aux employés de leur entreprise en récompense de performances ;
• Accès à un tableau de bord de suivi des allocations et du solde tokens de l'entreprise ;
• Gestion des comptes employés rattachés à l'entreprise.

4.2 Pour les Employés (rôle « employee »)
• Réception de tokens attribués par leur employeur ;
• Consultation du solde de tokens et de l'historique des transactions ;
• Accès au catalogue de bons d'achat partenaires ;
• Échange de tokens contre des codes promo auprès des partenaires référencés.

4.3 Pour les Administrateurs (rôle « admin »)
• Gestion du catalogue de bons d'achat (ajout, modification, suppression) ;
• Supervision des entreprises et des utilisateurs inscrits sur la Plateforme.

Les tokens PRIM'O sont des unités virtuelles de reconnaissance sans valeur monétaire légale. Ils ne peuvent pas être remboursés en espèces, échangés entre utilisateurs, ni transférés en dehors de la Plateforme.`,
  },
  {
    num: '5',
    title: 'Accès à la Plateforme',
    content: `5.1 Disponibilité
L'Éditeur s'efforce d'assurer la disponibilité de la Plateforme 24h/24 et 7j/7. Toutefois, l'accès peut être interrompu pour des raisons de maintenance, de mise à jour, ou en cas de force majeure. L'Éditeur ne garantit pas une disponibilité ininterrompue de la Plateforme.

5.2 Prérequis techniques
L'Utilisateur doit disposer d'un appareil compatible (smartphone, tablette ou ordinateur) et d'une connexion internet fonctionnelle. Les frais d'accès à internet sont à la charge exclusive de l'Utilisateur.

5.3 Sécurité d'accès
L'Utilisateur est responsable de la confidentialité de ses identifiants (email et mot de passe). En cas de suspicion d'utilisation frauduleuse de son compte, l'Utilisateur doit immédiatement contacter l'Éditeur et modifier son mot de passe.`,
  },
  {
    num: '6',
    title: 'Création et gestion du compte',
    content: `6.1 Inscription
La création d'un compte est obligatoire pour accéder aux fonctionnalités de la Plateforme. L'Utilisateur s'engage à fournir des informations exactes, complètes et à les maintenir à jour.

6.2 Identifiants
Chaque compte est strictement personnel et nominatif. L'Utilisateur ne peut pas céder son compte à un tiers.

6.3 Sécurité
Les mots de passe sont chiffrés et stockés de façon sécurisée (bcrypt, 12 rounds minimum). L'Éditeur ne communiquera jamais un mot de passe par email ou téléphone.

6.4 Suspension et suppression
L'Éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU-CGV, de comportement frauduleux ou d'utilisation abusive de la Plateforme, sans préavis ni indemnité.

L'Utilisateur peut supprimer son compte à tout moment depuis la section Paramètres de l'application. La suppression entraîne la perte définitive du solde de tokens et de l'historique associé.`,
  },
  {
    num: '7',
    title: 'Tokens — fonctionnement et limites',
    content: `7.1 Nature des tokens
Les tokens PRIM'O sont des unités virtuelles de reconnaissance sans valeur légale. Ils ne constituent pas une monnaie électronique au sens de la directive européenne 2009/110/CE et ne confèrent aucun droit pécuniaire.

7.2 Attribution
Les tokens sont attribués exclusivement par les employeurs aux employés appartenant à leur entreprise sur la Plateforme. L'attribution est irréversible une fois confirmée.

7.3 Expiration
Dans la version actuelle de la Plateforme, les tokens n'ont pas de date d'expiration. L'Éditeur se réserve le droit d'introduire une politique d'expiration en notifiant les Utilisateurs dans un délai raisonnable.

7.4 Non-remboursabilité
Les tokens ne peuvent en aucun cas être reconvertis en monnaie fiduciaire ou scripturale. Les tokens non utilisés lors de la suppression d'un compte sont définitivement perdus.

7.5 Fraude
Toute tentative de contournement du système d'attribution, de falsification du solde ou d'utilisation abusive de la Plateforme est strictement interdite et pourra faire l'objet de poursuites.`,
  },
  {
    num: '8',
    title: 'Marketplace et bons d\'achat',
    content: `8.1 Catalogue partenaires
Le catalogue de bons d'achat est composé d'offres de partenaires tiers sélectionnés par l'Éditeur. L'Éditeur ne garantit pas la disponibilité permanente d'une offre particulière.

8.2 Échange de tokens
L'échange de tokens contre un bon d'achat est définitif et irréversible. Le code promo est délivré immédiatement après confirmation de l'échange. En cas d'insuffisance de solde, l'échange est refusé.

8.3 Responsabilité partenaires
Les bons d'achat sont émis et gérés par les partenaires. L'Éditeur ne peut être tenu responsable de la non-utilisation, de l'expiration ou du refus d'un code promo par un partenaire. En cas de litige avec un partenaire, l'Utilisateur doit contacter directement le service client dudit partenaire.

8.4 Conditions d'utilisation des bons
Chaque bon d'achat est soumis aux conditions générales du partenaire émetteur, consultables sur le site du partenaire. L'Éditeur ne peut en garantir les modalités d'utilisation (validité, conditions d'exclusion, zone géographique).`,
  },
  {
    num: '9',
    title: 'Prix et paiement',
    content: `9.1 Tarification
L'accès à la Plateforme pour les employés est gratuit. Les employeurs acquièrent des packs de tokens selon une grille tarifaire disponible sur la page Abonnement de la Plateforme.

9.2 Paiement sécurisé
Les paiements sont traités exclusivement via Stripe, prestataire de services de paiement agréé. Aucune donnée de carte bancaire n'est stockée sur les serveurs de l'Éditeur. Les transactions sont sécurisées par le protocole TLS.

9.3 Facturation
Une confirmation de paiement est adressée par email à l'adresse associée au compte employeur. Les factures sont accessibles depuis l'espace client Stripe.

9.4 Impayés
En cas d'échec du paiement, les tokens correspondants ne sont pas crédités. L'Éditeur se réserve le droit de suspendre l'accès aux fonctionnalités premium en cas d'impayé.`,
  },
  {
    num: '10',
    title: 'Droit de rétractation',
    content: `Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques non fournis sur support matériel dont l'exécution a commencé avec l'accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation.

En validant l'achat d'un pack de tokens et en consentant expressément à l'exécution immédiate de la prestation numérique, l'Utilisateur reconnaît renoncer à son droit de rétractation de 14 jours prévu par l'article L221-18 du Code de la consommation.`,
  },
  {
    num: '11',
    title: 'Responsabilités',
    content: `11.1 Responsabilité de l'Éditeur
L'Éditeur met en œuvre tous les moyens raisonnables pour assurer la disponibilité, la sécurité et le bon fonctionnement de la Plateforme. Sa responsabilité est limitée aux dommages directs et prévisibles résultant d'une faute prouvée de sa part.

L'Éditeur n'est pas responsable des dommages indirects, pertes de données, pertes de revenus ou préjudices commerciaux subis par l'Utilisateur.

11.2 Responsabilité de l'Utilisateur
L'Utilisateur est seul responsable de l'utilisation qu'il fait de la Plateforme et des informations qu'il y publie. Il s'engage à ne pas utiliser la Plateforme à des fins illicites, frauduleuses ou contraires aux bonnes mœurs.

11.3 Force majeure
L'Éditeur ne pourra être tenu responsable en cas d'inexécution ou de retard d'exécution de ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil.`,
  },
  {
    num: '12',
    title: 'Données personnelles et confidentialité',
    content: `12.1 Responsable de traitement
L'Éditeur de PRIM'O est responsable du traitement des données personnelles collectées via la Plateforme, conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés.

12.2 Données collectées
• Données d'identification : nom, prénom, adresse email, mot de passe chiffré ;
• Données professionnelles : entreprise, rôle ;
• Données d'utilisation : historique des transactions, solde tokens, bons d'achat rachetés ;
• Données de paiement : gérées exclusivement par Stripe (non stockées sur nos serveurs).

12.3 Finalités
Les données sont collectées pour la gestion des comptes utilisateurs, la fourniture des services, la sécurisation de la Plateforme et la communication relative au service.

12.4 Durée de conservation
Les données sont conservées pendant toute la durée d'activité du compte, puis pendant 3 ans après sa suppression, sauf obligation légale contraire.

12.5 Droits des utilisateurs
Conformément au RGPD, tout Utilisateur dispose des droits d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition concernant ses données personnelles. Ces droits peuvent être exercés à l'adresse : support@primo.app

12.6 Sécurité
L'Éditeur met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données personnelles contre tout accès non autorisé, perte ou divulgation.`,
  },
  {
    num: '13',
    title: 'Propriété intellectuelle',
    content: `La Plateforme PRIM'O, son logo, son nom, son design, ses fonctionnalités, ses textes, ses graphismes et son code source sont la propriété exclusive de l'Éditeur et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.

Toute reproduction, représentation, modification, publication, transmission ou utilisation, totale ou partielle, de la Plateforme ou de son contenu, sans autorisation écrite préalable de l'Éditeur, est strictement interdite et constituerait une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la propriété intellectuelle.

L'Utilisateur ne bénéficie d'aucun droit de propriété intellectuelle sur la Plateforme. L'Éditeur lui accorde uniquement un droit d'usage personnel, non exclusif, non transférable et révocable.`,
  },
  {
    num: '14',
    title: 'Cookies et traceurs',
    content: `La Plateforme peut utiliser des cookies et technologies similaires à des fins de fonctionnement technique (maintien de la session), de sécurité et d'analyse anonyme des usages.

Aucun cookie publicitaire ou de pistage tiers n'est utilisé sans le consentement préalable de l'Utilisateur.

L'Utilisateur peut configurer son navigateur pour refuser les cookies. Certaines fonctionnalités de la Plateforme pourraient alors être limitées.`,
  },
  {
    num: '15',
    title: 'Modification des CGU-CGV',
    content: `L'Éditeur se réserve le droit de modifier les présentes CGU-CGV à tout moment afin de les adapter aux évolutions législatives, réglementaires ou fonctionnelles de la Plateforme.

Les modifications entrent en vigueur dès leur publication sur la Plateforme. L'Utilisateur sera informé de toute modification substantielle par email ou via une notification in-app. La poursuite de l'utilisation de la Plateforme après notification vaut acceptation des nouvelles CGU-CGV.`,
  },
  {
    num: '16',
    title: 'Résiliation',
    content: `16.1 Résiliation par l'Utilisateur
L'Utilisateur peut résilier son compte à tout moment depuis la section Paramètres → Supprimer mon compte. La résiliation entraîne la suppression immédiate du compte et la perte définitive du solde de tokens et de l'historique.

16.2 Résiliation par l'Éditeur
L'Éditeur peut suspendre ou résilier tout compte sans préavis en cas de :
• Violation des présentes CGU-CGV ;
• Comportement frauduleux ou abusif ;
• Non-paiement des sommes dues ;
• Inactivité prolongée du compte (plus de 24 mois consécutifs).

16.3 Effets de la résiliation
La résiliation entraîne la cessation immédiate de l'accès à la Plateforme. Les tokens non utilisés sont définitivement perdus et ne donnent droit à aucune compensation.`,
  },
  {
    num: '17',
    title: 'Droit applicable et juridiction compétente',
    content: `Les présentes CGU-CGV sont régies par le droit français.

En cas de litige relatif à l'interprétation, à l'exécution ou à la résiliation des présentes, et à défaut de résolution amiable dans un délai de 30 jours à compter de la notification du litige par la partie la plus diligente, les tribunaux compétents du ressort du siège social de l'Éditeur seront seuls compétents.

Conformément aux articles L611-1 et suivants du Code de la consommation, l'Utilisateur ayant la qualité de consommateur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige. La liste des médiateurs agréés est disponible sur le site du Ministère chargé de l'économie (https://www.economie.gouv.fr).`,
  },
];

export default function CGU() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  return (
    <div>
      {/* Sticky top bar */}
      <div className="faq-topbar faq-topbar--clean" style={{ justifyContent: 'space-between' }}>
        <h1 className="faq-topbar-title">CGU — CGV</h1>
        <button className="back-btn" onClick={() => navigate(from, { state: { reopenMenu: true } })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
      </div>

      <div className="cgu-content">
        <p className="cgu-update">Dernière mise à jour : {LAST_UPDATE}</p>
        <p className="cgu-intro">
          Bienvenue sur PRIM'O. En utilisant notre application, vous acceptez les présentes Conditions Générales d'Utilisation et de Vente. Veuillez les lire attentivement.
        </p>

        {articles.map((article) => (
          <div key={article.num} className="cgu-article">
            <h2 className="cgu-article-title">
              Article {article.num} — {article.title}
            </h2>
            <div className="cgu-article-body">
              {article.content.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}

        <div className="cgu-footer">
          <p style={{ marginBottom: 16 }}>
            Pour toute question relative aux présentes CGU-CGV, contactez-nous :
          </p>
          <div className="faq-contact-card">
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
