import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import leagueStyles from '../../../components/leagues.module.css';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Team {
  name: string;
  team_id: string;
}

interface LeagueData {
  teams: {
    teams: {
      team: Team[];
    };
  };
}

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const league_info_route = `/api/leagueinfo/${gameid}`;
  const { data, error } = useSwr(league_info_route, fetcher);

  if (error) return <div>Failed to load teams</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <Layout>
      <p>League ID: {gameid}</p>
      <ul>
        {data.teams.teams.team.map((team: Team) => (
          <li key={team.name}>
            <Link href={`${gameid}/team/${team.team_id}`}>
              {`Team Name: ${JSON.stringify(team.name)}`}
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
};

export default League;
