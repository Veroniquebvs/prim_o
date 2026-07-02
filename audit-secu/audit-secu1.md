# Audit de sécurité — PRIM'O

**Date** : 2026-07-02  
**Stack détectée** : Node.js/Express, React/TypeScript, PostgreSQL/Sequelize, Stripe, Docker Compose  
**Fichiers analysés** : 62 fichiers source (controllers, services, routes, middleware, config, modèles)  
**Outils utilisés** : npm audit (workspace), grep patterns secrets, lecture manuelle de code  

---

## Résumé

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 2 |
| 🟠 Élevée | 6 |
| 🟡 Moyenne | 7 |
| ⚪ Faible | 4 |

**Findings auto-fixables** : 13 / **Nécessitant validation manuelle** : 6

---

## 🔴 Critique

### [C1] Enregistrement admin via endpoint public

> `Action: AUTO-FIX` · `Fichier: server/src/routes/auth.routes.js:26` · `Catégorie: A01 Broken Access Control — Privilege Escalation` · `Dépend de: —`

- **Risque** : N'importe qui peut s'enregistrer avec `role: "admin"` via `POST /api/auth/register`, obtenant ainsi un accès complet à toutes les entreprises, leurs données et les opérations d'administration.
- **Code actuel** :
  ```js
  // auth.routes.js:24-27
  body('role')
    .isIn(['employer', 'employee', 'admin'])
    .withMessage('Role must be employer, employee or admin'),
  ```
- **Fix** :
  ```js
  body('role')
    .isIn(['employer', 'employee'])
    .withMessage('Role must be employer or employee'),
  ```
- **Note** : La création d'admin doit passer uniquement par `POST /api/companies/admin` (déjà protégé par `roleGuard('admin')`) ou par un script de seed serveur. Supprimer aussi `manager` si il était dans la liste — la promotion manager se fait via `PATCH /api/employer/employees/:id/role`.

---

### [C2] Secrets JWT avec valeurs placeholder en production

> `Action: VALIDATION MANUELLE` · `Fichier: server/.env:10,12` · `Catégorie: A05 Security Misconfiguration — Hardcoded Weak Secrets` · `Dépend de: —`

- **Risque** : `JWT_SECRET=change_me_in_production` et `JWT_REFRESH_SECRET=change_me_refresh_secret` sont des valeurs connues et publiques — quiconque les connaît peut forger des tokens JWT valides pour n'importe quel utilisateur, y compris admin.
- **Code actuel** :
  ```
  # server/.env
  JWT_SECRET=change_me_in_production
  JWT_REFRESH_SECRET=change_me_refresh_secret
  ```
