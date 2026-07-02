# Audit de sécurité — PRIM'O (2ème passe)

**Date** : 2026-07-02
**Stack détectée** : Node.js/Express, React/TypeScript, PostgreSQL/Sequelize, JWT HS256, Stripe, Docker
**Fichiers analysés** : 47 fichiers serveur + 15 fichiers client ciblés
**Outils utilisés** : npm audit (serveur + client), grep patterns secrets, lecture manuelle du code source
**Audit précédent** : audit-secu.md (session précédente — 13 failles auto-fixées)

---

## Résumé

| Sévérité | Nouveaux | Persistants (audit1) |
|----------|----------|----------------------|
| 🔴 Critique | 0 | 0 |
| 🟠 Élevée | 3 | 2 |
| 🟡 Moyenne | 0 | 2 |
| ⚪ Faible | 4 | 1 |

**Nouveaux findings auto-fixables** : 2 / **Nécessitant validation manuelle** : 5

---

## ✅ Résolu depuis l'audit précédent

Les 11 fixes auto-appliqués dans la session précédente sont **confirmés dans le code actuel** :

| ID | Titre | Vérification |
|----|-------|-------------|
| C1 | Register admin via rôle public | `auth.routes.js:26` — `isIn(['employer', 'employee'])`, 'admin' absent ✅ |
| E1 | IDOR balance utilisateur | `tokens.routes.js:38-43` — guard ownership + `token.service.js:127` scoping company ✅ |
| E2 | IDOR historique transactions | `users.routes.js:83-87` — guard ownership + `users.service.js:117` scoping company ✅ |
| E3 | IDOR détail transaction | `token.service.js:226-233` — check isInvolved / isSameCompany ✅ |
| M1 | Absence de rate limiting login | `server.js:72-80` — authLimiter 10 req/15min sur /login et /register ✅ |
| M2 | Stack traces en production | `errorHandler.js:25-27` — masquage 5xx en production ✅ |
| M3 | IDOR PUT utilisateur | `users.routes.js:55-60` — guard isSelf ou isAdminOrEmployer ✅ |
| M4 | IDOR GET entreprise | `companies.routes.js:79-84` — guard isAdmin ou isOwnCompany ✅ |
| M5 | Timing attack login email | `auth.service.js:119-122` — DUMMY_HASH toujours comparé ✅ |
| M7 | Énumération email au register | `auth.service.js:82-84` — message générique sans distinction 201/409 ✅ |
| F2 | MIME bypass upload | `upload.routes.js:51-55` — magic bytes vérifiés via file-type ✅ |

---

## 🟠 Élevée — Nouveaux

### [E-N1] Vulnérabilité DoS dans file-type — boucle infinie sur fichier ASF

> `Action: AUTO-FIX` · `Fichier: server/src/routes/upload.routes.js:15,51` · `Catégorie: A06 Composants vulnérables — CVE GHSA-5v7r-6r5c-r473` · `Dépend de: —`

- **Risque** : La version `file-type@18` installée est vulnérable à une boucle infinie sur des fichiers ASF malformés (range CVE : `>=13.0.0 <21.3.1`). Un attaquant peut envoyer une requête multipart avec `Content-Type: image/jpeg` sur un fichier dont le contenu est un ASF malformé : multer l'accepte (contrôle MIME basé sur le header déclaré), puis `fileTypeFromFile()` boucle indéfiniment et bloque le worker Node.js.
- **Code actuel** :
  ```js
  // upload.routes.js:15
  const { fileTypeFromFile } = require('file-type'); // v18 — vulnerable
  // ...
  const detected = await fileTypeFromFile(file.path); // peut boucler sur ASF malformé
  ```
- **Fix** :
  ```bash
  # 1. Désinstaller file-type@18 et installer la version patchée
  cd server && npm install file-type@latest
  ```
  ```js
  // upload.routes.js — supprimer le require en haut du fichier, puis dans le handler :
  // SUPPRIMER : const { fileTypeFromFile } = require('file-type');

  // Dans le handler async POST /, remplacer :
  const detected = await fileTypeFromFile(file.path);
  // Par :
  const { fileTypeFromFile } = await import('file-type'); // dynamic import ESM
  const detected = await fileTypeFromFile(file.path);
  ```
- **Note** : `file-type@19+` est ESM-only. L'import dynamique `await import()` fonctionne dans les fonctions `async` CJS — aucune conversion de l'ensemble du fichier en `.mjs` n'est requise.

---

