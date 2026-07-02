import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import xml2js from 'xml2js';
import { NextApiRequest } from 'next';

const secret = process.env.SECRET;

const parserOptions = { explicitArray: false };

const parser = new xml2js.Parser(parserOptions);

interface ErrorResponse {
  error: string;
  statusCode?: number;
}

export const getTeams = async (req: NextApiRequest): Promise<unknown> => {
  return new Promise((resolve) => {
    (async () => {
      try {
        let games: unknown = {};
        const token = await getToken({ req, secret });
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
            console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
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
                console.error(`Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`XML parsing error: ${parseErr}`);
                  const newError: ErrorResponse = { error: `XML parsing error: ${parseErr}` };
                  resolve(newError);
                  return;
                }
                games = (result as Record<string, unknown>).fantasy_content;
                resolve(games);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`Network error on Get Request: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Exception in getTeams: ${errorMsg}`);
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
            console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
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
                console.error(`Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`XML parsing error: ${parseErr}`);
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
          console.error(`Network error on Get Request: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Exception in getLeagueTeams: ${errorMsg}`);
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
            console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
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
                console.error(`Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`XML parsing error: ${parseErr}`);
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
          console.error(`Network error on Get Request: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Exception in getLeagueSettings: ${errorMsg}`);
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
            console.error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`);
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
                console.error(`Decompression error: ${err}`);
                const newError: ErrorResponse = { error: `Decompression error: ${err}` };
                resolve(newError);
                return;
              }
              parser.parseString(dezipped.toString(), function (parseErr, result) {
                if (parseErr) {
                  console.error(`XML parsing error: ${parseErr}`);
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
          console.error(`Network error on Get Request: ${error.message}`);
          const newError: ErrorResponse = { error: `Network error on Get Request: ${error.message}` };
          resolve(newError);
        });

        request.end();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Exception in getWeekStats: ${errorMsg}`);
        resolve({ error: `Exception in getWeekStats: ${errorMsg}` });
      }
    })();
  });
};
