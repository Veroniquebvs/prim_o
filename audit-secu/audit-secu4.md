# Audit de sécurité — PRIM'O (4ème passe)

**Date** : 2026-07-02
**Stack détectée** : Node.js/Express, React/TypeScript, PostgreSQL/Sequelize, JWT HS256, Stripe, Docker
**Fichiers analysés** : client/src/pages/MotDePasse.tsx, client/src/services/api.ts, client/src/services/user.service.ts, server/src/services/users.service.js, server/src/controllers/users.controller.js, server/src/routes/users.routes.js, server/src/services/companies.service.js, server/server.js, server/src/routes/auth.routes.js, server/src/models/ScheduledAllocation.js
**Outils utilisés** : npm audit, grep patterns, lecture croisée client↔serveur
**Audit précédent** : audit-secu/audit-secu3.md (2026-07-02 — 3 AUTO-FIX appliqués)

---

## Résumé

| Sévérité | Nouveaux | Persistants (audits 1–3) |
|----------|----------|--------------------------|
| 🔴 Critique | 1 | 0 |
| 🟠 Élevée | 1 | 2 |
| 🟡 Moyenne | 1 | 3 |
| ⚪ Faible | 2 | 4 |

**Nouveaux findings auto-fixables** : 4 / **Nécessitant validation manuelle** : 0

---

## ✅ Résolu depuis audit-secu3.md

| ID | Titre | Vérification |
|----|-------|-------------|
| M-N3A | `remove()` entreprise sans transaction | `companies.service.js:111-130` — wrappé dans `sequelize.transaction()`, commit/rollback atomiques ✅ |
| F-N3A | Docker en tant que root | `server/Dockerfile:16-17` — `chown -R node:node /app` + `USER node` ✅ |
| F-N3B | Commentaire JSDoc Primo2026 | `companies.service.js:163` — mention supprimée ✅ |

---

## 🔴 Critique — Nouveau

### [C4-1] Formulaire de changement de mot de passe silencieusement non-fonctionnel

> `Action: AUTO-FIX` · `Fichiers: server/src/services/users.service.js:72, server/src/routes/users.routes.js:52, client/src/pages/MotDePasse.tsx:109` · `Catégorie: A07 Auth Failures — perte de contrôle du compte` · `Dépend de: —`

- **Risque** : La page `MotDePasse.tsx` envoie `{ current_password, password }` à `PUT /users/:id`, mais la whitelist serveur n'autorise que `['name', 'first_name']` — les champs de mot de passe sont silencieusement ignorés. L'API renvoie 200, le client affiche "Mot de passe modifié avec succès." alors que **le mot de passe n'a pas changé**. Aucun endpoint de changement de mot de passe n'existe côté serveur. Conséquence directe : un utilisateur qui pense avoir changé son mot de passe après une compromission reste vulnérable avec l'ancien mot de passe toujours valide.
- **Code actuel** :
  ```ts
  // MotDePasse.tsx:109 — envoie les champs qui seront ignorés
  await userService.update(user.id, { current_password: current, password: next });
  ```
  ```js
  // users.service.js:72 — whitelist silencieuse
  const allowed = ['name', 'first_name']; // current_password et password ignorés
  allowed.forEach((key) => { if (body[key] !== undefined) user[key] = body[key]; });
  ```
- **Fix — Étape 1 : ajouter l'endpoint serveur**
  ```js
  // server/src/routes/users.routes.js — ajouter après la route PUT /:id :
  router.patch(
    '/:id/password',
    verifyToken,
    (req, res, next) => {
      if (req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden', code: 403 });
      }
      next();
    },
    [
      param('id').isUUID().withMessage('id must be a valid UUID'),
      body('current_password').notEmpty().withMessage('current_password is required'),
      body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
      validate,
    ],
    usersController.changePassword
  );
  ```
  ```js
  // server/src/services/users.service.js — ajouter la fonction :
  const bcrypt = require('bcrypt');
  const BCRYPT_ROUNDS = 12;

  const changePassword = async (id, { current_password, password }) => {
    const user = await User.findByPk(id);
    if (!user) throw httpError('User not found', 404);

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) throw httpError('Mot de passe actuel incorrect', 401);

    user.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await user.save();
  };
  ```
  ```js
  // server/src/controllers/users.controller.js — ajouter le handler :
  const changePassword = async (req, res, next) => {
    try {
      await usersService.changePassword(req.params.id, req.body);
      res.json({ success: true, message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  };
  // Penser à exporter changePassword dans module.exports
  ```
