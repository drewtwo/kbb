import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import xml2js from 'xml2js';
import { IncomingMessage } from 'http';
import { NextApiRequest } from 'next';

const secret = process.env.NEXTAUTH_SECRET;

const parserOptions = { explicitArray: false };

const parser = new xml2js.Parser(parserOptions);

interface ErrorResponse {
  error: string;
  statusCode?: number;
}

export type SportFilter = 'all' | 'mlb' | 'nba' | 'nfl' | 'nhl';

const SPORT_PATH_SUFFIX: Record<SportFilter, string> = {
  all: '',
  mlb: ';game_codes=mlb',
  nba: ';game_codes=nba',
  nfl: ';game_codes=nfl',
  nhl: ';game_codes=nhl',
};

const normalizeSport = (sport?: string): SportFilter => {
  if (!sport) {
    return 'mlb';
  }

  const normalized = sport.toLowerCase();
  if (normalized === 'mlb' || normalized === 'nba' || normalized === 'nfl' || normalized === 'nhl' || normalized === 'all') {
    return normalized as SportFilter;
  }

  return 'mlb';
};

const buildUserGamesPath = (sport: SportFilter): string => {
  const suffix = SPORT_PATH_SUFFIX[sport];
  return `/fantasy/v2/users;use_login=1/games${suffix}/teams`;
};

export const decodeYahooResponseBody = async (
  response: IncomingMessage,
  chunks: Buffer[]
): Promise<string> => {
  const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
  const contentEncodingHeader = response.headers['content-encoding'] as string | string[] | undefined;
  const contentEncoding = typeof contentEncodingHeader === 'string'
    ? contentEncodingHeader.toLowerCase()
    : Array.isArray(contentEncodingHeader)
      ? contentEncodingHeader.join(',').toLowerCase()
      : '';

  if (contentEncoding.includes('gzip')) {
    return new Promise<string>((resolve, reject) => {
      zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(dezipped.toString());
      });
    });
  }

  if (contentEncoding.includes('deflate')) {
    return new Promise<string>((resolve, reject) => {
      zlib.inflate(buffer as unknown as zlib.InputType, (err, inflated) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(inflated.toString());
      });
    });
  }

  return buffer.toString();
};

export interface TeamData {
  team_key: string;
  team_id: string;
  name: string;
}

export interface LeagueTeamsContent {
  league?: {
    league_key?: string;
    league_id?: string;
    name?: string;
    teams?: {
      team?: TeamData | TeamData[];
    };
  };
}

/**
 * Safely extracts the teams array from the league fantasy_content response.
 * Handles both single-team and multi-team responses (xml2js with explicitArray: false
 * returns a single object instead of an array when there is only one element).
 * @param fantasyContent - The fantasy_content object from the Yahoo API response
 * @returns An array of TeamData objects, or null if the structure is invalid
 */
export const extractTeamsFromLeagueContent = (
  fantasyContent: unknown
): TeamData[] | null => {
  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error('[yahooData] extractTeamsFromLeagueContent: fantasyContent is null or not an object');
    return null;
  }

  const content = fantasyContent as LeagueTeamsContent;
  const league = content.league;

  if (!league) {
    console.error('[yahooData] extractTeamsFromLeagueContent: league property is missing from fantasy_content');
    return null;
  }

  const teamsContainer = league.teams;
  if (!teamsContainer) {
    console.error('[yahooData] extractTeamsFromLeagueContent: league.teams is missing');
    return null;
  }

  const teamField = teamsContainer.team;
  if (!teamField) {
    console.error('[yahooData] extractTeamsFromLeagueContent: league.teams.team is missing');
    return null;
  }

  // xml2js with explicitArray: false returns a single object when there is only one team
  return Array.isArray(teamField) ? teamField : [teamField];
};

// ─── Standings types ─────────────────────────────────────────────────────────

/**
 * Win/loss/tie record and scoring totals for a single team in the standings.
 *
 * NOTE: The Yahoo Fantasy API may return `outcome_totals` as a nested object
 * or may omit it entirely for leagues that have not yet started.  All fields
 * are therefore typed as optional so that callers can safely use optional
 * chaining (`record?.outcome_totals?.wins`) without TypeScript errors.
 */
export interface StandingsTeamRecord {
  /** Overall rank in the league (1 = first place). */
  rank?: string;
  outcome_totals?: {
    wins?: string;
    losses?: string;
    ties?: string;
    percentage?: string;
  };
  /** Total fantasy points scored by this team. */
  points_for?: string;
  /** Total fantasy points scored against this team. */
  points_against?: string;
  /** Playoff seed (may be absent for in-progress seasons). */
  playoff_seed?: string;
  /** streak — may be present in some API responses */
  streak?: {
    type?: string;
    value?: string;
  };
}

/**
 * A single team entry as returned inside the standings response.
 */
export interface StandingsTeam {
  team_key: string;
  team_id: string;
  name: string;
  team_standings: StandingsTeamRecord;
}

/**
 * The parsed `fantasy_content` shape returned by the /standings endpoint.
 */
export interface LeagueStandingsContent {
  league?: {
    league_key?: string;
    league_id?: string;
    name?: string;
    /** "1" when the season is finished, "0" (or absent) otherwise. */
    is_finished?: string;
    teams?: {
      team?: StandingsTeam | StandingsTeam[];
    };
  };
}

// ─── Stat-category types ────────────────────────────────────────────────────

export interface StatCategory {
  stat_id: string;
  name: string;
  display_name: string;
}

export interface LeagueSettingsContent {
  league?: {
    settings?: {
      stat_categories?: {
        stats?: {
          stat?: StatCategory | StatCategory[];
        };
      };
    };
  };
}

// ─── Weekly-stats types ──────────────────────────────────────────────────────

export interface StatEntry {
  stat_id: string;
  value: string;
}

export interface WeekStatsEntry {
  week: string | number;
  stats: {
    stat: StatEntry | StatEntry[];
  };
}

export interface WeeklyStatsContent {
  team?: {
    team_stats?: {
      stats?: {
        stat?: StatEntry | StatEntry[];
      };
    };
    team_points?: {
      week?: string | number;
    };
  };
}

