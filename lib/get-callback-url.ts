/**
 * Yahoo Callback URL
 *
 * This module provides the Yahoo OAuth callback URL.
 */

const YAHOO_CALLBACK_URL: string = process.env.YAHOO_CALLBACK_URL || 'http://localhost:3000/api/auth/callback/yahoo';

export function getYahooCallbackUrl(): string {
  return YAHOO_CALLBACK_URL;
}