- **Fix — Étape 2 : corriger l'appel client**
  ```ts
  // client/src/services/user.service.ts — ajouter :
  async changePassword(id: string, current_password: string, password: string): Promise<void> {
    await api.patch(`/users/${id}/password`, { current_password, password });
  },
  ```
  ```ts
  // client/src/pages/MotDePasse.tsx:109 — remplacer l'appel :
  // AVANT : await userService.update(user.id, { current_password: current, password: next });
  // APRÈS :
  await userService.changePassword(user.id, current, next);
  ```

---

## 🟠 Élevée — Nouveau

### [E-N4] IDOR sur `GET /users` — un employer lit les utilisateurs de toute entreprise

> `Action: AUTO-FIX` · `Fichier: server/src/controllers/users.controller.js:13` · `Catégorie: A01 Broken Access Control — IDOR` · `Dépend de: —`

- **Risque** : `GET /users` est accessible aux `employer` et `admin`. Le contrôleur passe `req.query` directement au service sans forcer `company_id` à la valeur de l'employeur authentifié. Un employer peut donc : (1) appeler `GET /users?companyId=AUTRE_UUID` pour lister les employés d'une autre entreprise ; (2) appeler `GET /users` sans filtre pour obtenir **tous les utilisateurs de toute la plateforme** (noms + emails). Les mots de passe sont exclus (SAFE_ATTRIBUTES), mais les PII (nom, email, rôle) de tous les comptes sont exposées.
- **Code actuel** :
  ```js
  // users.controller.js:13-18
  const list = async (req, res, next) => {
    try {
      const data = await usersService.list(req.query); // req.query non scopé
      res.json({ success: true, data });
    }
  };
  ```
- **Fix** :
  ```js
  // users.controller.js — forcer le scope pour les non-admins :
  const list = async (req, res, next) => {
    try {
      const query = { ...req.query };
      if (req.user.role !== 'admin') {
        query.companyId = req.user.company_id; // écrase toute valeur fournie par le client
      }
      const data = await usersService.list(query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
  ```

---

## 🟠 Élevée — Persistants depuis audit-secu2.md

### [E4] CORS wildcard *.vercel.app (non résolu)

Voir audit-secu2.md. À appliquer lors du déploiement final.

### [E5] Logout stateless (non résolu)

Voir audit-secu2.md. Option A (réduire JWT à 15min) ou Option B (blocklist refresh tokens).

---

## 🟡 Moyenne — Nouveau

### [M-N4A] Email non normalisé au register — comptes potentiellement inaccessibles

> `Action: AUTO-FIX` · `Fichier: server/src/routes/auth.routes.js:23` · `Catégorie: A07 Auth Failures — lockout` · `Dépend de: —`

- **Risque** : Le login normalise l'email en minuscules (`email.toLowerCase()` dans `auth.service.js:113`) avant la recherche DB, mais le register stocke l'email tel qu'envoyé. Un utilisateur qui s'inscrit avec `Jean@Example.COM` se voit créer un compte, mais ne peut plus se connecter — le login cherche `jean@example.com` (inexistant en DB). Le compte est définitivement inaccessible sans intervention manuelle. PostgreSQL traitant `UNIQUE` de manière case-sensitive, `Jean@Example.COM` et `jean@example.com` peuvent coexister en DB comme deux comptes distincts.
- **Code actuel** :
  ```js
  // auth.routes.js:23 — isEmail() sans normalisation
  body('email').isEmail().withMessage('Valid email is required'),
  ```
  ```js
  // auth.service.js:80 — email stocké tel quel (sans toLowerCase)
  const existing = await User.findOne({ where: { email } });
  // ...
  await User.create({ ..., email, ... });
  ```
