import { validateTokenWithDetails, isErrorResponse } from '../utils/yahooData';
import type { TokenValidationResult } from '../utils/yahooData';

describe('validateTokenWithDetails', () => {
  describe('null / missing token', () => {
    it('returns invalid when token is null', () => {
      const result: TokenValidationResult = validateTokenWithDetails(null);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.reason).toMatch(/no authentication token/i);
    });
  });

  describe('token error flag (RefreshAccessTokenError)', () => {
    it('returns invalid when token carries a NextAuth error flag', () => {
      const token = {
        accessToken: 'some-token',
        error: 'RefreshAccessTokenError',
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.reason).toMatch(/RefreshAccessTokenError/);
      expect(result.reason).toMatch(/sign in again/i);
    });

    it('returns invalid for any non-empty error string on the token', () => {
      const token = {
        accessToken: 'some-token',
        error: 'SomeOtherTokenError',
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.reason).toMatch(/SomeOtherTokenError/);
    });
  });

  describe('missing accessToken', () => {
    it('returns invalid when token has no accessToken property', () => {
      const token = { sub: 'user-123' };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.reason).toMatch(/access token is missing/i);
    });

    it('returns invalid when accessToken is an empty string', () => {
      const token = { accessToken: '' };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('expired token', () => {
    it('returns invalid when accessTokenExpires is in the past', () => {
      const expiredMs: number = Date.now() - 60_000; // expired 60 seconds ago
      const token = {
        accessToken: 'expired-access-token',
        accessTokenExpires: expiredMs,
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.reason).toMatch(/expired/i);
      expect(result.reason).toMatch(/sign in again/i);
    });

    it('returns invalid when accessTokenExpires is just before the current time', () => {
      const nowMs: number = Date.now() - 1;
      const token = {
        accessToken: 'just-expired-token',
        accessTokenExpires: nowMs,
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('valid token', () => {
    it('returns valid when token has accessToken and no expiry info', () => {
      const token = { accessToken: 'valid-access-token' };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.reason).toBe('');
    });

    it('returns valid when token has accessToken and a future expiry', () => {
      const futureMs: number = Date.now() + 3_600_000; // expires in 1 hour
      const token = {
        accessToken: 'valid-access-token',
        accessTokenExpires: futureMs,
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.reason).toBe('');
    });

    it('returns valid when token has accessToken, future expiry, and no error flag', () => {
      const futureMs: number = Date.now() + 1_800_000; // expires in 30 minutes
      const token = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        accessTokenExpires: futureMs,
        sub: 'user-123',
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(true);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('error flag takes precedence over expiry', () => {
    it('returns invalid due to error flag even when token has a future expiry', () => {
      const futureMs: number = Date.now() + 3_600_000;
      const token = {
        accessToken: 'token-with-error',
        accessTokenExpires: futureMs,
        error: 'RefreshAccessTokenError',
      };
      const result: TokenValidationResult = validateTokenWithDetails(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/RefreshAccessTokenError/);
    });
  });
});

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
