/**
 * validate.js — Express middleware that collects express-validator errors and short-circuits
 * the request with a 400 response if any validation rule failed.
 *
 * Place this middleware after the array of body/query/param validators and before the
 * controller handler in any route definition.
 */
const { validationResult } = require('express-validator');

/**
 * Reads the validation result accumulated by preceding express-validator checks.
 * Returns the first error message as a 400 JSON response if any rule failed.
 * Calls next() and lets the request proceed when all rules pass.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, code: 400 });
  }
  next();
};

module.exports = { validate };
