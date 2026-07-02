import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import type { AggregatedTeamStats, LeagueAggregatedStats } from '../../../utils/yahooData';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Team {
  name: string;
  team_id: string;
  team_key: string;
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
  /** Aggregated season stats for all teams, keyed by team_key. */
  aggregated_stats?: LeagueAggregatedStats;
}

/**
 * Safely extracts the teams array from the league response data.
 * The API returns fantasy_content which has a nested league.teams.team structure.
 * @param data - The response data from /api/leagueinfo endpoint
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

/**
 * Renders a summary of a team's aggregated season stats.
 * Shows the total value for each stat across all aggregated weeks.
 */
const TeamAggregatedStatsSummary = ({
  aggregatedStats,
}: {
  aggregatedStats: AggregatedTeamStats;
}) => {
  const sortedEntries: [string, number][] = Object.entries(
    aggregatedStats.stats
  ).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <span>
      {' '}
      — {aggregatedStats.weeks_counted} week
      {aggregatedStats.weeks_counted !== 1 ? 's' : ''} aggregated
      {sortedEntries.length > 0 && (
        <span>
          {' '}
          (
          {sortedEntries
            .slice(0, 3)
            .map(([id, val]) => `stat ${id}: ${Number.isInteger(val) ? val : parseFloat(val.toFixed(3))}`)
            .join(', ')}
          {sortedEntries.length > 3 ? ', …' : ''})
        </span>
      )}
    </span>
  );
};

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;

  // Use the leagueinfo endpoint which now includes aggregated_stats
  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const { data, error } = useSwr<GameInfoData>(gameIdStr ? league_info_route : null, fetcher);

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

  const aggregatedStats: LeagueAggregatedStats | undefined = data.aggregated_stats;

  if (aggregatedStats) {
    console.log(
      `[GamePage] Received aggregated stats for ${Object.keys(aggregatedStats.teams).length} teams`,
      `(weeks ${aggregatedStats.week_range.start}–${aggregatedStats.week_range.end})`
    );
  } else {
    console.warn('[GamePage] No aggregated_stats in API response — multi-week aggregation unavailable');
  }

  return (
    <Layout>
      <p>League ID: {gameid}</p>
      {aggregatedStats && (
        <p>
          Season stats aggregated across weeks {aggregatedStats.week_range.start}–
          {aggregatedStats.week_range.end}
        </p>
      )}
      <ul>
        {teams.map((team: Team) => {
          const teamAggStats: AggregatedTeamStats | undefined =
            aggregatedStats?.teams[team.team_key];

          return (
            <li key={team.team_id}>
              <Link href={`${gameid}/team/${team.team_id}`}>
                {`Team Name: ${JSON.stringify(team.name)}`}
              </Link>
              {teamAggStats && (
                <TeamAggregatedStatsSummary aggregatedStats={teamAggStats} />
              )}
            </li>
          );
        })}
      </ul>
    </Layout>
  );
};

export default League;
