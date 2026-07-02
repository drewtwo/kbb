import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import xml2js from 'xml2js';
import { NextApiRequest } from 'next';

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

export interface WeekStatEntry {
  stat_id: string;
  value: string;
}

export interface WeekStatsContent {
  team?: {
    team_stats?: {
      stats?: {
        stat?: WeekStatEntry | WeekStatEntry[];
      };
    };
    team_points?: {
      week?: string | number;
    };
  };
  week?: string | number;
}

/**
 * Type guard that checks whether a value is an error response object.
 * @param value - The value to check
 * @returns true if the value has an `error` string property
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
 * Safely extracts the stat categories array from a league settings fantasy_content
 * response. Handles both single-stat and multi-stat responses (xml2js with
 * explicitArray: false returns a single object instead of an array when there is
 * only one element).
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
      '[yahooData] extractStatCategoriesFromLeagueSettings: league property is missing from fantasy_content'
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
 * Safely extracts the stats array from a single week's fantasy_content response.
 * Handles both single-stat and multi-stat responses (xml2js with explicitArray: false
 * returns a single object instead of an array when there is only one element).
 * @param fantasyContent - The fantasy_content object from the Yahoo API response
 * @returns An object with a `stats` array and `week` number, or null if invalid
 */
export const extractWeeklyStatsData = (
  fantasyContent: unknown
): { stats: WeekStatEntry[]; week: number } | null => {
  if (!fantasyContent || typeof fantasyContent !== 'object') {
    console.error(
      '[yahooData] extractWeeklyStatsData: fantasyContent is null or not an object'
    );
    return null;
  }

  const content = fantasyContent as WeekStatsContent;
  const team = content.team;

  if (!team) {
    console.error(
      '[yahooData] extractWeeklyStatsData: team property is missing from fantasy_content'
    );
    return null;
  }

  const teamStats = team.team_stats;
  if (!teamStats) {
    console.error(
      '[yahooData] extractWeeklyStatsData: team.team_stats is missing'
    );
    return null;
  }

  const statsContainer = teamStats.stats;
  if (!statsContainer) {
    console.error(
      '[yahooData] extractWeeklyStatsData: team.team_stats.stats is missing'
    );
    return null;
  }

  const statField = statsContainer.stat;
  if (!statField) {
    console.error(
      '[yahooData] extractWeeklyStatsData: team.team_stats.stats.stat is missing'
    );
    return null;
  }

  const stats: WeekStatEntry[] = Array.isArray(statField) ? statField : [statField];

  // Extract week number — it may live at the top level or inside team_points
  const rawWeek =
    content.week ?? team.team_points?.week ?? 0;
  const week = Number(rawWeek);

  return { stats, week };
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
