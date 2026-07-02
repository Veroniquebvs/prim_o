# Audit de sécurité — PRIM'O (3ème passe)

**Date** : 2026-07-02
**Stack détectée** : Node.js/Express, React/TypeScript, PostgreSQL/Sequelize, JWT HS256, Stripe, Docker
**Fichiers analysés** : 52 fichiers (server/src complet + models + Dockerfile + docker-compose + client ciblé)
**Outils utilisés** : npm audit (serveur + client), grep patterns, lecture manuelle
**Audit précédent** : audit-secu/audit-secu2.md (2026-07-02 — 3 AUTO-FIX appliqués)

---

## Résumé

| Sévérité | Nouveaux | Persistants (audits 1 & 2) |
|----------|----------|---------------------------|
| 🔴 Critique | 0 | 0 |
| 🟠 Élevée | 0 | 2 |
| 🟡 Moyenne | 3 | 3 |
| ⚪ Faible | 2 | 4 |

**Nouveaux findings auto-fixables** : 3 / **Nécessitant validation manuelle** : 2

---

## ✅ Résolu depuis audit-secu2.md

| ID | Titre | Vérification |
|----|-------|-------------|
| E-N1 | file-type DoS (GHSA-5v7r-6r5c-r473) | `upload.routes.js:50` — `await import('file-type')` dynamique, version 22.0.1 installée ✅ |
| E-N3 | Stripe webhook non-idempotent | `stripe.service.js:69-72` — `existingTx` check avant transaction ✅ |
| F-N2 | vite + esbuild CVEs (dev) | `npm audit` client → **0 vulnérabilité** ✅ |

---

## 🟠 Élevée — Persistants depuis audit-secu2.md

### [E4] CORS wildcard *.vercel.app avec credentials (non résolu)

> `Action: VALIDATION MANUELLE` · `Fichier: server/server.js:47` · `Catégorie: A05 Misconfiguration — CORS`

Voir audit-secu2.md pour le détail et le fix. À appliquer au moment du déploiement final avec les URLs Vercel exactes.

---

### [E5] Logout stateless — tokens non révocables (non résolu)

> `Action: VALIDATION MANUELLE` · `Fichier: server/src/services/auth.service.js:141` · `Catégorie: A07 Auth Failures`

Voir audit-secu2.md pour les deux options (réduire durée JWT ou blocklist en DB).

---

## 🟡 Moyenne — Nouveaux

### [M-N3A] Suppression d'entreprise sans transaction PostgreSQL

> `Action: AUTO-FIX` · `Fichier: server/src/services/companies.service.js:106-124` · `Catégorie: A04 Insecure Design — intégrité des données` · `Dépend de: —`

- **Risque** : La fonction `remove` effectue 5 destructions successives (Redemption → TokenTransaction → User → Company) sans enveloppe de transaction. Un échec réseau ou une contrainte FK à mi-parcours laisse la base dans un état incohérent — des Redemptions supprimées avec des Users encore présents, ou vice-versa.
- **Code actuel** :
  ```js
  // companies.service.js:106 — 5 destroy() indépendants, aucune transaction
  const remove = async (id) => {
    const company = await Company.findByPk(id);
    if (!company) throw httpError('Company not found', 404);
    const users = await User.findAll({ where: { company_id: id } });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await Redemption.destroy({ where: { user_id: userIds } });          // peut réussir...
      await TokenTransaction.destroy({ where: { ... } });                 // ...mais ci-dessous échoue
      await User.destroy({ where: { company_id: id } });
    }
    await TokenTransaction.destroy({ where: { company_id: id } });
    await company.destroy();
  };
  ```
- **Fix** :
  ```js
  const remove = async (id) => {
    const { User, TokenTransaction, Redemption } = require('../models');
    const company = await Company.findByPk(id);
    if (!company) throw httpError('Company not found', 404);

    const t = await sequelize.transaction();
    try {
      const users = await User.findAll({ where: { company_id: id }, transaction: t });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await Redemption.destroy({ where: { user_id: userIds }, transaction: t });
        await TokenTransaction.destroy({
          where: { [Op.or]: [{ sender_id: userIds }, { receiver_id: userIds }] },
          transaction: t,
        });
        await User.destroy({ where: { company_id: id }, transaction: t });
      }

      await TokenTransaction.destroy({ where: { company_id: id }, transaction: t });
      await company.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  };
  ```
