import { useRouter } from 'next/router';
import { useState, useCallback } from 'react';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import type {
  LeagueAggregatedStats,
  LeagueWeeklyStats,
  StandingsTeam,
  TeamData,
  StatCategory,
} from '../../../utils/yahooData';
import StandingsTable from '../../../components/standings-table';
import TeamsListFallback from '../../../components/teams-list-fallback';
import LeagueStatsChart from '../../../components/league-stats-chart';
import LeagueWeeklyChart from '../../../components/league-weekly-chart';
import styles from './league.module.css';
import { getRenderableStandings, isValidTeamsArray } from '../../../lib/standings-validation';

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
  /** Per-team per-week stats for the entire league (oldest week first). */
  weekly_stats?: LeagueWeeklyStats;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
  /**
   * Whether the season has finished.  Populated from the Yahoo API
   * `is_finished` field via the leagueinfo API route.
   */
  is_finished?: boolean;
  /**
   * Flat list of teams extracted from the league teams response.
   * Used as a fallback when standings data is unavailable so users can still
   * navigate to individual team stats pages.
   */
  extracted_teams?: TeamData[];
  /**
   * Stat categories defined for this league, extracted from the settings response.
   * Used to populate the dropdown in the league stats chart.
   */
  stat_categories?: StatCategory[];
}


const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr: string = Array.isArray(gameid) ? gameid[0] : (gameid ?? '');

  // Lifted stat selection state — shared between the bar chart and the line chart
  const [selectedStatId, setSelectedStatId] = useState<string>('');

  const handleStatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatId(e.target.value);
    },
    []
  );

  // Use the leagueinfo endpoint which now includes standings, is_finished,
  // aggregated_stats, and weekly_stats
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
    '| is_finished type:', typeof data.is_finished,
    '| extracted_teams length:', Array.isArray(data.extracted_teams) ? data.extracted_teams.length : 'N/A'
  );

  // Validate standings before passing to the table component so that
  // malformed or partially-missing data surfaces a clear fallback message
  // rather than a runtime crash inside StandingsTable.
  const rawStandings: StandingsTeam[] | undefined = data.standings;
  const standings: StandingsTeam[] | undefined = getRenderableStandings(rawStandings);

  if (rawStandings !== undefined && standings === undefined) {
    // The API returned a standings field but it failed validation — log details
    // so the issue can be diagnosed from the browser console.
    console.warn(
      '[GamePage] standings data received from API but failed validation — falling back to teams list.',
      'Raw standings value:', rawStandings
    );
  }

  // Validate the extracted_teams fallback array
  const rawExtractedTeams: TeamData[] | undefined = data.extracted_teams;
  const extractedTeams: TeamData[] | undefined = isValidTeamsArray(rawExtractedTeams)
    ? rawExtractedTeams
    : undefined;

  if (rawExtractedTeams !== undefined && extractedTeams === undefined) {
    console.warn(
      '[GamePage] extracted_teams received from API but failed validation — fallback list will be empty.',
      'Raw extracted_teams value:', rawExtractedTeams
    );
  }

  // is_finished is now a boolean field returned directly by the API route
  const isFinished: boolean = data.is_finished === true;
  const aggregatedStats: LeagueAggregatedStats | undefined = data.aggregated_stats;
  const weeklyStats: LeagueWeeklyStats | undefined = data.weekly_stats;
  const statCategories: StatCategory[] = Array.isArray(data.stat_categories)
    ? data.stat_categories
    : [];

  // Derive the effective stat id: use the lifted state value when set,
  // otherwise fall back to the first available category once data has loaded.
  const effectiveStatId: string =
    selectedStatId !== ''
      ? selectedStatId
      : statCategories.length > 0
      ? statCategories[0].stat_id
      : '';

  if (aggregatedStats) {
    console.log(
      `[GamePage] Received aggregated stats for ${Object.keys(aggregatedStats.teams).length} teams`,
      `(weeks ${aggregatedStats.week_range.start}–${aggregatedStats.week_range.end})`
    );
  } else {
    console.warn('[GamePage] No aggregated_stats in API response — multi-week aggregation unavailable');
  }

  if (weeklyStats) {
    console.log(
      `[GamePage] Received weekly stats for ${Object.keys(weeklyStats).length} teams`
    );
  } else {
    console.warn('[GamePage] No weekly_stats in API response — weekly line chart unavailable');
  }

  if (standings) {
    console.log(
      `[GamePage] Rendering standings table with ${standings.length} team(s), isFinished=${isFinished}`
    );
  } else {
    console.warn(
      '[GamePage] No valid standings data available — rendering fallback team list.',
      'extracted_teams count:', extractedTeams?.length ?? 0
    );
  }

  const handleBackClick = () => {
    router.push('/teamstable');
  };

  return (
    <Layout>
      <button className={styles.backButton} onClick={handleBackClick}>
        ← Back to Teams
      </button>
      <p>League ID: {gameid}</p>
      {standings ? (
        <StandingsTable
          gameId={gameIdStr}
          standings={standings}
          isFinished={isFinished}
        />
      ) : (
        <TeamsListFallback
          gameId={gameIdStr}
          teams={extractedTeams ?? []}
        />
      )}
      {aggregatedStats && (
        <LeagueStatsChart
          aggregatedStats={aggregatedStats}
          statCategories={statCategories}
          selectedStatId={effectiveStatId}
          onStatChange={handleStatChange}
        />
      )}
      {weeklyStats && (
        <LeagueWeeklyChart
          weeklyStats={weeklyStats}
          statCategories={statCategories}
          selectedStatId={effectiveStatId}
        />
      )}
    </Layout>
  );
};

export default League;
