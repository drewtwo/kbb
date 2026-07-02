import useSwr from 'swr';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import leagueStyles from '../components/leagues.module.css';
import Layout from '../components/layout';

const LeagueCard = dynamic(() => import('../components/leaguecard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    const error = new Error('Failed to fetch');
    throw error;
  }
  return res.json();
});

interface Team {
  team_key: string;
  name: string;
}

interface Game {
  name: string;
  season: string;
  teams: {
    team: Team | Team[];
  };
}

interface ErrorResponse {
  error?: string;
}

export default function Index() {
  const { status } = useSession();
  const { data, error } = useSwr(status === 'authenticated' ? '/api/teams' : null, fetcher);

  // Check authentication status
  if (status === 'loading') {
    return (
      <Layout>
        <div className={leagueStyles.errorContainer}>
          <p>Loading authentication...</p>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className={leagueStyles.errorContainer}>
          <p className={leagueStyles.errorText}>Please sign in to view your leagues</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={leagueStyles.errorContainer}>
          <p className={leagueStyles.errorText}>Failed to load leagues. Please try again later.</p>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className={leagueStyles.loadingContainer}>
          <p>Loading your leagues...</p>
        </div>
      </Layout>
    );
  }

  // Check if data contains an error response
  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as ErrorResponse;
    return (
      <Layout>
        <div className={leagueStyles.errorContainer}>
          <p className={leagueStyles.errorText}>
            Error loading leagues: {errorData.error || 'Unknown error'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={leagueStyles.grid}>
        {data.map((game: Game) =>
          Array.isArray(game.teams.team) ? (
            game.teams.team.map((inner_team: Team) => (
              <LeagueCard
                key={inner_team.team_key}
                game={game}
                team={inner_team}
              ></LeagueCard>
            ))
          ) : (
            <LeagueCard
              key={game.teams.team.team_key}
              game={game}
              team={game.teams.team}
            ></LeagueCard>
          )
        )}
      </div>
    </Layout>
  );
}
