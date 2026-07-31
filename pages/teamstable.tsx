import { useState, useCallback, type ChangeEvent } from 'react';
import useSwr from 'swr';
import dynamic from 'next/dynamic';
import { signIn, useSession } from 'next-auth/react';
import teamCardStyles from '../components/teamcard.module.css';
import Layout from '../components/layout';
import { getEmptyLeaguesMessage, isEmptyLeagueError } from '../lib/teamstable-empty-state';
import type { YahooGame, YahooTeam } from '../types/yahooFantasy';

const TeamCard = dynamic(() => import('../components/teamcard'), {
  ssr: false,
});

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: payload?.error || 'Failed to fetch',
      statusCode: res.status,
    } as ApiResponse;
  }

  return payload;
};

const SPORT_OPTIONS = [
  { value: 'mlb', label: 'MLB' },
  { value: 'nba', label: 'NBA' },
  { value: 'nfl', label: 'NFL' },
  { value: 'nhl', label: 'NHL' },
  { value: 'all', label: 'All sports' },
];

interface ApiResponse {
  games?: YahooGame[];
  error?: string;
  statusCode?: number;
}

/**
 * Returns true when the API response indicates an authentication or
 * authorisation failure (HTTP 401 or 403).
 *
 * Yahoo returns 403 Forbidden when a token is present but expired/revoked.
 * The teams API normalises both to 401 before sending to the client, but we
 * guard against both here for robustness.
 */
const isAuthErrorResponse = (data: ApiResponse): boolean =>
  data.statusCode === 401 || data.statusCode === 403;

/**
 * SportSelector renders the sport-filter dropdown and an optional
 * "Refreshing…" indicator.  Extracted to avoid repeating the JSX in every
 * early-return branch.
 */
