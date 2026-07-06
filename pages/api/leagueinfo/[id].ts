import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueStandings,
  getLeagueWeeklyAggregatedStats,
  extractTeamsFromLeagueContent,
  extractStatCategoriesFromLeagueSettings,
  isErrorResponse,
} from '../../../utils/yahooData';
import type { StandingsTeam, TeamData, StatCategory, LeagueAggregatedStats } from '../../../utils/yahooData';

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
    console.log('[leagueinfo API] league_teams fetched successfully');

    if (isErrorResponse(league_settings)) {
      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;
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

    // Fetch aggregated stats for all teams in the league
    console.log('[leagueinfo API] Fetching aggregated weekly stats for all teams');
    const aggregated_stats: LeagueAggregatedStats | null = await getLeagueWeeklyAggregatedStats(
      req,
      league_teams
    );
    if (aggregated_stats) {
      console.log(
        `[leagueinfo API] aggregated_stats: ${Object.keys(aggregated_stats.teams).length} team(s) aggregated (weeks ${aggregated_stats.week_range.start}–${aggregated_stats.week_range.end})`
      );
    } else {
      console.warn(
        '[leagueinfo API] getLeagueWeeklyAggregatedStats returned null — chart will not display'
      );
    }

    // Standings are non-fatal — if the call failed we omit them from the response
    let standings: StandingsTeam[] | undefined;
    let is_finished: boolean = false;

    if (isErrorResponse(league_standings)) {
      console.warn(
        '[leagueinfo API] getLeagueStandings returned error (non-fatal):',
        league_standings.error
      );
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
    };

    console.log(
      '[leagueinfo API] Sending response — standings present:', !!standings,
      '| standings count:', standings?.length ?? 0,
      '| is_finished:', is_finished,
      '| extracted_teams count:', extracted_teams?.length ?? 0,
      '| stat_categories count:', stat_categories?.length ?? 0,
      '| aggregated_stats present:', !!aggregated_stats
    );

    res.status(200).json(responsePayload);
  } catch (_err) {
    const message: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    res.status(500).json({ error: 'failed to load data' });
  }
}
