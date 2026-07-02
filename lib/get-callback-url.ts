/**
 * Dynamic Yahoo Callback URL Generator
 *
 * This module provides a utility function to dynamically generate the Yahoo
 * OAuth callback URL at runtime, derived from the NEXTAUTH_URL environment
 * variable. This eliminates the need for a separate YAHOO_CALLBACK_URL
 * environment variable.
 */

/** The path appended to the base URL to form the Yahoo OAuth callback URL. */
const YAHOO_CALLBACK_PATH: string = '/api/auth/callback/yahoo';

/**
 * Resolves the base URL for the application at runtime.
 *
 * Resolution order:
 * 1. `NEXTAUTH_URL` — explicitly configured base URL (local dev or production)
 * 2. `VERCEL_URL` — automatically provided by Vercel for preview deployments
 * 3. `http://localhost:3000` — fallback for local development
 *
 * @returns The resolved base URL string (no trailing slash).
 */
function resolveBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

/**
 * Dynamically generates the Yahoo OAuth callback URL at runtime.
 *
 * The URL is derived from the application's base URL (resolved via
 * `NEXTAUTH_URL` or `VERCEL_URL`) with the standard NextAuth Yahoo callback
 * path appended. No separate `YAHOO_CALLBACK_URL` environment variable is
 * required.
 *
 * @returns The full Yahoo OAuth callback URL string.
 *
 * @example
 * // Local development (NEXTAUTH_URL=http://localhost:3000)
 * getYahooCallbackUrl(); // => "http://localhost:3000/api/auth/callback/yahoo"
 *
 * @example
 * // Production (NEXTAUTH_URL=https://yourdomain.com)
 * getYahooCallbackUrl(); // => "https://yourdomain.com/api/auth/callback/yahoo"
 *
 * @example
 * // Vercel preview (VERCEL_URL=my-app-abc123.vercel.app)
 * getYahooCallbackUrl(); // => "https://my-app-abc123.vercel.app/api/auth/callback/yahoo"
 */
export function getYahooCallbackUrl(): string {
  const baseUrl: string = resolveBaseUrl();
  return `${baseUrl}${YAHOO_CALLBACK_PATH}`;
}
