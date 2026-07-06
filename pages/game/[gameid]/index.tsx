import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import type { LeagueAggregatedStats, StandingsTeam } from '../../../utils/yahooData';
import StandingsTable from '../../../components/standings-table';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface GameInfoData {
  error?: string;
  teams?: {
    league?: {
      teams?: {
        team?: { name: string; team_id: string; team_key: string } | { name: string; team_id: string; team_key: string }[];
      };
    };
  };
  /** Aggregated season stats for all teams, keyed by team_key. */
  aggregated_stats?: LeagueAggregatedStats;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
  /**
   * Whether the season has finished.  Populated from the Yahoo API
   * `is_finished` field via the leagueinfo API route.
   */
  is_finished?: boolean;
}

/**
 * Validates that a standings array is non-empty and that every entry has the
 * minimum required fields (team_key, team_id, name).  Entries that pass
 * validation but are missing team_standings will still be rendered — the
 * StandingsTable component handles missing record fields gracefully with "-".
 */
const isValidStandingsArray = (standings: unknown): standings is StandingsTeam[] => {
  if (!Array.isArray(standings) || standings.length === 0) {
    console.warn(
      '[GamePage] isValidStandingsArray: standings is not a non-empty array.',
      'Value:', standings
    );
    return false;
  }
  const result: boolean = standings.every(
    (t: unknown) =>
      t !== null &&
      typeof t === 'object' &&
      typeof (t as StandingsTeam).team_key === 'string' &&
      typeof (t as StandingsTeam).team_id === 'string' &&
      typeof (t as StandingsTeam).name === 'string'
  );
  if (!result) {
    console.warn(
      '[GamePage] isValidStandingsArray: one or more standings entries failed field validation.',
      'Entries:', standings
    );
  }
  return result;
};

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr: string = Array.isArray(gameid) ? gameid[0] : (gameid ?? '');

  // Use the leagueinfo endpoint which now includes standings, is_finished, and aggregated_stats
  const league_info_route: string = `/api/leagueinfo/${gameIdStr}`;
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

  // Log the raw API response shape to aid debugging of standings loading issues
  console.log(
    '[GamePage] Raw API response keys:', Object.keys(data),
    '| standings present:', 'standings' in data,
    '| standings type:', typeof data.standings,
    '| standings length:', Array.isArray(data.standings) ? data.standings.length : 'N/A',
    '| is_finished raw value:', data.is_finished,
    '| is_finished type:', typeof data.is_finished
  );

  // Validate standings before passing to the table component so that
  // malformed or partially-missing data surfaces a clear fallback message
  // rather than a runtime crash inside StandingsTable.
  const rawStandings: StandingsTeam[] | undefined = data.standings;
  const standings: StandingsTeam[] | undefined = isValidStandingsArray(rawStandings)
    ? rawStandings
    : undefined;

  if (rawStandings !== undefined && standings === undefined) {
    // The API returned a standings field but it failed validation — log details
    // so the issue can be diagnosed from the browser console.
    console.warn(
      '[GamePage] standings data received from API but failed validation — falling back to "no standings" message.',
      'Raw standings value:', rawStandings
    );
  }

  // is_finished is now a boolean field returned directly by the API route
  const isFinished: boolean = data.is_finished === true;
  const aggregatedStats: LeagueAggregatedStats | undefined = data.aggregated_stats;

  if (aggregatedStats) {
    console.log(
      `[GamePage] Received aggregated stats for ${Object.keys(aggregatedStats.teams).length} teams`,
      `(weeks ${aggregatedStats.week_range.start}–${aggregatedStats.week_range.end})`
    );
  } else {
    console.warn('[GamePage] No aggregated_stats in API response — multi-week aggregation unavailable');
  }

  if (standings) {
    console.log(
      `[GamePage] Rendering standings table with ${standings.length} team(s), isFinished=${isFinished}`
    );
  } else {
    console.warn('[GamePage] No valid standings data available — rendering fallback message');
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
      {standings ? (
        <StandingsTable
          gameId={gameIdStr}
          standings={standings}
          isFinished={isFinished}
        />
      ) : (
        <p>No standings data available.</p>
      )}
    </Layout>
  );
};

export default League;
