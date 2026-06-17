/**
 * server.js — Application entry point for the PRIM'O Express API.
 *
 * Bootstraps the Express application, applies global middleware (Helmet, CORS, body parsing),
 * registers all API routes under /api, connects to PostgreSQL via Sequelize, and starts the
 * daily cron job for scheduled token allocations. Listens on the port defined by the PORT
 * environment variable (default 5000).
 *
 * The Stripe webhook route (/api/tokens/webhook) receives its body as raw bytes because Stripe
 * requires the raw payload to verify the signature — it is therefore mounted before express.json().
 *
 * Graceful shutdown is handled on SIGTERM and SIGINT so in-flight requests complete before
 * the process exits.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const sequelize = require('./src/config/database');
require('./src/models');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { startCron } = require('./src/services/cron.service');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

// Allowed origins: explicit list from CLIENT_URL (comma-separated) + localhost dev.
// Any *.vercel.app domain is accepted so deployment-specific preview/prod URLs
// don't break CORS every time Vercel generates a new one.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, Stripe webhooks) with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Stripe webhook requires raw body for signature verification — must come before express.json()
app.use('/api/tokens/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "PRIM'O API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 404 });
});

app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established');
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true, logging: false });
      console.log('Database schema synced');
    }
    startCron();
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