// ─── Aggregated stats types ──────────────────────────────────────────────────

/**
 * Represents a single team's aggregated stats across all weeks of the season.
 */
export interface AggregatedTeamStats {
  /** The team key (e.g. "411.l.12345.t.1") */
  team_key: string;
  /** The team name */
  team_name: string;
  /** Aggregated stat values keyed by stat_id */
  stats: Record<string, number>;
  /** Number of weeks successfully aggregated */
  weeks_counted: number;
}

/**
 * Result of aggregating weekly stats for all teams in a league.
 */
export interface LeagueAggregatedStats {
  /** Map from team_key to that team's aggregated stats */
  teams: Record<string, AggregatedTeamStats>;
  /** The week range that was aggregated (inclusive) */
  week_range: {
    start: number;
    end: number;
  };
}

/**
 * Type guard: returns true when the value is an error response object.
 * @param value - Any value returned from a Yahoo API utility
 */
export const isErrorResponse = (value: unknown): value is ErrorResponse => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'string'
  );
};

/**
 * Safely extracts the stat categories array from a league settings
 * fantasy_content response.
 * Handles both single-stat and multi-stat responses (xml2js with
 * explicitArray: false returns a single object instead of an array when
 * there is only one element).
 * @param fantasyContent - The fantasy_content object from the Yahoo API response
 * @returns An array of StatCategory objects, or null if the structure is invalid
 */
export const extractStatCategoriesFromLeagueSettings = (
  fantasyContent: unknown
): StatCategory[] | null => {
  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: fantasyContent is null or not an object'
    );
    return null;
  }

  const content = fantasyContent as LeagueSettingsContent;
  const league = content.league;

  if (!league) {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: league property is missing'
    );
    return null;
  }

  const settings = league.settings;
  if (!settings) {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: league.settings is missing'
    );
    return null;
  }

  const statCategories = settings.stat_categories;
  if (!statCategories) {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: league.settings.stat_categories is missing'
    );
    return null;
  }

  const statsContainer = statCategories.stats;
  if (!statsContainer) {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: league.settings.stat_categories.stats is missing'
    );
    return null;
  }

  const statField = statsContainer.stat;
  if (!statField) {
    console.error(
      '[yahooData] extractStatCategoriesFromLeagueSettings: league.settings.stat_categories.stats.stat is missing'
    );
    return null;
  }

  // xml2js with explicitArray: false returns a single object when there is only one stat
  return Array.isArray(statField) ? statField : [statField];
};

/**
 * Safely extracts and normalises the stats array from a single week-stats
 * fantasy_content entry.
 * @param weekContent - The fantasy_content object for a single week
 * @returns An array of StatEntry objects, or null if the structure is invalid
 */
export const extractStatsFromWeekContent = (
  weekContent: unknown
): StatEntry[] | null => {
  if (!weekContent || typeof weekContent !== 'object') {
    console.error(
      '[yahooData] extractStatsFromWeekContent: weekContent is null or not an object'
    );
    return null;
  }

  const content = weekContent as WeeklyStatsContent;
  const team = content.team;

  if (!team) {
    console.error(
      '[yahooData] extractStatsFromWeekContent: team property is missing'
    );
    return null;
  }

  const teamStats = team.team_stats;
  if (!teamStats) {
    console.error(
      '[yahooData] extractStatsFromWeekContent: team.team_stats is missing'
    );
    return null;
  }

  const statsContainer = teamStats.stats;
  if (!statsContainer) {
    console.error(
      '[yahooData] extractStatsFromWeekContent: team.team_stats.stats is missing'
    );
    return null;
  }

  const statField = statsContainer.stat;
  if (!statField) {
    console.error(
      '[yahooData] extractStatsFromWeekContent: team.team_stats.stats.stat is missing'
    );
    return null;
  }

  // xml2js with explicitArray: false returns a single object when there is only one stat
  return Array.isArray(statField) ? statField : [statField];
};

// ─── Season week-range constants (deprecated) ───────────────────────────────
//
// These constants were used by the now-deprecated getLeagueAggregatedStats
// function to define the inclusive week range for multi-week stat aggregation.
// Standings are now fetched directly from the /standings endpoint via
// getLeagueStandings, so these constants are no longer used by the application.
//
// They are retained here for backwards compatibility with any external callers
// but should not be referenced in new code.

/** @deprecated No longer used. Standings are fetched directly from the /standings endpoint. */
export const SEASON_START_WEEK: number = (() => {
  const raw: string | undefined = process.env.NEXT_PUBLIC_SEASON_START_WEEK;
  const parsed: number = raw ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
})();

/** @deprecated No longer used. Standings are fetched directly from the /standings endpoint. */
export const SEASON_END_WEEK: number = (() => {
  const raw: string | undefined = process.env.NEXT_PUBLIC_SEASON_END_WEEK;
  const parsed: number = raw ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) && parsed >= SEASON_START_WEEK ? parsed : 15;
})();

/**
 * Aggregates weekly stats for a single team across multiple weeks.
 *
 * Each week's stats are summed together. For stat_id "60" (IP, which is
 * returned as "X/Y" format), only the numerator is used. Non-numeric values
 * are treated as 0 and do not contribute to the aggregate.
 *
 * @param weeklyStats - Array of raw fantasy_content objects, one per week
 * @param teamKey - The team key string (used for logging)
 * @param teamName - The team name (used for logging)
 * @returns An AggregatedTeamStats object with summed stats, or null on failure
 */
