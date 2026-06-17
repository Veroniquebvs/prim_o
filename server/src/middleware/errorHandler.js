/**
 * errorHandler.js — Centralised Express error-handling middleware.
 *
 * Catches any error forwarded by next(err) from controllers or services, derives the HTTP
 * status code from err.status or err.statusCode (defaulting to 500), logs the error to
 * stderr outside of the test environment, and returns a consistent JSON error envelope:
 * { error: string, code: number }.
 */

/**
 * Express error handler that formats all unhandled errors into a uniform JSON response.
 * err is the error object, which may carry a status or statusCode property set by services.
 * Logging is suppressed during tests to keep test output clean.
 */
const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${message}`, err.stack); // eslint-disable-line no-console
  }

  res.status(status).json({ error: message, code: status });
};

module.exports = { errorHandler };