- **Fix** :
  ```js
  // auth.routes.js:23 — ajouter .normalizeEmail() :
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ```
  ```js
  // auth.service.js:80 — normaliser avant stockage :
  const register = async ({ name, first_name, email, password, role, company_id }) => {
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    // ...
    await User.create({ ..., email: normalizedEmail, ... });
  ```
  ```js
  // Même correctif pour manager.service.js:57 (createEmployee) :
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  // ...
  await User.create({ ..., email: email.toLowerCase(), ... });
  ```

---

## 🟡 Moyenne — Persistants depuis audits précédents

### [M-N3B] SSL PostgreSQL `rejectUnauthorized: false` (non résolu)

Voir audit-secu3.md. Non urgent sur Render (réseau privé).

### [M-P1] JWT secrets locaux faibles (non critique — Render ok)

Voir audit-secu2.md.

### [M-P2] Absence de pagination (non résolu)

Voir audit-secu2.md.

---

## ⚪ Faible — Nouveaux

### [F-N4A] `/auth/refresh` sans rate limiting

> `Action: AUTO-FIX` · `Fichier: server/server.js:79-80` · `Catégorie: A07 Auth Failures` · `Dépend de: —`

- **Risque** : L'`authLimiter` (10 req/15min) protège `/login` et `/register` mais pas `/auth/refresh`. Un attaquant ayant capturé un refresh token (via XSS — voir E-N2) peut générer des access tokens indéfiniment sans jamais se faire bloquer. Impact amplifié si E5 (stateless logout) n'est pas corrigé : après que la victime se déconnecte, le refresh token reste valide et non révocable.
- **Code actuel** :
  ```js
  // server.js:79-80 — /auth/refresh non protégé
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  ```
- **Fix** :
  ```js
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/refresh', authLimiter);
  ```

---

### [F-N4B] Énumération d'email entreprise via `POST /companies` (409 vs 201)

> `Action: AUTO-FIX` · `Fichier: server/src/services/companies.service.js:29-31` · `Catégorie: A01 Broken Access Control — énumération` · `Dépend de: —`

- **Risque** : La création publique d'entreprise retourne `409` si l'email est déjà pris, `201` sinon. N'importe qui peut énumérer quels emails d'entreprise sont enregistrés sur la plateforme en testant `POST /companies` sans avoir besoin d'être authentifié. Impact faible (emails professionnels rarement secrets) mais constitue une fuite d'information non nécessaire.
- **Code actuel** :
  ```js
  // companies.service.js:29-31
  if (existing) throw httpError('A company with this email already exists', 409);
  ```
- **Fix** : Retourner un message générique sans distinguer email pris / pas pris :
  ```js
  if (existing) {
    // Ne pas révéler si l'email est déjà enregistré
    return existing; // Renvoyer silencieusement l'existant, ou :
    // throw httpError('Registration processed', 200); — selon la logique produit souhaitée
  }
  ```
- **Note** : Deux approches possibles selon le choix produit — (A) retourner silencieusement la company existante (idempotent) ; (B) renvoyer un message générique "Si cet email est nouveau, votre entreprise a été créée." Choisir A si le flux UX tolère l'idempotence.

---

## ⚪ Faible — Persistants depuis audits précédents

| ID | Titre | Statut |
|----|-------|--------|
| F-N1 | uuid CVE via Sequelize | 🔶 Pas de fix disponible |
| F-N3 | Clés Stripe TEST réelles dans .env local | 🔶 Bonne pratique |
| F-N4 (audit2) | Absence de log de sécurité | 🔶 Choix produit |
| F1 | JWT_EXPIRES_IN 7 jours | 🔶 Choix produit |

---

## Findings écartés (faux positifs vérifiés)