export const aggregateWeeklyStats = (
  weeklyStats: unknown[],
  teamKey: string,
  teamName: string
): AggregatedTeamStats | null => {
  if (!Array.isArray(weeklyStats) || weeklyStats.length === 0) {
    console.error(
      `[yahooData] aggregateWeeklyStats: no weekly stats provided for team ${teamKey}`
    );
    return null;
  }

  const aggregated: Record<string, number> = {};
  let weeks_counted: number = 0;

  for (const weekContent of weeklyStats) {
    // Skip error responses silently — a missing week should not break the whole aggregate
    if (isErrorResponse(weekContent)) {
      console.warn(
        `[yahooData] aggregateWeeklyStats: skipping error week for team ${teamKey}:`,
        (weekContent as ErrorResponse).error
      );
      continue;
    }

    const stats = extractStatsFromWeekContent(weekContent);
    if (!stats) {
      console.warn(
        `[yahooData] aggregateWeeklyStats: could not extract stats for a week of team ${teamKey}, skipping`
      );
      continue;
    }

    for (const entry of stats) {
      const { stat_id, value } = entry;
      // For stat_id "60" (Innings Pitched), the value is "X/Y" — use the numerator
      const rawValue: string =
        stat_id === '60' ? (value?.split('/')[0] ?? '0') : (value ?? '0');
      const numericValue: number = Number(rawValue);

      if (!isNaN(numericValue)) {
        aggregated[stat_id] = (aggregated[stat_id] ?? 0) + numericValue;
      }
    }

    weeks_counted += 1;
  }

  if (weeks_counted === 0) {
    console.error(
      `[yahooData] aggregateWeeklyStats: no valid weeks found for team ${teamKey}`
    );
    return null;
  }

  console.log(
    `[yahooData] aggregateWeeklyStats: aggregated ${weeks_counted} weeks for team ${teamKey} (${teamName})`
  );

  return {
    team_key: teamKey,
    team_name: teamName,
    stats: aggregated,
    weeks_counted,
  };
};

/**
 * @deprecated Standings are now fetched directly from the /standings endpoint
 * via `getLeagueStandings`, which returns a processed `StandingsTeam[]`
 * directly. This function is retained for backwards compatibility but is no
 * longer called by the application.
 *
 * Fetches and aggregates weekly stats for every team in a league across all
 * weeks from SEASON_START_WEEK to SEASON_END_WEEK (inclusive).
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param leagueTeamsContent - The raw fantasy_content from getLeagueTeams
 * @param startWeek - First week of the season to include (default: SEASON_START_WEEK)
 * @param endWeek - Last week of the season to include (default: SEASON_END_WEEK)
 * @returns A LeagueAggregatedStats object, or null on failure
 */
export const getLeagueAggregatedStats = async (
  req: NextApiRequest,
  leagueTeamsContent: unknown,
  startWeek: number = SEASON_START_WEEK,
  endWeek: number = SEASON_END_WEEK
): Promise<LeagueAggregatedStats | null> => {
  const teams = extractTeamsFromLeagueContent(leagueTeamsContent);
  if (!teams || teams.length === 0) {
    console.error('[yahooData] getLeagueAggregatedStats: could not extract teams from league content');
    return null;
  }

  console.log(
    `[yahooData] getLeagueAggregatedStats: aggregating weeks ${startWeek}-${endWeek} for ${teams.length} teams`
  );

  const result: LeagueAggregatedStats = {
    teams: {},
    week_range: { start: startWeek, end: endWeek },
  };

  for (const team of teams) {
    const { team_key, name } = team;

    // Fetch stats for every week in the range in parallel for this team
    const weekNumbers: number[] = [];
    for (let w: number = startWeek; w <= endWeek; w++) {
      weekNumbers.push(w);
    }

    const weeklyStatsPromises: Promise<unknown>[] = weekNumbers.map(
      (week: number) => getWeekStats(req, team_key, String(week))
    );

    let weeklyStats: unknown[];
    try {
      weeklyStats = await Promise.all(weeklyStatsPromises);
    } catch (err) {
      const msg: string = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[yahooData] getLeagueAggregatedStats: error fetching weekly stats for team ${team_key}: ${msg}`
      );
      continue;
    }

    const aggregated: AggregatedTeamStats | null = aggregateWeeklyStats(
      weeklyStats,
      team_key,
      name
    );

    if (aggregated) {
      result.teams[team_key] = aggregated;
    }
  }

  if (Object.keys(result.teams).length === 0) {
    console.error('[yahooData] getLeagueAggregatedStats: no teams were successfully aggregated');
    return null;
  }

  console.log(
    `[yahooData] getLeagueAggregatedStats: successfully aggregated stats for ${Object.keys(result.teams).length} teams`
  );

  return result;
};

/**
 * Fetches and aggregates weekly stats for all teams in a league using the
 * existing getWeeklyStats and aggregateWeeklyStats functions.
 *
 * This function is called by the /api/leagueinfo/[id] endpoint to build the
 * LeagueAggregatedStats structure that the chart component expects.
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param leagueTeamsContent - The raw fantasy_content from getLeagueTeams
 * @param startWeek - First week of the season to include (default: SEASON_START_WEEK)
 * @param endWeek - Last week of the season to include (default: SEASON_END_WEEK)
 * @returns A LeagueAggregatedStats object, or null on failure
 */
export const getLeagueWeeklyAggregatedStats = async (
  req: NextApiRequest,
  leagueTeamsContent: unknown,
  startWeek: number = SEASON_START_WEEK,
  endWeek: number = SEASON_END_WEEK
): Promise<LeagueAggregatedStats | null> => {
  const teams = extractTeamsFromLeagueContent(leagueTeamsContent);
  if (!teams || teams.length === 0) {
    console.error('[yahooData] getLeagueWeeklyAggregatedStats: could not extract teams from league content');
    return null;
  }

  console.log(
    `[yahooData] getLeagueWeeklyAggregatedStats: aggregating weeks ${startWeek}-${endWeek} for ${teams.length} teams`
  );

  const result: LeagueAggregatedStats = {
    teams: {},
    week_range: { start: startWeek, end: endWeek },
  };

  for (const team of teams) {
    const { team_key, name } = team;

    // Fetch stats for every week in the range in parallel for this team
    const weekNumbers: number[] = [];
    for (let w: number = startWeek; w <= endWeek; w++) {
      weekNumbers.push(w);
    }

    const weeklyStatsPromises: Promise<unknown>[] = weekNumbers.map(
      (week: number) => getWeekStats(req, team_key, String(week))
    );

    let weeklyStats: unknown[];
    try {
      weeklyStats = await Promise.all(weeklyStatsPromises);
    } catch (err) {
      const msg: string = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[yahooData] getLeagueWeeklyAggregatedStats: error fetching weekly stats for team ${team_key}: ${msg}`
      );
      continue;
    }

    const aggregated: AggregatedTeamStats | null = aggregateWeeklyStats(
      weeklyStats,
      team_key,
      name
    );

    if (aggregated) {
      result.teams[team_key] = aggregated;
    }
  }

  if (Object.keys(result.teams).length === 0) {
    console.error('[yahooData] getLeagueWeeklyAggregatedStats: no teams were successfully aggregated');
    return null;
  }

  console.log(
    `[yahooData] getLeagueWeeklyAggregatedStats: successfully aggregated stats for ${Object.keys(result.teams).length} teams`
  );

  return result;
};

