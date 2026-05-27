const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${message}`, err.stack);
  }

  res.status(status).json({ error: message, code: status });
};

module.exports = { errorHandler };
