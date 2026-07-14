import { useState, type ChangeEvent } from 'react';
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

export default function Index() {
  const [sport, setSport] = useState('mlb');
  const { data: session, status } = useSession();
  const { data, error, isValidating } = useSwr(
    status === 'authenticated' ? `/api/teams?sport=${encodeURIComponent(sport)}` : null,
    fetcher
  );

  // Check authentication status
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

  const handleSportChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSport(event.target.value);
  };

  // Validate session has required data
  if (status === 'authenticated' && !session?.user) {
    console.error('[teamstable] Session authenticated but user data missing');
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>Session error: User data not available. Please sign in again.</p>
        </div>
      </Layout>
    );
  }

  // Validate session has access token
  if (status === 'authenticated' && !session?.accessToken) {
    console.error('[teamstable] Session authenticated but accessToken missing');
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>Authentication error: Access token not available. Please sign in again.</p>
          <button className={teamCardStyles.signInButton} type="button" onClick={() => signIn()}>
            Sign in again
          </button>
        </div>
      </Layout>
    );
  }

  if (session?.error) {
    console.warn('[teamstable] Session error present:', session.error);
    return (
      <Layout>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Session error: {session.error}. Please sign in again.
          </p>
          <button className={teamCardStyles.signInButton} type="button" onClick={() => signIn()}>
            Sign in again
          </button>
        </div>
      </Layout>
    );
  }

  if (error) {
    console.error('[teamstable] Failed to load leagues:', error);
  }

  if (!data && !error) {
    return (
      <Layout>
        <div className={teamCardStyles.loadingContainer}>
          <p>Loading your leagues...</p>
        </div>
      </Layout>
    );
  }

  const isEmptyState = Boolean(
    data && typeof data === 'object' && 'error' in data && isEmptyLeagueError((data as ApiResponse).error)
  );

  // Check if data contains an error response
  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as ApiResponse;
    console.error('[teamstable] API returned error:', errorData);

    if (errorData.statusCode === 401) {
      return (
        <Layout>
          <div className={teamCardStyles.toolbar}>
            <label htmlFor="sport-selector">Game type:</label>
            <select
              id="sport-selector"
              value={sport}
              onChange={handleSportChange}
              disabled={status !== 'authenticated' || isValidating}
            >
              {SPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isValidating && <span>Refreshing...</span>}
          </div>
          <div className={teamCardStyles.errorContainer}>
            <p className={teamCardStyles.errorText}>
              Authentication error: Your session has expired. Please sign in again.
            </p>
            <button className={teamCardStyles.signInButton} type="button" onClick={() => signIn()}>
              Sign in again
            </button>
          </div>
        </Layout>
      );
    }

    if (isEmptyState) {
      return (
        <Layout>
          <div className={teamCardStyles.toolbar}>
            <label htmlFor="sport-selector">Game type:</label>
            <select
              id="sport-selector"
              value={sport}
              onChange={handleSportChange}
              disabled={status !== 'authenticated' || isValidating}
            >
              {SPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isValidating && <span>Refreshing...</span>}
          </div>
          <div className={teamCardStyles.errorContainer}>
            <p className={teamCardStyles.errorText}>{getEmptyLeaguesMessage(sport)}</p>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className={teamCardStyles.toolbar}>
          <label htmlFor="sport-selector">Game type:</label>
          <select
            id="sport-selector"
            value={sport}
            onChange={handleSportChange}
            disabled={status !== 'authenticated' || isValidating}
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isValidating && <span>Refreshing...</span>}
        </div>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Error loading leagues: {errorData.error || 'Unknown error'}
          </p>
        </div>
      </Layout>
    );
  }

  // Validate that data has games array
  if (!data?.games || !Array.isArray(data.games)) {
    console.error('[teamstable] Invalid data structure: missing or invalid games array', data);
    return (
      <Layout>
        <div className={teamCardStyles.toolbar}>
          <label htmlFor="sport-selector">Game type:</label>
          <select
            id="sport-selector"
            value={sport}
            onChange={handleSportChange}
            disabled={status !== 'authenticated' || isValidating}
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isValidating && <span>Refreshing...</span>}
        </div>
        <div className={teamCardStyles.errorContainer}>
          <p className={teamCardStyles.errorText}>
            Error: Invalid response format from server. Please try again later.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={teamCardStyles.toolbar}>
        <label htmlFor="sport-selector">Game type:</label>
        <select
          id="sport-selector"
          value={sport}
          onChange={handleSportChange}
          disabled={status !== 'authenticated' || isValidating}
        >
          {SPORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isValidating && <span>Refreshing...</span>}
      </div>
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
                  ></TeamCard>
                );
              })
            ) : (
              <TeamCard
                key={game.teams.team.team_key}
                game={game}
                team={game.teams.team as YahooTeam}
              ></TeamCard>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