- **Note** : `sequelize` est déjà importé dans le fichier (`const sequelize = require('../config/database')`). `Op` doit être ajouté à l'import existant : `const { Op } = require('sequelize');`.

---

### [M-N3B] SSL PostgreSQL avec `rejectUnauthorized: false` en production

> `Action: VALIDATION MANUELLE` · `Fichiers: server/src/config/database.js:27, server/src/config/sequelize-config.js:7,24` · `Catégorie: A02 Cryptographic Failures — transport` · `Dépend de: —`

- **Risque** : La connexion PostgreSQL en production n'authentifie pas le certificat SSL du serveur de base de données. Un attaquant ayant accès au réseau intermédiaire peut monter une attaque MITM pour intercepter ou altérer les requêtes DB. Sur Render, l'API et la DB partagent le même réseau privé (risque pratique très réduit), mais ce n'est pas une garantie architecturale.
- **Code actuel** :
  ```js
  // database.js:27
  { ssl: { require: true, rejectUnauthorized: false } }
  ```
- **Fix** : Configurer le certificat CA de Render pour valider le certificat serveur :
  ```bash
  # Télécharger le CA cert Render (disponible dans le dashboard DB → Connect → SSL)
  # L'ajouter dans server/ et le référencer dans l'env
  ```
  ```js
  // database.js
  const fs = require('fs');
  const sslCa = process.env.NODE_ENV === 'production' && process.env.DB_SSL_CA
    ? fs.readFileSync(process.env.DB_SSL_CA)
    : undefined;

  dialectOptions: process.env.NODE_ENV === 'production'
    ? { ssl: { require: true, rejectUnauthorized: true, ca: sslCa } }
    : {},
  ```
  ```
  # server/.env — ajouter :
  DB_SSL_CA=./certs/render-ca.crt
  ```
- **Note** : Sur Render, le réseau privé réduit le risque à quasi-zéro en pratique. Ce fix est recommandé pour une posture de sécurité défense en profondeur, pas urgent pour le MVP.

---

### [M-N3C] Credentials de développement hardcodés dans docker-compose.yml (commité en git)

> `Action: VALIDATION MANUELLE` · `Fichier: docker-compose.yml:8-10,35-37` · `Catégorie: A02 Cryptographic Failures — gestion des secrets` · `Dépend de: —`

- **Risque** : `POSTGRES_PASSWORD: primo_password` et `JWT_SECRET: dev_jwt_secret_change_in_production` sont écrits en clair dans `docker-compose.yml`, qui est suivi par git. Ces valeurs sont dans l'historique du dépôt et accessibles à tous les collaborateurs et aux forks. Pour le dev local, le risque est faible (ce sont des credentials dev) — mais si un développeur utilise ce compose en staging sans modifier les valeurs, les secrets faibles se retrouvent dans un environnement semi-exposé.
- **Code actuel** :
  ```yaml
  # docker-compose.yml:8-10
  environment:
    POSTGRES_PASSWORD: primo_password
  # ...
  # docker-compose.yml:35-37
    JWT_SECRET: dev_jwt_secret_change_in_production
    JWT_REFRESH_SECRET: dev_refresh_secret_change_in_production
  ```
- **Fix** : Utiliser des variables d'environnement lues depuis un fichier `.env` non commité :
  ```yaml
  # docker-compose.yml — remplacer les valeurs en dur par des références :
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-primo_dev_password}
  api:
    environment:
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret_local}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-dev_refresh_secret_local}
  ```
  ```bash
  # .env (à la racine, déjà dans .gitignore via la règle *.env ou à y ajouter)
  POSTGRES_PASSWORD=primo_dev_password_local
  JWT_SECRET=dev_jwt_secret_local
  JWT_REFRESH_SECRET=dev_refresh_secret_local
  ```
