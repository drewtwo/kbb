import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import leagueStyles from '../../../components/leagues.module.css';
import { FantasyContent, Team, TeamsContainer, ErrorResponse } from '../../../types/yahooFantasy';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;
  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const { data, error } = useSwr(gameIdStr ? league_info_route : null, fetcher);

  if (error) return <div>Failed to load teams</div>;
  if (!data) return <div>Loading...</div>;

  // Type guard to check if data is an error response
  if ('error' in data && typeof (data as any).error === 'string') {
    return <div>Error: {(data as any).error}</div>;
  }

  // Type guard to check if data has teams
  const responseData = data as any;
  if (!responseData.teams) {
    return <div>No teams data available</div>;
  }

  const teamsData = responseData.teams as FantasyContent;
  if (!teamsData.teams) {
    return <div>No teams available</div>;
  }

  const teamsContainer = teamsData.teams as TeamsContainer;
  const teamArray = Array.isArray(teamsContainer.team)
    ? teamsContainer.team
    : [teamsContainer.team];

  return (
    <Layout>
      <p>League ID: {gameid}</p>
      <ul>
        {teamArray.map((team: Team) => (
          <li key={team.team_id || team.name}>
            <Link href={`${gameid}/team/${team.team_id}`}>
              {`Team Name: ${team.name}`}
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
};

export default League;
