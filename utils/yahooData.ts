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