/**
 * Converts a game ID (numeric, e.g. "411") to a league key format suitable for
 * Yahoo Fantasy API calls. If the input already looks like a full league key
 * (contains a dot, e.g. "411.l.12345"), it is returned as-is.
 * @param gameId - The game ID or league key string
 * @returns The league key string
 */
export const convertGameIdToLeagueKey = (gameId: string): string => {
  // If it already contains a dot it is likely already a full league key
  if (gameId.includes('.')) {
    return gameId;
  }
  // A bare numeric game ID is used directly as the league key prefix.
  // Callers that need a full league key (game_id.l.league_id) should
  // supply the complete key; this helper simply passes the value through
  // so that the API path is constructed correctly.
  return gameId;
};

/**
 * Validates that the token has an access token
 * @param token - The JWT token from NextAuth
 * @returns true if token is valid, false otherwise
 */
const validateToken = (token: Record<string, unknown> | null): boolean => {
  if (!token) {
    console.error('[yahooData] Token is null or undefined');
    return false;
  }
  if (!token.accessToken) {
    console.error('[yahooData] Token does not have accessToken property');
    return false;
  }
  return true;
};

const fetchTeams = async (req: NextApiRequest, sportFilter: SportFilter): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        let games: unknown = {};
        const token = await getToken({ req, secret });
        
        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] fetchTeams: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: buildUserGamesPath(sportFilter),
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];
          
          // Check HTTP status code
          if (response.statusCode && response.statusCode >= 400) {
            console.error(`[yahooData] getTeams HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
            const newError: ErrorResponse = { 
              error: `HTTP Error: ${response.statusCode} - ${response.statusMessage}`,
              statusCode: response.statusCode
            };
            resolve(newError);
            return;
          }
          
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', async function () {
            try {
              const body = await decodeYahooResponseBody(response, chunks);
              parser.parseString(body, function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getTeams XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                const fantasyContent = (result as Record<string, unknown>).fantasy_content;

                // Extract games array from nested fantasy_content structure
                if (fantasyContent && typeof fantasyContent === 'object') {
                  const users = (fantasyContent as Record<string, unknown>).users;
                  if (users && typeof users === 'object') {
                    const user = (users as Record<string, unknown>).user;
                    if (user && typeof user === 'object') {
                      const userGames = (user as Record<string, unknown>).games;
                      if (userGames && typeof userGames === 'object') {
                        const gameData = (userGames as Record<string, unknown>).game;
                        if (gameData) {
                          // Ensure games is always an array
                          games = Array.isArray(gameData) ? gameData : [gameData];
                        }
                      }
                    }
                  }
                }

                resolve(games);
              });
            } catch (err) {
              console.error(`[yahooData] getTeams Decompression error: ${err}`);
              const newError: ErrorResponse = { error: `Decompression error: ${err}` };
              resolve(newError);
            }
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getTeams Network error: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in fetchTeams: ${errorMsg}`);
        resolve({ error: `Exception in fetchTeams: ${errorMsg}` });
      }
    })();
  });
};

export const getTeams = async (
  req: NextApiRequest,
  sport: string = 'mlb'
): Promise<unknown> => {
  const sportFilter = normalizeSport(sport);
  const result = await fetchTeams(req, sportFilter);

  if (isErrorResponse(result) && sportFilter !== 'mlb') {
    console.warn(
      `[yahooData] getTeams: retrying with mlb after error when requesting sport="${sportFilter}"`
    );
    return fetchTeams(req, 'mlb');
  }

  return result;
};

export const getLeagueTeams = async (
  req: NextApiRequest,
  league_key: string | string[]
): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        let league: unknown = {};
        const token = await getToken({ req, secret });
        
        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getLeagueTeams: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const leagueKeyStr = Array.isArray(league_key) ? league_key[0] : league_key;
        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: `/fantasy/v2/league/${leagueKeyStr}/teams`,
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];
          
          // Check HTTP status code
          if (response.statusCode && response.statusCode >= 400) {
            console.error(`[yahooData] getLeagueTeams HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
            const newError: ErrorResponse = { 
              error: `HTTP Error: ${response.statusCode} - ${response.statusMessage}`,
              statusCode: response.statusCode
            };
            resolve(newError);
            return;
          }
          
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', async function () {
            try {
              const body = await decodeYahooResponseBody(response, chunks);
              parser.parseString(body, function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueTeams XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            } catch (err) {
              console.error(`[yahooData] getLeagueTeams Decompression error: ${err}`);
              const newError: ErrorResponse = { error: `Decompression error: ${err}` };
              resolve(newError);
            }
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getLeagueTeams Network error: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in getLeagueTeams: ${errorMsg}`);
        resolve({ error: `Exception in getLeagueTeams: ${errorMsg}` });
      }
    })();
  });
};

export const getLeagueSettings = async (
  req: NextApiRequest,
  league_key: string | string[]
): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        let league: unknown = {};
        const token = await getToken({ req, secret });
        
        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getLeagueSettings: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const leagueKeyStr = Array.isArray(league_key) ? league_key[0] : league_key;
        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: `/fantasy/v2/league/${leagueKeyStr}/settings`,
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];
          
          // Check HTTP status code
          if (response.statusCode && response.statusCode >= 400) {
            console.error(`[yahooData] getLeagueSettings HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
            const newError: ErrorResponse = { 
              error: `HTTP Error: ${response.statusCode} - ${response.statusMessage}`,
              statusCode: response.statusCode
            };
            resolve(newError);
            return;
          }
          
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', async function () {
            try {
              const body = await decodeYahooResponseBody(response, chunks);
              parser.parseString(body, function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueSettings XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            } catch (err) {
              console.error(`[yahooData] getLeagueSettings Decompression error: ${err}`);
              const newError: ErrorResponse = { error: `Decompression error: ${err}` };
              resolve(newError);
            }
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getLeagueSettings Network error: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in getLeagueSettings: ${errorMsg}`);
        resolve({ error: `Exception in getLeagueSettings: ${errorMsg}` });
      }
    })();
  });
};