const SportSelector = ({
  sport,
  disabled,
  isValidating,
  onChange,
}: {
  sport: string;
  disabled: boolean;
  isValidating: boolean;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}) => (
  <div className={teamCardStyles.toolbar}>
    <label htmlFor="sport-selector">Game type:</label>
    <select
      id="sport-selector"
      value={sport}
      onChange={onChange}
      disabled={disabled}
    >
      {SPORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {isValidating && <span>Refreshing...</span>}
  </div>
);

export default function Index() {
  const [sport, setSport] = useState('mlb');
  const { data: session, status } = useSession();

  // retryKey is incremented to force SWR to re-fetch after the user clicks
  // "Try again" — this is a lightweight retry mechanism that avoids a full
  // page reload while still clearing the cached error response.
  const [retryKey, setRetryKey] = useState(0);

  const { data, error, isValidating } = useSwr(
    status === 'authenticated'
      ? `/api/teams?sport=${encodeURIComponent(sport)}&_retry=${retryKey}`
      : null,
    fetcher
  );

  const handleSportChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSport(event.target.value);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryKey((k: number) => k + 1);
  }, []);

  // ── Authentication loading / unauthenticated states ──────────────────────

  if (status === 'loading') {
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p>Loading authentication...</p>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>Please sign in to view your leagues</p>
        </div>
      </Layout>
    );
  }

  // ── Session integrity checks ─────────────────────────────────────────────

  if (status === 'authenticated' && !session?.user) {
    console.error('[teamstable] Session authenticated but user data missing');
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Session error: User data not available. Please sign in again.
          </p>
        </div>
      </Layout>
    );
  }

  if (status === 'authenticated' && !session?.accessToken) {
    console.error('[teamstable] Session authenticated but accessToken missing');
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Authentication error: Access token not available. Please sign in again.
          </p>
          <button
            className={teamCardStyles.signInButton}
            type="button"
            onClick={() => signIn()}
          >
            Sign in again
          </button>
        </div>
      </Layout>
    );
  }

  // Surface NextAuth token-refresh errors (e.g. "RefreshAccessTokenError").
  // This is set by the JWT callback in pages/api/auth/[...nextauth].ts when
  // the Yahoo refresh token has expired or been revoked, which will cause
  // every subsequent Yahoo API call to return 401 or 403.
  if (session?.error) {
    console.warn('[teamstable] Session error present:', session.error);
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Your session has expired ({session.error}). Please sign in again to
            refresh your Yahoo access token.
          </p>
          <button
            className={teamCardStyles.signInButton}
            type="button"
            onClick={() => signIn()}
          >
            Sign in again
          </button>
        </div>
      </Layout>
    );
  }

  if (error) {
    console.error('[teamstable] SWR fetch error:', error);
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (!data && !error) {
    return (
      <Layout>
        <div className={teamCardStyles.loadingContainer}>
          <p>Loading your leagues...</p>
        </div>
      </Layout>
    );
  }

  // ── API error responses ──────────────────────────────────────────────────

  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as ApiResponse;
    console.error('[teamstable] API returned error:', errorData);

    // Auth errors (401 / 403): prompt the user to sign in again.
    // Yahoo returns 403 when a token is present but expired or revoked; the
    // teams API normalises this to 401 before sending to the client, but we
    // check both here for defence-in-depth.
    if (isAuthErrorResponse(errorData)) {
      return (
        <Layout>
          <SportSelector
            sport={sport}
            disabled={status !== 'authenticated' || isValidating}
            isValidating={isValidating}
            onChange={handleSportChange}
          />
          <div className={teamCardStyles.errorContainer}>
            <p className={teamCardStyles.errorText}>
              Your session has expired or been revoked by Yahoo. Please sign in
              again to continue.
            </p>
            <button
              className={teamCardStyles.signInButton}
              type="button"
              onClick={() => signIn()}
            >
              Sign in again
            </button>
          </div>
        </Layout>
      );
    }

    // Empty-league state: no teams found for the selected sport.
    const isEmptyState: boolean = isEmptyLeagueError(errorData.error);
    if (isEmptyState) {
      return (
        <Layout>
          <SportSelector
            sport={sport}
            disabled={status !== 'authenticated' || isValidating}
            isValidating={isValidating}
            onChange={handleSportChange}
          />
          <div className={teamCardStyles.errorContainer}>
            <p className={teamCardStyles.errorText}>{getEmptyLeaguesMessage(sport)}</p>
          </div>
        </Layout>
      );
    }

    // Generic API error with a retry button.
    return (
      <Layout>
        <SportSelector
          sport={sport}
          disabled={status !== 'authenticated' || isValidating}
          isValidating={isValidating}
          onChange={handleSportChange}
        />
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Error loading leagues: {errorData.error || 'Unknown error'}
          </p>
          <button
            className={teamCardStyles.signInButton}
            type="button"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  // ── Invalid data shape ───────────────────────────────────────────────────

  if (!data?.games || !Array.isArray(data.games)) {
    console.error(
      '[teamstable] Invalid data structure: missing or invalid games array',
      data
    );
    return (
      <Layout>
        <SportSelector
          sport={sport}
          disabled={status !== 'authenticated' || isValidating}
          isValidating={isValidating}
          onChange={handleSportChange}
        />
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Error: Invalid response format from server. Please try again later.
          </p>
          <button
            className={teamCardStyles.signInButton}
            type="button"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  // ── Happy path ───────────────────────────────────────────────────────────

  return (
    <Layout>
      <SportSelector
        sport={sport}
        disabled={status !== 'authenticated' || isValidating}
        isValidating={isValidating}
        onChange={handleSportChange}
      />
      {data.games.length === 0 ? (
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>{getEmptyLeaguesMessage(sport)}</p>
        </div>
      ) : (
        <div className={teamCardStyles.grid}>
          {data.games.map((game: YahooGame) => {
            // Validate game has required properties
            if (!game || !game.teams || !game.teams.team) {
              console.warn('[teamstable] Skipping invalid game object:', game);
              return null;
            }

            return Array.isArray(game.teams.team) ? (
              game.teams.team.map((inner_team: YahooTeam) => {
                // Validate team has required properties
                if (!inner_team || !inner_team.team_key) {
                  console.warn('[teamstable] Skipping invalid team object:', inner_team);
                  return null;
                }
                return (
                  <TeamCard
                    key={inner_team.team_key}
                    game={game}
                    team={inner_team}
                  />
                );
              })
            ) : (
              <TeamCard
                key={game.teams.team.team_key}
                game={game}
                team={game.teams.team as YahooTeam}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
}