- **Race condition token refresh (api.ts)** — La flag `_retry` est par requête. Si plusieurs 401 arrivent simultanément, plusieurs refreshes s'exécutent en parallèle. Les refresh tokens JWT étant stateless, tous réussissent. Performance légèrement dégradée mais aucune fuite ou bypass de sécurité.
- **Open redirect MotDePasse.tsx** — `from` vient de `location.state` (React Router interne), pas d'un query param URL contrôlable par l'attaquant. Pas de risque.
- **`excluded_user_ids` non validé UUID** — Utilisé dans `Op.notIn` (Sequelize paramétré). Une valeur non-UUID provoque une erreur PostgreSQL proprement catchée et retournée en 500. Pas d'injection possible.
- **GitHub Actions** — Aucun fichier workflow trouvé dans `.github/`. Pipeline CI/CD non encore configuré pour ce dépôt.

---

## État global des findings (synthèse 4 audits)

| ID | Titre | Sévérité | Statut |
|----|-------|----------|--------|
| C1 | Register rôle admin | 🔴 | ✅ Résolu audit1 |
| C4-1 | Changement de mot de passe non-fonctionnel | 🔴 | 🆕 AUTO-FIX disponible |
| E1 | IDOR balance | 🟠 | ✅ Résolu audit1 |
| E2 | IDOR historique | 🟠 | ✅ Résolu audit1 |
| E3 | IDOR transaction | 🟠 | ✅ Résolu audit1 |
| E-N1 | file-type DoS | 🟠 | ✅ Résolu audit2 |
| E-N3 | Stripe idempotency | 🟠 | ✅ Résolu audit2 |
| E-N4 | IDOR GET /users inter-entreprise | 🟠 | 🆕 AUTO-FIX disponible |
| E4 | CORS wildcard *.vercel.app | 🟠 | 🔶 Ouvert — déploiement |
| E5 | Logout stateless | 🟠 | 🔶 Ouvert — validation manuelle |
| E-N2 | JWT en localStorage | 🟠 | 🔶 Ouvert — validation manuelle |
| M1–M7 | Rate limiting, error masking, timing... | 🟡 | ✅ Résolu audit1 |
| M-N3A | `remove()` sans transaction | 🟡 | ✅ Résolu audit3 |
| M-N3B | SSL rejectUnauthorized | 🟡 | 🔶 Non urgent (Render) |
| M-N3C | Credentials docker-compose git | 🟡 | 🔶 Ouvert — validation manuelle |
| M-N4A | Email non normalisé au register | 🟡 | 🆕 AUTO-FIX disponible |
| M-P1 | JWT secrets locaux faibles | 🟡 | 🔶 Non critique (Render ok) |
| M-P2 | Pas de pagination | 🟡 | 🔶 Ouvert — choix produit |
| F2 | Magic bytes upload | ⚪ | ✅ Résolu audit1 |
| F-N2 | vite/esbuild CVEs (dev) | ⚪ | ✅ Résolu audit2 |
| F-N3A | Docker root | ⚪ | ✅ Résolu audit3 |
| F-N3B | Commentaire Primo2026 | ⚪ | ✅ Résolu audit3 |
| F-N4A | /auth/refresh sans rate limit | ⚪ | 🆕 AUTO-FIX disponible |
| F-N4B | Énumération email entreprise 409 | ⚪ | 🆕 AUTO-FIX disponible |
| F-N1 | uuid CVE Sequelize | ⚪ | 🔶 Pas de fix dispo |
| F-N3 | Stripe test keys .env | ⚪ | 🔶 Bonne pratique |
| F1 | JWT 7 jours | ⚪ | 🔶 Choix produit |

---

## Plan d'exécution recommandé

### AUTO-FIX prioritaire (immédiat)

1. **[C4-1]** Implémenter `PATCH /users/:id/password` côté serveur + corriger l'appel client dans `MotDePasse.tsx`. C'est le seul finding qui crée une fausse impression de sécurité chez l'utilisateur.
2. **[E-N4]** Forcer `query.companyId = req.user.company_id` dans `users.controller.js` pour les non-admins.
3. **[M-N4A]** Ajouter `.normalizeEmail()` dans `auth.routes.js` + `email.toLowerCase()` dans `auth.service.js` et `manager.service.js`.
4. **[F-N4A]** Ajouter `app.use('/api/auth/refresh', authLimiter)` dans `server.js`.
5. **[F-N4B]** Rendre la réponse de `POST /companies` générique sur email déjà pris.
