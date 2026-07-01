import useSwr from 'swr';
import dynamic from 'next/dynamic';
import leagueStyles from '../components/leagues.module.css';
import Layout from '../components/layout';

const LeagueCard = dynamic(() => import('../components/leaguecard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export default function Index() {
  const { data, error } = useSwr('/api/teams', fetcher);

  if (error) return <div>Failed to load users</div>;
  if (!data) return <div>Loading...</div>;
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