### [E-N2] Tokens JWT stockés en localStorage — vol par XSS

> `Action: VALIDATION MANUELLE` · `Fichier: client/src/context/AuthContext.tsx:82-83,95-96` · `Catégorie: A02 Cryptographic Failures / A07 Auth Failures` · `Dépend de: —`

- **Risque** : L'`accessToken` (7j) et le `refreshToken` (30j) sont écrits dans `localStorage`, accessible par tout JavaScript sur la page. Un XSS via une librairie tierce compromise (supply chain), une extension navigateur malveillante, ou un script injecté permet de voler les deux tokens et d'usurper l'identité de l'utilisateur pendant 30 jours.
- **Code actuel** :
  ```ts
  // AuthContext.tsx:82-83
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  ```
- **Fix recommandé** : Stocker les tokens dans des cookies `HttpOnly; Secure; SameSite=Strict` émis par le serveur au moment du login :
  ```js
  // server — auth.controller.js, à la place de renvoyer les tokens dans le body :
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30j
  });
  // NE PAS inclure les tokens dans le body JSON
  ```
  ```ts
  // client/src/context/AuthContext.tsx — supprimer tous les localStorage.setItem/getItem/removeItem
  // L'intercepteur axios lit automatiquement les cookies HttpOnly (withCredentials: true déjà présent)
  ```
  ```bash
  cd server && npm install cookie-parser
  # Puis : app.use(require('cookie-parser')()) dans server.js
  ```
- **Note** : Changement architectural impactant. Nécessite que `axios` soit déjà configuré avec `withCredentials: true` (à vérifier dans `client/src/services/api.ts`). CORS doit autoriser le domaine Vercel exact avec `credentials: true` (déjà en place). Le Stripe webhook n'est pas affecté (pas de cookie).

---

### [E-N3] Webhook Stripe non-idempotent — double crédit possible

> `Action: AUTO-FIX` · `Fichier: server/src/services/stripe.service.js:68-79` · `Catégorie: A04 Insecure Design — intégrité financière` · `Dépend de: —`

- **Risque** : Si le serveur met trop longtemps à répondre (> timeout Stripe) ou retourne un 5xx, Stripe retente l'envoi du même événement `invoice.payment_succeeded`. Sans vérification d'idempotence, chaque retry crédite à nouveau `company.token_balance` du montant du plan — le client reçoit des tokens en double sans payer plus.
- **Code actuel** :
  ```js
  // stripe.service.js:68-79 — pas de vérification préalable
  const t = await sequelize.transaction();
  try {
    await company.increment('token_balance', { by: plan.tokens, transaction: t });
    await TokenTransaction.create(
      { ..., stripe_payment_id: invoice.payment_intent },
      { transaction: t }
    );
    await t.commit();
  }
  ```
- **Fix** :
  ```js
  // stripe.service.js — ajouter AVANT l'ouverture de la transaction :

  // Idempotence : si ce payment_intent a déjà été traité, ignorer le retry Stripe
  const existingTx = await TokenTransaction.findOne({
    where: { stripe_payment_id: invoice.payment_intent, type: 'purchase' },
  });
  if (existingTx) return;

  const t = await sequelize.transaction();
  // ...reste inchangé
  ```

---

## 🟠 Élevée — Persistants depuis audit1

### [E4] CORS accepte tous les sous-domaines *.vercel.app avec credentials

> `Action: VALIDATION MANUELLE` · `Fichier: server/server.js:47` · `Catégorie: A05 Misconfiguration — CORS` · `Dépend de: —`

- **Risque** : Tout sous-domaine `*.vercel.app` peut faire des requêtes authentifiées (avec cookies ou tokens) vers l'API. Tout projet Vercel créé par n'importe qui pourrait appeler vos endpoints si les tokens CORS sont réutilisés.
- **Code actuel** :
  ```js
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
  ```
- **Fix** : Remplacer le wildcard par la liste explicite des domaines Vercel utilisés :
  ```js
  // server.js — remplacer le block CORS par :
  const allowedOrigins = [
    'http://localhost:3000',
    'https://primo-app.vercel.app',       // domaine production Vercel — à adapter
    'https://primo-staging.vercel.app',   // preview — à adapter
  ];
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  }));
  ```
- **Note** : Nécessite de connaître les URLs Vercel exactes (prod + éventuels preview). À faire au moment du déploiement final.

---

### [E5] Logout stateless — tokens non révocables

