import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueStandings,
  getLeagueAggregatedStats,
  extractStandingsFromLeagueContent,
  isErrorResponse,
  SEASON_START_WEEK,
  SEASON_END_WEEK,
} from '../../../utils/yahooData';
import type { LeagueAggregatedStats, StandingsTeam, LeagueStandingsContent } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
  /** Aggregated stats for every team across all weeks of the season. */
  aggregated_stats?: LeagueAggregatedStats;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
  /** True when the season has finished (derived from the standings response). */
  is_finished?: boolean;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { id } = req.query;
    if (id === undefined || id === null) {
      res.status(400).json({ error: 'no league id provided' });
      return;
    }

    const leagueIdStr: string = Array.isArray(id) ? id[0] : id;
    console.log(`[leagueinfo API] Fetching data for league id: "${leagueIdStr}"`);

    // Fetch teams, settings, and standings in parallel
    console.log('[leagueinfo API] Starting parallel fetch: teams, settings, standings');
    const [league_teams, league_settings, league_standings] = await Promise.all([
      getLeagueTeams(req, id),
      getLeagueSettings(req, id),
      getLeagueStandings(req, id),
    ]);
    console.log('[leagueinfo API] Parallel fetch complete');

    // Surface any error returned by the Yahoo API utilities
    if (isErrorResponse(league_teams)) {
      console.error('[leagueinfo API] getLeagueTeams returned error:', league_teams.error);
      const statusCode: number =
        typeof league_teams.statusCode === 'number' ? league_teams.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league teams: ${league_teams.error}` });
      return;
    }
    console.log('[leagueinfo API] league_teams fetched successfully, type:', typeof league_teams);

    if (isErrorResponse(league_settings)) {
      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league settings: ${league_settings.error}` });
      return;
    }
    console.log('[leagueinfo API] league_settings fetched successfully, type:', typeof league_settings);

    // Extract standings — non-fatal if it fails
    let standings: StandingsTeam[] | undefined;
    let is_finished: boolean | undefined;

    if (isErrorResponse(league_standings)) {
      console.warn(
        '[leagueinfo API] getLeagueStandings returned error (non-fatal):',
        league_standings.error
      );
    } else {
      console.log(
        '[leagueinfo API] league_standings fetched successfully, type:', typeof league_standings,
        '| isNull:', league_standings === null,
        '| keys:', league_standings && typeof league_standings === 'object'
          ? Object.keys(league_standings as object)
          : 'N/A'
      );

      const extractedStandings: StandingsTeam[] | null = extractStandingsFromLeagueContent(league_standings);
      if (extractedStandings) {
        standings = extractedStandings;
        console.log(
          `[leagueinfo API] extractStandingsFromLeagueContent succeeded: ${standings.length} team(s)`
        );
        // Log a brief summary of each team's standings entry for traceability
        standings.forEach((t: StandingsTeam, i: number) => {
          console.log(
            `[leagueinfo API]   standings[${i}]: team_id=${t.team_id} name="${t.name}" rank=${t.team_standings?.rank ?? 'N/A'} wins=${t.team_standings?.outcome_totals?.wins ?? 'N/A'}`
          );
        });
      } else {
        console.warn('[leagueinfo API] extractStandingsFromLeagueContent returned null — omitting standings from response');
      }

      // Extract is_finished from the standings league metadata
      const standingsContent: LeagueStandingsContent = league_standings as LeagueStandingsContent;
      if (standingsContent?.league?.is_finished !== undefined) {
        is_finished = standingsContent.league.is_finished === '1';
        console.log(`[leagueinfo API] is_finished extracted: ${is_finished} (raw: "${standingsContent.league.is_finished}")`);
      } else {
        console.log('[leagueinfo API] is_finished not present in standings response — defaulting to false');
      }
    }

    // Aggregate weekly stats for all teams across all weeks of the season.
    // A failure here is non-fatal — we still return teams and settings so the
    // rest of the page can render.
    console.log(
      `[leagueinfo API] Aggregating league stats for weeks ${SEASON_START_WEEK}-${SEASON_END_WEEK}`
    );
    const aggregated_stats: LeagueAggregatedStats | null = await getLeagueAggregatedStats(
      req,
      league_teams,
      SEASON_START_WEEK,
      SEASON_END_WEEK
    );

    if (!aggregated_stats) {
      console.warn(
        '[leagueinfo API] getLeagueAggregatedStats returned null — responding without aggregated stats'
      );
    } else {
      console.log(
        `[leagueinfo API] Successfully aggregated stats for ${Object.keys(aggregated_stats.teams).length} teams`
      );
    }

    const responsePayload: ResponseData = {
      teams: league_teams,
      settings: league_settings,
      ...(aggregated_stats ? { aggregated_stats } : {}),
      ...(standings ? { standings } : {}),
      ...(is_finished !== undefined ? { is_finished } : {}),
    };

    console.log(
      '[leagueinfo API] Sending response — standings present:', !!standings,
      '| standings count:', standings?.length ?? 0,
      '| aggregated_stats present:', !!aggregated_stats,
      '| is_finished:', is_finished
    );

    res.status(200).json(responsePayload);
  } catch (_err) {
    const message: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    res.status(500).json({ error: 'failed to load data' });
  }
}
