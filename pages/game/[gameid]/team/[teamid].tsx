import { useRouter } from 'next/router';
import Layout from '../../../../components/layout';
import ErrorDisplay from '../../../../components/error-display';
import useSwr from 'swr';
import dynamic from 'next/dynamic';
import {
  extractStatCategoriesFromLeagueSettings,
  extractWeeklyStatsData,
  isErrorResponse,
  StatCategory,
  WeekStatEntry,
} from '../../../../utils/yahooData';

const StatCard = dynamic(() => import('../../../../components/statcard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface WeeklyStatsApiResponse {
  stats_by_week: unknown[];
}

/**
 * Safely extracts the stat value for a given stat_id from a stats array.
 * Returns the raw value string, or '0' when the stat is not found.
 */
function getStatValue(statId: string, stats: WeekStatEntry[]): string {
  const found = stats.find((s: WeekStatEntry) => s.stat_id === statId);
  if (!found) {
    return '0';
  }
  // Stat 60 is a ratio (e.g. "5/10") — use only the numerator for charting
  if (statId === '60') {
    return found.value.split('/')[0] ?? '0';
  }
  return found.value;
}

/**
 * Builds a chart-ready array of numeric values for a given stat across all weeks.
 * The array is reversed so that the earliest week appears first.
 */
export function generateChartData(
  stat_id: string,
  weekly_stats_data: WeeklyStatsApiResponse
): (string | number)[] {
  const dataset: (string | number)[] = [];

  for (const weekEntry of weekly_stats_data.stats_by_week) {
    const parsed = extractWeeklyStatsData(weekEntry);
    if (!parsed) {
      continue;
    }
    dataset.push(getStatValue(stat_id, parsed.stats));
  }

  console.log('stat id: ' + stat_id);
  return dataset.reverse();
}

/**
 * Computes the week-over-week delta for a given stat.
 * Returns 0 when there are fewer than two weeks of data.
 */
export function generateDelta(
  stat_id: string,
  weekly_stats_data: WeeklyStatsApiResponse
): number | string {
  const weeks = weekly_stats_data.stats_by_week;
  if (!weeks || weeks.length < 2) {
    return 0;
  }

  const thisWeekParsed = extractWeeklyStatsData(weeks[0]);
  const lastWeekParsed = extractWeeklyStatsData(weeks[1]);

  if (!thisWeekParsed || !lastWeekParsed) {
    return 0;
  }

  const thisWeekValue = getStatValue(stat_id, thisWeekParsed.stats);
  const lastWeekValue = getStatValue(stat_id, lastWeekParsed.stats);

  const delta = Number(thisWeekValue) - Number(lastWeekValue);
  return delta % 1 === 0 ? delta : delta.toFixed(3);
}

/**
 * Returns the current (most recent) week's value for a given stat.
 * Returns an empty string when data is unavailable.
 */
export function generateCurrentValue(
  stat_id: string,
  weekly_stats_data: WeeklyStatsApiResponse
): string {
  const weeks = weekly_stats_data.stats_by_week;
  if (!weeks || weeks.length === 0) {
    return '';
  }

  const thisWeekParsed = extractWeeklyStatsData(weeks[0]);
  if (!thisWeekParsed) {
    return '';
  }

  return getStatValue(stat_id, thisWeekParsed.stats);
}

const Team = () => {
  const router = useRouter();
  const { gameid, teamid } = router.query;
  const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;
  const teamIdStr = Array.isArray(teamid) ? teamid[0] : teamid;
  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const team_stats_route = `/api/teamstats/${gameIdStr}.t.${teamIdStr}`;
  const stats_response = useSwr(gameIdStr ? league_info_route : null, fetcher);
  const weekly_stat_response = useSwr(teamIdStr ? team_stats_route : null, fetcher);

  if (stats_response.error || weekly_stat_response.error) {
    const errorMessage =
      stats_response.error?.message ??
      weekly_stat_response.error?.message ??
      'An unexpected error occurred while loading team data.';
    return (
      <Layout>
        <ErrorDisplay title="Failed to load team stats" message={errorMessage} />
      </Layout>
    );
  }

  if (!stats_response.data || !weekly_stat_response.data) {
    return (
      <Layout>
        <p>Loading...</p>
      </Layout>
    );
  }

  // Check whether the API returned an error payload instead of real data
  if (isErrorResponse(stats_response.data)) {
    return (
      <Layout>
        <ErrorDisplay
          title="League info unavailable"
          message={stats_response.data.error}
        />
      </Layout>
    );
  }

  if (isErrorResponse(weekly_stat_response.data)) {
    return (
      <Layout>
        <ErrorDisplay
          title="Team stats unavailable"
          message={weekly_stat_response.data.error}
        />
      </Layout>
    );
  }

  // Safely extract stat categories from the league settings response
  const settingsContent =
    stats_response.data &&
    typeof stats_response.data === 'object' &&
    'settings' in stats_response.data
      ? (stats_response.data as { settings: unknown }).settings
      : null;

  const statCategories: StatCategory[] | null =
    extractStatCategoriesFromLeagueSettings(settingsContent);

  if (!statCategories) {
    return (
      <Layout>
        <ErrorDisplay
          title="League settings unavailable"
          message="Could not load stat categories from the league settings. The data returned by Yahoo may be incomplete or in an unexpected format."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <p>League Stats</p>
      <div>
        {statCategories.map((stat: StatCategory) => (
          <div key={stat.name}>
            <StatCard
              name={stat.name}
              shortName={stat.display_name}
              delta={generateDelta(stat.stat_id, weekly_stat_response.data)}
              deltaDirection={
                Number(generateDelta(stat.stat_id, weekly_stat_response.data)) > 0
                  ? 1
                  : -1
              }
              currentValue={generateCurrentValue(
                stat.stat_id,
                weekly_stat_response.data
              )}
              chartData={generateChartData(
                stat.stat_id,
                weekly_stat_response.data
              )}
            />
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Team;