- **Note** : `docker compose` lit automatiquement `.env` à la racine. Les valeurs fallback `:-primo_dev_password` assurent que les nouveaux collaborateurs peuvent `docker compose up` sans créer le `.env`. Valider que `.env` (racine) est bien dans `.gitignore` — actuellement seuls `server/.env` et `client/.env` sont explicitement ignorés.

---

## 🟡 Moyenne — Persistants depuis audit-secu2.md

### [M-P1] JWT_SECRET locaux faibles (non résolu)

Voir audit-secu2.md — non critique (Render utilise de vrais secrets).

### [M-P2] Absence de pagination sur les endpoints liste (non résolu)

Voir audit-secu2.md — à implémenter avant le premier pilote entreprise.

---

## ⚪ Faible — Nouveaux

### [F-N3A] Dockerfile Node.js exécuté en tant que root

> `Action: AUTO-FIX` · `Fichier: server/Dockerfile` · `Catégorie: A05 Misconfiguration — container` · `Dépend de: —`

- **Risque** : Aucune directive `USER` dans le Dockerfile serveur — le processus Node.js tourne en `root` dans le conteneur. En cas de compromission de l'application (RCE), l'attaquant obtient les droits root dans le conteneur et peut potentiellement s'échapper vers l'hôte.
- **Code actuel** :
  ```dockerfile
  FROM base AS production
  RUN npm ci --only=production
  COPY . .
  EXPOSE 5000
  CMD ["node", "server.js"]
  ```
- **Fix** :
  ```dockerfile
  FROM base AS production
  RUN npm ci --only=production
  COPY . .
  # Créer un utilisateur non-root et transférer la propriété des fichiers
  RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
      && chown -R appuser:appgroup /app
  USER appuser
  EXPOSE 5000
  CMD ["node", "server.js"]
  ```
- **Note** : `node:20-alpine` inclut déjà un utilisateur `node` — on peut simplifier en utilisant directement `USER node` si le `WORKDIR /app` appartient à root. Dans ce cas, ajouter `RUN chown -R node:node /app` avant `USER node`.

---

### [F-N3B] Commentaire JSDoc trompeur — mot de passe par défaut fictif

> `Action: AUTO-FIX` · `Fichier: server/src/services/companies.service.js:163` · `Catégorie: documentation — risque d'erreur dev` · `Dépend de: —`

- **Risque** : Le JSDoc de `adminCreate` indique "defaulting to 'Primo2026' if not provided" mais le code n'implémente aucun mot de passe par défaut. Un développeur lisant ce commentaire pourrait supposer qu'un compte admin avec `Primo2026` comme mot de passe est créé automatiquement et ne pas modifier la valeur en prod.
- **Code actuel** :
  ```js
  // companies.service.js:163
  * Hashes the employer's password (defaulting to 'Primo2026' if not provided).
  ```
- **Fix** :
  ```js
  * Hashes the employer's password with bcrypt (12 rounds). password is required.
  ```

---

## ⚪ Faible — Persistants depuis audits précédents

### [F-N1] uuid CVE (GHSA-w5hq-g745-h8pq) via Sequelize — risque réel ~0 (non résolu)

Voir audit-secu2.md — aucun fix disponible sans breaking change Sequelize.

### [F-N3] Clés Stripe TEST réelles dans .env local (non résolu)

Voir audit-secu2.md — utiliser des placeholders et stocker les vraies clés hors du répertoire projet.

### [F-N4] Absence de log de sécurité structuré (non résolu)

Voir audit-secu2.md — ajouter logs JSON sur `login_failed`, `token_invalid`, `403_forbidden`.

### [F1] JWT_EXPIRES_IN à 7 jours (non résolu)

Voir audit-secu1.md — réduire à 15min + refresh à 7j pour limiter la fenêtre de vol.

---

## Findings écartés (faux positifs vérifiés dans cet audit)