- **Fix** :
  ```bash
  # Générer deux secrets forts de 64 octets
  openssl rand -hex 64
  # → coller le premier en JWT_SECRET dans server/.env ET dans les secrets Render
  openssl rand -hex 64
  # → coller le second en JWT_REFRESH_SECRET
  ```
  Puis invalider toutes les sessions actives (les anciens tokens signés avec les placeholders resteront valides jusqu'à expiration — passer `JWT_EXPIRES_IN=15m` le temps de la transition si possible).
- **Note** : Action externe requise — mettre à jour les secrets dans Render Dashboard → Environment → Secret Files. Vérifier que les mêmes valeurs sont bien injectées en CI (GitHub Secrets) si les tests d'intégration utilisent ces variables.

---

## 🟠 Élevée

### [E1] IDOR — Solde token d'un utilisateur quelconque accessible

> `Action: AUTO-FIX` · `Fichier: server/src/routes/tokens.routes.js:35-39` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : Tout utilisateur authentifié peut interroger le solde token de n'importe quel autre utilisateur, sans restriction de rôle ou d'entreprise.
- **Code actuel** :
  ```js
  // tokens.routes.js:35-39
  router.get(
    '/balance/:userId',
    verifyToken,
    [param('userId').isUUID()...],
    tokensController.getBalance
  );
  ```
- **Fix** : ajouter une vérification dans `token.service.js:getBalance` ou directement dans la route :
  ```js
  // tokens.routes.js — ajouter le middleware suivant avant tokensController.getBalance
  (req, res, next) => {
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.params.userId === req.user.id;
    const isEmployerOrManager = ['employer', 'manager'].includes(req.user.role);
    if (!isAdmin && !isSelf && !isEmployerOrManager) {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    next();
  },
  ```
  Et dans `token.service.js:getBalance`, pour les employeurs/managers, ajouter un scope `company_id` :
  ```js
  const getBalance = async (userId, requester) => {
    const where = { id: userId };
    if (requester.role !== 'admin' && requester.id !== userId) {
      where.company_id = requester.company_id; // scope entreprise
    }
    const user = await User.findOne({ where, attributes: ['id', 'token_balance'] });
    if (!user) throw httpError('User not found', 404);
    return { userId: user.id, token_balance: user.token_balance };
  };
  ```

---

### [E2] IDOR — Historique de transactions d'un utilisateur quelconque accessible

> `Action: AUTO-FIX` · `Fichiers: server/src/routes/users.routes.js:72-76, server/src/services/users.service.js:115-127` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : `GET /api/users/:id/history` n'a que `verifyToken` — tout employé peut lire l'historique complet de transactions (montants, raisons, partenaires) de n'importe quel autre utilisateur de n'importe quelle entreprise.
- **Code actuel** :
  ```js
  // users.routes.js:72-76
  router.get(
    '/:id/history',
    verifyToken,
    [param('id').isUUID()..., validate],
    usersController.history
  );
  ```
  ```js
  // users.service.js:115-127 — pas de scope company_id
  const history = async (id) => {
    const user = await User.findByPk(id, { attributes: ['id'] });
    ...
  ```
- **Fix** :
  ```js
  // users.routes.js:72-76 — ajouter roleGuard
  router.get(
    '/:id/history',
    verifyToken,
    (req, res, next) => {
      const isSelf = req.params.id === req.user.id;
      const canSeeOthers = ['employer', 'manager', 'admin'].includes(req.user.role);
      if (!isSelf && !canSeeOthers) return res.status(403).json({ error: 'Forbidden', code: 403 });
      next();
    },
    [param('id').isUUID()..., validate],
    usersController.history
  );
  ```
  ```js
  // users.service.js:115 — ajouter scope company
  const history = async (id, requesterCompanyId) => {
    const where = { id };
    if (requesterCompanyId) where.company_id = requesterCompanyId;
    const user = await User.findOne({ where, attributes: ['id'] });
    if (!user) throw httpError('User not found', 404);
    ...
  };
  ```

---

### [E3] IDOR — Détail d'une transaction individuelle accessible sans restriction

> `Action: AUTO-FIX` · `Fichier: server/src/services/token.service.js:215-223` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : `GET /api/tokens/transactions/:id` retourne n'importe quelle transaction par UUID sans vérifier que l'appelant en est l'émetteur, le destinataire, ou un admin de la même entreprise.
- **Code actuel** :
  ```js
  // token.service.js:215
  const getTransaction = async (id) => {
    const tx = await TokenTransaction.findByPk(id, { include: [...] });
    if (!tx) throw httpError('Transaction not found', 404);
    return tx;
  };
  ```
- **Fix** :
  ```js
  const getTransaction = async (id, requester) => {
    const tx = await TokenTransaction.findByPk(id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'first_name', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'first_name', 'email'] },
      ],
    });
    if (!tx) throw httpError('Transaction not found', 404);

    const isAdmin = requester.role === 'admin';
    const isInvolved = tx.sender_id === requester.id || tx.receiver_id === requester.id;
    const isSameCompany = tx.company_id === requester.company_id &&
      ['employer', 'manager'].includes(requester.role);

    if (!isAdmin && !isInvolved && !isSameCompany) {
      throw httpError('Forbidden', 403);
    }
    return tx;
  };
  ```
  Et passer `req.user` depuis le contrôleur : `tokenService.getTransaction(req.params.id, req.user)`.

---

### [E4] CORS wildcard `*.vercel.app` avec `credentials: true`

> `Action: VALIDATION MANUELLE` · `Fichier: server/server.js:46,49` · `Catégorie: A05 Security Misconfiguration — CORS` · `Dépend de: —`

- **Risque** : Toute application déployée sur Vercel (y compris malveillante) peut effectuer des requêtes cross-origin authentifiées (cookies, Authorization header) vers l'API PRIM'O.
- **Code actuel** :
  ```js
  // server.js:46
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
  ```
- **Fix** : Remplacer le wildcard par une liste explicite des domaines Vercel de PRIM'O :
  ```js
  // server.js — remplacer la ligne 46
  const ALLOWED_VERCEL = new Set([
    'https://prim-o.vercel.app',          // production Vercel
    'https://prim-o-git-main.vercel.app', // preview Vercel main
    // ajouter ici les preview branches si nécessaire
  ]);
  if (ALLOWED_VERCEL.has(origin)) return callback(null, true);
  ```
- **Note** : Nécessite de lister explicitement les URLs Vercel connues. Récupérer la liste via le Dashboard Vercel → Settings → Domains.

---

### [E5] Logout stateless — tokens volés non révocables

> `Action: VALIDATION MANUELLE` · `Fichier: server/src/services/auth.service.js:136` · `Catégorie: A07 Identification and Authentication Failures` · `Dépend de: C2`

- **Risque** : `logout` est un no-op — le serveur ne maintient aucun état. Un token volé (XSS, fuite de logs) reste valide 7 jours sans possibilité de révocation, permettant à un attaquant de continuer à accéder à l'API après déconnexion de la victime.
- **Code actuel** :
  ```js
  // auth.service.js:136
  const logout = async (_userId) => {};
  ```
- **Fix** : Implémenter une blocklist de tokens en base de données :
  ```sql
  CREATE TABLE revoked_tokens (
    jti UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP NOT NULL
  );
  CREATE INDEX ON revoked_tokens (expires_at); -- pour le nettoyage
  ```
  ```js
  // auth.service.js — sign le token avec un jti
  const createAccessToken = (user) =>
    jwt.sign(
      { id: user.id, role: user.role, company_id: user.company_id ?? null, jti: crypto.randomUUID() },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

  // logout — insérer le jti dans la blocklist
  const logout = async (jti, expiresAt) => {
    const { RevokedToken } = require('../models');
    await RevokedToken.create({ jti, expires_at: new Date(expiresAt * 1000) });
  };

  // verifyToken.js — vérifier la blocklist
  const { RevokedToken } = require('../models');
  const revoked = await RevokedToken.findByPk(req.user.jti);
  if (revoked) return res.status(401).json({ error: 'Token revoked', code: 401 });
  ```
- **Note** : Choix architectural à valider — Redis est plus adapté que PostgreSQL pour la blocklist en production (TTL natif, performance). Si la complexité est trop élevée pour le MVP, raccourcir `JWT_EXPIRES_IN` à `15m` comme mesure palliative.

---

### [E6] Multer CVE — DoS via champs profondément imbriqués (GHSA-72gw-mp4g-v24j)

> `Action: AUTO-FIX` · `Fichier: server/package.json` · `Catégorie: A06 Vulnerable and Outdated Components` · `Dépend de: —`

- **Risque** : multer@2.1.1 est vulnérable à un déni de service via des noms de champs profondément imbriqués — un attaquant peut saturer le CPU du serveur sans authentification sur l'endpoint upload (CVSS 7.5).
- **Code actuel** :
  ```json
  "multer": "^2.1.1"
  ```
- **Fix** :
  ```bash
  cd server && npm update multer
  # ou : npm install multer@2.2.0
  ```

---

## 🟡 Moyenne

### [M1] Absence de rate limiting sur les endpoints d'authentification

> `Action: AUTO-FIX` · `Fichier: server/server.js, server/src/routes/auth.routes.js` · `Catégorie: A07 Identification and Authentication Failures — Brute Force` · `Dépend de: —`

- **Risque** : Aucune limite de tentatives sur `POST /api/auth/login` et `POST /api/auth/register` — brute force de mots de passe et création en masse de comptes possibles sans blocage.
- **Fix** :
  ```bash
  cd server && npm install express-rate-limit
  ```
  ```js
  // server.js — après les imports, avant app.use('/api', routes)
  const rateLimit = require('express-rate-limit');

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 tentatives par IP
    message: { error: 'Too many attempts, please try again later', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  ```

---

### [M2] `err.message` retourné brut au client (exposition de détails internes)

> `Action: AUTO-FIX` · `Fichier: server/src/middleware/errorHandler.js:22` · `Catégorie: A05 Security Misconfiguration — Information Disclosure` · `Dépend de: —`

- **Risque** : Pour les erreurs 500 non anticipées (erreurs Sequelize, exceptions JS), `err.message` peut exposer des détails du schéma DB, des noms de tables, ou des stack traces partielles au client.
- **Code actuel** :
  ```js
  // errorHandler.js:22
  res.status(status).json({ error: message, code: status });
  ```
- **Fix** :
  ```js
  // errorHandler.js
  const errorHandler = (err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    // En production, masquer les détails des erreurs 5xx
    const message =
      status < 500 || process.env.NODE_ENV !== 'production'
        ? err.message || 'Internal server error'
        : 'Internal server error';

    if (process.env.NODE_ENV !== 'test') {
      console.error(`[${status}] ${err.message}`, err.stack);
    }

    res.status(status).json({ error: message, code: status });
  };
  ```

---

### [M3] IDOR — Mise à jour du profil sans vérification de propriété

> `Action: AUTO-FIX` · `Fichier: server/src/routes/users.routes.js:52-62` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : `PUT /api/users/:id` est accessible à tout utilisateur authentifié sans vérifier qu'il modifie son propre profil — un employé peut modifier le nom de n'importe quel autre employé de la même entreprise.
- **Code actuel** :
  ```js
  // users.routes.js:52-62
  router.put(
    '/:id',
    verifyToken,
    [...validation...],
    usersController.update
  );
  ```
- **Fix** :
  ```js
  router.put(
    '/:id',
    verifyToken,
    (req, res, next) => {
      const isSelf = req.params.id === req.user.id;
      const isAdminOrEmployer = ['admin', 'employer'].includes(req.user.role);
      if (!isSelf && !isAdminOrEmployer) {
        return res.status(403).json({ error: 'Forbidden', code: 403 });
      }
      next();
    },
    [...validation...],
    usersController.update
  );
  ```

---

### [M4] Données entreprise exposées sans vérification d'appartenance

> `Action: AUTO-FIX` · `Fichiers: server/src/routes/companies.routes.js:76-81, server/src/services/companies.service.js:47-51` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : `GET /api/companies/:id` retourne la fiche complète d'une entreprise (dont `stripe_customer_id`, `stripe_subscription_id`, informations SIRET) à tout utilisateur authentifié, quelle que soit son entreprise.
- **Code actuel** :
  ```js
  // companies.routes.js:76-81
  router.get(
    '/:id',
    verifyToken,
    [param('id').isUUID()..., validate],
    companiesController.getById
  );
  ```
- **Fix** :
  ```js
  router.get(
    '/:id',
    verifyToken,
    (req, res, next) => {
      const isAdmin = req.user.role === 'admin';
      const isOwnCompany = req.params.id === req.user.company_id;
      if (!isAdmin && !isOwnCompany) {
        return res.status(403).json({ error: 'Forbidden', code: 403 });
      }
      next();
    },
    [param('id').isUUID()..., validate],
    companiesController.getById
  );
  ```

---

### [M5] Timing attack — login plus rapide pour emails inexistants

> `Action: AUTO-FIX` · `Fichier: server/src/services/auth.service.js:108-118` · `Catégorie: A07 Identification and Authentication Failures — Timing Attack` · `Dépend de: —`

- **Risque** : Quand l'email n'existe pas, `bcrypt.compare` est ignoré → la réponse est 10–100× plus rapide que pour un mauvais mot de passe. Un attaquant peut énumérer les emails valides en mesurant les temps de réponse.
- **Code actuel** :
  ```js
  // auth.service.js:108-114
  const user = await User.findOne({ where: { email: email.toLowerCase() }, ... });
  if (!user) {
    throw httpError('Invalid credentials', 401); // ← retourne immédiatement
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  ```
- **Fix** :
  ```js
  // auth.service.js
  const DUMMY_HASH = '$2b$12$invalidhashfortimingprotection00000000000000000000000u';

  const login = async ({ email, password }) => {
    const user = await User.findOne({ where: { email: email.toLowerCase() }, ... });

    // Toujours appeler bcrypt.compare — même si user est null — pour égaliser le timing
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      throw httpError('Invalid credentials', 401);
    }
    ...
  };
  ```

---

### [M6] form-data CRLF injection (GHSA-hmw2-7cc7-3qxx, CVSS 7.5)

> `Action: AUTO-FIX` · `Fichiers: client/package.json, server/package.json` · `Catégorie: A06 Vulnerable and Outdated Components` · `Dépend de: —`

- **Risque** : `form-data@<4.0.6` permet une injection CRLF dans les en-têtes HTTP via des noms de champs ou fichiers non échappés — peut altérer des requêtes HTTP sortantes.
- **Fix** :
  ```bash
  cd server && npm update
  cd ../client && npm update
  ```

---

### [M7] Enumération d'emails via code de statut différent à l'inscription

> `Action: AUTO-FIX` · `Fichier: server/src/services/auth.service.js:79` · `Catégorie: A07 Identification and Authentication Failures — Account Enumeration` · `Dépend de: —`

- **Risque** : `POST /api/auth/register` retourne 409 si l'email est déjà utilisé, permettant de confirmer l'existence d'un compte pour n'importe quelle adresse email.
- **Code actuel** :
  ```js
  // auth.service.js:79
  if (existing) throw httpError('Email already in use', 409);
  ```
- **Fix** : Retourner toujours 201 avec un message générique (le compte existe déjà ou a été créé) pour ne pas distinguer les deux cas. Si un email de confirmation est envoyé, le flux reste sécurisé :
  ```js
  if (existing) {
    // Retourne le même format que le succès mais sans créer de compte
    return {
      message: 'If this email is new, your account has been created.',
    };
  }
  ```
  Côté client, afficher systématiquement : *"Compte créé — vérifiez votre email."*

---

## ⚪ Faible

### [F1] Durée d'expiration du token d'accès trop longue (7 jours)

> `Action: VALIDATION MANUELLE` · `Fichier: server/src/services/auth.service.js:39, server/.env` · `Catégorie: A07 Identification and Authentication Failures` · `Dépend de: E5`

- **Risque** : Un token volé (XSS, fuite de logs) est utilisable 7 jours. Pour une app manipulant des tokens financiers, c'est une fenêtre excessive.
- **Fix** : Passer `JWT_EXPIRES_IN=15m` dans `.env` et les secrets Render, et s'assurer que le client frontend utilise bien le refresh token pour renouveler automatiquement (le flux `POST /api/auth/refresh` existe déjà).
- **Note** : À coordonner avec E5 — si la blocklist de révocation est implémentée, 15m garantit que même les tokens non révocables expirent rapidement.

---

### [F2] Validation MIME upload basée sur le header HTTP (spoofable)

> `Action: AUTO-FIX` · `Fichier: server/src/routes/upload.routes.js:32-35` · `Catégorie: A03 Injection — File Upload` · `Dépend de: —`

- **Risque** : `file.mimetype` est fourni par le client HTTP et peut être falsifié pour uploader un fichier d'un type non attendu. L'endpoint est admin-only (risque limité), mais un admin compromis pourrait uploader un fichier malveillant.
- **Fix** :
  ```bash
  cd server && npm install file-type
  ```
  ```js
  // upload.routes.js — remplacer fileFilter par une vérification post-upload
  const { fileTypeFromFile } = require('file-type');

  // Dans le handler après upload.array(...)
  for (const file of req.files) {
    const detected = await fileTypeFromFile(file.path);
    if (!detected || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detected.mime)) {
      fs.unlinkSync(file.path); // supprimer le fichier invalide
      return res.status(400).json({ error: 'Invalid file type detected', code: 400 });
    }
  }
  ```

---

### [F3] Absence de pagination sur les endpoints de liste

> `Action: VALIDATION MANUELLE` · `Fichiers: server/src/services/users.service.js:28-33, server/src/services/token.service.js:140` · `Catégorie: A04 Insecure Design — Resource Exhaustion` · `Dépend de: —`

- **Risque** : `GET /api/users`, `GET /api/tokens/transactions` et `GET /api/marketplace/admin/history` chargent toutes les lignes en mémoire sans limite — sur une base de données de taille réelle, cela peut provoquer des timeouts ou saturer la mémoire du serveur.
- **Fix** : Ajouter `limit` et `offset` à tous les endpoints de liste (exemple pour `users.service.js`) :
  ```js
  const list = async ({ role, companyId, limit = 50, offset = 0 } = {}) => {
    const where = {};
    if (role) where.role = role;
    if (companyId) where.company_id = companyId;
    return User.findAndCountAll({
      where,
      attributes: SAFE_ATTRIBUTES,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit, 10), 100), // max 100
      offset: parseInt(offset, 10),
    });
  };
  ```
- **Note** : Choix des valeurs par défaut et de la limite max à valider selon les besoins produit.

---

### [F4] Dépendances transitives avec CVE publiées (js-yaml, tar, esbuild)

> `Action: AUTO-FIX` · `Fichiers: server/package.json, client/package.json` · `Catégorie: A06 Vulnerable and Outdated Components` · `Dépend de: —`

- **Risque** : `js-yaml@<3.15.0` (DoS quadratique, CVSS 5.3), `tar@<7.5.7` (path traversal via hardlinks, CVSS 8.2 — dépendance de build), `esbuild@<=0.24.2` (dev-only, CVSS 5.3) ont des CVE publiées. Toutes sont des dépendances indirectes de build/dev sans exposition directe en production.
- **Fix** :
  ```bash
  cd server && npm update && npm audit fix
  cd ../client && npm update && npm audit fix
  # Pour les vulnérabilités nécessitant --force (esbuild via vite), évaluer l'impact avant
  ```
- **Note** : `tar` et `esbuild` sont des dépendances de tooling (build, préinstall) — non exposées à des inputs utilisateurs en runtime. Risque opérationnel faible, mais à corriger pour passer `npm audit` en CI.

---

## Findings non exploitables / faux positifs écartés

| Pattern détecté | Raison d'exclusion |
|---|---|
| `secrets_scan.txt:server/.env` — `JWT_SECRET=change_me_in_production` | Inclus comme C2 (secret faible). Le fichier n'est pas commité (`.gitignore` correct). |
| `secrets_scan.txt` — matches `password` dans les controllers | Variables nommées `password` reçoivent `req.body.password` (donnée utilisateur), jamais de secret hardcodé. |
| `sequelize.sync({ alter: true })` dans `server.js:85` | Conditionnel `if (NODE_ENV !== 'production')` — pas de risque en prod. Acceptable en dev. |
| `console.error(err.stack)` dans `errorHandler.js` | Uniquement écrit dans `stderr` serveur, pas retourné au client. Bonne pratique de logging. |
| CORS autorise les requêtes sans header `Origin` | Intentionnel pour les webhooks Stripe (pas de navigateur). Documenté dans le code. |
| `logout` sans `jti` dans l'implémentation actuelle | Listé en E5 avec le fix complet. Le JWT actuel est bien signé avec HS256 et `algorithms` forcé. |

---

## Plan d'exécution recommandé pour Claude Code

**Phase 1 — Critique (bloquant avant toute mise en production)**

1. `[C1]` AUTO-FIX : retirer `'admin'` de la validation `isIn` dans `server/src/routes/auth.routes.js:26`
2. `[C2]` VALIDATION MANUELLE : générer deux secrets JWT forts (`openssl rand -hex 64`) et les mettre à jour dans `server/.env` ET dans les secrets Render

**Phase 2 — Élevée (à corriger sous 48h)**

3. `[E6]` AUTO-FIX : `cd server && npm install multer@2.2.0`
4. `[E1]` AUTO-FIX : ajouter vérification d'ownership dans `tokens.routes.js` et `token.service.js:getBalance`
5. `[E2]` AUTO-FIX : ajouter guard + scope company dans `users.routes.js` et `users.service.js:history`
6. `[E3]` AUTO-FIX : ajouter vérification ownership dans `token.service.js:getTransaction`
7. `[E4]` VALIDATION MANUELLE : remplacer le wildcard CORS `*.vercel.app` par une liste explicite dans `server/server.js:46`
8. `[E5]` VALIDATION MANUELLE : implémenter blocklist token ou raccourcir `JWT_EXPIRES_IN` à `15m`

**Phase 3 — Moyenne**

9. `[M1]` AUTO-FIX : installer `express-rate-limit` et l'appliquer sur `/api/auth/login` et `/api/auth/register`
10. `[M2]` AUTO-FIX : masquer `err.message` pour les erreurs 5xx en production dans `errorHandler.js`
11. `[M3]` AUTO-FIX : ajouter vérification `isSelf || isAdminOrEmployer` dans `PUT /api/users/:id`
12. `[M4]` AUTO-FIX : ajouter vérification d'appartenance dans `GET /api/companies/:id`
13. `[M5]` AUTO-FIX : ajouter dummy hash bcrypt dans `auth.service.js:login`
14. `[M6]` AUTO-FIX : `cd server && npm update && cd ../client && npm update`
15. `[M7]` AUTO-FIX : retourner toujours 201 dans `auth.service.js:register`

**Phase 4 — Faible (avant passage en mode live)**

16. `[F1]` VALIDATION MANUELLE : passer `JWT_EXPIRES_IN=15m` dans `.env` et Render
17. `[F2]` AUTO-FIX : installer `file-type` et vérifier les magic bytes dans `upload.routes.js`
18. `[F3]` VALIDATION MANUELLE : ajouter pagination `limit`/`offset` sur tous les endpoints de liste
19. `[F4]` AUTO-FIX : `npm audit fix` dans `/server` et `/client`

---

*Rapport généré par analyse statique — ne couvre pas les tests d'intrusion dynamiques ni la sécurité des déploiements infrastructure (Render/Vercel hardening, WAF, DDoS protection).*
