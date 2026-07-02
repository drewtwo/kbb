import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import xml2js from 'xml2js';
import { NextApiRequest } from 'next';
import {
  diagLog,
  diagWarn,
  diagError,
  diagDump,
  diagHttpResponse,
  diagExtractionTrace,
  isDebugEnabled,
} from './diagnosticLogger';
import { dumpObject, summariseValue, traceObjectPath, diagnoseObjectShape } from './objectDumper';

const secret = process.env.NEXTAUTH_SECRET;

const parserOptions = { explicitArray: false };

const parser = new xml2js.Parser(parserOptions);

interface ErrorResponse {
  error: string;
  statusCode?: number;
}

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
 */
export interface StandingsTeamRecord {
  /** Overall rank in the league (1 = first place). */
  rank: string;
  outcome_totals: {
    wins: string;
    losses: string;
    ties: string;
    percentage: string;
  };
  /** Total fantasy points scored by this team. */
  points_for: string;
  /** Total fantasy points scored against this team. */
  points_against: string;
  /** Playoff seed (may be absent for in-progress seasons). */
  playoff_seed?: string;
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

// ─── Season week-range constants ────────────────────────────────────────────
//
// These constants define the inclusive week range used when aggregating stats
// across the full season.  Override them via environment variables so that
// different seasons or league configurations can be supported without code
// changes.
//
//   NEXT_PUBLIC_SEASON_START_WEEK  – first week to include (default: 1)
//   NEXT_PUBLIC_SEASON_END_WEEK    – last week to include  (default: 15)

/** First week of the season to include in multi-week aggregation (1-based). */
export const SEASON_START_WEEK: number = (() => {
  const raw: string | undefined = process.env.NEXT_PUBLIC_SEASON_START_WEEK;
  const parsed: number = raw ? parseInt(raw, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
})();

/** Last week of the season to include in multi-week aggregation (1-based). */
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
 * Fetches and aggregates weekly stats for every team in a league across all
 * weeks from SEASON_START_WEEK to SEASON_END_WEEK (inclusive).
 *
 * This is the primary entry-point for the league stats multi-week aggregation
 * feature. It:
 *   1. Extracts the list of teams from the provided league teams content.
 *   2. For each team, fetches stats for every week in the configured range.
 *   3. Aggregates (sums) each stat across all weeks.
 *   4. Returns a LeagueAggregatedStats object keyed by team_key.
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

export const getTeams = async (req: NextApiRequest): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        let games: unknown = {};
        const token = await getToken({ req, secret });
        
        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getTeams: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: '/fantasy/v2/users;use_login=1/games/teams',
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

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
              if (err) {
                console.error(`[yahooData] getTeams Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
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
            });
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
        console.error(`[yahooData] Exception in getTeams: ${errorMsg}`);
        resolve({ error: `Exception in getTeams: ${errorMsg}` });
      }
    })();
  });
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

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
              if (err) {
                console.error(`[yahooData] getLeagueTeams Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueTeams XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            });
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

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
              if (err) {
                console.error(`[yahooData] getLeagueSettings Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueSettings XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            });
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
 * Fetches the league standings from the Yahoo Fantasy API.
 * Calls `/fantasy/v2/league/{league_key}/standings`.
 * Modelled after `getLeagueTeams` — handles gzip decompression, XML parsing,
 * HTTP/network/token errors, and resolves with the raw `fantasy_content`.
 *
 * Diagnostic logging is controlled by NEXT_PUBLIC_DEBUG_STANDINGS=true.
 *
 * @param req - The Next.js API request (needed for auth token extraction)
 * @param league_key - The Yahoo league key (e.g. "411.l.12345")
 * @returns The raw fantasy_content object, or an ErrorResponse on failure
 */
export const getLeagueStandings = async (
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
          console.error(`[yahooData] getLeagueStandings: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

        const leagueKeyStr: string = Array.isArray(league_key) ? league_key[0] : league_key;
        const apiPath: string = `/fantasy/v2/league/${leagueKeyStr}/standings`;
        const apiUrl: string = `https://fantasysports.yahooapis.com${apiPath}`;

        diagLog('[yahooData] getLeagueStandings', `Requesting standings for league key: "${leagueKeyStr}"`);
        diagLog('[yahooData] getLeagueStandings', `Full URL: ${apiUrl}`);

        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: apiPath,
          method: 'GET',
          headers: {
            Accept: '*/*',
            'accept-encoding': 'gzip,deflate',
            Authorization: `Bearer ${token?.accessToken}`,
          },
        };

        const request = https.request(options, (response) => {
          const chunks: Buffer[] = [];
          const statusCode: number | undefined = response.statusCode;
          const statusMessage: string | undefined = response.statusMessage;

          // Log HTTP response headers for diagnostic purposes
          diagHttpResponse(
            '[yahooData] getLeagueStandings',
            'GET',
            apiUrl,
            statusCode,
            statusMessage,
            response.headers as Record<string, string | string[] | undefined>
          );

          // Log any redirect location header (3xx responses)
          if (statusCode !== undefined && statusCode >= 300 && statusCode < 400) {
            const location: string | string[] | undefined = response.headers['location'];
            diagWarn(
              '[yahooData] getLeagueStandings',
              `Redirect detected (${statusCode}): Location=${String(location ?? 'N/A')}`
            );
          }

          // Log rate-limit headers if present
          const rateLimitRemaining: string | string[] | undefined =
            response.headers['x-ratelimit-requests-remaining'];
          const retryAfter: string | string[] | undefined = response.headers['retry-after'];
          if (rateLimitRemaining !== undefined) {
            diagLog(
              '[yahooData] getLeagueStandings',
              `Rate-limit remaining: ${String(rateLimitRemaining)}`
            );
          }
          if (retryAfter !== undefined) {
            diagWarn(
              '[yahooData] getLeagueStandings',
              `Retry-After header present: ${String(retryAfter)} — possible rate limiting`
            );
          }

          // Check HTTP status code — surface auth and not-found errors immediately
          if (statusCode !== undefined && statusCode >= 400) {
            const errMsg: string = `HTTP Error: ${statusCode} - ${statusMessage ?? 'Unknown'}`;
            console.error(`[yahooData] getLeagueStandings ${errMsg}`);

            if (statusCode === 401) {
              console.error(
                '[yahooData] getLeagueStandings: 401 Unauthorized — OAuth access token may be expired or invalid. ' +
                'The user may need to re-authenticate.'
              );
            } else if (statusCode === 403) {
              console.error(
                '[yahooData] getLeagueStandings: 403 Forbidden — the authenticated user may not have ' +
                `access to league "${leagueKeyStr}".`
              );
            } else if (statusCode === 404) {
              console.error(
                `[yahooData] getLeagueStandings: 404 Not Found — league key "${leagueKeyStr}" may be ` +
                'incorrect or the league may not exist.'
              );
            } else if (statusCode === 429) {
              console.error(
                '[yahooData] getLeagueStandings: 429 Too Many Requests — Yahoo API rate limit exceeded. ' +
                `Retry-After: ${String(retryAfter ?? 'not specified')}`
              );
            } else if (statusCode >= 500) {
              console.error(
                `[yahooData] getLeagueStandings: ${statusCode} Server Error — transient Yahoo API issue. ` +
                'Consider retrying after a short delay.'
              );
            }

            const newError: ErrorResponse = {
              error: errMsg,
              statusCode,
            };
            resolve(newError);
            return;
          }

          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', function () {
            const buffer: Buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            diagLog(
              '[yahooData] getLeagueStandings',
              `Response body received: ${buffer.length} byte(s) (compressed)`
            );

            zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
              if (err) {
                // gunzip failed — the response may not be gzip-encoded (e.g. an HTML error page)
                console.error(`[yahooData] getLeagueStandings Decompression error: ${err}`);
                diagLog(
                  '[yahooData] getLeagueStandings',
                  `Raw (non-decompressed) response preview: ${buffer.slice(0, 500).toString('utf8')}`
                );
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }

              const rawXml: string = dezipped.toString();
              diagLog(
                '[yahooData] getLeagueStandings',
                `Decompressed response: ${dezipped.length} byte(s)`
              );
              diagDump('[yahooData] getLeagueStandings', 'Raw XML (first 2000 chars)', rawXml.slice(0, 2000));

              parser.parseString(rawXml, function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getLeagueStandings XML parsing error: ${parseErr}`);
                  diagDump('[yahooData] getLeagueStandings', 'XML that failed to parse', rawXml.slice(0, 1000));
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }

                diagLog(
                  '[yahooData] getLeagueStandings',
                  `XML parsed successfully. Top-level keys: [${Object.keys(result as object).join(', ')}]`
                );

                const fantasyContent: unknown = (result as Record<string, unknown>).fantasy_content;

                if (fantasyContent === undefined || fantasyContent === null) {
                  console.error(
                    '[yahooData] getLeagueStandings: fantasy_content is missing from parsed XML result. ' +
                    `Top-level keys present: [${Object.keys(result as object).join(', ')}]`
                  );
                  diagDump('[yahooData] getLeagueStandings', 'Full parsed XML result', result);
                } else {
                  diagLog(
                    '[yahooData] getLeagueStandings',
                    `fantasy_content type: ${summariseValue(fantasyContent)}`
                  );
                  diagDump('[yahooData] getLeagueStandings', 'fantasy_content', fantasyContent);

                  // Trace the expected path to help diagnose structural issues
                  if (isDebugEnabled()) {
                    console.log(
                      '[yahooData] getLeagueStandings',
                      traceObjectPath(fantasyContent, 'league.teams.team')
                    );
                    console.log(
                      '[yahooData] getLeagueStandings',
                      diagnoseObjectShape(
                        fantasyContent,
                        ['league'],
                        'fantasy_content'
                      )
                    );
                  }
                }

                league = fantasyContent;
                resolve(league);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getLeagueStandings Network error: ${error.message}`);
          diagError(
            '[yahooData] getLeagueStandings',
            `Network error details — name: ${error.name}, message: ${error.message}`
          );
          const newError: ErrorResponse = {
            error: `Network error on Get Request: ${error.message}`,
          };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg: string = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[yahooData] Exception in getLeagueStandings: ${errorMsg}`);
        diagError('[yahooData] getLeagueStandings', `Exception stack: ${err instanceof Error ? err.stack ?? errorMsg : errorMsg}`);
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
 * Comprehensive diagnostic logging is emitted at each validation step.
 * Enable verbose output by setting NEXT_PUBLIC_DEBUG_STANDINGS=true.
 *
 * @param fantasyContent - The fantasy_content object from the Yahoo standings API response
 * @returns An array of StandingsTeam objects, or null if the structure is invalid
 */
export const extractStandingsFromLeagueContent = (
  fantasyContent: unknown
): StandingsTeam[] | null => {
  console.log('[yahooData] extractStandingsFromLeagueContent: called');

  // ── Step 1: Validate the root fantasyContent value ───────────────────────
  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: fantasyContent is null or not an object',
      { received: typeof fantasyContent, value: fantasyContent }
    );
    diagError(
      '[yahooData] extractStandingsFromLeagueContent',
      `STEP 1 FAILED — fantasyContent is ${fantasyContent === null ? 'null' : typeof fantasyContent}. ` +
      'Expected a non-null object. This usually means the Yahoo API returned an empty or error response.'
    );
    return null;
  }

  diagLog(
    '[yahooData] extractStandingsFromLeagueContent',
    `STEP 1 OK — fantasyContent type: ${summariseValue(fantasyContent)}`
  );

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: fantasyContent top-level keys:',
    Object.keys(fantasyContent as object)
  );

  // Log a full dump of the fantasyContent for deep inspection
  diagDump('[yahooData] extractStandingsFromLeagueContent', 'fantasyContent (full)', fantasyContent);

  // Emit an extraction trace for the expected path
  diagExtractionTrace('[yahooData] extractStandingsFromLeagueContent', [
    { path: 'fantasyContent', value: fantasyContent },
    { path: 'fantasyContent.league', value: (fantasyContent as Record<string, unknown>).league },
    {
      path: 'fantasyContent.league.teams',
      value: ((fantasyContent as Record<string, unknown>).league as Record<string, unknown> | undefined)?.teams,
    },
    {
      path: 'fantasyContent.league.teams.team',
      value: (
        ((fantasyContent as Record<string, unknown>).league as Record<string, unknown> | undefined)
          ?.teams as Record<string, unknown> | undefined
      )?.team,
    },
  ]);

  // ── Step 2: Validate league ───────────────────────────────────────────────
  const content = fantasyContent as LeagueStandingsContent;
  const league = content.league;

  if (!league) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league property is missing from fantasy_content.',
      'Available keys:', Object.keys(fantasyContent as object)
    );
    diagError(
      '[yahooData] extractStandingsFromLeagueContent',
      `STEP 2 FAILED — "league" property is absent from fantasy_content. ` +
      `Available keys: [${Object.keys(fantasyContent as object).join(', ')}]. ` +
      'This may indicate the league key is wrong or the API returned an unexpected structure.'
    );
    diagDump('[yahooData] extractStandingsFromLeagueContent', 'fantasyContent at failure point', fantasyContent);
    return null;
  }

  diagLog(
    '[yahooData] extractStandingsFromLeagueContent',
    `STEP 2 OK — league found. Keys: [${Object.keys(league as object).join(', ')}]`
  );

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: league keys:',
    Object.keys(league as object),
    '| league_key:', league.league_key,
    '| name:', league.name,
    '| is_finished:', league.is_finished
  );

  diagDump('[yahooData] extractStandingsFromLeagueContent', 'league object', league);

  // ── Step 3: Validate teams container ─────────────────────────────────────
  const teamsContainer = league.teams;
  if (!teamsContainer) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league.teams is missing.',
      'League keys present:', Object.keys(league as object)
    );
    diagError(
      '[yahooData] extractStandingsFromLeagueContent',
      `STEP 3 FAILED — "teams" property is absent from league object. ` +
      `League keys present: [${Object.keys(league as object).join(', ')}]. ` +
      'The standings endpoint may have returned league metadata without team data.'
    );
    diagDump('[yahooData] extractStandingsFromLeagueContent', 'league at failure point', league);
    return null;
  }

  diagLog(
    '[yahooData] extractStandingsFromLeagueContent',
    `STEP 3 OK — teamsContainer found. Keys: [${Object.keys(teamsContainer as object).join(', ')}]`
  );

  console.log(
    '[yahooData] extractStandingsFromLeagueContent: teamsContainer keys:',
    Object.keys(teamsContainer as object)
  );

  diagDump('[yahooData] extractStandingsFromLeagueContent', 'teamsContainer', teamsContainer);

  // ── Step 4: Validate team field ───────────────────────────────────────────
  const teamField = teamsContainer.team;
  if (!teamField) {
    console.error(
      '[yahooData] extractStandingsFromLeagueContent: league.teams.team is missing.',
      'teamsContainer keys:', Object.keys(teamsContainer as object)
    );
    diagError(
      '[yahooData] extractStandingsFromLeagueContent',
      `STEP 4 FAILED — "team" property is absent from teams container. ` +
      `teamsContainer keys: [${Object.keys(teamsContainer as object).join(', ')}]. ` +
      'This may mean the league has no teams, or the API returned a "count" attribute only.'
    );
    diagDump('[yahooData] extractStandingsFromLeagueContent', 'teamsContainer at failure point', teamsContainer);
    return null;
  }

  const isArray: boolean = Array.isArray(teamField);
  const teamCount: number = isArray ? (teamField as StandingsTeam[]).length : 1;

  diagLog(
    '[yahooData] extractStandingsFromLeagueContent',
    `STEP 4 OK — teamField found. isArray=${isArray}, count=${teamCount}, type=${summariseValue(teamField)}`
  );

  console.log(
    `[yahooData] extractStandingsFromLeagueContent: found ${teamCount} team(s) (isArray=${isArray})`
  );

  diagDump('[yahooData] extractStandingsFromLeagueContent', 'teamField (raw)', teamField);

  // ── Step 5: Normalise to array ────────────────────────────────────────────
  // xml2js with explicitArray: false returns a single object when there is only one team
  const teams: StandingsTeam[] = isArray
    ? (teamField as StandingsTeam[])
    : [teamField as StandingsTeam];

  // ── Step 6: Validate individual team entries ──────────────────────────────
  const validTeams: StandingsTeam[] = teams.filter((team: StandingsTeam, idx: number) => {
    if (!team || typeof team !== 'object') {
      console.warn(
        `[yahooData] extractStandingsFromLeagueContent: team at index ${idx} is not an object, skipping`
      );
      diagWarn(
        '[yahooData] extractStandingsFromLeagueContent',
        `STEP 6 — team[${idx}] is not a valid object (${summariseValue(team)}), skipping`
      );
      return false;
    }

    // Log the shape of each team entry for traceability
    diagLog(
      '[yahooData] extractStandingsFromLeagueContent',
      `team[${idx}] shape: ${summariseValue(team)}`
    );

    if (!team.team_standings) {
      console.warn(
        `[yahooData] extractStandingsFromLeagueContent: team "${team.name ?? team.team_key}" (index ${idx}) is missing team_standings — it will still be included but standings columns will show "-"`,
        { team_key: team.team_key, team_id: team.team_id, name: team.name }
      );
      diagWarn(
        '[yahooData] extractStandingsFromLeagueContent',
        `team[${idx}] "${team.name ?? team.team_key}" is missing team_standings. ` +
        `Team keys present: [${Object.keys(team as object).join(', ')}]`
      );
      diagDump(
        '[yahooData] extractStandingsFromLeagueContent',
        `team[${idx}] full object`,
        team
      );
    } else {
      diagLog(
        '[yahooData] extractStandingsFromLeagueContent',
        `team[${idx}] "${team.name ?? team.team_key}" has team_standings. ` +
        `rank=${team.team_standings.rank ?? 'N/A'} ` +
        `wins=${team.team_standings.outcome_totals?.wins ?? 'N/A'} ` +
        `losses=${team.team_standings.outcome_totals?.losses ?? 'N/A'}`
      );
    }

    return true;
  });

  console.log(
    `[yahooData] extractStandingsFromLeagueContent: returning ${validTeams.length} valid team(s)`
  );

  diagLog(
    '[yahooData] extractStandingsFromLeagueContent',
    `STEP 6 COMPLETE — ${validTeams.length} valid team(s) out of ${teams.length} total`
  );

  if (validTeams.length === 0) {
    diagError(
      '[yahooData] extractStandingsFromLeagueContent',
      `All ${teams.length} team(s) were filtered out during validation. Returning null.`
    );
  }

  return validTeams.length > 0 ? validTeams : null;
};

export const getWeeklyStats = async (req: NextApiRequest, team_key: string | string[]): Promise<unknown[]> => {
  const teamKeyStr = Array.isArray(team_key) ? team_key[0] : team_key;
  let stats = await getWeekStats(req, teamKeyStr, '0');
  const week = (stats as Record<string, unknown>).week as number;
  const result: unknown[] = [stats];
  for (let index = week - 1; index > 0; index--) {
    stats = await getWeekStats(req, teamKeyStr, String(index));
    result.push(stats);
  }
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
        let stats: unknown = {};
        const token = await getToken({ req, secret });
        
        // Validate token before making request
        if (!validateToken(token)) {
          const errorMsg = 'Invalid or missing authentication token';
          console.error(`[yahooData] getWeekStats: ${errorMsg}`);
          resolve({ error: errorMsg, statusCode: 401 });
          return;
        }

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
            console.error(`[yahooData] getWeekStats HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
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

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (err, dezipped) => {
              if (err) {
                console.error(`[yahooData] getWeekStats Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`[yahooData] getWeekStats XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                stats = (result as Record<string, unknown>).fantasy_content;
                resolve(stats);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`[yahooData] getWeekStats Network error: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
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
