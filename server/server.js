const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Stripe webhook requires raw body for signature verification — must come before express.json()
app.use('/api/tokens/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
