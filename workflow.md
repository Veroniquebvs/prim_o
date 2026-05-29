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
