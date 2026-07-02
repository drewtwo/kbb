import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Team {
  name: string;
  team_id: string;
}

interface GameInfoData {
  error?: string;
  teams?: {
    league?: {
      teams?: {
        team?: Team | Team[];
      };
    };
  };
}

/**
 * Safely extracts the teams array from the league response data.
 * The API returns fantasy_content which has a nested league.teams.team structure.
 * @param data - The response data from /api/gameinfo endpoint
 * @returns An array of Team objects, or null if the structure is invalid
 */
const extractTeamsFromData = (data: GameInfoData): Team[] | null => {
  if (!data) {
    console.error('[GamePage] extractTeamsFromData: data is null or undefined');
    return null;
  }

  if (data.error) {
    console.error(`[GamePage] extractTeamsFromData: API returned error: ${data.error}`);
    return null;
  }

  const leagueData = data?.teams?.league;
  if (!leagueData) {
    console.error('[GamePage] extractTeamsFromData: data.teams.league is missing');
    return null;
  }

  const teamsData = leagueData?.teams;
  if (!teamsData) {
    console.error('[GamePage] extractTeamsFromData: data.teams.league.teams is missing');
    return null;
  }

  const teamField = teamsData?.team;
  if (!teamField) {
    console.error('[GamePage] extractTeamsFromData: data.teams.league.teams.team is missing');
    return null;
  }

  // team can be a single object or an array depending on the API response
  return Array.isArray(teamField) ? teamField : [teamField];
};

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;
  const game_info_route = `/api/gameinfo/${gameIdStr}`;
  const { data, error } = useSwr<GameInfoData>(gameIdStr ? game_info_route : null, fetcher);

  if (error) return <div>Failed to load teams</div>;
  if (!data) return <div>Loading...</div>;

  if (data.error) {
    return (
      <Layout>
        <p>Error loading game data: {data.error}</p>
      </Layout>
    );
  }

  const teams = extractTeamsFromData(data);

  if (!teams) {
    return (
      <Layout>
        <p>Error: Unexpected data structure received from the server. Unable to display teams.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <p>League ID: {gameid}</p>
      <ul>
        {teams.map((team: Team) => (
          <li key={team.team_id}>
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