/**
 * The result returned by `getLeagueStandings`, bundling the teams array with
 * the `is_finished` flag extracted from the same API response.
 */
export interface LeagueStandingsResult {
  /** Standings teams array, one entry per team. */
  teams: StandingsTeam[];
  /**
   * Whether the season has finished.  Derived from the `is_finished` field in
   * the Yahoo API response ("1" = finished, anything else = not finished).
   */
  is_finished: boolean;
}

/**
 * Fetches the league standings from the Yahoo Fantasy API and returns the
 * extracted teams array together with the `is_finished` flag.
 *
 * Calls `/fantasy/v2/league/{league_key}/standings`, handles gzip
 * decompression, XML parsing, HTTP/network/token errors, then internally
 * calls `extractStandingsFromLeagueContent` so callers receive a ready-to-use
 * `LeagueStandingsResult` without needing to perform any further extraction.
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param league_key - The Yahoo league key (e.g. "411.l.12345")
 * @returns A LeagueStandingsResult object, or an ErrorResponse on failure
 */
export const getLeagueStandings = async (
  req: NextApiRequest,
  league_key: string | string[]
): Promise<LeagueStandingsResult | ErrorResponse> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        const token = await getToken({ req, secret });

        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getLeagueStandings: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const leagueKeyStr = Array.isArray(league_key) ? league_key[0] : league_key;
        console.log(`[yahooData] getLeagueStandings: fetching standings for league "${leagueKeyStr}"`);

        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: `/fantasy/v2/league/${leagueKeyStr}/standings`,
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];

          // Check HTTP status code
          if (response.statusCode && response.statusCode >= 400) {
            console.error(
              `[yahooData] getLeagueStandings HTTP Error: ${response.statusCode} - ${response.statusMessage}`
            );
            const newError: ErrorResponse = {
              error: `HTTP Error: ${response.statusCode} - ${response.statusMessage}`,
              statusCode: response.statusCode,
            };
            resolve(newError);
            return;
          }

          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', async function () {
            try {
              const body = await decodeYahooResponseBody(response, chunks);
              parser.parseString(body, function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueStandings XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }

                const fantasyContent = (result as Record<string, unknown>).fantasy_content;

                // Log the top-level keys of the parsed fantasy_content to aid debugging
                if (fantasyContent && typeof fantasyContent === 'object') {
                  console.log(
                    '[yahooData] getLeagueStandings: fantasy_content top-level keys:',
                    Object.keys(fantasyContent as Record<string, unknown>)
                  );
                  const leagueObj = (fantasyContent as Record<string, unknown>).league;
                  if (leagueObj && typeof leagueObj === 'object') {
                    console.log(
                      '[yahooData] getLeagueStandings: fantasy_content.league top-level keys:',
                      Object.keys(leagueObj as Record<string, unknown>)
                    );
                    const rawIsFinished = (leagueObj as Record<string, unknown>).is_finished;
                    console.log(
                      `[yahooData] getLeagueStandings: raw is_finished value from API: "${rawIsFinished}" (type: ${typeof rawIsFinished})`
                    );
                  } else {
                    console.warn('[yahooData] getLeagueStandings: fantasy_content.league is missing or not an object');
                  }
                } else {
                  console.warn('[yahooData] getLeagueStandings: fantasy_content is missing or not an object');
                }

                const teams = extractStandingsFromLeagueContent(fantasyContent);
                if (!teams) {
                  const newError: ErrorResponse = {
                    error: 'Failed to extract standings teams from API response',
                  };
                  resolve(newError);
                  return;
                }

                // Extract is_finished from the league node
                const isFinishedRaw: unknown =
                  fantasyContent &&
                  typeof fantasyContent === 'object' &&
                  (fantasyContent as Record<string, unknown>).league &&
                  typeof (fantasyContent as Record<string, unknown>).league === 'object'
                    ? ((fantasyContent as Record<string, unknown>).league as Record<string, unknown>).is_finished
                    : undefined;

                const is_finished: boolean = isFinishedRaw === '1' || isFinishedRaw === 1 || isFinishedRaw === true;
                console.log(
                  `[yahooData] getLeagueStandings: resolved is_finished=${is_finished} (raw="${isFinishedRaw}"), teams=${teams.length}`
                );

                resolve({ teams, is_finished });
              });
            } catch (err) {
              console.error(`[yahooData] getLeagueStandings Decompression error: ${err}`);
              const newError: ErrorResponse = { error: `Decompression error: ${err}` };
              resolve(newError);
            }
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getLeagueStandings Network error: ${error.message}`);
          const newError: ErrorResponse = {
            error: `Network error on Get Request: ${error.message}`,
          };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in getLeagueStandings: ${errorMsg}`);
        resolve({ error: `Exception in getLeagueStandings: ${errorMsg}` });
      }
    })();
  });
};

/**
 * Safely extracts the standings teams array from the league standings
 * fantasy_content response.
 * Handles both single-team and multi-team responses (xml2js with
 * explicitArray: false returns a single object instead of an array when
 * there is only one element).
 *
 * @param fantasyContent - The fantasy_content object from the Yahoo standings API response
 * @returns An array of StandingsTeam objects, or null if the structure is invalid
 */
