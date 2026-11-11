import { isErrorResponse } from '../utils/yahooData';

// Note: validateTokenWithDetails / TokenValidationResult were removed from
// utils/yahooData.ts by the rollback documented in ROLLBACK_SUMMARY.md and replaced
// by the simpler validateToken(), so only the still-existing exports are tested here.

describe('isErrorResponse', () => {
  it('returns true for objects with an error string property', () => {
    expect(isErrorResponse({ error: 'something went wrong' })).toBe(true);
    expect(isErrorResponse({ error: 'HTTP Error: 403', statusCode: 403 })).toBe(true);
  });

  it('returns false for objects without an error property', () => {
    expect(isErrorResponse({ data: 'ok' })).toBe(false);
    expect(isErrorResponse({})).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isErrorResponse(null)).toBe(false);
    expect(isErrorResponse(undefined)).toBe(false);
    expect(isErrorResponse('error string')).toBe(false);
    expect(isErrorResponse(42)).toBe(false);
  });

  it('returns false when error property is not a string', () => {
    expect(isErrorResponse({ error: 123 })).toBe(false);
    expect(isErrorResponse({ error: null })).toBe(false);
    expect(isErrorResponse({ error: true })).toBe(false);
  });
});
