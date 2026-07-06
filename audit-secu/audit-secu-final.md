# PRIM'O — Rapport de sécurité final consolidé (audits 1 → 5)

**Date de consolidation** : 2026-07-02
**Périmètre** : backend Node.js/Express + frontend React/TypeScript, PostgreSQL/Sequelize, JWT HS256, Stripe, Docker.
**Objet** : ce document récapitule **toutes les modifications de code effectivement appliquées** suite aux vulnérabilités identifiées lors des 5 passes d'audit successives, ainsi que les points laissés ouverts (avec justification).

Rapports détaillés par passe : [audit-secu1.md](audit-secu1.md) · [audit-secu2.md](audit-secu2.md) · [audit-secu3.md](audit-secu3.md) · [audit-secu4.md](audit-secu4.md) · [audit-secu5.md](audit-secu5.md).

---

## 1. Bilan chiffré

| | Findings détectés | Corrigés (code modifié) | Ouverts (validation manuelle / déploiement) |
|---|---|---|---|
| **Audit 1** | 19 | 13 | 6 |
| **Audit 2** | 7 (3 nouveaux + 4 persistants) | 3 | 4 |
| **Audit 3** | 5 nouveaux | 3 | 2 |
| **Audit 4** | 5 nouveaux | 5 | 0 |
| **Audit 5** | 4 nouveaux | 3 | 1 (non applicable) |
| **Total corrigé** | | **27 corrections de code appliquées** | |

**Sévérité des failles corrigées** : 2 critiques · 8 élevées · 9 moyennes · 8 faibles.
**Aucune faille critique ou élevée exploitable ne subsiste dans le code applicatif.** Les points ouverts sont soit des décisions de déploiement (CORS, secrets Render), soit des choix produit (pagination, logs), soit des CVE transitives sans exposition runtime.

---

## 2. Corrections appliquées — Contrôle d'accès (OWASP A01)

### C1 — Escalade de privilège via register public *(Critique)*
Fichier : [server/src/routes/auth.routes.js](../server/src/routes/auth.routes.js)
`POST /api/auth/register` acceptait `role: "admin"`. Le rôle admin a été retiré de la whitelist.
```js
// AVANT : .isIn(['employer', 'employee', 'admin'])
// APRÈS :
body('role').isIn(['employer', 'employee']).withMessage('Role must be employer or employee'),
```
La création d'admin ne passe plus que par `POST /api/companies/admin` (protégé `roleGuard('admin')`).

### E1 — IDOR sur le solde token *(Élevée)*
Fichiers : [tokens.routes.js](../server/src/routes/tokens.routes.js) · [token.service.js](../server/src/services/token.service.js)
Ajout d'un middleware d'ownership sur `GET /tokens/balance/:userId` + scoping `company_id` dans `getBalance` : un employeur/manager ne peut lire que les soldes de sa propre entreprise, un employé que le sien.

### E2 — IDOR sur l'historique de transactions *(Élevée)*
Fichiers : [users.routes.js](../server/src/routes/users.routes.js) · [users.service.js](../server/src/services/users.service.js)
Guard `isSelf || employer/manager/admin` sur `GET /users/:id/history` + scoping `company_id` dans `history()`.

### E3 — IDOR sur le détail d'une transaction *(Élevée)*
Fichier : [token.service.js](../server/src/services/token.service.js)
`getTransaction(id, requester)` vérifie désormais `isAdmin || isInvolved || isSameCompany` avant de retourner la transaction.

### M3 — IDOR sur la mise à jour de profil *(Moyenne)*
Fichier : [users.routes.js](../server/src/routes/users.routes.js)
`PUT /users/:id` protégé par un guard `isSelf || isAdminOrEmployer`.