export const extractStandingsFromLeagueContent = (
  fantasyContent: unknown
): StandingsTeam[] | null => {
  console.log(
    '[yahooData] extractStandingsFromLeagueContent: called, fantasyContent type:',
    typeof fantasyContent,
    '| is null:', fantasyContent === null
  );

  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: fantasyContent is null or not an object'
    );
    return null;
  }

  // Log the full top-level structure to diagnose unexpected API shapes
  try {
    console.log(
      '[yahooData] extractStandingsFromLeagueContent: fantasyContent top-level keys:',
      Object.keys(fantasyContent as Record<string, unknown>)
    );
  } catch (_e) {
    // ignore — just diagnostic
  }

  const content = fantasyContent as LeagueStandingsContent;
  const league = content.league;

  if (!league) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league property is missing from fantasy_content.',
      'Available keys:', Object.keys(fantasyContent as Record<string, unknown>)
    );
    return null;
  }

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: league keys:',
    Object.keys(league as Record<string, unknown>)
  );

  const teamsContainer = league.teams;
  if (!teamsContainer) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league.teams is missing.',
      'League keys present:', Object.keys(league as Record<string, unknown>)
    );
    return null;
  }

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: teamsContainer keys:',
    Object.keys(teamsContainer as Record<string, unknown>),
    '| count attr:', (teamsContainer as Record<string, unknown>).count
  );

  const teamField = teamsContainer.team;
  if (!teamField) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league.teams.team is missing.',
      'teamsContainer keys:', Object.keys(teamsContainer as Record<string, unknown>)
    );
    return null;
  }

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: teamField is array:', Array.isArray(teamField),
    '| type:', typeof teamField
  );

  // xml2js with explicitArray: false returns a single object when there is only one team
  const teams: StandingsTeam[] = Array.isArray(teamField)
    ? (teamField as StandingsTeam[])
    : [teamField as StandingsTeam];

  console.log(
    `[yahooData] extractStandingsFromLeagueContent: raw teams count: ${teams.length}`
  );

  // Filter out non-object entries; warn for missing team_standings (still included
  // so standings columns can show "-").
  const validTeams: StandingsTeam[] = teams.filter((team: StandingsTeam, idx: number) => {
    if (!team || typeof team !== 'object') {
      console.warn(
        `[yahooData] extractStandingsFromLeagueContent: team at index ${idx} is not an object, skipping`
      );
      return false;
    }

    // Log the raw team object keys to diagnose structural mismatches
    const teamRecord: Record<string, unknown> = team as unknown as Record<string, unknown>;
    console.log(
      `[yahooData] extractStandingsFromLeagueContent: team[${idx}] keys:`,
      Object.keys(teamRecord)
    );

    if (!team.team_standings) {
      console.warn(
        `[yahooData] extractStandingsFromLeagueContent: team "${team.name ?? team.team_key}" (idx=${idx}) is missing team_standings.`,
        'Team object keys:', Object.keys(teamRecord)
      );
    } else {
      const standings: StandingsTeamRecord = team.team_standings;
      const standingsRecord: Record<string, unknown> = standings as unknown as Record<string, unknown>;
      console.log(
        `[yahooData] extractStandingsFromLeagueContent: team[${idx}] "${team.name}"`,
        `rank="${standings.rank}"`,
        `wins="${standings.outcome_totals?.wins}"`,
        `losses="${standings.outcome_totals?.losses}"`,
        `ties="${standings.outcome_totals?.ties}"`,
        `ptsFor="${standings.points_for}"`,
        `ptsAgainst="${standings.points_against}"`,
        `playoffSeed="${standings.playoff_seed}"`,
        '| team_standings keys:', Object.keys(standingsRecord)
      );
    }
    return true;
  });

  console.log(
    `[yahooData] extractStandingsFromLeagueContent: validTeams count: ${validTeams.length}`
  );

  return validTeams.length > 0 ? validTeams : null;
};

/**
 * Extracts the current week number from a fantasy_content object returned by
 * `getWeekStats`. The week is nested at `fantasy_content.team.team_points.week`.
 *
 * @param fantasyContent - The raw fantasy_content object from the Yahoo API
 * @returns The current week number, or null if it cannot be determined
 */
const extractCurrentWeekFromStats = (fantasyContent: unknown): number | null => {
  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error(
      '[yahooData] extractCurrentWeekFromStats: fantasyContent is null or not an object'
    );
    return null;
  }

  const content = fantasyContent as WeeklyStatsContent;
  const team = content.team;

  if (!team) {
    console.error(
      '[yahooData] extractCurrentWeekFromStats: team property is missing from fantasy_content'
    );
    return null;
  }

  const teamPoints = team.team_points;
  if (!teamPoints) {
    console.error(
      '[yahooData] extractCurrentWeekFromStats: team.team_points is missing'
    );
    return null;
  }

  const rawWeek = teamPoints.week;
  if (rawWeek === undefined || rawWeek === null) {
    console.error(
      '[yahooData] extractCurrentWeekFromStats: team.team_points.week is missing'
    );
    return null;
  }

  const weekNum: number =
    typeof rawWeek === 'number' ? rawWeek : parseInt(String(rawWeek), 10);

  if (isNaN(weekNum) || weekNum <= 0) {
    console.error(
      `[yahooData] extractCurrentWeekFromStats: invalid week value "${rawWeek}" (parsed: ${weekNum})`
    );
    return null;
  }

  console.log(
    `[yahooData] extractCurrentWeekFromStats: detected current week = ${weekNum}`
  );
  return weekNum;
};

/**
 * Fetches weekly stats for a single team across all weeks from week 1 up to
 * and including the current week.
 *
 * The current week is determined by fetching week `'0'` (Yahoo's alias for the
 * current week) and reading the `team.team_points.week` field from the response.
 * All prior weeks are then fetched in parallel and the results are returned in
 * descending order (most recent week first) to match the expected shape for the
 * team stats page chart helpers.
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param team_key - The Yahoo team key (e.g. "411.l.12345.t.1")
 * @returns An array of raw fantasy_content objects, one per week (most recent
 *          first), or an empty array if the current week cannot be determined
 */
