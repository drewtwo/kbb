import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getTeams } from '../../utils/yahooData';
import type { YahooGame, ApiErrorResponse } from '../../types/yahooFantasy';

const secret = process.env.NEXTAUTH_SECRET;

type ResponseData = {
  games?: YahooGame[];
  error?: string;
  statusCode?: number;
};

/**
 * Returns true when the given HTTP status code indicates an authentication or
 * authorisation failure from the Yahoo API (401 Unauthorized or 403 Forbidden).
 *
 * Yahoo returns 403 Forbidden — rather than 401 — when an access token is
 * present but expired or revoked.  Both codes should be surfaced to the client
 * as an auth error so the UI can prompt the user to sign in again.
 */
const isAuthError = (statusCode: number | undefined): boolean =>
  statusCode === 401 || statusCode === 403;

/**
 * Builds a human-readable error message for auth failures that clearly
 * instructs the user to sign in again, regardless of whether Yahoo returned
 * 401 or 403.
 */
const buildAuthErrorMessage = (originalError: string, statusCode: number): string => {
  if (statusCode === 403) {
    return (
      'Access denied by Yahoo API (HTTP 403 Forbidden). ' +
      'Your session token may be expired or revoked. ' +
      'Please sign out and sign in again to obtain a fresh token. ' +
      `(Original error: ${originalError})`
    );
  }
  return (
    'Authentication failed (HTTP 401 Unauthorized). ' +
    'Please sign in again to continue. ' +
    `(Original error: ${originalError})`
  );
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const requestedSport = Array.isArray(req.query.sport)
      ? req.query.sport[0]
      : req.query.sport;

    // Log incoming request details
    const sessionToken = await getToken({ req, secret });
    const hasAccessToken: boolean = !!(sessionToken && sessionToken.accessToken);
    console.info(
      `[kbb:api] teams: ${req.method} sport="${requestedSport ?? 'mlb'}" — accessToken present: ${hasAccessToken}`
    );

    const teamsData = await getTeams(req, requestedSport ?? 'mlb');

    // Check if the response contains an error
    if (teamsData && typeof teamsData === 'object' && 'error' in teamsData) {
      const errorData = teamsData as ApiErrorResponse;
      const statusCode: number = errorData.statusCode || 500;

      // Treat 401 and 403 as auth errors — Yahoo returns 403 when a token is
      // present but expired/revoked, so we must handle both codes the same way.
      if (isAuthError(statusCode)) {
        const authMsg: string = buildAuthErrorMessage(errorData.error, statusCode);
        console.error(`[teams API] Auth error (HTTP ${statusCode}): ${authMsg}`);
        // Always return 401 to the client so the UI knows to prompt re-login
        res.status(401).json({ error: authMsg, statusCode: 401 });
        return;
      }

      console.error(`[teams API] error (HTTP ${statusCode}): ${errorData.error}`);
      res.status(statusCode).json({ error: errorData.error });
      return;
    }

    // Validate that we have an array of games
    if (!Array.isArray(teamsData)) {
      console.error('[teams API] Expected array of games but received:', typeof teamsData);
      res.status(500).json({ error: 'Invalid response format from Yahoo API' });
      return;
    }

    res.status(200).json({ games: teamsData as YahooGame[] });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[teams API] exception: ${errorMsg}`);
    res.status(500).json({ error: 'failed to load data' });
  }
}
