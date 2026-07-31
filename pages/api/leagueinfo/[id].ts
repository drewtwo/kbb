import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueStandings,
  getLeagueWeeklyAggregatedStats,
  getLeagueAllTeamsWeeklyStats,
  extractTeamsFromLeagueContent,
  extractStatCategoriesFromLeagueSettings,
  isErrorResponse,
} from '../../../utils/yahooData';
import type {
  StandingsTeam,
  TeamData,
  StatCategory,
  LeagueAggregatedStats,
  LeagueWeeklyStats,
} from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
  /** League standings — one entry per team, sorted by rank ascending. */
  standings?: StandingsTeam[];
  /** True when the season has finished (derived from Yahoo API is_finished field). */
  is_finished?: boolean;
  /**
   * Flat list of teams extracted from the league teams response.
   * Populated even when standings are unavailable so the game page can render
   * a fallback team list with links to individual team stats pages.
   */
  extracted_teams?: TeamData[];
  /**
   * Stat categories defined for this league, extracted from the settings response.
   * Used to populate the dropdown in the league stats chart.
   */
  stat_categories?: StatCategory[];
  /**
   * Aggregated weekly stats for all teams in the league.
   * Used to populate the league stats chart.
   */
  aggregated_stats?: LeagueAggregatedStats;
  /**
   * Per-team per-week stats for the entire league (oldest week first).
   * Used to populate the league weekly line chart.
   */
  weekly_stats?: LeagueWeeklyStats;
};

/**
 * Returns true when the given HTTP status code indicates an authentication or
 * authorisation failure from the Yahoo API (401 Unauthorized or 403 Forbidden).
 *
 * Yahoo returns 403 Forbidden — rather than 401 — when an access token is
 * present but expired or revoked.  Both codes should be surfaced to the client
 * as an auth error so the UI can prompt the user to sign in again.
 */
const isAuthError = (statusCode: number | undefined): boolean =>
  statusCode === 401 || statusCode === 403;

/**
 * Builds a human-readable error message for auth failures that clearly
 * instructs the user to sign in again, regardless of whether Yahoo returned
 * 401 or 403.
 */
