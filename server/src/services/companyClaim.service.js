/**
 * companyClaim.service.js — Short-lived proof that the caller created a given company.
 *
 * Public self-onboarding is two calls: POST /companies creates the company, then
 * POST /auth/register creates its employer. The claim token returned by the first call must
 * be sent with the second, so only the creator of a company can become its employer (a company
 * id alone, e.g. read from a QR code poster, is not enough).
 *
 * The token is signed with a key derived from JWT_SECRET (HMAC with a fixed label), so it can
 * never be accepted as an access token by verifyToken, and expires after one hour.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const PURPOSE = 'company_claim';
const EXPIRES_IN = '1h';

/** Derives the signing key from JWT_SECRET, distinct from the access-token key. */
const claimKey = () => crypto.createHmac('sha256', process.env.JWT_SECRET).update(PURPOSE).digest();

/** Signs a claim token for the given company id. */
const signClaimToken = (companyId) =>
  jwt.sign({ company_id: companyId, purpose: PURPOSE }, claimKey(), { algorithm: 'HS256', expiresIn: EXPIRES_IN });

/**
 * Returns true when token is a valid, unexpired claim token for exactly this company id.
 * Never throws: any malformed, expired or foreign token yields false.
 */
const verifyClaimToken = (token, companyId) => {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, claimKey(), { algorithms: ['HS256'] });
    return payload.purpose === PURPOSE && payload.company_id === companyId;
  } catch {
    return false;
  }
};

module.exports = { signClaimToken, verifyClaimToken };