export const getWeeklyStats = async (
  req: NextApiRequest,
  team_key: string | string[]
): Promise<unknown[]> => {
  const teamKeyStr: string = Array.isArray(team_key) ? team_key[0] : team_key;

  console.log(
    `[yahooData] getWeeklyStats: fetching current week stats for team "${teamKeyStr}"`
  );

  // Fetch week '0' — Yahoo's alias for the current/most-recent scoring week
  const currentWeekStats: unknown = await getWeekStats(req, teamKeyStr, '0');

  // Guard: if the current-week fetch returned an error, bail out early
  if (isErrorResponse(currentWeekStats)) {
    console.error(
      `[yahooData] getWeeklyStats: error fetching current week for team "${teamKeyStr}":`,
      (currentWeekStats as { error: string }).error
    );
    return [];
  }

  // Extract the current week number from the nested team.team_points.week field
  const currentWeek: number | null = extractCurrentWeekFromStats(currentWeekStats);

  if (currentWeek === null) {
    console.error(
      `[yahooData] getWeeklyStats: could not determine current week for team "${teamKeyStr}". ` +
        'Returning only the current-week entry.'
    );
    // Return at least the current week data so the page is not completely empty
    return [currentWeekStats];
  }

  console.log(
    `[yahooData] getWeeklyStats: current week is ${currentWeek} for team "${teamKeyStr}". ` +
      `Fetching weeks 1–${currentWeek - 1} in parallel.`
  );

  // Fetch all prior weeks (currentWeek-1 down to 1) in parallel
  const priorWeekNumbers: number[] = [];
  for (let w: number = currentWeek - 1; w >= 1; w--) {
    priorWeekNumbers.push(w);
  }

  let priorWeekStats: unknown[] = [];
  if (priorWeekNumbers.length > 0) {
    const priorWeekPromises: Promise<unknown>[] = priorWeekNumbers.map(
      (w: number) => getWeekStats(req, teamKeyStr, String(w))
    );

    try {
      priorWeekStats = await Promise.all(priorWeekPromises);
    } catch (err) {
      const msg: string = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[yahooData] getWeeklyStats: error fetching prior weeks for team "${teamKeyStr}": ${msg}`
      );
      // Fall through — return at minimum the current week
    }
  }

  // Result ordered most-recent first: [currentWeek, currentWeek-1, ..., week1]
  const result: unknown[] = [currentWeekStats, ...priorWeekStats];

  console.log(
    `[yahooData] getWeeklyStats: returning ${result.length} week(s) for team "${teamKeyStr}" ` +
      `(weeks ${currentWeek} down to 1)`
  );

  return result;
};

export const getWeekStats = async (
  req: NextApiRequest,
  team_key: string,
  week: string
): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        const token = await getToken({ req, secret });

        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getWeekStats: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const weekLabel: string = week === '0' ? 'current (0)' : week;
        console.log(
          `[yahooData] getWeekStats: fetching week ${weekLabel} for team "${team_key}"`
        );

        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: `/fantasy/v2/team/${team_key}/stats;type=week;week=${week}`,
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];

          // Check HTTP status code
          if (response.statusCode && response.statusCode >= 400) {
            console.error(
              `[yahooData] getWeekStats HTTP Error for week ${weekLabel}: ` +
                `${response.statusCode} - ${response.statusMessage}`
            );
            const newError: ErrorResponse = {
              error: `HTTP Error: ${response.statusCode} - ${response.statusMessage}`,
              statusCode: response.statusCode,
            };
            resolve(newError);
            return;
          }

          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', async function () {
            try {
              const body = await decodeYahooResponseBody(response, chunks);
              parser.parseString(body, function (parseErr, result) {
                if (parseErr) {
                  console.error(
                    `[yahooData] getWeekStats XML parsing error for week ${weekLabel}: ${parseErr}`
                  );
                  const newError: ErrorResponse = {
                    error: `XML parsing error: ${parseErr}`,
                  };
                  resolve(newError);
                  return;
                }

                const fantasyContent = (result as Record<string, unknown>).fantasy_content;

                if (!fantasyContent) {
                  console.error(
                    `[yahooData] getWeekStats: fantasy_content missing in response for week ${weekLabel}`
                  );
                  resolve({
                    error: `Missing fantasy_content in response for week ${weekLabel}`,
                  });
                  return;
                }

                // Log the week number from the response for diagnostics
                const weeklyContent = fantasyContent as WeeklyStatsContent;
                const detectedWeek = weeklyContent?.team?.team_points?.week;
                console.log(
                  `[yahooData] getWeekStats: received week ${weekLabel} for team "${team_key}", ` +
                    `response week = "${detectedWeek}"`
                );

                resolve(fantasyContent);
              });
            } catch (err) {
              console.error(
                `[yahooData] getWeekStats Decompression error for week ${weekLabel}: ${err}`
              );
              const newError: ErrorResponse = {
                error: `Decompression error: ${err}`,
              };
              resolve(newError);
            }
          });
        });

        request.on('error', (error) => {
          console.error(
            `[yahooData] getWeekStats Network error for week ${weekLabel}: ${error.message}`
          );
          const newError: ErrorResponse = {
            error: `Network error on Get Request: ${error.message}`,
          };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in getWeekStats: ${errorMsg}`);
        resolve({ error: `Exception in getWeekStats: ${errorMsg}` });
      }
    })();
  });
};

// ─── Per-team per-week stats types ──────────────────────────────────────────

/**
 * Per-team, per-week stats for the entire league.
 * Keyed by team_key; each value contains the team name and an ordered array
 * of per-week StatEntry arrays (oldest week first, i.e. week 1 at index 0).
 */
export interface LeagueWeeklyStats {
  [team_key: string]: {
    team_name: string;
    /** Ordered array of per-week stats arrays, oldest week first. */
    weekly: StatEntry[][];
  };
}

/**
 * Fetches per-week stats for every team in a league in parallel and returns
 * a `LeagueWeeklyStats` map (oldest week first for each team).
 *
 * Uses `getWeeklyStats` (which auto-detects the current week) for each team,
 * then reverses the resulting array (which is most-recent-first) to produce
 * chronological order.
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param leagueTeamsContent - The raw fantasy_content from getLeagueTeams
 * @returns A LeagueWeeklyStats map, or null on total failure
 */
