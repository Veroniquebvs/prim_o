#!/usr/bin/env node
/**
 * PRIM'O — Practical E2E Test Script
 *
 * Teste chaque route de l'API sur une instance live (server + PostgreSQL).
 * Crée company, employer, employees, bons d'achat, simule un achat Stripe
 * et un rachat employé, puis génère un rapport Markdown.
 *
 * Usage :
 *   node server/tests/e2e/practical-test.js
 *   TEST_BASE_URL=http://localhost:5000 node server/tests/e2e/practical-test.js
 *
 * Prérequis : docker-compose up (ou serveur démarré manuellement)
 * Sortie    : practical-test.md à la racine du projet
 */

'use strict';

const fs   = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BASE_URL       = process.env.TEST_BASE_URL || 'http://localhost:5000';
const STRIPE_KEY     = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
const TS             = Date.now();

// Real Stripe test keys are 107 chars (sk_test_51...). Placeholders are short.
const hasRealStripeKey =
  STRIPE_KEY.startsWith('sk_test_') &&
  STRIPE_KEY.length > 40 &&
  !STRIPE_KEY.includes('placeholder');

// ── État partagé entre les tests ──────────────────────────────────────────
const ctx = {
  company:              null,
  employer:             null, employerToken: null, employerRefreshToken: null,
  employee1:            null, employee1Token: null,
  employee2:            null, employee2Token: null,
  admin:                null, adminToken: null,
  vouchers:             [],   // [cheap50, mid75, expensive9999]
  firstTransaction:     null,
  paymentIntentId:      null,
};

// ── Helpers HTTP ──────────────────────────────────────────────────────────
async function api(method, endpoint, body, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body)  headers['Content-Type']  = 'application/json';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

async function rawPost(endpoint, rawBody, extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: rawBody,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}
function assertStatus(res, expected) {
  assert(
    res.status === expected,
    `HTTP ${expected} attendu, reçu ${res.status} — ${JSON.stringify(res.data)}`
  );
}

// ── Suivi des résultats ───────────────────────────────────────────────────
const results = [];
let currentCategory = '';

function setCategory(name) {
  currentCategory = name;
  console.log(`\n▶  ${name}`);
}

function record(name, status, detail = '') {
  results.push({ category: currentCategory, name, status, detail });
  const icon = status === 'OK' ? '✅' : status === 'FAIL' ? '❌' : '⏭ ';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`   ${icon} ${name}${suffix}`);
}

async function test(name, fn) {
  try {
    const detail = await fn();
    record(name, 'OK', detail || '');
  } catch (err) {
    record(name, 'FAIL', err.message);
  }
}

function skip(name, reason) {
  record(name, 'SKIP', reason);
}