const buildAuthErrorMessage = (originalError: string, statusCode: number): string => {
  if (statusCode === 403) {
    return (
      'Access denied by Yahoo API (HTTP 403 Forbidden). ' +
      'Your session token may be expired or revoked. ' +
      'Please sign out and sign in again to obtain a fresh token. ' +
      `(Original error: ${originalError})`
    );
  }
  return (
    'Authentication failed (HTTP 401 Unauthorized). ' +
    'Please sign in again to continue. ' +
    `(Original error: ${originalError})`
  );
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

    // Surface any error returned by the Yahoo API utilities.
    // Treat 401 and 403 as auth errors — Yahoo returns 403 when a token is
    // present but expired/revoked, so we must handle both codes the same way.
    if (isErrorResponse(league_teams)) {
      const statusCode: number =
        typeof league_teams.statusCode === 'number' ? league_teams.statusCode : 500;

      if (isAuthError(statusCode)) {
        const authMsg: string = buildAuthErrorMessage(league_teams.error, statusCode);
        console.error(
          `[leagueinfo API] getLeagueTeams auth error (HTTP ${statusCode}): ${authMsg}`
        );
        res.status(401).json({ error: authMsg });
        return;
      }

      console.error('[leagueinfo API] getLeagueTeams returned error:', league_teams.error);
      res.status(statusCode).json({ error: `Failed to load league teams: ${league_teams.error}` });
      return;
    }
    console.log('[leagueinfo API] league_teams fetched successfully');

    if (isErrorResponse(league_settings)) {
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;

      if (isAuthError(statusCode)) {
        const authMsg: string = buildAuthErrorMessage(league_settings.error, statusCode);
        console.error(
          `[leagueinfo API] getLeagueSettings auth error (HTTP ${statusCode}): ${authMsg}`
        );
        res.status(401).json({ error: authMsg });
        return;
      }

      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      res.status(statusCode).json({ error: `Failed to load league settings: ${league_settings.error}` });
      return;
    }
    console.log('[leagueinfo API] league_settings fetched successfully');

    // Extract the flat teams array from the league_teams response so the game
    // page can render a fallback list even when standings are unavailable.
    const extracted_teams: TeamData[] | null = extractTeamsFromLeagueContent(league_teams);
    if (extracted_teams) {
      console.log(
        `[leagueinfo API] extracted_teams: ${extracted_teams.length} team(s) extracted from league_teams`
      );
    } else {
      console.warn(
        '[leagueinfo API] extractTeamsFromLeagueContent returned null — fallback team list will be empty'
      );
    }

    // Extract stat categories from the settings response
    const stat_categories: StatCategory[] | null = extractStatCategoriesFromLeagueSettings(league_settings);
    if (stat_categories) {
      console.log(
        `[leagueinfo API] stat_categories: ${stat_categories.length} category(ies) extracted from league_settings`
      );
    } else {
      console.warn(
        '[leagueinfo API] extractStatCategoriesFromLeagueSettings returned null — chart dropdown will be empty'
      );
    }

    // Fetch aggregated stats and per-week stats for all teams in parallel
    console.log('[leagueinfo API] Fetching aggregated weekly stats and per-week stats for all teams in parallel');
    const [aggregated_stats, weekly_stats] = await Promise.all([
      getLeagueWeeklyAggregatedStats(req, league_teams),
      getLeagueAllTeamsWeeklyStats(req, league_teams),
    ]);

    if (aggregated_stats) {
      console.log(
        `[leagueinfo API] aggregated_stats: ${Object.keys(aggregated_stats.teams).length} team(s) aggregated (weeks ${aggregated_stats.week_range.start}–${aggregated_stats.week_range.end})`
      );
    } else {
      console.warn(
        '[leagueinfo API] getLeagueWeeklyAggregatedStats returned null — chart will not display'
      );
    }

    if (weekly_stats) {
      console.log(
        `[leagueinfo API] weekly_stats: ${Object.keys(weekly_stats).length} team(s) with per-week data`
      );
    } else {
      console.warn(
        '[leagueinfo API] getLeagueAllTeamsWeeklyStats returned null — weekly line chart will not display'
      );
    }

    // Standings are non-fatal — if the call failed we omit them from the response.
    // However, if the failure is an auth error (401/403) we still log it clearly
    // so operators can diagnose token issues without the page appearing broken.
    let standings: StandingsTeam[] | undefined;
    let is_finished: boolean = false;

    if (isErrorResponse(league_standings)) {
      const standingsStatusCode: number =
        typeof league_standings.statusCode === 'number' ? league_standings.statusCode : 0;

      if (isAuthError(standingsStatusCode)) {
        console.warn(
          `[leagueinfo API] getLeagueStandings auth error (HTTP ${standingsStatusCode}) — ` +
            'standings will be omitted from response. ' +
            `Error: ${league_standings.error}`
        );
      } else {
        console.warn(
          '[leagueinfo API] getLeagueStandings returned error (non-fatal):',
          league_standings.error
        );
      }
    } else {
      // league_standings is now a LeagueStandingsResult — extract teams and is_finished
      const rawTeams: StandingsTeam[] = league_standings.teams;
      is_finished = league_standings.is_finished;

      console.log(
        `[leagueinfo API] standings fetched successfully: ${rawTeams.length} team(s), is_finished=${is_finished}`
      );

      // Sort standings by rank ascending so the table renders in the correct order
      // regardless of the order returned by the Yahoo API.
      standings = [...rawTeams].sort((a: StandingsTeam, b: StandingsTeam) => {
        const rankA: number = parseInt(a.team_standings?.rank ?? '0', 10);
        const rankB: number = parseInt(b.team_standings?.rank ?? '0', 10);
        console.log(
          `[leagueinfo API] sort compare: "${a.name}" rank=${rankA} vs "${b.name}" rank=${rankB}`
        );
        return rankA - rankB;
      });

      console.log(
        '[leagueinfo API] standings sorted by rank:',
        standings.map((t: StandingsTeam) => `${t.name}(rank=${t.team_standings?.rank})`)
      );
    }

    const responsePayload: ResponseData = {
      teams: league_teams,
      settings: league_settings,
      ...(standings ? { standings } : {}),
      is_finished,
      ...(extracted_teams ? { extracted_teams } : {}),
      ...(stat_categories ? { stat_categories } : {}),
      ...(aggregated_stats ? { aggregated_stats } : {}),
      ...(weekly_stats ? { weekly_stats } : {}),
    };

    console.log(
      '[leagueinfo API] Sending response — standings present:', !!standings,
      '| standings count:', standings?.length ?? 0,
      '| is_finished:', is_finished,
      '| extracted_teams count:', extracted_teams?.length ?? 0,
      '| stat_categories count:', stat_categories?.length ?? 0,
      '| aggregated_stats present:', !!aggregated_stats,
      '| weekly_stats present:', !!weekly_stats
    );

    res.status(200).json(responsePayload);
  } catch (_err) {
    const message: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    res.status(500).json({ error: 'failed to load data' });
  }
}
