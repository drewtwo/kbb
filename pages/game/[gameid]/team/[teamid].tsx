import { useRouter } from 'next/router';
import Layout from '../../../../components/layout';
import ErrorDisplay from '../../../../components/error-display';
import useSwr from 'swr';
import dynamic from 'next/dynamic';
import {
  extractStatCategoriesFromLeagueSettings,
  extractStatsFromWeekContent,
  StatCategory,
  StatEntry,
} from '../../../../utils/yahooData';
import styles from './teamstats.module.css';

const StatCard = dynamic(() => import('../../../../components/statcard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Types for raw API responses ─────────────────────────────────────────────

interface WeeklyStatsApiResponse {
  stats_by_week?: unknown[];
  error?: string;
}

interface LeagueInfoApiResponse {
  settings?: unknown;
  teams?: unknown;
  error?: string;
}

// ─── Normalised internal types ────────────────────────────────────────────────

interface NormalisedWeekStats {
  stats: StatEntry[];
}

interface NormalisedWeeklyStatsData {
  stats_by_week: NormalisedWeekStats[];
}

// ─── Chart / stat helpers ─────────────────────────────────────────────────────

/**
 * Safely extracts the numeric value for a given stat_id from a stats array.
 * Returns '0' when the stat is not found so downstream Number() calls are safe.
 */
function getStatValue(statId: string, stats: StatEntry[]): string {
  const entry = stats.find((s: StatEntry) => s.stat_id === statId);
  if (!entry) return '0';
  if (statId === '60') {
    return entry.value?.split('/')[0] ?? '0';
  }
  return entry.value ?? '0';
}

export function generateChartData(
  stat_id: string,
  weekly_stats_data: NormalisedWeeklyStatsData
): (string | number)[] {
  if (
    !weekly_stats_data ||
    !Array.isArray(weekly_stats_data.stats_by_week) ||
    weekly_stats_data.stats_by_week.length === 0
  ) {
    console.warn(`[generateChartData] No weekly stats data for stat_id: ${stat_id}`);
    return [];
  }

  const dataset: (string | number)[] = weekly_stats_data.stats_by_week.map(
    (weekEntry: NormalisedWeekStats) => {
      if (!weekEntry || !Array.isArray(weekEntry.stats)) return '0';
      return getStatValue(stat_id, weekEntry.stats);
    }
  );

  console.log(`[generateChartData] stat_id: ${stat_id}, dataset length: ${dataset.length}, data:`, dataset);
  return dataset.reverse();
}

export function generateDelta(
  stat_id: string,
  weekly_stats_data: NormalisedWeeklyStatsData
): number | string {
  if (
    !weekly_stats_data ||
    !Array.isArray(weekly_stats_data.stats_by_week) ||
    weekly_stats_data.stats_by_week.length < 2
  ) {
    return 0;
  }

  const thisWeek = weekly_stats_data.stats_by_week[0];
  const lastWeek = weekly_stats_data.stats_by_week[1];

  if (
    !thisWeek ||
    !Array.isArray(thisWeek.stats) ||
    !lastWeek ||
    !Array.isArray(lastWeek.stats)
  ) {
    return 0;
  }

  const thisWeekValue = getStatValue(stat_id, thisWeek.stats);
  const lastWeekValue = getStatValue(stat_id, lastWeek.stats);

  const delta = Number(thisWeekValue) - Number(lastWeekValue);
  return delta % 1 === 0 ? delta : delta.toFixed(3);
}

export function generateCurrentValue(
  stat_id: string,
  weekly_stats_data: NormalisedWeeklyStatsData
): string {
  if (
    !weekly_stats_data ||
    !Array.isArray(weekly_stats_data.stats_by_week) ||
    weekly_stats_data.stats_by_week.length === 0
  ) {
    return '0';
  }

  const thisWeek = weekly_stats_data.stats_by_week[0];
  if (!thisWeek || !Array.isArray(thisWeek.stats)) return '0';

  const entry = thisWeek.stats.find((s: StatEntry) => s.stat_id === stat_id);
  return entry?.value ?? '0';
}

// ─── Normalise weekly stats API response ─────────────────────────────────────

/**
 * Converts the raw API response from /api/teamstats into the normalised
 * NormalisedWeeklyStatsData shape used by the chart helpers above.
 * Returns null when the data is missing or malformed.
 */
function normaliseWeeklyStats(
  raw: WeeklyStatsApiResponse | null | undefined
): NormalisedWeeklyStatsData | null {
  if (!raw) {
    console.error('[normaliseWeeklyStats] Raw data is null or undefined');
    return null;
  }
  if (raw.error) {
    console.error('[normaliseWeeklyStats] Weekly stats API returned error:', raw.error);
    return null;
  }
  if (!Array.isArray(raw.stats_by_week) || raw.stats_by_week.length === 0) {
    console.error('[normaliseWeeklyStats] Weekly stats API: stats_by_week is missing or empty');
    return null;
  }

  console.log(`[normaliseWeeklyStats] Processing ${raw.stats_by_week.length} weeks of data`);

  const normalisedWeeks: NormalisedWeekStats[] = [];

  for (const weekContent of raw.stats_by_week) {
    const stats = extractStatsFromWeekContent(weekContent);
    if (!stats) {
      // Skip weeks with malformed data rather than crashing
      console.warn('[normaliseWeeklyStats] Skipping malformed week entry in stats_by_week');
      continue;
    }
    normalisedWeeks.push({ stats });
  }

  if (normalisedWeeks.length === 0) {
    console.error('[normaliseWeeklyStats] No valid week entries found in stats_by_week');
    return null;
  }

  console.log(`[normaliseWeeklyStats] Successfully normalised ${normalisedWeeks.length} weeks`);
  return { stats_by_week: normalisedWeeks };
}

// ─── Page component ───────────────────────────────────────────────────────────

const Team = () => {
  const router = useRouter();
  const { gameid, teamid } = router.query;
  const gameIdStr: string | undefined = Array.isArray(gameid) ? gameid[0] : gameid;
  const teamIdStr: string | undefined = Array.isArray(teamid) ? teamid[0] : teamid;

  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const team_stats_route = `/api/teamstats/${gameIdStr}.t.${teamIdStr}`;

  const stats_response = useSwr<LeagueInfoApiResponse>(
    gameIdStr ? league_info_route : null,
    fetcher
  );
  const weekly_stat_response = useSwr<WeeklyStatsApiResponse>(
    teamIdStr ? team_stats_route : null,
    fetcher
  );

  // ── Network / SWR errors ──────────────────────────────────────────────────
  if (stats_response.error) {
    console.error('[Team page] Network error loading league info:', stats_response.error);
    return (
      <Layout>
        <ErrorDisplay
          title="Failed to load league info"
          message="There was a network error loading league settings. Please try refreshing the page."
        />
      </Layout>
    );
  }

  if (weekly_stat_response.error) {
    console.error('[Team page] Network error loading team stats:', weekly_stat_response.error);
    return (
      <Layout>
        <ErrorDisplay
          title="Failed to load team stats"
          message="There was a network error loading team statistics. Please try refreshing the page."
        />
      </Layout>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!stats_response.data || !weekly_stat_response.data) {
    console.log('[Team page] Loading... stats_response.data:', !!stats_response.data, 'weekly_stat_response.data:', !!weekly_stat_response.data);
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  // ── API-level errors returned in the JSON body ────────────────────────────
  if (stats_response.data.error) {
    console.error('[Team page] League info API error:', stats_response.data.error);
    return (
      <Layout>
        <ErrorDisplay
          title="League info unavailable"
          message={stats_response.data.error}
        />
      </Layout>
    );
  }

  if (weekly_stat_response.data.error) {
    console.error('[Team page] Team stats API error:', weekly_stat_response.data.error);
    return (
      <Layout>
        <ErrorDisplay
          title="Team stats unavailable"
          message={weekly_stat_response.data.error}
        />
      </Layout>
    );
  }

  // ── Extract stat categories from league settings ──────────────────────────
  const statCategories: StatCategory[] | null =
    extractStatCategoriesFromLeagueSettings(stats_response.data.settings);

  if (!statCategories) {
    console.error('[Team page] Could not extract stat categories from league settings');
    return (
      <Layout>
        <ErrorDisplay
          title="League settings unavailable"
          message="Could not read stat categories from the league settings. The data returned by Yahoo may be in an unexpected format."
        />
      </Layout>
    );
  }

  console.log(`[Team page] Extracted ${statCategories.length} stat categories:`, statCategories.map(s => ({ id: s.stat_id, name: s.name })));

  // ── Normalise weekly stats ────────────────────────────────────────────────
  const weeklyStatsData: NormalisedWeeklyStatsData | null = normaliseWeeklyStats(
    weekly_stat_response.data
  );

  if (!weeklyStatsData) {
    console.error('[Team page] Failed to normalise weekly stats data');
    return (
      <Layout>
        <ErrorDisplay
          title="Team stats unavailable"
          message="Could not read weekly statistics for this team. The data returned by Yahoo may be in an unexpected format."
        />
      </Layout>
    );
  }

  console.log(`[Team page] Successfully loaded ${weeklyStatsData.stats_by_week.length} weeks of stats`);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <p>League Stats</p>
      <div className={styles.statsGrid}>
        {statCategories.map((stat: StatCategory) => {
          const chartData = generateChartData(stat.stat_id, weeklyStatsData);
          console.log(`[Team page] Rendering stat: ${stat.name} (${stat.stat_id}) with ${chartData.length} data points`);
          return (
            <div key={stat.stat_id}>
              <StatCard
                name={stat.name}
                shortName={stat.display_name}
                delta={generateDelta(stat.stat_id, weeklyStatsData)}
                deltaDirection={
                  Number(generateDelta(stat.stat_id, weeklyStatsData)) > 0 ? 1 : -1
                }
                currentValue={generateCurrentValue(stat.stat_id, weeklyStatsData)}
                chartData={chartData}
              />
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default Team;