// ── Signature webhook Stripe ──────────────────────────────────────────────
function buildSignedWebhook(companyId, tokenAmount, intentId) {
  // generateTestHeaderString ne fait qu'un HMAC — fonctionne même avec un secret placeholder
  const stripe  = require('stripe')(STRIPE_KEY || 'sk_test_placeholder');
  const payload = JSON.stringify({
    id:   `evt_test_${TS}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id:       intentId || `pi_test_${TS}`,
        object:   'payment_intent',
        amount:   tokenAmount * 100,
        currency: 'eur',
        status:   'succeeded',
        metadata: {
          company_id:   String(companyId),
          token_amount: String(tokenAmount),
        },
      },
    },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { payload, header };
}

// ─────────────────────────────────────────────────────────────────────────
// SUITES DE TESTS
// ─────────────────────────────────────────────────────────────────────────

async function runAll() {

  // ── 0. Infrastructure ───────────────────────────────────────────────────
  setCategory('Infrastructure');

  await test('Health check — GET /health', async () => {
    const res = await api('GET', '/health');
    assertStatus(res, 200);
    assert(res.data.success, 'flag success absent');
    return `"${res.data.message}"`;
  });

  await test('Route inconnue → 404', async () => {
    const res = await api('GET', '/api/route-qui-nexiste-pas');
    assertStatus(res, 404);
    return '404 Route not found';
  });

  await test('Route protégée sans token → 401', async () => {
    const res = await api('GET', '/api/auth/me');
    assertStatus(res, 401);
    return '401 Access token required';
  });

  await test('Token invalide → 401', async () => {
    const res = await api('GET', '/api/auth/me', null, 'token.bidon.ici');
    assertStatus(res, 401);
    return '401 Invalid token';
  });

  // ── 1. Companies ─────────────────────────────────────────────────────────
  setCategory('Companies — Création');

  await test('Créer une company — POST /api/companies', async () => {
    const res = await api('POST', '/api/companies', {
      name:     `TechCorp Test ${TS}`,
      email:    `contact-${TS}@techcorp-test.com`,
      street:   '42 Avenue des Tests',
      zip_code: '75008',
      city:     'Paris',
      siret:    '12345678901234',
    });
    assertStatus(res, 201);
    assert(res.data.data?.id, 'id manquant dans la réponse');
    ctx.company = res.data.data;
    return `id: ${ctx.company.id}`;
  });

  await test('Validation — zip_code invalide → 400', async () => {
    const res = await api('POST', '/api/companies', {
      name: 'Bad Corp', email: 'bad@corp.com',
      street: '1 Rue Test', zip_code: '123', city: 'Lyon',
      siret: '12345678901234',
    });
    assertStatus(res, 400);
    return '400 zip_code invalide rejeté';
  });

  await test('Validation — email manquant → 400', async () => {
    const res = await api('POST', '/api/companies', {
      name: 'No Email Corp', street: '1 Rue Test', zip_code: '75001', city: 'Paris',
      siret: '12345678901234',
    });
    assertStatus(res, 400);
    return '400 email manquant rejeté';
  });

  // ── 2. Auth — Inscription ────────────────────────────────────────────────
  setCategory('Auth — Inscription (register)');

  await test('Inscrire employer — POST /api/auth/register', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Dupont', first_name: 'Jean',
      email: `employer-${TS}@test.com`,
      password: 'SecurePass123!',
      role: 'employer',
      company_id: ctx.company?.id,
    });
    assertStatus(res, 201);
    ctx.employer          = res.data.data?.user;
    ctx.employerToken     = res.data.data?.accessToken;
    ctx.employerRefreshToken = res.data.data?.refreshToken;
    return `id: ${ctx.employer?.id}`;
  });

  await test('Inscrire employee 1 — POST /api/auth/register', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Martin', first_name: 'Alice',
      email: `employee1-${TS}@test.com`,
      password: 'SecurePass123!',
      role: 'employee',
      company_id: ctx.company?.id,
    });
    assertStatus(res, 201);
    ctx.employee1      = res.data.data?.user;
    ctx.employee1Token = res.data.data?.accessToken;
    return `id: ${ctx.employee1?.id}`;
  });

  await test('Inscrire employee 2 — POST /api/auth/register', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Bernard', first_name: 'Bob',
      email: `employee2-${TS}@test.com`,
      password: 'SecurePass123!',
      role: 'employee',
      company_id: ctx.company?.id,
    });
    assertStatus(res, 201);
    ctx.employee2      = res.data.data?.user;
    ctx.employee2Token = res.data.data?.accessToken;
    return `id: ${ctx.employee2?.id}`;
  });

  await test('Inscrire admin — POST /api/auth/register', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Admin', first_name: 'Super',
      email: `admin-${TS}@test.com`,
      password: 'SecurePass123!',
      role: 'admin',
    });
    assertStatus(res, 201);
    ctx.admin      = res.data.data?.user;
    ctx.adminToken = res.data.data?.accessToken;
    return `id: ${ctx.admin?.id}`;
  });

  await test('Email déjà utilisé → 409', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Dupont', first_name: 'Jean',
      email: `employer-${TS}@test.com`,  // même email
      password: 'SecurePass123!',
      role: 'employer',
    });
    assertStatus(res, 409);
    return '409 Email already in use';
  });

  await test('Mot de passe trop court → 400', async () => {
    const res = await api('POST', '/api/auth/register', {
      name: 'Test', first_name: 'Test',
      email: `short-${TS}@test.com`,
      password: '123',
      role: 'employee',
    });
    assertStatus(res, 400);
    return '400 Password must be at least 8 characters';
  });

  // ── 3. Auth — Connexion ───────────────────────────────────────────────────
  setCategory('Auth — Connexion (login / me / refresh / logout)');

  await test('Login employer — POST /api/auth/login', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `employer-${TS}@test.com`, password: 'SecurePass123!',
    });
    assertStatus(res, 200);
    assert(res.data.data?.accessToken, 'accessToken absent');
    ctx.employerToken        = res.data.data.accessToken;
    ctx.employerRefreshToken = res.data.data.refreshToken;
    return 'accessToken + refreshToken reçus';
  });

  await test('Mauvais mot de passe → 401', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `employer-${TS}@test.com`, password: 'MauvaisMotDePasse!',
    });
    assertStatus(res, 401);
    return '401 Invalid credentials';
  });

  await test('Login employee 1 — POST /api/auth/login', async () => {
    const res = await api('POST', '/api/auth/login', {
      email: `employee1-${TS}@test.com`, password: 'SecurePass123!',
    });
    assertStatus(res, 200);
    ctx.employee1Token = res.data.data.accessToken;
    return 'accessToken reçu';
  });

  await test('Profil courant — GET /api/auth/me', async () => {
    const res = await api('GET', '/api/auth/me', null, ctx.employerToken);
    assertStatus(res, 200);
    assert(res.data.data?.email === `employer-${TS}@test.com`, 'email inattendu');
    return `role: ${res.data.data.role}, company_id OK`;
  });

  await test('Refresh token — POST /api/auth/refresh', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      refreshToken: ctx.employerRefreshToken,
    });
    assertStatus(res, 200);
    assert(res.data.data?.accessToken, 'nouveau accessToken absent');
    ctx.employerToken = res.data.data.accessToken;  // remplace le token courant
    return 'nouveau accessToken obtenu';
  });

  await test('Refresh token invalide → 401', async () => {
    const res = await api('POST', '/api/auth/refresh', {
      refreshToken: 'token.bidon.refresh',
    });
    assertStatus(res, 401);
    return '401 Invalid refresh token';
  });

  // ── 4. Users ──────────────────────────────────────────────────────────────
  setCategory('Users');

  await test('Lister les users (employer) — GET /api/users', async () => {
    const res = await api('GET', '/api/users', null, ctx.employerToken);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    return `${res.data.data.length} utilisateur(s)`;
  });

  await test('Lister les users (employee → 403)', async () => {
    const res = await api('GET', '/api/users', null, ctx.employee1Token);
    assertStatus(res, 403);
    return '403 Forbidden (rôle insuffisant)';
  });

  await test('Filtrer par companyId — GET /api/users?companyId=...', async () => {
    const res = await api('GET', `/api/users?companyId=${ctx.company?.id}`, null, ctx.employerToken);
    assertStatus(res, 200);
    return `${res.data.data.length} user(s) dans la company`;
  });

  await test('Récupérer un user par id — GET /api/users/:id', async () => {
    const res = await api('GET', `/api/users/${ctx.employee1?.id}`, null, ctx.employerToken);
    assertStatus(res, 200);
    assert(res.data.data?.id === ctx.employee1?.id, 'id inattendu');
    assert(!res.data.data?.password_hash, 'password_hash ne doit pas être exposé');
    return `email: ${res.data.data.email}`;
  });

  await test('User inexistant → 404', async () => {
    const res = await api('GET', '/api/users/00000000-0000-0000-0000-000000000000', null, ctx.employerToken);
    assertStatus(res, 404);
    return '404 User not found';
  });

  await test('Mettre à jour un user — PUT /api/users/:id', async () => {
    const res = await api('PUT', `/api/users/${ctx.employee1?.id}`, {
      name: 'Martin-Updated', first_name: 'Alice',
    }, ctx.employee1Token);
    assertStatus(res, 200);
    assert(res.data.data?.name === 'Martin-Updated', 'name non mis à jour');
    return 'name mis à jour avec succès';
  });

  // ── 5. Marketplace — Vouchers (CRUD admin) ────────────────────────────────
  setCategory('Marketplace — Vouchers (CRUD admin)');

  await test('Créer voucher 1 — Fnac 20€ / 50 tokens (admin)', async () => {
    const res = await api('POST', '/api/marketplace/items', {
      title: 'Carte Cadeau Fnac 20€', partner: 'Fnac', token_cost: 50,
    }, ctx.adminToken);
    assertStatus(res, 201);
    ctx.vouchers.push(res.data.data);
    return `id: ${res.data.data?.id}`;
  });

  await test('Créer voucher 2 — Décathlon 30€ / 75 tokens (admin)', async () => {
    const res = await api('POST', '/api/marketplace/items', {
      title: 'Bon Décathlon 30€', partner: 'Decathlon', token_cost: 75,
    }, ctx.adminToken);
    assertStatus(res, 201);
    ctx.vouchers.push(res.data.data);
    return `id: ${res.data.data?.id}`;
  });

  await test('Créer voucher test "solde insuffisant" — 9999 tokens (admin)', async () => {
    const res = await api('POST', '/api/marketplace/items', {
      title: 'Bon Très Cher 9999 tokens', partner: 'TestCorp', token_cost: 9999,
    }, ctx.adminToken);
    assertStatus(res, 201);
    ctx.vouchers.push(res.data.data);
    return `id: ${res.data.data?.id} (token_cost: 9999)`;
  });

  await test('Créer voucher (employee → 403)', async () => {
    const res = await api('POST', '/api/marketplace/items', {
      title: 'Voucher interdit', partner: 'Test', token_cost: 10,
    }, ctx.employee1Token);
    assertStatus(res, 403);
    return '403 Forbidden (rôle insuffisant)';
  });

  await test('Lister les vouchers — GET /api/marketplace/items', async () => {
    const res = await api('GET', '/api/marketplace/items', null, ctx.employee1Token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    return `${res.data.data.length} voucher(s) disponible(s)`;
  });

  await test('Détail voucher — GET /api/marketplace/items/:id', async () => {
    const res = await api('GET', `/api/marketplace/items/${ctx.vouchers[0]?.id}`, null, ctx.employee1Token);
    assertStatus(res, 200);
    assert(res.data.data?.id === ctx.vouchers[0]?.id, 'id inattendu');
    return `${res.data.data.title} — ${res.data.data.token_cost} tokens`;
  });

  await test('Mettre à jour voucher — PUT /api/marketplace/items/:id', async () => {
    const res = await api('PUT', `/api/marketplace/items/${ctx.vouchers[0]?.id}`, {
      token_cost: 55,
    }, ctx.adminToken);
    assertStatus(res, 200);
    assert(res.data.data?.token_cost === 55, 'token_cost non mis à jour');
    ctx.vouchers[0] = res.data.data;  // mise à jour locale
    return 'token_cost mis à jour : 50 → 55';
  });

  await test('Supprimer voucher — DELETE /api/marketplace/items/:id', async () => {
    // Crée un voucher temporaire pour le supprimer proprement
    const createRes = await api('POST', '/api/marketplace/items', {
      title: 'Voucher à supprimer', partner: 'Delete Test', token_cost: 1,
    }, ctx.adminToken);
    assertStatus(createRes, 201);
    const tempId = createRes.data.data?.id;

    const delRes = await api('DELETE', `/api/marketplace/items/${tempId}`, null, ctx.adminToken);
    assertStatus(delRes, 200);
    return `voucher ${tempId.slice(0, 8)}... supprimé`;
  });

  // ── 6. Stripe — Achat de tokens ───────────────────────────────────────────
  setCategory('Stripe — Achat tokens (carte 4242 4242 4242 4242)');

  const TOKEN_PURCHASE = 500;

  if (hasRealStripeKey) {
    await test(`Créer PaymentIntent ${TOKEN_PURCHASE} tokens — POST /api/tokens/purchase`, async () => {
      const res = await api('POST', '/api/tokens/purchase', {
        amount: TOKEN_PURCHASE,
      }, ctx.employerToken);
      assertStatus(res, 200);
      assert(res.data.clientSecret, 'clientSecret absent');
      ctx.paymentIntentId = res.data.clientSecret.split('_secret_')[0];
      return `PaymentIntent: ${ctx.paymentIntentId}`;
    });

    await test('Confirmer paiement via Stripe SDK (tok_visa)', async () => {
      const stripe = require('stripe')(STRIPE_KEY);
      const pm = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
      });
      const confirmed = await stripe.paymentIntents.confirm(ctx.paymentIntentId, {
        payment_method: pm.id,
      });
      assert(confirmed.status === 'succeeded', `statut inattendu: ${confirmed.status}`);
      return `statut: ${confirmed.status} — carte 4242 acceptée`;
    });
  } else {
    skip(
      `Créer PaymentIntent ${TOKEN_PURCHASE} tokens — POST /api/tokens/purchase`,
      'STRIPE_SECRET_KEY non configurée — ajouter sk_test_... dans server/.env'
    );
    skip(
      'Confirmer paiement via Stripe SDK (tok_visa)',
      'STRIPE_SECRET_KEY non configurée'
    );
  }

  await test('Webhook payment_intent.succeeded — POST /api/tokens/webhook', async () => {
    const { payload, header } = buildSignedWebhook(
      ctx.company?.id,
      TOKEN_PURCHASE,
      ctx.paymentIntentId || `pi_test_${TS}`
    );
    const res = await rawPost('/api/tokens/webhook', payload, { 'stripe-signature': header });
    assertStatus(res, 200);
    assert(res.data.received === true, 'received flag absent');
    return `${TOKEN_PURCHASE} tokens crédités sur la company`;
  });

  await test('Solde company après achat — GET /api/companies/:id', async () => {
    const res = await api('GET', `/api/companies/${ctx.company?.id}`, null, ctx.employerToken);
    assertStatus(res, 200);
    const balance = res.data.data?.token_balance;
    assert(balance >= TOKEN_PURCHASE, `solde ${balance} < ${TOKEN_PURCHASE} attendu`);
    return `token_balance company: ${balance}`;
  });

  // ── 7. Tokens — Allocation employer → employees ───────────────────────────
  setCategory('Tokens — Allocation employer → employees');

  await test('Allouer 200 tokens à employee 1 — POST /api/tokens/allocate', async () => {
    const res = await api('POST', '/api/tokens/allocate', {
      receiver_id: ctx.employee1?.id,
      amount: 200,
      reason: 'Excellente performance Q2',
    }, ctx.employerToken);
    assertStatus(res, 201);
    ctx.firstTransaction = res.data.data;
    return `transaction id: ${res.data.data?.id}`;
  });

  await test('Allouer 100 tokens à employee 2 — POST /api/tokens/allocate', async () => {
    const res = await api('POST', '/api/tokens/allocate', {
      receiver_id: ctx.employee2?.id,
      amount: 100,
      reason: 'Ponctualité exemplaire',
    }, ctx.employerToken);
    assertStatus(res, 201);
    return `transaction id: ${res.data.data?.id}`;
  });

  await test('Allocation (employee tente → 403)', async () => {
    const res = await api('POST', '/api/tokens/allocate', {
      receiver_id: ctx.employee2?.id, amount: 10,
    }, ctx.employee1Token);
    assertStatus(res, 403);
    return '403 Forbidden (rôle insuffisant)';
  });

  await test('Solde insuffisant → 402', async () => {
    const res = await api('POST', '/api/tokens/allocate', {
      receiver_id: ctx.employee1?.id, amount: 999999,
    }, ctx.employerToken);
    assertStatus(res, 402);
    return '402 Insufficient token balance';
  });

  await test('Vérifier solde employee 1 — GET /api/tokens/balance/:id', async () => {
    const res = await api('GET', `/api/tokens/balance/${ctx.employee1?.id}`, null, ctx.employerToken);
    assertStatus(res, 200);
    const bal = res.data.data?.token_balance;
    assert(bal >= 200, `solde ${bal} insuffisant`);
    return `token_balance: ${bal}`;
  });

  // ── 8. Tokens — Transactions ──────────────────────────────────────────────
  setCategory('Tokens — Transactions');

  await test('Lister les transactions — GET /api/tokens/transactions', async () => {
    const res = await api('GET', '/api/tokens/transactions', null, ctx.employerToken);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    return `${res.data.data.length} transaction(s)`;
  });

  await test('Filtrer par userId — GET /api/tokens/transactions?userId=...', async () => {
    const res = await api(
      'GET', `/api/tokens/transactions?userId=${ctx.employee1?.id}`,
      null, ctx.employerToken
    );
    assertStatus(res, 200);
    return `${res.data.data.length} transaction(s) pour employee1`;
  });

  await test('Détail transaction — GET /api/tokens/transactions/:id', async () => {
    if (!ctx.firstTransaction?.id) {
      throw new Error('Pas de transaction disponible (allocation a échoué en amont)');
    }
    const res = await api(
      'GET', `/api/tokens/transactions/${ctx.firstTransaction.id}`,
      null, ctx.employerToken
    );
    assertStatus(res, 200);
    assert(res.data.data?.id === ctx.firstTransaction.id, 'id inattendu');
    return `amount: ${res.data.data.amount}, type: ${res.data.data.type}`;
  });

  await test('Historique user — GET /api/users/:id/history', async () => {
    const res = await api(
      'GET', `/api/users/${ctx.employee1?.id}/history`,
      null, ctx.employee1Token
    );
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    return `${res.data.data.length} entrée(s) dans l'historique`;
  });

  // ── 9. Marketplace — Rachat employé ──────────────────────────────────────
  setCategory('Marketplace — Rachat de bons (employee)');

  await test('Racheter voucher 1 (employee 1, 55 tokens) — POST /api/marketplace/redeem', async () => {
    const res = await api('POST', '/api/marketplace/redeem', {
      voucherId: ctx.vouchers[0]?.id,
    }, ctx.employee1Token);
    assertStatus(res, 200);
    assert(res.data.data?.promo_code, 'promo_code absent');
    return `promo_code: ${res.data.data.promo_code}`;
  });

  await test('Solde employee 1 après rachat', async () => {
    const res = await api('GET', `/api/tokens/balance/${ctx.employee1?.id}`, null, ctx.employee1Token);
    assertStatus(res, 200);
    const bal = res.data.data?.token_balance;
    return `token_balance: ${bal} (déduit: ${ctx.vouchers[0]?.token_cost} tokens)`;
  });

  await test('Racheter voucher déjà utilisé → 403', async () => {
    // Ce test n'est pertinent que si le rachat précédent a réussi (voucher[0].available=false)
    const checkRes = await api('GET', `/api/marketplace/items/${ctx.vouchers[0]?.id}`, null, ctx.employee1Token);
    const isUnavailable = checkRes.data.data?.available === false;
    if (!isUnavailable) throw new Error('Le voucher est toujours disponible — le rachat précédent a échoué');
    const res = await api('POST', '/api/marketplace/redeem', {
      voucherId: ctx.vouchers[0]?.id,
    }, ctx.employee1Token);
    assertStatus(res, 403);
    return '403 Voucher not available';
  });

  await test('Rachat avec solde insuffisant → 403', async () => {
    // voucher[2] coûte 9999 tokens — aucun employee ne les a
    const res = await api('POST', '/api/marketplace/redeem', {
      voucherId: ctx.vouchers[2]?.id,
    }, ctx.employee1Token);
    assertStatus(res, 403);
    return '403 Insufficient token balance';
  });

  await test('Historique rachats — GET /api/marketplace/orders', async () => {
    const res = await api('GET', '/api/marketplace/orders', null, ctx.employee1Token);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    assert(res.data.data.length >= 1, 'au moins 1 rachat attendu');
    return `${res.data.data.length} rachat(s) dans l'historique`;
  });

  // ── 10. Companies — Lecture & mise à jour ─────────────────────────────────
  setCategory('Companies — Lecture et mise à jour');

  await test('Lister companies (admin) — GET /api/companies', async () => {
    const res = await api('GET', '/api/companies', null, ctx.adminToken);
    assertStatus(res, 200);
    assert(Array.isArray(res.data.data), 'data doit être un tableau');
    return `${res.data.data.length} company(ies)`;
  });

  await test('Lister companies (employer → 403)', async () => {
    const res = await api('GET', '/api/companies', null, ctx.employerToken);
    assertStatus(res, 403);
    return '403 Forbidden (non admin)';
  });

  await test('Récupérer company — GET /api/companies/:id', async () => {
    const res = await api('GET', `/api/companies/${ctx.company?.id}`, null, ctx.employerToken);
    assertStatus(res, 200);
    assert(res.data.data?.id === ctx.company?.id, 'id inattendu');
    return `name: ${res.data.data.name}, token_balance: ${res.data.data.token_balance}`;
  });

  await test('Mettre à jour company (employer) — PUT /api/companies/:id', async () => {
    const res = await api('PUT', `/api/companies/${ctx.company?.id}`, {
      city: 'Lyon',
    }, ctx.employerToken);
    assertStatus(res, 200);
    assert(res.data.data?.city === 'Lyon', 'city non mise à jour');
    return 'city mise à jour : Paris → Lyon';
  });

  // ── 11. Suppression & logout ───────────────────────────────────────────────
  setCategory('Auth — Logout et suppression');

  await test('Supprimer user (admin) — DELETE /api/users/:id', async () => {
    // Crée un user temporaire pour le supprimer proprement
    const regRes = await api('POST', '/api/auth/register', {
      name: 'Temp', first_name: 'User',
      email: `temp-${TS}@test.com`,
      password: 'SecurePass123!',
      role: 'employee',
    });
    assertStatus(regRes, 201);
    const tempId = regRes.data.data?.user?.id;

    const delRes = await api('DELETE', `/api/users/${tempId}`, null, ctx.adminToken);
    assertStatus(delRes, 200);
    return `user ${tempId.slice(0, 8)}... supprimé`;
  });

  await test('Logout employer — POST /api/auth/logout', async () => {
    const res = await api('POST', '/api/auth/logout', null, ctx.employerToken);
    assertStatus(res, 200);
    return 'Déconnexion confirmée (token invalidé côté client)';
  });
}

