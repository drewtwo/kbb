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
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (_err, dezipped) => {
              parser.parseString(dezipped.toString(), function (_err, result) {
                games = (result as Record<string, unknown>).fantasy_content;
                resolve(games);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`Error on Get Request --> ${error}`);
          const newError: ErrorResponse = { error: `Error on Get Request --> ${error}` };
          resolve(newError);
        });

        request.end();
      } catch (_err) {
        resolve({ error: 'failed to load data' });
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
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (_err, dezipped) => {
              parser.parseString(dezipped.toString(), function (_err, result) {
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`Error on Get Request --> ${error}`);
          const newError: ErrorResponse = { error: `Error on Get Request --> ${error}` };
          resolve(newError);
        });

        request.end();
      } catch (_err) {
        resolve({ error: 'failed to load data' });
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
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (_err, dezipped) => {
              parser.parseString(dezipped.toString(), function (_err, result) {
                league = (result as Record<string, unknown>).fantasy_content;
                resolve(league);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`Error on Get Request --> ${error}`);
          const newError: ErrorResponse = { error: `Error on Get Request --> ${error}` };
          resolve(newError);
        });

        request.end();
      } catch (_err) {
        resolve({ error: 'failed to load data' });
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
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });

          response.on('end', function () {
            const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
            zlib.gunzip(buffer as unknown as zlib.InputType, (_err, dezipped) => {
              parser.parseString(dezipped.toString(), function (_err, result) {
                stats = (result as Record<string, unknown>).fantasy_content;
                resolve(stats);
              });
            });
          });
        });

        request.on('error', (error) => {
          console.error(`Error on Get Request --> ${error}`);
          const newError: ErrorResponse = { error: `Error on Get Request --> ${error}` };
          resolve(newError);
        });

        request.end();
      } catch (_err) {
        resolve({ error: 'failed to load data' });
      }
    })();
  });
};