export const getLeagueAllTeamsWeeklyStats = async (
  req: NextApiRequest,
  leagueTeamsContent: unknown
): Promise<LeagueWeeklyStats | null> => {
  const teams: TeamData[] | null = extractTeamsFromLeagueContent(leagueTeamsContent);
  if (!teams || teams.length === 0) {
    console.error(
      '[yahooData] getLeagueAllTeamsWeeklyStats: could not extract teams from league content'
    );
    return null;
  }

  console.log(
    `[yahooData] getLeagueAllTeamsWeeklyStats: fetching weekly stats for ${teams.length} teams in parallel`
  );

  // Fetch all teams' weekly stats in parallel
  const teamWeeklyPromises: Promise<{ team: TeamData; weeks: unknown[] }>[] = teams.map(
    async (team: TeamData) => {
      const weeks: unknown[] = await getWeeklyStats(req, team.team_key);
      return { team, weeks };
    }
  );

  let teamResults: { team: TeamData; weeks: unknown[] }[];
  try {
    teamResults = await Promise.all(teamWeeklyPromises);
  } catch (err) {
    const msg: string = err instanceof Error ? err.message : 'Unknown error';
    console.error(
      `[yahooData] getLeagueAllTeamsWeeklyStats: error fetching weekly stats: ${msg}`
    );
    return null;
  }

  const result: LeagueWeeklyStats = {};

  for (const { team, weeks } of teamResults) {
    const { team_key, name } = team;

    if (!weeks || weeks.length === 0) {
      console.warn(
        `[yahooData] getLeagueAllTeamsWeeklyStats: no weeks returned for team "${team_key}", skipping`
      );
      continue;
    }

    // getWeeklyStats returns most-recent-first; reverse to get oldest-first (chronological)
    const chronologicalWeeks: unknown[] = [...weeks].reverse();

    const weeklyStats: StatEntry[][] = [];
    for (const weekContent of chronologicalWeeks) {
      if (isErrorResponse(weekContent)) {
        console.warn(
          `[yahooData] getLeagueAllTeamsWeeklyStats: skipping error week for team "${team_key}":`,
          (weekContent as { error: string }).error
        );
        // Push an empty array so week indices remain aligned across teams
        weeklyStats.push([]);
        continue;
      }

      const stats: StatEntry[] | null = extractStatsFromWeekContent(weekContent);
      weeklyStats.push(stats ?? []);
    }

    result[team_key] = {
      team_name: name,
      weekly: weeklyStats,
    };

    console.log(
      `[yahooData] getLeagueAllTeamsWeeklyStats: team "${team_key}" (${name}) — ${weeklyStats.length} week(s) processed`
    );
  }

  if (Object.keys(result).length === 0) {
    console.error(
      '[yahooData] getLeagueAllTeamsWeeklyStats: no teams were successfully processed'
    );
    return null;
  }

  console.log(
    `[yahooData] getLeagueAllTeamsWeeklyStats: successfully processed ${Object.keys(result).length} teams`
  );

  return result;
};

// ─── Chart data utilities ────────────────────────────────────────────────────

/**
 * A palette of distinct colours used to colour each team's bar in the chart.
 * Colours cycle when there are more teams than palette entries.
 */
export const TEAM_COLORS: string[] = [
  'rgba(0, 112, 243, 0.8)',
  'rgba(220, 53, 69, 0.8)',
  'rgba(40, 167, 69, 0.8)',
  'rgba(255, 193, 7, 0.8)',
  'rgba(111, 66, 193, 0.8)',
  'rgba(23, 162, 184, 0.8)',
  'rgba(253, 126, 20, 0.8)',
  'rgba(102, 16, 242, 0.8)',
  'rgba(32, 201, 151, 0.8)',
  'rgba(214, 51, 132, 0.8)',
  'rgba(52, 58, 64, 0.8)',
  'rgba(0, 123, 255, 0.8)',
];

/**
 * Assigns a stable, deterministic color to each team based on the team key.
 * This keeps the line chart and bar chart colors aligned even when the
 * displayed order differs between charts.
 */
export const buildTeamColorMap = (
  teamKeys: string[],
  colors: string[] = TEAM_COLORS
): Record<string, string> => {
  const sortedTeamKeys = [...teamKeys].sort((a: string, b: string) => a.localeCompare(b));

  return sortedTeamKeys.reduce<Record<string, string>>((accumulator, teamKey, index) => {
    accumulator[teamKey] = colors[index % colors.length];
    return accumulator;
  }, {});
};

/**
 * The shape of a Chart.js dataset object used by the Bar chart.
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string[];
  borderColor: string[];
  borderWidth: number;
}

/**
 * The shape of the data object passed to a Chart.js Bar chart.
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Builds a Chart.js-compatible data object for a bar chart comparing all
 * teams on a single stat category.
 *
 * Teams are sorted by their stat value descending so the chart is easy to read.
 *
 * @param aggregatedStats - The league-wide aggregated stats object
 * @param statId - The stat_id to chart (e.g. "7" for HR)
 * @param colors - Array of colour strings to cycle through for each bar
 * @returns A Chart.js data object ready to pass to a <Bar> component
 */
export const buildChartData = (
  aggregatedStats: LeagueAggregatedStats,
  statId: string,
  colors: string[]
): ChartData => {
  const teamEntries: { teamKey: string; name: string; value: number }[] = Object.entries(
    aggregatedStats.teams
  ).map(([teamKey, team]: [string, AggregatedTeamStats]) => ({
    teamKey,
    name: team.team_name,
    value: team.stats[statId] ?? 0,
  }));

  // Sort descending by value so the highest-performing team appears first.
  teamEntries.sort(
    (a: { teamKey: string; name: string; value: number }, b: { teamKey: string; name: string; value: number }) =>
      b.value - a.value
  );

  const colorMap = buildTeamColorMap(
    teamEntries.map((entry: { teamKey: string; name: string; value: number }) => entry.teamKey),
    colors
  );

  const labels: string[] = teamEntries.map(
    (entry: { teamKey: string; name: string; value: number }) => entry.name
  );
  const values: number[] = teamEntries.map(
    (entry: { teamKey: string; name: string; value: number }) => entry.value
  );
  const backgroundColors: string[] = teamEntries.map((entry: { teamKey: string; name: string; value: number }) =>
    colorMap[entry.teamKey] ?? colors[0]
  );
  const borderColors: string[] = backgroundColors.map((color: string) =>
    color.replace('0.8)', '1)')
  );

  return {
    labels,
    datasets: [
      {
        label: `Stat ${statId}`,
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };
};