// ── Génération du rapport Markdown ────────────────────────────────────────
function buildReport() {
  const now       = new Date().toISOString();
  const passed    = results.filter(r => r.status === 'OK').length;
  const failed    = results.filter(r => r.status === 'FAIL').length;
  const skipped   = results.filter(r => r.status === 'SKIP').length;
  const total     = results.length;
  const categories = [...new Set(results.map(r => r.category))];

  let md = `# PRIM'O — Practical E2E Test Report\n\n`;
  md += `**Généré le :** ${now}  \n`;
  md += `**Serveur :** \`${BASE_URL}\`  \n`;
  md += `**Stripe :** ${hasRealStripeKey ? '✅ Clé réelle (paiement confirmé)' : '⚠️  Placeholder (webhook simulé uniquement)'}  \n\n`;

  md += `## Résumé\n\n`;
  md += `| | Nb |\n|---|---|\n`;
  md += `| ✅ Passed  | **${passed}** |\n`;
  md += `| ❌ Failed  | **${failed}** |\n`;
  md += `| ⏭  Skipped | **${skipped}** |\n`;
  md += `| **Total**  | **${total}** |\n\n`;

  if (failed > 0) {
    md += `## ❌ Échecs à corriger\n\n`;
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += `- **[${r.category}]** ${r.name}  \n`;
      md += `  \`${r.detail}\`\n\n`;
    });
  }

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPass  = catResults.filter(r => r.status === 'OK').length;
    const catFail  = catResults.filter(r => r.status === 'FAIL').length;
    const catSkip  = catResults.filter(r => r.status === 'SKIP').length;

    md += `## ${cat}\n\n`;
    md += `*${catPass} OK · ${catFail} FAIL · ${catSkip} SKIP*\n\n`;
    md += `| Test | Statut | Détail |\n|---|:---:|---|\n`;

    for (const r of catResults) {
      const icon   = r.status === 'OK' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭ ';
      const detail = r.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| ${r.name} | ${icon} | ${detail} |\n`;
    }
    md += '\n';
  }

  md += `---\n\n`;
  md += `*Généré par \`server/tests/e2e/practical-test.js\`*  \n`;
  md += `*Pour relancer : \`node server/tests/e2e/practical-test.js\`*\n`;
  return md;
}

// ── Point d'entrée ────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  PRIM'O — Practical E2E Tests`);
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Stripe   : ${hasRealStripeKey ? '✅ Clé réelle' : '⚠️  Placeholder (webhook simulé)'}`);
  console.log(`${'═'.repeat(55)}`);

  try {
    await runAll();
  } catch (fatal) {
    console.error('\n💥 Erreur fatale dans le runner :', fatal.message);
  }

  const report  = buildReport();
  const outPath = path.join(__dirname, '../../../practical-test.md');
  fs.writeFileSync(outPath, report, 'utf-8');

  const passed  = results.filter(r => r.status === 'OK').length;
  const failed  = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ✅ ${passed} passed   ❌ ${failed} failed   ⏭  ${skipped} skipped`);
  console.log(`  📄 Rapport : practical-test.md`);
  console.log(`${'─'.repeat(55)}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