- **Console.log dans cron.service.js** — `console.log('[cron] Scheduled allocations cron started')` ne logue aucune donnée sensible. Acceptable.
- **Secrets dans tests** — `JWT_SECRET = 'test_access_secret'` dans les tests d'intégration est le pattern correct (secrets de test isolés, pas de vraies valeurs).
- **client/.dockerignore manquant** — Le client dispose bien d'un `.dockerignore` avec `node_modules`, `.env`, `.env.local`, `*.log`, `coverage`, `build`, `.git`. Pas de finding.
- **`@mapbox/node-pre-gyp` / `tar` (high)** — Dépendances de compilation de native addons, non exposées au runtime de l'API. Pas de vecteur d'exploitation via les routes HTTP.

---

## État global des findings (synthèse 3 audits)

| ID | Titre | Sévérité | Statut |
|----|-------|----------|--------|
| C1 | Register rôle admin | 🔴 | ✅ Résolu (audit1) |
| E1 | IDOR balance | 🟠 | ✅ Résolu (audit1) |
| E2 | IDOR historique | 🟠 | ✅ Résolu (audit1) |
| E3 | IDOR transaction | 🟠 | ✅ Résolu (audit1) |
| E-N1 | file-type DoS | 🟠 | ✅ Résolu (audit2) |
| E-N3 | Stripe idempotency | 🟠 | ✅ Résolu (audit2) |
| M1 | Rate limiting | 🟡 | ✅ Résolu (audit1) |
| M2 | Error masking prod | 🟡 | ✅ Résolu (audit1) |
| M3 | IDOR PUT user | 🟡 | ✅ Résolu (audit1) |
| M4 | IDOR GET company | 🟡 | ✅ Résolu (audit1) |
| M5 | Timing attack login | 🟡 | ✅ Résolu (audit1) |
| M7 | Énumération email | 🟡 | ✅ Résolu (audit1) |
| F2 | Magic bytes upload | ⚪ | ✅ Résolu (audit1) |
| F-N2 | vite/esbuild CVEs | ⚪ | ✅ Résolu (audit2) |
| E4 | CORS wildcard | 🟠 | 🔶 Ouvert — validation manuelle |
| E5 | Logout stateless | 🟠 | 🔶 Ouvert — validation manuelle |
| E-N2 | JWT localStorage | 🟠 | 🔶 Ouvert — validation manuelle |
| M-N3A | Remove sans transaction | 🟡 | 🆕 AUTO-FIX disponible |
| M-N3B | SSL rejectUnauthorized | 🟡 | 🆕 Validation manuelle |
| M-N3C | Credentials docker-compose | 🟡 | 🆕 Validation manuelle |
| M-P1 | JWT secrets locaux faibles | 🟡 | 🔶 Non critique (Render ok) |
| M-P2 | Pas de pagination | 🟡 | 🔶 Ouvert — choix produit |
| F-N3A | Docker root | ⚪ | 🆕 AUTO-FIX disponible |
| F-N3B | Commentaire Primo2026 | ⚪ | 🆕 AUTO-FIX disponible |
| F-N1 | uuid CVE | ⚪ | 🔶 No fix disponible |
| F-N3 | Stripe test keys .env | ⚪ | 🔶 Ouvert — bonne pratique |
| F-N4 | Logs sécurité | ⚪ | 🔶 Ouvert — choix produit |
| F1 | JWT 7 jours | ⚪ | 🔶 Ouvert — choix produit |

---

## Plan d'exécution recommandé

### AUTO-FIX (3 items, < 20 min)

1. **[M-N3A]** Envelopper `remove()` dans une transaction PostgreSQL — `companies.service.js:106`.
2. **[F-N3A]** Ajouter `USER node` (ou `USER appuser`) dans `server/Dockerfile`.
3. **[F-N3B]** Corriger le commentaire JSDoc — `companies.service.js:163`.

### VALIDATION MANUELLE prioritaires

4. **[M-N3C]** Migrer les credentials `docker-compose.yml` vers des variables `.env` racine.
5. **[E4]** Whitelist CORS exacte lors du déploiement final.
6. **[E-N2]** Décider architecture JWT : localStorage vs cookies HttpOnly.
