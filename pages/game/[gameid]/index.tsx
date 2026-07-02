import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import type { LeagueAggregatedStats, StandingsTeam } from '../../../utils/yahooData';
import StandingsTable from '../../../components/standings-table';
import { logDiagnostic, logDiagnosticError, logDiagnosticValidationFailure } from '../../../utils/diagnosticLogger';
import { dumpObject, describeObjectStructure } from '../../../utils/objectDumper';

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
  /** True when the season has finished. */
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
    logDiagnosticValidationFailure(
      'game-page',
      'standings array check',
      'standings is not an array or is empty',
      { isArray: Array.isArray(standings), length: Array.isArray(standings) ? standings.length : 'N/A' }
    );
    return false;
  }
  
  const invalidEntries: Array<{ index: number; reason: string }> = [];
  
  const allValid = standings.every(
    (t: unknown, idx: number) => {
      if (t === null || typeof t !== 'object') {
        invalidEntries.push({ index: idx, reason: `not an object (${typeof t})` });
        return false;
      }
      const team = t as StandingsTeam;
      if (typeof team.team_key !== 'string') {
        invalidEntries.push({ index: idx, reason: `team_key is not a string (${typeof team.team_key})` });
        return false;
      }
      if (typeof team.team_id !== 'string') {
        invalidEntries.push({ index: idx, reason: `team_id is not a string (${typeof team.team_id})` });
        return false;
      }
      if (typeof team.name !== 'string') {
        invalidEntries.push({ index: idx, reason: `name is not a string (${typeof team.name})` });
        return false;
      }
      return true;
    }
  );
  
  if (!allValid && invalidEntries.length > 0) {
    logDiagnosticValidationFailure(
      'game-page',
      'standings entry validation',
      `${invalidEntries.length} invalid entries found`,
      { invalidEntries }
    );
  }
  
  return allValid;
};

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr: string = Array.isArray(gameid) ? gameid[0] : (gameid ?? '');

  // Use the leagueinfo endpoint which now includes standings and aggregated_stats
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
    logDiagnosticError(
      'game-page',
      'standings validation failed',
      {
        rawStandingsType: typeof rawStandings,
        isArray: Array.isArray(rawStandings),
        length: Array.isArray(rawStandings) ? rawStandings.length : 'N/A',
        structure: describeObjectStructure(rawStandings, 2),
        sample: Array.isArray(rawStandings) && rawStandings.length > 0 ? rawStandings[0] : null,
      }
    );
  }

  const isFinished: boolean = data.is_finished ?? false;
  const aggregatedStats: LeagueAggregatedStats | undefined = data.aggregated_stats;

  if (aggregatedStats) {
    console.log(
      `[GamePage] Received aggregated stats for ${Object.keys(aggregatedStats.teams).length} teams`,
      `(weeks ${aggregatedStats.week_range.start}–${aggregatedStats.week_range.end})`
    );
    logDiagnostic(
      'game-page',
      'aggregated stats received',
      {
        teamCount: Object.keys(aggregatedStats.teams).length,
        weekRange: aggregatedStats.week_range,
      }
    );
  } else {
    console.warn('[GamePage] No aggregated_stats in API response — multi-week aggregation unavailable');
    logDiagnostic('game-page', 'No aggregated_stats in API response');
  }

  if (standings) {
    console.log(
      `[GamePage] Rendering standings table with ${standings.length} team(s), isFinished=${isFinished}`
    );
    logDiagnostic(
      'game-page',
      'Rendering standings table',
      {
        teamCount: standings.length,
        isFinished,
      }
    );
  } else {
    console.warn('[GamePage] No valid standings data available — rendering fallback message');
    logDiagnosticError('game-page', 'No valid standings data available');
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
