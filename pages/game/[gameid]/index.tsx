import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import leagueStyles from '../../../components/leagues.module.css';

const fetcher = (url: String) => fetch(url).then((res) => res.json());

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
        {data.teams.teams.team.map((team) => (
          <li key={team.name}>
            <Link href={`${gameid}/team/${team.team_id}`}>
              <a>{`Team Name: ${JSON.stringify(team.name)}`}</a>
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
};

export default League;
