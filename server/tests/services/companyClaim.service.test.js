/**
 * tests/services/companyClaim.service.test.js — Unit tests for the company claim token (T-80).
 *
 * The claim token proves that the caller created the company with POST /companies. It must be
 * bound to one company, expire, and never be usable as (or forged from) an access token.
 */
process.env.JWT_SECRET = 'test_access_secret';

const jwt = require('jsonwebtoken');
const { signClaimToken, verifyClaimToken } = require('../../src/services/companyClaim.service');

describe('companyClaim.service', () => {
  it('accepts a token for the company it was issued for', () => {
    expect(verifyClaimToken(signClaimToken('co-1'), 'co-1')).toBe(true);
  });

  it('rejects a token issued for another company', () => {
    expect(verifyClaimToken(signClaimToken('co-1'), 'co-2')).toBe(false);
  });

  it('rejects a missing or malformed token without throwing', () => {
    expect(verifyClaimToken(undefined, 'co-1')).toBe(false);
    expect(verifyClaimToken('garbage', 'co-1')).toBe(false);
  });

  it('rejects a token signed with the access-token secret', () => {
    const forged = jwt.sign({ company_id: 'co-1', purpose: 'company_claim' }, 'test_access_secret');
    expect(verifyClaimToken(forged, 'co-1')).toBe(false);
  });

  it('cannot be verified as an access token', () => {
    expect(() => jwt.verify(signClaimToken('co-1'), 'test_access_secret')).toThrow();
  });

  it('rejects an expired token', () => {
    jest.useFakeTimers();
    const token = signClaimToken('co-1');
    jest.setSystemTime(Date.now() + 61 * 60 * 1000);
    expect(verifyClaimToken(token, 'co-1')).toBe(false);
    jest.useRealTimers();
  });
});
