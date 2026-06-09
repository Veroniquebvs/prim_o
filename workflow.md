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

### Mise en place de la couche Données (feature.data) 27/05/26

- Installation et configuration de Sequelize (ORM) relié à PostgreSQL.
- Création des 5 modèles de données principaux avec types stricts, valeurs par défaut et validations métiers :
  - `Company.js` : Gestion des entreprises (séparation de l'adresse en `street`, `zip_code`, `city`).
  - `User.js` : Gestion des comptes (rôles `admin`/`employer`/`employee` et mots de passe hashés).
  - `TokenTransaction.js` : Registre des jetons (avec support des ID de paiement Stripe).
  - `Voucher.js` : Catalogue des bons d'achat et gestion de disponibilité.
  - `Redemption.js` : Historique des échanges de bons et stockage des codes promos partenaires.
- Centralisation et configuration de la logique relationnelle (clés étrangères gérées par l'ORM) dans `src/models/index.js`.
- Configuration de l'environnement VS Code local avec **Prettier** (`Format On Save`) pour garantir l'uniformité du code de l'équipe.

### Mise en place de la couche SQL & Docker (feature.sql-init) 27/05/26

- Séparation stricte de l'infrastructure de la base de données (`init.sql`) et des données fictives de test (`seed.sql`).
- Écriture du script `init.sql` pour activer l'extension de génération d'UUID PostgreSQL (`uuid-ossp`).
- Écriture du script `seed.sql` avec un jeu de données complet pour le MVP (1 entreprise "TechCorp", 1 manager/employer, 1 employé avec solde de jetons, 3 bons d'achat en boutique et 1 transaction historique).
- Mise à jour du fichier `docker-compose.yml` pour monter les volumes SQL et forcer l'ordre d'exécution par Docker (`01_init.sql` puis `02_seed.sql`).

### Connexion DB, Middleware & Routes complètes (feature/backend-core) — 28/05/26 (fait par Loïc)

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

### Intégration Stripe (feature/stripe-payment-integration) — 29/05/26 (fait par Véronique)

- Création du compte Stripe test et récupération des clés (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Installation et configuration du SDK Stripe côté backend
- Implémentation de la création de `PaymentIntent`
- Implémentation de la route webhook `POST /api/tokens/webhook`
- Test du flux complet avec la carte test Stripe (`4242 4242 4242 4242`)


### Tests E2E backend complets — 02/06/26 (fait par Loïc)

Validation complète du backend via le script `server/tests/e2e/practical-test.js`.

**Résultat : 57/57 tests passés — 0 échec — 0 ignoré**

| Domaine | Tests validés |
|---|:---:|
| Infrastructure (health check, middlewares auth) | 4 |
| Companies (création, validation, lecture, mise à jour) | 7 |
| Auth (register, login, me, refresh, logout) | 12 |
| Users (liste, filtre, détail, mise à jour, suppression) | 6 |
| Marketplace — Vouchers (CRUD admin, liste, détail) | 8 |
| Marketplace — Rachat (redeem, solde déduit, historique) | 5 |
| Stripe (PaymentIntent, confirmation, webhook, solde crédité) | 4 |
| Tokens — Allocation + contrôle de rôle et de solde | 5 |
| Tokens — Transactions (liste, filtre, détail, historique) | 4 |
| Auth — Logout et suppression de compte | 2 |

**Points clés vérifiés :**
- Guards de rôle (403) contrôlés sur toutes les routes sensibles
- Paiement Stripe testé avec une clé réelle (`tok_visa` — carte `4242 4242 4242 4242`)
- Logique transactionnelle : solde insuffisant → 402/403, voucher déjà utilisé → 403
- Webhook Stripe : 500 tokens correctement crédités sur la company après `payment_intent.succeeded`

Pour relancer les tests :
```bash
node server/tests/e2e/practical-test.js
```

### Développement frontend — UI & fonctionnalités MVP — 04/06/26 (fait par Loïc & Véro)

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

### Initialisation du frontend React/TypeScript — 04/06/26 (fait par Loïc)

**Étape 54-58 — Setup React + TypeScript (Vite)**

Dépendances installées (`client/package.json`) :
- `react-router-dom` v7, `axios` (déjà présents)
- `@stripe/stripe-js`, `@stripe/react-stripe-js` (ajoutés)

Structure créée sous `client/src/` :

| Fichier | Rôle |
|---|---|
| `types/index.ts` | Types partagés : `User`, `Company`, `Voucher`, `TokenTransaction`, `Redemption`, `ApiResponse` |
| `services/api.ts` | Instance Axios avec intercepteurs : injection du Bearer token + refresh automatique sur 401 |
| `services/auth.service.ts` | Appels API : `login`, `register`, `logout`, `me` |
| `context/AuthContext.tsx` | `AuthProvider` + hook `useAuth` — restaure la session depuis `localStorage` au montage |
| `components/ProtectedRoute.tsx` | Guard de route : redirige vers `/login` si non authentifié, vers `/` si rôle insuffisant |
| `App.tsx` | `BrowserRouter` + toutes les routes avec guards de rôle |
| `vite-env.d.ts` | Déclaration des types Vite (`import.meta.env`) |

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

### Navigation & UX — 05/06/26 (fait par Loïc)

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

### Marketplace, favoris, panier & admin tokens — 08/06/26 (fait par Loïc)

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