### M4 — Données entreprise exposées *(Moyenne)*
Fichier : [companies.routes.js](../server/src/routes/companies.routes.js)
`GET /companies/:id` protégé par `isAdmin || isOwnCompany` (empêche la lecture des `stripe_customer_id`, SIRET, etc. d'autres entreprises).

### E-N4 — IDOR inter-entreprise sur `GET /users` *(Élevée — audit 4)*
Fichier : [users.controller.js](../server/src/controllers/users.controller.js)
Un employeur pouvait lister les utilisateurs de n'importe quelle entreprise via `?companyId=`. Le contrôleur force désormais le scope :
```js
const query = { ...req.query };
if (req.user.role !== 'admin') {
  query.companyId = req.user.company_id; // écrase toute valeur cliente
}
```

### F5-A — Sur-portée manager sur `GET /transactions/:id` *(Faible — audit 5)*
Fichier : [token.service.js](../server/src/services/token.service.js)
`getTransaction` autorisait un manager à lire toute transaction de l'entreprise. Il est désormais restreint aux transactions de son équipe (aligné sur `listTransactions`) ; l'employeur conserve la visibilité entreprise.

---

## 3. Corrections appliquées — Authentification & sessions (OWASP A07)

### C4-1 — Changement de mot de passe non-fonctionnel *(Critique — audit 4)*
Fichiers : [users.routes.js](../server/src/routes/users.routes.js) · [users.service.js](../server/src/services/users.service.js) · [users.controller.js](../server/src/controllers/users.controller.js) · [client/src/services/user.service.ts](../client/src/services/user.service.ts) · [client/src/pages/MotDePasse.tsx](../client/src/pages/MotDePasse.tsx)

Le formulaire envoyait `{ current_password, password }` à `PUT /users/:id`, dont la whitelist ignore ces champs → l'utilisateur voyait « Mot de passe modifié » alors que **rien ne changeait**. Correction complète :
- Nouvel endpoint `PATCH /users/:id/password` (garde self-only + validation).
- `changePassword()` : vérifie l'ancien mot de passe via `bcrypt.compare`, re-hashe le nouveau (12 rounds).
- Client corrigé pour appeler le bon endpoint.

### M1 — Absence de rate limiting *(Moyenne)*
Fichiers : [server.js](../server/server.js) · dépendance `express-rate-limit`
`authLimiter` (10 req/15 min) appliqué sur `/api/auth/login` et `/api/auth/register`.

### M5 — Timing attack à la connexion *(Moyenne)*
Fichier : [auth.service.js](../server/src/services/auth.service.js)
`bcrypt.compare` est désormais toujours exécuté (via un `DUMMY_HASH` quand l'email est inconnu) pour égaliser le temps de réponse et empêcher l'énumération d'emails.

### M7 — Énumération d'email au register *(Moyenne)*
Fichier : [auth.service.js](../server/src/services/auth.service.js)
`register` retourne un message générique identique que l'email existe ou non (plus de distinction 201/409).

### M-N4A / M5-A — Normalisation d'email incomplète puis complétée *(Moyenne — audits 4 & 5)*
Fichiers : [auth.service.js](../server/src/services/auth.service.js) · [auth.routes.js](../server/src/routes/auth.routes.js) · [manager.service.js](../server/src/services/manager.service.js) · [companies.service.js](../server/src/services/companies.service.js) · [manager.routes.js](../server/src/routes/manager.routes.js) · [companies.routes.js](../server/src/routes/companies.routes.js)

Le login normalisait l'email en minuscules mais pas la création → comptes inaccessibles et doublons (UNIQUE PostgreSQL sensible à la casse). Corrigé sur **les trois chemins de création** :
- `auth.register` (audit 4) : `email.toLowerCase()` + `.normalizeEmail()` sur la route.
- `manager.createEmployee` (audit 5) : `email.toLowerCase()` avant find + create.
- `companies.adminCreate` (audit 5) : `employer_email.toLowerCase()` pour la company ET l'user.
- `.normalizeEmail()` ajouté sur les routes `manager /employees` et `companies /admin`.

### F-N4A — `/auth/refresh` sans rate limiting *(Faible — audit 4)*
Fichier : [server.js](../server/server.js)
`authLimiter` étendu à `/api/auth/refresh` (empêchait le rafraîchissement illimité d'access tokens depuis un refresh token volé).

---

## 4. Corrections appliquées — Intégrité des données & conception (OWASP A04)

### E-N3 — Webhook Stripe non-idempotent *(Élevée — audit 2)*
Fichier : [stripe.service.js](../server/src/services/stripe.service.js)
Un retry Stripe pouvait créditer deux fois les tokens. Ajout d'un contrôle d'idempotence avant la transaction :
```js
const existingTx = await TokenTransaction.findOne({
  where: { stripe_payment_id: invoice.payment_intent, type: 'purchase' },
});
if (existingTx) return;
```

### M-N3A — Suppression d'entreprise sans transaction *(Moyenne — audit 3)*
Fichier : [companies.service.js](../server/src/services/companies.service.js)
`remove()` enchaînait 5 `destroy()` indépendants → état incohérent possible en cas d'échec partiel. Le tout est désormais enveloppé dans `sequelize.transaction()` avec commit/rollback atomiques.

### F5-C — Création d'entreprise publique non throttlée *(Faible — audit 5)*
Fichier : [server.js](../server/server.js)
`POST /api/companies` (public, self-onboarding) n'avait aucune limite → spam d'enregistrements. Ajout d'un `publicWriteLimiter` (20 req/15 min) ciblant les POST sur cette route.

---

## 5. Corrections appliquées — Injection & upload (OWASP A03)

### F2 → E-N1 — Validation d'upload par magic bytes *(Faible puis Élevée — audits 1 & 2)*
Fichier : [upload.routes.js](../server/src/routes/upload.routes.js)
- Audit 1 : le type MIME était basé sur le header HTTP (falsifiable). Ajout d'une vérification des **magic bytes** via `file-type` avec suppression du fichier si type invalide.
- Audit 2 : `file-type@18` était vulnérable à une boucle infinie (DoS) sur fichier ASF malformé. Montée en `file-type@22` (ESM-only) via **import dynamique** `await import('file-type')` dans le handler async, sans conversion du fichier en `.mjs`.

---

## 6. Corrections appliquées — Configuration & composants (OWASP A05 / A06)

### M2 — Fuite de détails internes dans les erreurs 5xx *(Moyenne — audit 1)*
Fichier : [errorHandler.js](../server/src/middleware/errorHandler.js)
`err.message` n'est plus renvoyé au client pour les erreurs ≥ 500 en production (message générique). Les détails restent loggés côté serveur.

### F-N3A — Conteneur Docker exécuté en root *(Faible — audit 3)*
Fichier : [server/Dockerfile](../server/Dockerfile)
Ajout de `RUN chown -R node:node /app` + `USER node` dans le stage production (limite l'impact d'une éventuelle RCE).

### E6 / M6 / F-N2 — Dépendances vulnérables mises à jour
- **multer** `2.1.1 → 2.2.0` (E6, DoS champs imbriqués — audit 1).
- **form-data** mis à jour (M6, injection CRLF — audit 1).
- **vite / esbuild** montés en dernière version côté client (F-N2 — audit 2) → **client : 0 vulnérabilité**.

### F-N3B — Commentaire JSDoc trompeur *(Faible — audit 3)*
Fichier : [companies.service.js](../server/src/services/companies.service.js)
Le JSDoc d'`adminCreate` mentionnait un mot de passe par défaut « Primo2026 » inexistant dans le code → corrigé en « password is required, bcrypt 12 rounds ».

### F-N4B — Énumération d'email entreprise via 409 *(Faible — audit 4)*
Fichier : [companies.service.js](../server/src/services/companies.service.js)
Le message d'erreur 409 de `create()` révélait qu'un email était déjà pris → rendu générique.

---

## 7. Points ouverts (non corrigés dans le code — action externe ou décision requise)

| ID | Titre | Sévérité | Raison de non-correction |
|----|-------|----------|--------------------------|
| **C2 / M-P1** | Secrets JWT placeholder dans `.env` local | 🔴→🟡 | **Non-risque en prod** : Render injecte de vrais secrets aléatoires (confirmé). `.env` non tracké par git. |
| **E4** | CORS accepte `*.vercel.app` | 🟠 | À restreindre aux URLs Vercel exactes **au déploiement final**. |
| **E5** | Logout stateless (token non révocable) | 🟠 | Décision produit : réduire `JWT_EXPIRES_IN` à 15 min **ou** blocklist des refresh tokens. |
| **E-N2** | JWT stocké en `localStorage` (risque XSS) | 🟠 | Changement architectural (cookies `HttpOnly`) à arbitrer. |
| **M-N3B** | SSL PostgreSQL `rejectUnauthorized: false` | 🟡 | Risque quasi nul sur réseau privé Render ; défense en profondeur. |
| **M-N3C** | Credentials dev en clair dans `docker-compose.yml` | 🟡 | Dev only ; à migrer vers `.env` racine. |
| **M-P2** | Absence de pagination sur les listes | 🟡 | Choix produit ; à faire avant le 1er pilote à volume réel. |
| **F1** | `JWT_EXPIRES_IN` = 7 jours | ⚪ | Choix produit (corrélé à E5). |
| **F-N1** | CVE `uuid` (transitif Sequelize) | ⚪ | Pas de fix non-cassant tant que Sequelize ne supporte pas uuid v11. Usage non exposé. |
| **F-N3** | Clés Stripe TEST réelles dans `.env` local | ⚪ | Bonne pratique ; clés test, non tracké par git. |
| **F-N4** | Absence de logs de sécurité structurés | ⚪ | Choix produit (pino + transport). |
| **F5-B** | CVE `tar` (transitif bcrypt → node-pre-gyp) | ⚪ | **Correction tentée puis abandonnée** : l'override `tar@^7` casse l'arbre (node-pre-gyp épingle l'API tar v6). **Aucune exposition runtime** — `tar` n'est utilisé qu'à l'installation du binaire prébuilt bcrypt. À traiter via un futur bump majeur de bcrypt, testé en CI. |

### Précision sur F5-B (tentative du 2026-07-02)
Un `overrides: { "tar": "^7.5.7" }` a été ajouté à la racine du workspace puis **retiré** après vérification : npm n'honore pas l'override (tar reste en 6.2.1) car `@mapbox/node-pre-gyp@1.0.11` requiert l'API tar v6, et le forcer laisse l'installation dans un état cassé (bcrypt introuvable). L'état des `package.json` et lockfiles a été restauré ; bcrypt reste fonctionnel. Recommandation : **ne rien forcer**, documenter l'exception.

---

## 8. Points positifs confirmés (aucune action nécessaire)

- **Transactions atomiques** systématiques là où des soldes bougent : `token.allocate`, `manager.giveTokens`, `marketplace.redeem`, `companies.remove/grantTokens/adminCreate`, `employer.createAllocation` — toutes avec `sequelize.transaction()` + `lock: true` (SELECT FOR UPDATE).
- **Webhook Stripe** : signature vérifiée via `constructEvent` + idempotence.
- **bcrypt 12 rounds** + hash factice anti-timing.
- **`verifyToken`** force `algorithms: ['HS256']` (pas de confusion d'algorithme / `alg:none`).
- **`teamScope`** : un manager ne peut créditer qu'un employé de son équipe.
- **Whitelists d'update** strictes empêchant l'escalade de rôle/solde (`users.update` = name/first_name uniquement, etc.).
- **Aucun secret hardcodé** dans le code source (les seules occurrences sont dans `server/.env`, non tracké).

---

## 9. Feuille de route sécurité restante (avant mise en production réelle)

**Bloquant déploiement**
1. **E4** — Renseigner la whitelist CORS avec les URLs Vercel exactes.
2. **C2** — Confirmer que les secrets JWT Render sont bien aléatoires et distincts des placeholders locaux (déjà vérifié, à re-confirmer avant go-live).

**Fortement recommandé**
3. **E5 + F1** — Réduire `JWT_EXPIRES_IN` à 15 min et implémenter la révocation des refresh tokens.
4. **E-N2** — Migrer le stockage des tokens vers des cookies `HttpOnly; Secure; SameSite=Strict`.

**Avant montée en charge**
5. **M-P2** — Pagination sur `GET /users`, `/tokens/transactions`, `/marketplace/admin/history`.
6. **F-N4** — Logs de sécurité structurés (login_failed, token_invalid, 403).

**Maintenance dépendances**
7. **F5-B / F-N1** — Suivre les releases bcrypt (fix `tar`) et Sequelize (fix `uuid`) ; corriger via bump majeur testé en CI.

---

*Rapport de synthèse basé sur 5 passes d'analyse statique (lecture de code + npm audit + scan de patterns). Ne remplace pas un test d'intrusion dynamique ni un audit de l'infrastructure de déploiement (Render/Vercel hardening, WAF, protection DDoS), recommandés avant l'ouverture à des données d'entreprise réelles.*
