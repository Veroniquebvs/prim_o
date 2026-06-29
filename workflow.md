# Git Workflow — PRIM'O

## Branches

| Branche     | Rôle                                               |
| ----------- | -------------------------------------------------- |
| `main`      | Production-ready — protégée, aucun push direct     |
| `dev`       | Développement actif — intégration des features     |
| `feature/*` | Une branche par fonctionnalité, créée depuis `dev` |

---

## Historique des actions

### Initialisation du dépôt (main)

- Initialisation du dépôt Git
- Création de l'arborescence du projet (`/client`, `/server`, `/docker`, `/docs`)
- Ajout du `.gitignore`, `.env.example`, `README.md`
- Création des `Dockerfile` backend et frontend
- Création du `docker-compose.yml` (services : `api`, `client`, `postgres`)

### Création de la branche dev

```bash
git checkout -b dev
git push -u origin dev
```

---

### Branche `feature/init` — 2026-05-27 (fait par Loïc)

Création de la branche depuis `dev` :

```bash
git checkout dev && git pull origin dev
git checkout -b feature/init
```

**Initialisation du projet Node.js**

- Ajout d'un `package.json` racine avec npm workspaces (`server`, `client`)
- Scripts racine : `dev:server`, `dev:client`, `test:server`
- `package-lock.json` tracké dans git (requis par `npm ci` en CI/CD)

**Dépendances backend** (`server/`)

- Dépendances production déjà présentes : `express`, `pg`, `bcrypt`, `jsonwebtoken`, `dotenv`, `cors`, `helmet`, `stripe`
- Ajout : `express-validator`
- Dépendances dev déjà présentes : `jest`, `nodemon`, `supertest`
- Ajout : `eslint`, `prettier`, `eslint-config-prettier`, `@eslint/js`
- Configuration ESLint flat config (v10) + Prettier — scripts `lint`, `lint:fix`, `format`
- Configuration ESLint flat config (v10) + Prettier avec scripts `lint`, `lint:fix`, `format`

**Dépendances frontend** (`client/`)

- Ajout : `react-router-dom`, `axios`

**Structure backend** (`server/src/`)

- `routes/` : `index.js` + `auth`, `users`, `tokens`, `marketplace`
- `controllers/` : stubs fins pour `auth`, `users`, `tokens`, `marketplace`
- `services/` : stubs prêts à implémenter pour `auth`, `users`, `token`, `stripe`, `marketplace`
- `middleware/` : `verifyToken.js`, `roleGuard.js`, `errorHandler.js`

**Serveur Express** (`server/server.js`)

- CORS restreint à `CLIENT_URL`
- `express.raw()` monté sur `/api/tokens/webhook` avant `express.json()` (requis Stripe)
- Limite payload à 10 kb
- Handler 404 JSON
- Arrêt gracieux sur SIGTERM / SIGINT

**Fichiers d'environnement**

- `server/.env` créé depuis `server/.env.example` (ajout de `CLIENT_URL`)
- `client/.env` créé depuis `client/.env.example`
- Les deux sont gitignorés — valeurs réelles à renseigner manuellement

**Middleware `verifyToken`**

- Vérification JWT avec algorithme forcé `HS256` (protection contre attaque `alg: none`)
- Parsing strict du header `Authorization: Bearer <token>`
- Erreurs typées : `TokenExpiredError` retourne un message distinct (utile pour le refresh flow)
- 5 tests unitaires : token valide, header manquant, token malformé, token expiré, mauvais secret

---

## Mise en place pour un nouveau développeur

Commandes à lancer une seule fois après avoir cloné le projet :

```bash
# 1. Cloner le dépôt et se placer sur dev
git clone https://github.com/Loic2888/prim_o.git
cd prim_o
git checkout dev

# 2. Copier les fichiers d'environnement
cp server/.env.example server/.env
cp client/.env.example client/.env
# → Remplir les valeurs manquantes dans server/.env (JWT_SECRET, STRIPE_SECRET_KEY…)

# 3. Lancer l'environnement Docker
docker compose up --build
```

Les trois services démarrent automatiquement :

- Frontend → http://localhost:3000
- API → http://localhost:5000
- PostgreSQL → localhost:5433 (client externe type DBeaver, pgAdmin)

---

## Commandes quotidiennes

```bash
# Créer une feature branch depuis dev
git checkout dev
git pull origin dev
git checkout -b feature/nom-de-la-feature

# Fusionner une feature dans dev
# → ouvrir une Pull Request sur GitHub : feature/* → dev

# Fusionner dev dans main
# → ouvrir une Pull Request sur GitHub : dev → main
```

---

## Règles

- Ne jamais commiter directement sur `main`
- Toute feature passe par une branche `feature/*`
- Toute PR requiert une review avant merge
- Format des commits : `type(scope): description`
  - Exemples : `feat(auth): add JWT middleware`, `fix(tokens): fix balance computation`

## Mise en place de la couche Données (feature.data) 27/05/26

