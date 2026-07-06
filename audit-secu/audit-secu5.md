# Audit de sécurité — PRIM'O (5ème passe)

**Date** : 2026-07-02
**Stack détectée** : Node.js/Express, React/TypeScript, PostgreSQL/Sequelize, JWT HS256, Stripe, Docker
**Périmètre analysé** : couverture complète du backend (auth, users, companies, tokens, manager, employer, marketplace, favorites, scheduled, upload, middlewares, config) + points d'entrée client sensibles.
**Outils** : `detect_and_scan.sh` (npm audit, scan de secrets, cohérence .env/.gitignore), lecture croisée routes↔services↔middlewares.
**Audit précédent** : audit-secu/audit-secu4.md (5 AUTO-FIX appliqués cette session)

---

## Résumé

| Sévérité | Nouveaux | Persistants (audits 1–4) |
|----------|----------|--------------------------|
| 🔴 Critique | 0 | 0 |
| 🟠 Élevée | 0 | 2 |
| 🟡 Moyenne | 1 | 3 |
| ⚪ Faible | 3 | 4 |

**Bilan** : aucune nouvelle vulnérabilité critique ni élevée. Les corrections des audits 1→4 tiennent. Les nouveaux findings sont des **incohérences de périmètre** (une régularisation incomplète de la normalisation d'email, un scope manager asymétrique) et un **CVE transitif** sans exposition runtime.

---

## ✅ Résolu depuis audit-secu4.md

| ID | Titre | Vérification dans le code actuel |
|----|-------|----------------------------------|
| C4-1 | Changement de mot de passe non-fonctionnel | `PATCH /users/:id/password` existe ([users.routes.js:108](server/src/routes/users.routes.js#L108)), garde self-only, `changePassword` vérifie l'ancien hash bcrypt et re-hashe ([users.service.js](server/src/services/users.service.js)). Client corrigé ([MotDePasse.tsx](client/src/pages/MotDePasse.tsx), [user.service.ts](client/src/services/user.service.ts)). ✅ |
| E-N4 | IDOR `GET /users` inter-entreprise | [users.controller.js:12-22](server/src/controllers/users.controller.js#L12) force `query.companyId = req.user.company_id` pour tout rôle ≠ admin. ✅ |
| M-N4A | Email non normalisé au register | [auth.service.js:80](server/src/services/auth.service.js#L80) applique `email.toLowerCase()` + [auth.routes.js:23](server/src/routes/auth.routes.js#L23) `.normalizeEmail()`. ⚠️ **Partiel** — voir M5-A ci-dessous. |
| F-N4A | `/auth/refresh` sans rate limit | [server.js:81](server/server.js#L81) `app.use('/api/auth/refresh', authLimiter)`. ✅ |
| F-N4B | Énumération email entreprise (409) | [companies.service.js:31](server/src/services/companies.service.js#L31) message générique. ✅ |

---

## 🟡 Moyenne — Nouveau

### [M5-A] Normalisation d'email incomplète — deux chemins de création oubliés

> `Action: AUTO-FIX` · `Fichiers: server/src/services/manager.service.js:58, server/src/services/companies.service.js:179, server/src/routes/manager.routes.js:34, server/src/routes/companies.routes.js:58` · `Catégorie: A07 Auth Failures — lockout / doublons de compte` · `Dépend de: —`

- **Risque** : Le correctif M-N4A n'a été appliqué qu'à `auth.service.register`. Deux autres chemins créent des utilisateurs **sans** `.toLowerCase()` :
  1. `manager.service.createEmployee` — un manager qui saisit `Jean@Boite.FR` crée un employé qui ne pourra jamais se connecter (le login cherche `jean@boite.fr`, absent en base).
  2. `companies.service.adminCreate` — même problème pour le compte employeur créé par un admin.
  Comme la contrainte `UNIQUE` de PostgreSQL est sensible à la casse, `Jean@Boite.FR` et `jean@boite.fr` peuvent coexister comme deux comptes distincts, contournant le contrôle d'unicité et créant des doublons ingérables.
- **Code actuel** :
  ```js
  // manager.service.js:58
  const existing = await User.findOne({ where: { email } });
  // ... puis User.create({ email, ... }) à la ligne 71
  ```
  ```js
  // companies.service.js:179 / 185 / 195 / 210 — employer_email stocké tel quel
  const existingUser = await User.findOne({ where: { email: employer_email } });
  ```
- **Fix — manager.service.js** :
  ```js
  const createEmployee = async (manager, { email, first_name, name, password, entry_date }) => {
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) throw httpError('Email already in use', 409);
    // ...
    const employee = await User.create(
      { email: normalizedEmail, first_name, name, password_hash, /* ... */ },
      { transaction: t }
    );
  ```
- **Fix — companies.service.js (adminCreate)** :
  ```js
  const adminCreate = async ({ ..., employer_email, password }) => {
    const normalizedEmail = employer_email.toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) throw httpError('Cet email est déjà utilisé par un utilisateur.', 409);
    const existingCompany = await Company.findOne({ where: { email: normalizedEmail } });
    if (existingCompany) throw httpError('Une entreprise avec cet email existe déjà.', 409);
    // ... utiliser normalizedEmail dans Company.create ET User.create
  ```
- **Fix — validation des routes (défense en profondeur)** :
  ```js
  // manager.routes.js:34
  body('email').isEmail().normalizeEmail().withMessage('email must be a valid email address'),
  // companies.routes.js:58
  body('employer_email').isEmail().normalizeEmail().withMessage('valid employer_email is required'),
  ```

---

## 🟠 Élevée — Persistants (non résolus, revalidés)

### [E4] CORS accepte tout sous-domaine `*.vercel.app`

[server.js:47](server/server.js#L47) — `if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);`. N'importe quel projet Vercel tiers (`https://attacker.vercel.app`) passe le CORS avec `credentials: true`. À restreindre à la liste explicite `CLIENT_URL` lors du déploiement final. Voir audit-secu2.md.

### [E5] Logout stateless — pas de révocation de token

[auth.service.js:141](server/src/services/auth.service.js#L141) — `logout` est un no-op ; un refresh token capturé reste valide 30 jours après déconnexion. Corrélé à E-N2 (stockage localStorage). Décision produit : soit réduire `JWT_EXPIRES_IN` à 15 min, soit introduire une blocklist des refresh tokens. Voir audit-secu2.md.

---

## ⚪ Faible — Nouveaux

### [F5-A] `GET /transactions/:id` — un manager peut lire toute transaction de l'entreprise

> `Action: AUTO-FIX` · `Fichier: server/src/services/token.service.js:229` · `Catégorie: A01 Broken Access Control — divulgation d'info intra-entreprise` · `Dépend de: —`

- **Risque** : `listTransactions` scope volontairement un manager à sa propre équipe ([tokens.controller.js:43-49](server/src/controllers/tokens.controller.js#L43)). Mais `getTransaction(id)` autorise tout `employer`/`manager` de la même entreprise via `isSameCompany`. Un manager peut donc, en énumérant des UUID de transaction, lire des mouvements sans rapport avec son équipe (transferts employeur↔autre manager, montants, motifs, noms des parties). Incohérence avec l'intention de scoping établie ailleurs. Impact limité (intra-entreprise, pas de fuite inter-entreprise), d'où sévérité faible.
- **Code actuel** :
  ```js
  // token.service.js:229-231
  const isSameCompany =
    tx.company_id === requester.company_id &&
    ['employer', 'manager'].includes(requester.role);
  ```
- **Fix** — aligner le manager sur le périmètre équipe (employeur conserve la visibilité entreprise) :
  ```js
  const isEmployerSameCompany =
    tx.company_id === requester.company_id && requester.role === 'employer';

  let isManagerTeamTx = false;
  if (requester.role === 'manager' && tx.company_id === requester.company_id) {
    const { Team, TeamMember } = require('../models');
    const team = await Team.findOne({ where: { manager_id: requester.id, dissolved_at: null } });
    if (team) {
      const memberIds = (await TeamMember.findAll({ where: { team_id: team.id, left_at: null } }))
        .map((m) => m.user_id);
      memberIds.push(requester.id);
      isManagerTeamTx = memberIds.includes(tx.sender_id) || memberIds.includes(tx.receiver_id);
    }
  }

  if (!isAdmin && !isInvolved && !isEmployerSameCompany && !isManagerTeamTx) {
    throw httpError('Forbidden', 403);
  }
  ```

### [F5-B] CVE `tar` (GHSA-34x7-hfp2-rc4v, CVSS 8.2) — dépendance transitive de bcrypt

> `Action: VALIDATION MANUELLE` · `Chaîne: bcrypt@5.1.1 → @mapbox/node-pre-gyp@1.0.11 → tar@6.2.1` · `Catégorie: A06 Vulnerable Components` · `Dépend de: —`

- **Risque** : `npm audit` remonte `tar < 7.5.7` (arbitrary file creation via hardlink path traversal, CWE-22/59). **Pas d'exposition runtime dans PRIM'O** : `tar` n'est utilisé que par `node-pre-gyp` à l'installation de bcrypt (téléchargement du binaire prébuilt), jamais pour extraire une archive fournie par un utilisateur. Le risque réel est quasi nul en production ; c'est un bruit d'audit à documenter.
- **Fix** : `tar@6` est épinglé par `node-pre-gyp@1` — le forcer en v7 peut casser le build de bcrypt. Deux options, à valider :
  1. **Recommandé (attendre)** : aucune action, documenter l'exception ; le fix arrivera avec une mise à jour majeure de bcrypt.
  2. **Override npm** (à tester sur CI avant merge) — dans `server/package.json` :
     ```json
     "overrides": { "tar": "^7.5.7" }
     ```
     puis `npm install` et vérifier que bcrypt build et `npm test` passent. À rollback si le build échoue.

### [F5-C] Création d'entreprise publique sans authentification ni throttling

> `Action: VALIDATION MANUELLE` · `Fichier: server/src/routes/companies.routes.js:37` · `Catégorie: A04 Insecure Design — abus/spam` · `Dépend de: —`

- **Risque** : `POST /api/companies` est public (nécessaire au self-onboarding employeur) et n'a **ni auth ni rate limiting**. Un script peut créer en masse des enregistrements `companies` (pollution DB, énumération d'emails d'entreprise déjà atténuée par F-N4B). Sévérité faible car aucune donnée sensible n'est exposée et aucun token n'est crédité à la création.
- **Fix** (choix produit — d'où validation manuelle) : appliquer un limiteur dédié plus permissif que `authLimiter` sur cette route publique :
  ```js
  // server.js
  const publicWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
    message: { error: 'Too many requests, please try again later', code: 429 } });
  app.use('/api/companies', (req, res, next) =>
    req.method === 'POST' ? publicWriteLimiter(req, res, next) : next());
  ```
  Alternative : exiger un CAPTCHA côté front avant le POST. À arbitrer selon le flux d'onboarding voulu.

---

## ⚪ Faible — Persistants (revalidés)

| ID | Titre | Statut |
|----|-------|--------|
| E-N2 | JWT stocké en localStorage (risque XSS) | 🔶 Ouvert — validation manuelle ([api.ts](client/src/services/api.ts)) |
| M-N3B | SSL PostgreSQL `rejectUnauthorized: false` | 🔶 Non urgent (réseau privé Render) |
| M-N3C | Credentials en clair dans docker-compose (git) | 🔶 Ouvert — dev only |
| M-P2 | Absence de pagination (list users/transactions) | 🔶 Ouvert — choix produit |
| F1 | `JWT_EXPIRES_IN` = 7 jours | 🔶 Choix produit |
| F-N1 | `uuid` CVE moderate via Sequelize | 🔶 Pas de fix non-cassant dispo |
| F-N3 | Clés Stripe TEST réelles dans `server/.env` local | 🔶 Bonne pratique (non tracké par git) |
| F-N4 (audit2) | Absence de logs de sécurité (auth, allocations) | 🔶 Choix produit |

**Note secrets (`.env` local)** : `JWT_SECRET=change_me_in_production` et clés Stripe test présentes dans `server/.env` (non tracké par git, confirmé par le scan). **Non-risque en production** — Render fournit de vrais secrets aléatoires via variables d'environnement (confirmé lors de l'audit 2, item C2). Pas de secret hardcodé dans le code source.

---

## Points positifs confirmés (aucune action)

- **Transactions atomiques** partout où des soldes bougent : `token.allocate`, `manager.giveTokens`, `marketplace.redeem`, `companies.remove`/`grantTokens`/`adminCreate`, `employer.createAllocation` — toutes avec `sequelize.transaction()` + `lock: true` (SELECT FOR UPDATE). ✅
- **Webhook Stripe** : signature vérifiée via `constructEvent` + idempotence sur `stripe_payment_id` ([stripe.service.js:51,69](server/src/services/stripe.service.js#L51)). ✅
- **Upload** : vérification des magic bytes via `file-type` (import ESM dynamique), suppression du fichier si type invalide, `roleGuard('admin')`, limite 5 Mo. ✅
- **bcrypt 12 rounds** + hash factice anti-timing sur login absent d'email ([auth.service.js:19,119](server/src/services/auth.service.js#L19)). ✅
- **teamScope** : `POST /manager/tokens/give` protégé par `requireTeamScope` empêchant un manager de créditer un employé hors de son équipe. ✅
- **verifyToken** force explicitement `algorithms: ['HS256']` (pas de confusion d'algorithme / `alg: none`). ✅
- **Whitelists d'update** strictes empêchant l'escalade (`users.update` = name/first_name ; `employer.updateAllocation` = amount/active/day_of_month). ✅

---

## Findings écartés (faux positifs vérifiés)

- **`favorites.toggle`** — `voucher_id` validé UUID ; un ID inexistant provoquerait une erreur FK PostgreSQL proprement catchée. Pas d'injection ni d'IDOR (scopé à `req.user.id`).
- **`marketplace.redeem` rend le voucher `available: false` globalement** — comportement voulu (code promo à usage unique), pas une faille.
- **`GET /tokens/balance/:userId` pour employer/manager** — le service `token.getBalance` scope les non-admin non-self à `requester.company_id` ([token.service.js:127](server/src/services/token.service.js#L127)). Pas d'IDOR inter-entreprise.
- **Scan de secrets** — les 4 correspondances sont toutes dans `server/.env` (non tracké), pas dans le code source. Aucun secret hardcodé.

---

## Plan d'exécution recommandé

1. **[M5-A]** (AUTO-FIX prioritaire) — normaliser l'email dans `manager.createEmployee` et `companies.adminCreate` + `.normalizeEmail()` sur les deux routes. Termine la régularisation entamée en audit 4.
2. **[F5-A]** (AUTO-FIX) — aligner `getTransaction` sur le scope équipe des managers.
3. **[F5-C]** (validation) — décider throttling vs CAPTCHA sur `POST /companies` public.
4. **[F5-B]** (validation) — documenter l'exception `tar` ou tester l'override sur CI.
5. **Backlog déploiement** — E4 (CORS), E5 (révocation token) à traiter avant la mise en production réelle.