> `Action: VALIDATION MANUELLE` · `Fichier: server/src/services/auth.service.js:141` · `Catégorie: A07 Auth Failures` · `Dépend de: —`

- **Risque** : Le logout ne révoque pas le JWT côté serveur. Si un token est volé avant expiration (7j access, 30j refresh), l'attaquant reste connecté même après que la victime ait cliqué "Déconnexion".
- **Code actuel** :
  ```js
  const logout = async (_userId) => {}; // no-op
  ```
- **Fixes possibles** :
  - **Option A (minimal)** : Réduire `JWT_EXPIRES_IN` à `15m` et `JWT_REFRESH_EXPIRES_IN` à `7d` pour limiter la fenêtre d'exploitation.
  - **Option B (complet)** : Maintenir une table `refresh_token_blocklist` en PostgreSQL et vérifier à chaque refresh :
    ```sql
    CREATE TABLE refresh_token_blocklist (
      jti UUID PRIMARY KEY,
      invalidated_at TIMESTAMP DEFAULT NOW()
    );
    ```
- **Note** : Option A est réalisable en 5 minutes (variables d'env). Option B est plus sûre mais ajoute de la complexité.

---

## 🟡 Moyenne — Persistants depuis audit1

### [M-P1] JWT_SECRET locaux trop faibles

> `Action: VALIDATION MANUELLE` · `Fichier: server/.env:10,12` · `Catégorie: A07 Auth Failures` · `Dépend de: —`

- **Risque** : `JWT_SECRET=change_me_in_production` et `JWT_REFRESH_SECRET=change_me_refresh_secret` dans le `.env` local. Non critique en production (Render utilise ses propres variables aléatoires — confirmé). Risque limité au dev local : un token signé localement serait invalide en prod (secrets différents).
- **Fix** : Mettre à jour le `.env` local avec des valeurs non triviales :
  ```
  JWT_SECRET=dev_local_not_used_in_prod_$(openssl rand -hex 16)
  JWT_REFRESH_SECRET=dev_refresh_local_not_used_in_prod_$(openssl rand -hex 16)
  ```

---

### [M-P2] Absence de pagination sur les endpoints liste

> `Action: VALIDATION MANUELLE` · `Fichiers: tokens.routes.js:52, users.routes.js:23, marketplace.routes.js:23` · `Catégorie: A04 Insecure Design — DoS indirect` · `Dépend de: —`

- **Risque** : Les endpoints `GET /transactions`, `GET /users`, `GET /marketplace/items` retournent toutes les lignes sans limite. Une entreprise avec 10 000 transactions bloquerait le serveur et la base à chaque appel.
- **Fix générique** : Ajouter `limit/offset` ou `page/pageSize` dans chaque service :
  ```js
  // Exemple dans token.service.js listTransactions :
  const { limit = 50, offset = 0 } = options;
  const txs = await TokenTransaction.findAll({ where, order, limit, offset });
  ```

---

## ⚪ Faible — Nouveaux

### [F-N1] CVE uuid (GHSA-w5hq-g745-h8pq) via Sequelize

> `Action: VALIDATION MANUELLE` · `Fichier: server/package.json (dépendance transitive sequelize → uuid)` · `Catégorie: A06 Composants vulnérables` · `Dépend de: —`

- **Risque** : uuid `<11.1.1` a un buffer bounds check manquant dans `v3/v5/v6` quand le paramètre optionnel `buf` est fourni. Sequelize n'utilise pas ce paramètre dans son usage normal → risque réel proche de zéro dans ce contexte.
- **Fix** : La mise à jour requiert que Sequelize supporte uuid v11, ce qui n'est pas encore le cas (breaking change dans uuid v3 → v11). Aucune action immédiate requise — surveiller la prochaine release Sequelize.

---

### [F-N2] Dépendances de développement vulnérables (vite, esbuild)

> `Action: AUTO-FIX` · `Fichier: client/package.json` · `Catégorie: A06 Composants vulnérables — dev only` · `Dépend de: —`

- **Risque** : `vite ≤6.4.2` (path traversal, NTLMv2 hash disclosure) et `esbuild ≤0.24.2` (dev server accessible cross-origin). Ces vulnérabilités n'existent **qu'en développement local** — le build de production (Vercel) ne les expose pas.
- **Fix** :
  ```bash
  cd client && npm update vite esbuild
  ```
- **Note** : Si `npm update` bloque sur des peer deps, `npm install vite@latest --save-dev` force la mise à jour.

---

### [F-N3] Clés Stripe TEST réelles dans le .env local

> `Action: VALIDATION MANUELLE` · `Fichier: server/.env:16,17` · `Catégorie: A02 Cryptographic Failures — gestion des secrets` · `Dépend de: —`

- **Risque** : Les valeurs `STRIPE_SECRET_KEY=sk_test_51Tdmut...` et `STRIPE_WEBHOOK_SECRET=whsec_...` dans le `.env` local sont des vraies clés Stripe (environnement test). Non commitées en git (vérifié). Risque de divulgation accidentelle : partage d'écran, copie du fichier, logs système.
- **Fix** : Utiliser des valeurs placeholder dans `.env` et stocker les vraies clés test dans un gestionnaire de secrets (même simple : fichier `~/.primo_secrets` hors du dépôt) :
  ```
  # server/.env — valeurs placeholder, non fonctionnelles
  STRIPE_SECRET_KEY=sk_test_replace_with_real_key
  STRIPE_WEBHOOK_SECRET=whsec_replace_with_real_secret
  ```
- **Note** : `.env` n'est pas dans git et les clés sont test-only. Ce finding est à corriger progressivement, non urgent.

---

### [F-N4] Absence de log des événements de sécurité critiques

> `Action: VALIDATION MANUELLE` · `Fichier: global` · `Catégorie: A09 Security Logging & Monitoring Failures` · `Dépend de: —`

- **Risque** : Les événements de sécurité (tentatives de login échouées, tokens invalides, violations de rôle 403, webhook Stripe rejetés) ne sont pas loggés dans un format structuré interrogeable. Difficile de détecter une attaque par brute force ou une tentative d'intrusion après coup.
- **Fix minimal** : Ajouter un log structuré dans les points critiques :
  ```js
  // verifyToken.js — log token invalide
  if (err.name === 'TokenExpiredError') {
    console.warn(JSON.stringify({ event: 'token_expired', ip: req.ip, path: req.path, ts: new Date() }));
    return res.status(401).json({ error: 'Token expired', code: 401 });
  }
  // auth.service.js — log login raté
  if (!user || !isValid) {
    console.warn(JSON.stringify({ event: 'login_failed', email, ip: 'unknown', ts: new Date() }));
    throw httpError('Invalid credentials', 401);
  }
  ```
- **Note** : Pour du monitoring sérieux, utiliser une lib comme `pino` avec transport vers un service de logs (Render logs, Datadog, etc.).

---

## Findings écartés (faux positifs vérifiés)

- **Avatar IDOR** — `PATCH /users/:id/avatar` : la vérification d'ownership `req.user.id !== req.params.id` est présente dans `users.controller.js:169`, pas dans le fichier route. Pas de vulnérabilité.
- **Webhook Stripe error message** — L'erreur de signature Stripe dans la réponse 400 (`status < 500`, donc passée telle quelle) ne contient que le message Stripe générique, pas d'info sensible interne.
- **`@mapbox/node-pre-gyp` et `tar`** — Dépendances build-time de native addons, non exposées au runtime. Pas de vecteur d'exploitation via l'API.

---

## Plan d'exécution recommandé

### Phase 1 — AUTO-FIX (2 items, < 30 min)

1. **[E-N1] file-type DoS** : `npm install file-type@latest` + remplacer le `require` par `await import('file-type')` dans `upload.routes.js`.
2. **[E-N3] Stripe idempotency** : Ajouter le check `existingTx` dans `stripe.service.js` avant l'ouverture de la transaction.
3. **[F-N2] vite + esbuild** : `cd client && npm update vite esbuild`.

### Phase 2 — VALIDATION MANUELLE (décisions produit)

4. **[E-N2] JWT localStorage** : Décider entre cookie HttpOnly (changement architectural ∼ 2h) ou mitigation rapide via durée réduite (tokens 15min + 7j).
5. **[E4] CORS whitelist** : Renseigner les URLs Vercel exactes lors du déploiement final.
6. **[E5] Logout** : Choisir Option A (réduire durée JWT) ou Option B (blocklist en DB).
7. **[F-N3] .env Stripe** : Remplacer par placeholders, déplacer les vraies clés test hors du répertoire projet.

### Phase 3 — Long terme

8. **[M-P2] Pagination** : Implémenter limit/offset sur les 3 endpoints liste avant le premier pilote entreprise (risque de perf avec 1000+ transactions).
9. **[F-N4] Logs sécurité** : Ajouter logs structurés sur login_failed, token_invalid, 403_forbidden.