- Installation et configuration de Sequelize (ORM) relié à PostgreSQL.
- Création des 5 modèles de données principaux avec types stricts, valeurs par défaut et validations métiers :
  - `Company.js` : Gestion des entreprises (séparation de l'adresse en `street`, `zip_code`, `city`).
  - `User.js` : Gestion des comptes (rôles `admin`/`employer`/`employee` et mots de passe hashés).
  - `TokenTransaction.js` : Registre des jetons (avec support des ID de paiement Stripe).
  - `Voucher.js` : Catalogue des bons d'achat et gestion de disponibilité.
  - `Redemption.js` : Historique des échanges de bons et stockage des codes promos partenaires.
- Centralisation et configuration de la logique relationnelle (clés étrangères gérées par l'ORM) dans `src/models/index.js`.
- Configuration de l'environnement VS Code local avec **Prettier** (`Format On Save`) pour garantir l'uniformité du code de l'équipe.

## Mise en place de la couche SQL & Docker (feature.sql-init) 27/05/26

- Séparation stricte de l'infrastructure de la base de données (`init.sql`) et des données fictives de test (`seed.sql`).
- Écriture du script `init.sql` pour activer l'extension de génération d'UUID PostgreSQL (`uuid-ossp`).
- Écriture du script `seed.sql` avec un jeu de données complet pour le MVP (1 entreprise "TechCorp", 1 manager/employer, 1 employé avec solde de jetons, 3 bons d'achat en boutique et 1 transaction historique).
- Mise à jour du fichier `docker-compose.yml` pour monter les volumes SQL et forcer l'ordre d'exécution par Docker (`01_init.sql` puis `02_seed.sql`).

## Connexion DB, Middleware & Routes complètes (feature/backend-core) — 28/05/26 (fait par Loïc)

**Couche infrastructure**

- Création de la connexion PostgreSQL (`db/index.js`)
- Création du middleware `authMiddleware` (vérification JWT)
- Création du `roleGuard` (gestion des rôles `employer` / `employee` / `admin`)

**Phase 05 — Routes Auth**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

**Phase 06 — Routes Tokens**

- `POST /api/tokens/allocate`
- `GET /api/tokens/balance/:userId`
- `GET /api/tokens/transactions`
- `GET /api/tokens/transactions/:id`
- `POST /api/tokens/webhook` (Stripe)

**Phase 07 — Routes Marketplace / Vouchers**

- `GET /api/marketplace/items`
- `GET /api/marketplace/items/:id`
- `POST /api/marketplace/redeem` (transaction atomique)
- `POST /api/marketplace/items` (admin)
- `PUT /api/marketplace/items/:id` (admin)
- `DELETE /api/marketplace/items/:id` (admin)
- `GET /api/marketplace/orders`

**Phase 08 — Routes Users**

- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id` (admin)
- `GET /api/users/:id/history`

## Intégration Stripe (feature/stripe-payment-integration) — 29/05/26 (fait par Véronique)

- Création du compte Stripe test et récupération des clés (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Installation et configuration du SDK Stripe côté backend
- Implémentation de la création de `PaymentIntent`
- Implémentation de la route webhook `POST /api/tokens/webhook`
- Test du flux complet avec la carte test Stripe (`4242 4242 4242 4242`)

## Tests E2E backend complets — 02/06/26 (fait par Loïc)

Validation complète du backend via le script `server/tests/e2e/practical-test.js`.

**Résultat : 57/57 tests passés — 0 échec — 0 ignoré**

| Domaine                                                      | Tests validés |
| ------------------------------------------------------------ | :-----------: |
| Infrastructure (health check, middlewares auth)              |       4       |
| Companies (création, validation, lecture, mise à jour)       |       7       |
| Auth (register, login, me, refresh, logout)                  |      12       |
| Users (liste, filtre, détail, mise à jour, suppression)      |       6       |
| Marketplace — Vouchers (CRUD admin, liste, détail)           |       8       |
| Marketplace — Rachat (redeem, solde déduit, historique)      |       5       |
| Stripe (PaymentIntent, confirmation, webhook, solde crédité) |       4       |
| Tokens — Allocation + contrôle de rôle et de solde           |       5       |
| Tokens — Transactions (liste, filtre, détail, historique)    |       4       |
| Auth — Logout et suppression de compte                       |       2       |

**Points clés vérifiés :**

- Guards de rôle (403) contrôlés sur toutes les routes sensibles
- Paiement Stripe testé avec une clé réelle (`tok_visa` — carte `4242 4242 4242 4242`)
- Logique transactionnelle : solde insuffisant → 402/403, voucher déjà utilisé → 403
- Webhook Stripe : 500 tokens correctement crédités sur la company après `payment_intent.succeeded`

Pour relancer les tests :

```bash
node server/tests/e2e/practical-test.js
```

## Développement frontend — UI & fonctionnalités MVP — 04/06/26 (fait par Loïc & Véro)

**Navbar mobile (bottom pill) & desktop (top bar)**

- Navbar mobile : pilule flottante en bas, fond sombre/transparent, icônes blanches, icône active en vert
- Navbar desktop (≥1024px) : barre horizontale noire en haut avec liens de navigation
- Navbar **role-aware** : boutons différents selon le rôle (employer, employee, admin)
- Admin : Entreprises · Catalogue · Dashboard · Bons d'achat
- Menu slide-up : Paramètres / Service client / Déconnexion

**Pages créées**

- `Historique.tsx` — 3 onglets : Mes tokens, Mes achats, Mon équipe (employer)
- `Panier.tsx` — bons sauvegardés, rachat individuel ou "Acheter le panier"
- `Service.tsx` — page support / contact
- `Abonnement.tsx` — plans de tokens mensuels (Starter / Growth / Scale), stub Stripe
- `admin/AdminBons.tsx` — 3 onglets : Gérer (CRUD bons), Historique des achats, Top ventes
- `admin/AdminStats.tsx` — KPIs globaux (entreprises, bons, rachats, taux)

**Catalogue redesigné**

- Carousels horizontaux par catégorie (Tech, Alimentation, Divertissement, Sport, Beauté, Mode, Maison)
- Catégorie "Populaires" en premier (6 bons les moins chers)
- Recherche plein texte + chips de filtre par catégorie
- Bouton bookmark pour sauvegarder dans le panier

**Top bar mobile**

- Badge token (solde de l'utilisateur) en haut à droite
- Bouton "+ Acheter" pour les employeurs → page abonnement

**Corrections de bugs**

- Inscription employeur : champs `email`, `street`, `zip_code`, `city` rendus optionnels dans le modèle Company et la route companies (MVP self-onboarding avec juste le nom)
- Route `GET /catalogue` ouverte à tous les rôles authentifiés (plus restreinte employee)
- `company_id` dans auth routes repassé en `isUUID()` (les IDs Company sont des UUID)
- Couleur des boutons actifs : texte blanc immédiatement au clic (fix `:focus` override)

**Backend — nouveaux endpoints admin**

- `GET /api/marketplace/admin/vouchers` — tous les bons avec compteur rachats
- `GET /api/marketplace/admin/history` — tous les rachats avec user + voucher joints
- `POST/PUT/DELETE /api/marketplace/items` — CRUD bons accessibles depuis AdminBons

---

## Initialisation du frontend React/TypeScript — 04/06/26 (fait par Loïc)

**Étape 54-58 — Setup React + TypeScript (Vite)**

Dépendances installées (`client/package.json`) :

- `react-router-dom` v7, `axios` (déjà présents)
- `@stripe/stripe-js`, `@stripe/react-stripe-js` (ajoutés)

Structure créée sous `client/src/` :

| Fichier                         | Rôle                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `types/index.ts`                | Types partagés : `User`, `Company`, `Voucher`, `TokenTransaction`, `Redemption`, `ApiResponse` |
| `services/api.ts`               | Instance Axios avec intercepteurs : injection du Bearer token + refresh automatique sur 401    |
| `services/auth.service.ts`      | Appels API : `login`, `register`, `logout`, `me`                                               |
| `context/AuthContext.tsx`       | `AuthProvider` + hook `useAuth` — restaure la session depuis `localStorage` au montage         |
| `components/ProtectedRoute.tsx` | Guard de route : redirige vers `/login` si non authentifié, vers `/` si rôle insuffisant       |
| `App.tsx`                       | `BrowserRouter` + toutes les routes avec guards de rôle                                        |
| `vite-env.d.ts`                 | Déclaration des types Vite (`import.meta.env`)                                                 |

**Pages stub créées :**

- `pages/HomePage.tsx` — landing publique
- `pages/LoginPage.tsx` — formulaire login avec redirection post-connexion
- `pages/RegisterPage.tsx` — formulaire d'inscription (employer / employee)
- `pages/employer/EmployerDashboard.tsx` — protégée `employer`
- `pages/admin/AdminDashboard.tsx` — protégée `admin`
- `pages/employee/Catalogue.tsx` — protégée `employee`
- `pages/employee/Profil.tsx` — protégée (tout rôle authentifié)
- `pages/employee/Parameters.tsx` — protégée (tout rôle authentifié)

**Routage :**

- `/` → `HomeRedirect` : affiche la landing si non connecté, redirige selon le rôle sinon
- Routes privées via `<ProtectedRoute allowedRoles={[...]}>`, redirection propre en cas de rôle invalide
- `tsc --noEmit` : **0 erreur TypeScript**

---

## Navigation & UX — 05/06/26 (fait par Loïc)

**Compte employé créé en base**

- Insertion directe via `docker exec` : Loic / loic.88@gmail.com / rôle `employee` / entreprise Leclerc

**Fil d'activité temps réel (page Historique)**

- Nouvelle section sous les onglets : liste des allocations de tokens dans l'entreprise, polling toutes les 5 s
- Nouvelles entrées animées (slide-in) pendant 1,8 s
- Backend : filtre `type` ajouté à `listTransactions`

**Refonte du menu "Voir plus" (BottomNav & TopNav)**

- Bouton "Menu" renommé **"Voir plus"**, icône 3 points, placé en dernière position à droite
- Menu sheet mobile avec 6 entrées + chevron : Paramètres · Mes informations personnelles · Changer mon mot de passe · Aide · Voir les CGU · Nous noter
- Même liste dans le dropdown TopNav desktop
- Menu sheet s'ouvre **au-dessus** de la navbar (z-index revu, padding-bottom overlay)
- Navigation depuis le menu : `state.from` + `state.reopenMenu` pour restaurer le menu au retour

**Page Paramètres** (`/parametres`)

- Toggle e-mail offres, toggle notifications (localStorage)
- Sélecteur de langue Français / English (localStorage)
- Suppression de compte : confirmation inline → `DELETE /api/users/:id` → logout

**Page Mes informations** (`/mes-informations`)

- Champs Prénom, Nom, Entreprise (lecture seule, fetch API), Email
- Bouton Enregistrer grisé, actif dès qu'un champ change

**Page Changer mon mot de passe** (`/mot-de-passe`)

- Champs avec œil afficher/masquer
- Prérequis en temps réel (8 car., chiffre, maj., min., spécial) — règles cochées au fur et à mesure
- Indicateur ✓/✗ sur la confirmation, bouton actif quand tout est valide

**Page Aide** (`/service`)

- Texte d'intro + 2 cards cliquables : FAQ et Nous contacter

**Page FAQ** (`/faq`)

- Barre sticky avec ← Retour
- 5 sections accordéon, 17 questions/réponses
- Section contact en bas : email + LinkedIn, Instagram, X

**Page CGU-CGV** (`/cgu`)

- Barre sticky avec ← Retour
- 17 articles complets (objet → droit applicable), texte justifié
- Section contact centrée en bas : email + réseaux sociaux

**Page Pour toi** (`/pour-toi`)

- Remplace l'ancienne page Profil dans la navbar (mobile + desktop), bouton renommé **"Pour toi"**, placé en premier à gauche
- Carousel horizontal "Offres du moment" (8 bons les moins chers)
- Section "Mes bons d'achat" : liste des rachats de l'utilisateur avec partenaire, titre, date, code promo

**Page Panier**

- Bouton **"Acheter le panier"** déplacé hors de la carte, toujours visible, grisé si panier vide

**Design global**

- Barre `.page-header` : fond vert primary, rayures diagonales subtiles, titre en vert très clair (`#d4f5f3`), sous-titre blanc 75%
- Titres centrés sur toutes les pages
- Bouton ← Retour adapté (blanc sur fond vert)
- Barre `.faq-topbar` sticky sur FAQ, CGU, Nous noter

---

## [feature/update-registration-form] - Système d'inscription dynamique 05/05/26 (Véronique)

### Description

Cette branche améliore le processus d'onboarding des salariés en permettant aux employeurs de générer, d'imprimer ou de télécharger une affiche d'inscription personnalisée via un QR Code.

### Modifications apportées

#### 1. Composant `PrintableQRCode.tsx`

- **Génération de QR Code :** Utilisation de `qrcode.react` pour créer un lien d'inscription unique incluant l'ID de l'entreprise (`companyId`).
- **Fonctionnalité d'impression :** Intégration de `react-to-print` avec une gestion correcte des `useRef` pour imprimer uniquement la zone dédiée à l'affiche.
- **Fonctionnalité de téléchargement :** Ajout d'une méthode pour convertir le composant SVG en fichier image (PNG) afin de permettre une diffusion dématérialisée.

#### 2. EmployerDashboard.tsx

- Intégration conditionnelle du composant `PrintableQRCode` pour le rendre accessible aux employeurs connectés.
- Nettoyage du flux de données pour s'assurer que les informations de l'entreprise (`companyId`, `companyName`) sont disponibles avant le rendu du QR Code.

### Notes de test & validation

- **Validation du lien :** Vérifié via console pour s'assurer que `registrationUrl` est correctement formaté.
- **Test en navigation privée :** Confirmation que le lien redirige correctement vers le formulaire d'inscription sans conflit avec la session employeur actuelle.
- **Correctifs techniques :** \* Résolution de l'erreur "There is nothing to print" par l'ajustement de la référence DOM (`contentRef`).
  - Gestion de l'encodage des caractères spéciaux lors de la sérialisation du SVG pour le téléchargement.

### État actuel

- Branche stable.
- Fonctionnalités d'impression et de téléchargement opérationnelles.

---

## Marketplace, favoris, panier & admin tokens — 08/06/26 (fait par Loïc)

**Système de favoris (server-side)**

- Nouveau modèle `Favorite.js` (UUID, `user_id`, `voucher_id`, index unique)
- Route `GET /api/favorites` + `POST /api/favorites/toggle` avec `verifyToken`
- Hook `useFavorites.ts` côté client (optimiste : mise à jour locale immédiate, rollback si erreur)
- Icône bookmark remplacée par un cœur sur toutes les cartes voucher
- `favorite_count` agrégé par voucher (COUNT + GROUP BY Sequelize) dans `listItems`

**Carousels "Pour toi"**

- Carousel **"Favoris"** : priorité aux bons `is_featured` (flag admin), puis les plus aimés — max 50
- Carousel **"Offres de la semaine"** : bons ajoutés il y a moins de 7 jours, triés par date
- Carousel **"Offres du moment"** : triés par `favorite_count` DESC puis date DESC
- Correction `createdAt: 'created_at'` dans le modèle Voucher (Sequelize v6 — `toJSON()` renvoyait le nom camelCase)

**Catalogue — améliorations**

- Recherche par partenaire : autocomplete `startsWith` (jusqu'à 6 suggestions)
- Dropdown suggestions : fond blanc explicite (`#ffffff`), z-index 500 (corrige transparence)
- Bouton **"Plus d'offres"** sur chaque carousel → page `/catalogue/categorie/:slug`
- `CategorieDetail.tsx` (nouvelle page) : pagination 30/page, triée par date desc
- Carousels : max 20 offres — cœurs en priorité, puis les plus récentes pour compléter
- Grille mobile : 2 colonnes ; desktop (≥1024px) : 3 colonnes

**Panier (cart)**

- Sur chaque carte voucher : si solde insuffisant → bouton **"+ Panier"** (`.btn-outline`) à la place du "Racheter" désactivé
- État "✓ Sauvé" visible sur le bouton quand l'offre est déjà dans le panier
- Badge numéroté sur le lien "Panier" dans la Navbar (via `useCart` localStorage)
- Compatible Catalogue, CategorieDetail et PourToi

**Champ `promo_code` sur les bons d'achat**

- Colonne `promo_code` (STRING, unique, nullable) ajoutée au modèle Voucher
- Formulaire de création admin : champ obligatoire "Code promo partenaire"
- Page de détail admin : champ éditable + sauvegarde via `updateItem`
- Liste AdminBons : nouvelle colonne "Code promo" avec le tag stylé
- `redeem` service : utilise `voucher.promo_code` au lieu d'un UUID aléatoire
- `listItems` et `GET /items/:id` : `promo_code` retiré des réponses employé (sécurité)

**Admin — Donner des tokens aux entreprises**

- Backend : `POST /api/companies/:id/tokens` — transaction PostgreSQL avec row-level lock, `TokenTransaction` type `admin_grant`
- Frontend : carte "🪙 Donner des tokens" dans `AdminDashboard` — sélecteur entreprise avec adresse (nom + rue + ville), champ montant, feedback succès/erreur, mise à jour du solde en temps réel

**Admin — Bons d'achat**

- Liste triée alphabétiquement par partenaire (`localeCompare fr`)
- Toggle `is_featured` (ON/OFF) dans la page de détail d'un bon → priorité dans le carousel Favoris, indépendamment du nombre de cœurs

**Résolution de conflit Git**

- `git pull origin dev` : conflits sur `TopNav.tsx` et `globals.css` avec les changements de Véronique
- Résolution : ordre des liens admin (Tableau de bord en premier), variables CSS pour btn-bookmark, colonnes de grille explicites à 640px

---

## [feature/update-registration-form] - Système d'inscription dynamique 08/06/26 (Vero)

### Description

Cette branche améliore le processus d'onboarding des salariés en permettant aux employeurs de générer, d'imprimer ou de télécharger une affiche d'inscription personnalisée via un QR Code.

### Modifications apportées

#### 1. Composant `PrintableQRCode.tsx`

- **Génération de QR Code :** Utilisation de `qrcode.react` pour créer un lien d'inscription unique incluant l'ID de l'entreprise (`companyId`).
- **Fonctionnalité d'impression :** Intégration de `react-to-print` avec une gestion correcte des `useRef` pour imprimer uniquement la zone dédiée à l'affiche.
- **Fonctionnalité de téléchargement :** Ajout d'une méthode pour convertir le composant SVG en fichier image (PNG) afin de permettre une diffusion dématérialisée.

#### 2. EmployerDashboard.tsx

- Intégration conditionnelle du composant `PrintableQRCode` pour le rendre accessible aux employeurs connectés.
- Nettoyage du flux de données pour s'assurer que les informations de l'entreprise (`companyId`, `companyName`) sont disponibles avant le rendu du QR Code.

### Notes de test & validation

- **Validation du lien :** Vérifié via console pour s'assurer que `registrationUrl` est correctement formaté.
- **Test en navigation privée :** Confirmation que le lien redirige correctement vers le formulaire d'inscription sans conflit avec la session employeur actuelle.
- **Correctifs techniques :** \* Résolution de l'erreur "There is nothing to print" par l'ajustement de la référence DOM (`contentRef`).
  - Gestion de l'encodage des caractères spéciaux lors de la sérialisation du SVG pour le téléchargement.

### État actuel

- Branche stable.
- Fonctionnalités d'impression et de téléchargement opérationnelles.

---

## UX & fonctionnalités admin — 10/06/26 (fait par Loïc)

**Centrage des pages "Voir plus"**

- `.param-list` et `.cgu-content` : `margin: auto` ajouté dans `globals.css`
- `MesInformations`, `MotDePasse`, `Service` : `margin: '0 auto'` ajouté sur le container `maxWidth`
- `Avis` : wrappé dans un div centré `maxWidth: 520`

**Modale de confirmation — Allocation de tokens**

- `TransferForm.tsx` : le clic "Allouer" n'envoie plus directement
- Affichage d'une modale overlay avec récap (avatar initiales, nom destinataire, montant badge, motif)
- "Confirmer" → envoi réel | "Annuler" (ou clic en dehors) → retour au formulaire intact

**Déduction de tokens admin**

- Backend : nouvelle route `POST /api/tokens/admin/deduct` (`verifyToken` + `roleGuard('admin')`)
  - `target: 'company'` → déduit de `companies.token_balance`
  - `target: 'employee'` → déduit de `users.token_balance` (user doit appartenir à la company)
  - Transaction PostgreSQL atomique (BEGIN / COMMIT / ROLLBACK)
  - Enregistrement dans `TOKEN_TRANSACTIONS` avec `type: reason || 'admin_deduct'`
- Frontend : card "Déduire des tokens" dans `AdminCompanyDetail`
  - Deux tabs **🏢 Entreprise** / **👤 Employé**
  - Mode Entreprise : affiche le nom + solde actuel (lecture seule)
  - Mode Employé : select de tous les membres de l'entreprise avec leur solde
  - Confirmation inline (récap cible / montant rouge / motif) avant envoi
  - Refresh automatique des soldes après déduction

**Corrections header admin**

- `AdminStats` (`/admin/stats`) : "Tableau de bord" et "Vue d'ensemble" maintenant dans un wrapper `<div>` → empilés verticalement et centrés
- `AdminDashboard` (`/admin/dashboard`) : restauré "Entreprises" / "Liste des entreprises" (écrasé par erreur)

---

## [feature/entry_date] - Gestion de la date d'entrée des salariés 11/06/26 (Vero)

### Description

Cette branche ajoute la gestion de la date d'entrée des salariés afin de permettre aux employeurs de renseigner cette information lors de la validation d'un nouveau collaborateur et de la modifier ultérieurement depuis sa fiche détaillée.

Elle renforce également la sécurité des accès entre entreprises en limitant la consultation et la modification des utilisateurs à leur propre société.

### Modifications apportées

#### 1. Backend (`users.service.js`)

- Renforcement de l'isolation multi-entreprises via `company_id`.

- Modification des méthodes :
  - `getById(id, companyId)`
  - `update(id, body, companyId)`
  - `activateUser(id, companyId, entry_date)`

- Remplacement des recherches par identifiant seul (`findByPk`) par des recherches sécurisées :

```js
where: {
  id,
  company_id: companyId
}
```

#### 2. Backend (`users.controller.js`)

- Transmission systématique de `req.user.company_id` aux services concernés.
- Adaptation de `activateUser()` afin de recevoir :

```json
{
  "entry_date": "YYYY-MM-DD"
}
```

- Mise à jour de la route de validation des salariés pour enregistrer simultanément :
  - le changement de statut (`pending → active`) ;
  - la date d'entrée.

#### 3. Backend (`users.routes.js`)

- Ajout de la validation :

```js
body("entry_date").optional().isISO8601();
```

- Création de la route :

```http
PATCH /users/:id/entry-date
```

permettant la modification ultérieure de la date d'entrée.

#### 4. EmployerDashboard.tsx

- Ajout d'un champ calendrier pour chaque salarié en attente de validation.
- Mise en place d'un état local :

```ts
const [entryDates, setEntryDates] = useState<Record<string, string>>({});
```

- Transmission de la date sélectionnée lors de la validation :

```ts
userService.activate(id, entryDates[id]);
```

#### 5. user.service.ts

- Modification de :

```ts
activate(id, entry_date?)
```

afin d'envoyer :

```ts
{
  entry_date;
}
```

- Ajout de la méthode :

```ts
updateEntryDate(id, entry_date);
```

pour communiquer avec :

```http
PATCH /users/:id/entry-date
```

#### 6. EmployeeDetail.tsx

- Ajout d'une section « Date d'entrée » sur la fiche salarié.
- Possibilité pour l'employeur :
  - de visualiser la date d'entrée actuelle ;
  - de la modifier ;
  - de sauvegarder les changements directement depuis l'interface.

### Notes de test & validation

- Vérification de la transmission correcte de `entry_date` entre le frontend et le backend.

- Validation du changement de statut d'un salarié (`pending → active`).

- Contrôle de la persistance de la date d'entrée après rechargement de la page.

- Vérification des protections multi-entreprises :
  - consultation d'un salarié ;
  - modification d'un salarié ;
  - activation d'un salarié.

- Correction d'une erreur de syntaxe dans `users.routes.js` (virgule manquante dans la route `PATCH /:id/activate`).

### État actuel

- Branche stable.
- Date d'entrée enregistrée lors de l'activation d'un salarié.
- Modification ultérieure possible depuis la fiche détaillée.
- Isolation des données entre entreprises renforcée.
- Backend et frontend synchronisés.

---

## Déploiement Render & Vercel — 11/06/26 (fait par Loïc)

**Mise en production de l'application**

- Fork du dépôt de Véronique et déploiement à partir du fork
- Déploiement du backend sur **Render**
- Déploiement du frontend sur **Vercel**

---

### 🗓️ 15 Juin 2026 : Optimisations UI/UX et corrections de logique

**Objectifs :** Améliorer l'interface utilisateur (UI) du catalogue et sécuriser les calculs financiers côté employeur.

#### 🎨 Interface Utilisateur (UI/UX) - 15/06/26 (fait par Véro)
*   **Alignement des titres :** Centralisation des titres de page pour une meilleure lisibilité et uniformité visuelle.
*   **Bouton "Retour" :** 
    *   Refonte du style : passage en fond blanc avec texte contrasté.
    *   Positionnement fixe à droite dans le header pour une meilleure ergonomie mobile/desktop.
*   **Style des offres :** Restructuration visuelle des cartes d'offres :
    *   Amélioration de la hiérarchie typographique (titre mis en avant, description plus lisible).
    *   Ajustement des espacements (padding/margin) pour aérer le contenu.

#### ⚙️ Logique & Backend
*   **Correction du panier :**
    *   Audit et correction de l'algorithme de calcul du solde total du panier côté employeur.
    *   Assurance de la cohérence des totaux lors de l'ajout/suppression d'offres.

---

## UX, polissage & intégration Stripe complète — 16/06/26 (fait par Loïc)

**Polissage UI**

- Suppression de la fenêtre "Solde disponible" redondante sur la page Panier (déjà affiché en haut à droite)
- Remplacement du cadran horloge par un logo token Prim'O (cercle jaune `#F5C518` + lettre **P** verte) dans la TopNav desktop et la barre mobile (`Layout.tsx`)
- Alignement à gauche du titre "Détail de l'offre" sur `VoucherDetail.tsx`
- Correction du style des boutons ← Retour sur les pages "Voir plus" (Paramètres, Mes informations, Mot de passe, CGU, Aide, Nous noter) : `.page-header .back-btn` unifié dans `globals.css` — transparent, texte blanc, `margin-left: auto`
- Ajout d'un bouton ← Retour (chevron vert + `var(--primary)`) dans les modales "Attribution automatique" et "Créer un employé" sur `EmployerDashboard`
- Remplacement de l'ID entreprise par le nom de l'entreprise dans la modale "Créer un employé"
- Suppression de la fenêtre "Solde actuel" redondante sur la page Abonnement

**Page de chargement (SplashScreen)**

- Création de `SplashScreen.tsx` : fond blanc, logo centré, dégradé vert léger en haut
- Branché sur `ProtectedRoute` (remplace le texte "Chargement…")
- Logo `logo_page-chargement.png` copié dans `public/` pour accès direct

**Œil afficher/masquer le mot de passe**

- Ajout d'un toggle œil sur le champ mot de passe de `LoginPage.tsx`
- SVG œil barré / ouvert selon l'état, couleur `var(--text-muted)`

**Intégration Stripe complète (abonnements mensuels récurrents)**

- Migration de `PaymentIntent` vers **Stripe Subscription** (vrai prélèvement mensuel automatique)
- Backend `stripe.service.js` : `createOrUpdateSubscription()` — crée un Stripe Customer + Subscription avec `price_data` inline, annule l'ancien abonnement si changement de plan
- Backend : nouveau webhook `invoice.payment_succeeded` (remplace `payment_intent.succeeded`) — crédit des tokens via transaction PostgreSQL atomique
- Nouveaux endpoints : `POST /api/tokens/subscribe` (planId) · `GET /api/tokens/subscription`
- Modèle `Company` : 5 nouvelles colonnes (`stripe_customer_id`, `stripe_subscription_id`, `subscription_plan`, `subscription_status`, `subscription_next_billing`) — ajout automatique via `sync({ alter: true })`
- Frontend `Abonnement.tsx` : 4 états — chargement · abonnement actif (plan + date prochain prélèvement + changement de plan) · sélection · paiement · succès
- Polling du solde toutes les 2 s après paiement (le webhook crédite de façon asynchrone)
- `PaymentElement` configuré : carte bancaire uniquement (`payment_method_types: ['card']`, `wallets: { link: 'never' }`)
- `docker-compose.yml` : `env_file: ./client/.env` pour injecter `VITE_STRIPE_PUBLIC_KEY` dans le conteneur frontend
- Masquage du badge test-mode Stripe via CSS global (`#stripe-badge-iframe`)

---

## TODO

- [ ] **Nettoyer les contraintes UNIQUE dupliquées sur `users.email`** — la table contient ~22 index `users_email_keyX` identiques, probablement générés par des migrations Sequelize rejouées en boucle. À corriger via une migration qui supprime les doublons et ne conserve qu'un seul `UNIQUE` sur `email`.

---

## Astuces & Résolution de problèmes (Database)

### Comment forcer Docker à recharger les fichiers init.sql et seed.sql ?

PostgreSQL sous Docker n'exécute les scripts du dossier `initdb.d` **que la toute première fois** où la base de données est créée. Si des modifications sont apportées à `init.sql` ou `seed.sql`, relancer un simple `docker compose up` ne les prendra pas en compte.

Pour forcer la réinitialisation complète et propre avec les nouvelles graines (seeds), il faut vider le volume de stockage avec cette commande :

```bash
# Éteindre les conteneurs et détruire le volume de stockage local
docker compose down -v

# Relancer l'environnement à neuf (les scripts SQL seront rejoués)
docker compose up --build
```

---

## Comptes de démonstration (base Render — production)

Mot de passe pour tous les comptes : `admin123456789`

### Admin
| Email | Rôle |
|---|---|
| admin123@admin.com | admin |

### Employeurs
| Email | Entreprise |
|---|---|
| pierre.dupont@leclerc-demo.fr | Leclerc |
| marie.garcia@aldi-demo.fr | Aldi |
| paul.thomas@amazon-demo.fr | Amazon |

### Managers (Leclerc — seed local, mot de passe : `admin123`)
| Email | Équipe |
|---|---|
| sophie.martin@leclerc.fr | Équipe Rayon Frais |
| thomas.dubois@leclerc.fr | Équipe Caisse |
| isabelle.bernard@leclerc.fr | Équipe Drive |

### Employés (Leclerc — seed local, mot de passe : `admin123`)
| Email | Équipe |
|---|---|
| lucas.petit@leclerc.fr | Rayon Frais |
| emma.leroy@leclerc.fr | Rayon Frais |
| nathan.moreau@leclerc.fr | Rayon Frais |
| chloe.simon@leclerc.fr | Rayon Frais |
| antoine.laurent@leclerc.fr | Rayon Frais |
| camille.michel@leclerc.fr | Caisse |
| raphael.garcia@leclerc.fr | Caisse |
| lea.david@leclerc.fr | Caisse |
| hugo.bertrand@leclerc.fr | Caisse |
| manon.roux@leclerc.fr | Caisse |
| alexis.vincent@leclerc.fr | Drive |
| ines.fournier@leclerc.fr | Drive |
| maxime.morel@leclerc.fr | Drive |
| julie.girard@leclerc.fr | Drive |
| theo.andre@leclerc.fr | Drive |

### Employés (base Render — production, mot de passe : `admin123456789`)
| Email | Entreprise |
|---|---|
| sophie.martin@leclerc-demo.fr | Leclerc |
| lucas.bernard@leclerc-demo.fr | Leclerc |
| emma.dubois@leclerc-demo.fr | Leclerc |
| hugo.petit@aldi-demo.fr | Aldi |
| camille.leroy@aldi-demo.fr | Aldi |
| nathan.moreau@aldi-demo.fr | Aldi |
| lea.simon@amazon-demo.fr | Amazon |
| tom.laurent@amazon-demo.fr | Amazon |
| jade.michel@amazon-demo.fr | Amazon |


---

## Session du 17 Juin 2026 — Refonte UI Pages Manager & Employé

**Auteur :** Loïc Cerqueira  
**Branche :** `feat/front`

### Objectif
Intégrer la maquette client (moodboard mobile) pour les pages **Pour Toi (Manager)** et **Pour Toi (Employé)**.

### Modifications effectuées

#### `client/src/pages/PourToi.tsx`
- **Hero Manager** (dark navy) : logo prim'O en Pacifico, pièce `token-logo-SF.png`, fenêtre stock tokens fond gris foncé avec contour blanc et `translateY(55px)` pour chevaucher la coupure bleu/blanc, nom d'équipe au-dessus de l'image
- **Hero Employé** (teal) : greeting "Bonjour, [Prénom] !", pièce centrée, bulle blanche avec solde tokens
- **Layout 2 colonnes** dans les deux heroes : gauche réservée aux avatars (fournis par le client), droite avec pièce + solde
- **Fil d'activité** : récupération via `userService.getHistory()` des derniers tokens reçus (page employé)
- **Carousels** : offres du moment, favoris, nouveautés (page employé)
- **Cards collaborateurs** : avatar (initiales), nom, solde tkn, bouton "+ Envoyer" (page manager)
- **Quick send modal** : envoi instantané de tokens depuis une card collaborateur
- **Panneau Ajouter/Créer** collaborateur avec deux modes : "Depuis la liste" / "Créer un profil"

#### `client/src/components/Layout.tsx`
- Ajout détection des "hero pages" (`/pour-toi`, `/employer/dashboard`)
- Sur ces pages : masquage de la `top-bar` mobile (blanc avec tokens) pour que le hero couvre toute la largeur dès le haut

#### `client/src/styles/globals.css`
- Classes `.pour-toi-hero` et `.manager-hero` : gradients teal/navy, responsive
- Suppression des rayures diagonales (`::before`)
- Classe `.app-main--hero` : `padding-top: 0` pour coller le hero au bord supérieur
- Classes `.collab-card` et `.activity-item`

#### Infrastructure Docker
- Résolution du bug `Cannot find module 'vite-plugin-pwa'` : volume anonyme `node_modules` obsolète → `docker compose rm -f client` + `docker volume prune -f` + `docker compose build --no-cache client`

---
## Refonte des Historiques, Tableaux de bord & Admin (feature/improve_front) — 23/06/26 au 24/06/26 (fait par Véronique)

**Suivi d'activité et Historique complets (23/06/26)** :
- Implémentation du tableau de bord complet d'historique de l'utilisateur (`Historique.tsx`).
- Mise en place du flux d'activité en temps réel pour l'employeur et le manager (`PourToi.tsx`).
- Création de la fiche détaillée des salariés (`EmployeeDetail.tsx`) et des managers (`ManagerDetail.tsx`) pour permettre aux employeurs de suivre les soldes individuels et l'historique d'équipe.
- Création des routes et services backend pour les managers (`manager.routes.js`, `manager.service.js`).

**Sécurisation des Jetons, Allocations & Administration (24/06/26)** :
- Liaison complète du tableau de bord d'administration système (`AdminDashboard.tsx`) pour gérer les entreprises abonnées.
- Implémentation de la page de statistiques des motifs d'attribution (`AdminStatMotifs.tsx`).
- Création de la page de détail des bons d'achat côté collaborateur (`VoucherDetail.tsx`).
- Création de la vue de gestion détaillée du collaborateur côté manager (`CollaborateurDetail.tsx`).
- Développement des endpoints et des services d'administration des entreprises côté serveur (`companies.routes.js`, `companies.service.js`, `companies.controller.js`).
- Sécurisation et optimisation de la logique d'allocation transactionnelle PostgreSQL (ACID) dans `token.service.js`.


---

## Système d'avatars & polissage UI — 24/06/26 (fait par Loïc)

**Branche :** `dev`

### Avatars — mise en place complète

#### Assets
- Copie des fichiers `av_1.png` à `av_6.png` depuis `client/dist/assets/` vers `client/public/assets/` (servis statiquement par Vite à `/assets/av_N.png`)
- Rognage automatique du whitespace transparent autour de chaque personnage via un script Python/PIL (`getbbox()` + 4 px de marge)
- Redimensionnement de tous les avatars aux dimensions de `av_1.png` (218 × 699 px) pour une taille homogène dans le picker
- `av_3.png` recadré depuis l'original (`dist/`) en mettant à l'échelle sur la hauteur (au lieu de la largeur) pour conserver la même taille de personnage que les autres

#### Utilitaires (`client/src/utils/avatar.ts`)
- `getAvatarUrl(userId)` : avatar déterministe basé sur un hash de l'ID
- `getStoredAvatar(userId)` : lit le choix en localStorage, retourne `av_1` par défaut (plus d'aléatoire)
- `saveAvatar(userId, index)` : persiste le choix en localStorage

#### Composant partagé (`client/src/components/AvatarPickerModal.tsx`)
- Bottom-sheet mobile (position fixed, alignItems flex-end) avec grille 3 colonnes
- Sélection mise en évidence (bordure + scale), fermeture au clic en dehors

#### Intégration dans les pages
- **`PourToi.tsx` (manager & employé)** : avatar `position: absolute` dans le hero (ne pousse pas le contenu), cliquable, ouvre le picker
- **`EmployerDashboard.tsx`** : même approche dans le hero employeur
- **`ManagerDetail.tsx`, `CollaborateurDetail.tsx`** : avatar en lecture seule (pas de picker)
- **`BottomNav.tsx`, `MesInformations.tsx`, `Profil.tsx`** : avatar affiché en cercle
- Tous les cercles à initiales remplacés par des avatars (collab list manager, modales quick-send)

#### Persistance
- `useState(1)` + `useEffect([user?.id])` : lecture du localStorage après chargement de l'auth (corrige le bug où `useState` lazy s'exécutait avant que `user` soit disponible)
- `String(user.id)` utilisé partout pour garantir la cohérence de la clé localStorage

#### Affichage du visage dans les petits cercles
- `objectFit: 'cover'` + `objectPosition: 'top center'` sur tous les avatars circulaires → montre la tête/visage au lieu du ventre

---

### Polissage UI — hero pages

#### Layout hero (avatar absolu)
- Avatar en `position: absolute` dans le hero → n'entre plus dans le flux flex, la colonne droite (tokens/pièce) a tout l'espace
- `zIndex: 10` pour passer devant les autres éléments

#### Responsive desktop — style "carte"
- `.manager-hero` et `.pour-toi-hero` sur desktop (≥1024 px) : `border-radius: 24px`, `max-width: 600px`, `margin: auto`, ombre assortie au gradient → même rendu visuel que le bloc employeur
- Taille avatar : `min(105px, 27vw)` → cap à 105 px sur desktop (évite l'avatar surdimensionné sur grands écrans)

#### TopNav manager
- `top-nav--transparent` (fond transparent + position absolute) restreint à `@media (max-width: 1023px)` → sur desktop, la barre est identique à celle de l'employeur (fond blanc, ombre, liens visibles)
- Classes `top-nav--manager` et `no-shadow` supprimées du header → même style pour tous les rôles

#### Modal QR Code (employeur)
- Rendu via `ReactDOM.createPortal(…, document.body)` → échappe aux stacking contexts créés par le hero `position: relative`, passe devant la TopNav quelle que soit la hiérarchie DOM
- `maxHeight: calc(100vh - 32px)` + `overflowY: auto` → le modal ne déborde plus hors écran

---

## Stratégie de Test Complète, Sécurisation & Recette (feature/tests) — 26/06/26 (fait par Véronique)

### Étape 1 — Configuration de l'environnement de test (Fondation)
*   **Mise en place technique** :
    - Configuration de **Jest** et de **Supertest** pour l'exécution des tests dans le conteneur Docker de l'API.
    - Création des scripts npm dédiés au lancement des suites en isolation (`npm test`) pour éviter les conflits de ports réseau.
    - Isolation de l'environnement de test avec configuration de clés secrètes et de variables d'environnement dédiées aux mocks.

### Étape 2 — Écriture des tests unitaires (Cœur de métier)
*   **Validation des services et de la logique interne** :
    - **`AuthService`** : Tests unitaires sur le hachage des mots de passe (bcrypt), la génération et la vérification des signatures JWT.
    - **`TokenService`** : Tests de la logique métier d'allocation, de la vérification de la cohérence des soldes, et des contrôles avant débit.
    - **`StripeService`** : Validation de la création de clients et d'abonnements récurrents en mode test.
    - **Middlewares** : Validation du fonctionnement autonome de `verifyToken.js` et de `roleGuard.js`.

### Étape 3 — Tests d'intégration des routes critiques (/auth, /tokens, /marketplace)
*   **Alignement des routes réelles** :
    - **`auth.integration.test.js`** : Remplacement du chemin `/profile` par l'endpoint `/me` et adaptation des assertions d'erreurs au middleware de validation (propriété `error` attendue). Exclusion du champ `password_hash` dans le mock de profil.
    - **`tokens.integration.test.js` & `marketplace.integration.test.js`** : Remplacement des identifiants temporaires par des chaînes au format **UUID v4** valide pour satisfaire les validateurs de routes stricts `.isUUID()`.
*   **Résultat** : Réussite complète des 109 tests unitaires et d'intégration initiaux.

### Étape 4 — Sécurisation de l'API (RBAC, isolation multi-entreprises et contraintes individuelles)
*   **Création de la suite de tests des utilisateurs** :
    - Fichier créé : `server/tests/users/users.integration.test.js`.
    - **Contrôles de rôles (RBAC)** : Validation du blocage (403) des collaborateurs sur la liste des utilisateurs, la liste des comptes en attente, les activations et les dates d'entrée. Blocage des employeurs sur la suppression de profils.
    - **Isolation multi-entreprises (Multi-tenant)** : Validation du fait que toute requête d'un employeur/manager visant à lire, modifier, activer ou gérer la date d'un collaborateur d'une autre entreprise retourne un code `404 User not found`.
    - **Contrainte personnelle** : Validation du blocage (403) lors de la tentative de modification de l'avatar d'un tiers.
*   **Sécurité étendue sur les jetons et le catalogue** :
    - Vérification du blocage des collaborateurs sur les déductions de jetons et abonnements Stripe (`tokens.integration.test.js`).
    - Vérification du blocage des collaborateurs et employeurs sur le CRUD du catalogue de bons et sur l'historique d'achat global (`marketplace.integration.test.js`).
*   **Résultat** : **141 tests sur 141 validés avec succès** (100% de réussite).

### Étape 5 — Protocole de recette (Manual QA)
*   **Création du guide de recette** :
    - Fichier créé : `manual_qa_protocol.md` décrivant les flux à tester localement via Docker.
    - Fourniture des identifiants locaux de test : `jean.dupont@techcorp.com` (Employeur) et `alice.martin@techcorp.com` (Collaboratrice).
    - Protocole pas à pas pour tester l'abonnement Stripe (carte de test `4242 4242 4242 4242`), l'attribution de jetons et le rachat de bons dans le catalogue (Fnac 20€).
