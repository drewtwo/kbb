import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import xml2js from 'xml2js';
import { NextApiRequest } from 'next';

const secret = process.env.SECRET;

const parserOptions = { explicitArray: false };

const parser = new xml2js.Parser(parserOptions);

export const getTeams = async (req: NextApiRequest) => {
  return new Promise(async (resolve) => {
    try {
      let games = {};
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
          const buffer = Buffer.concat(chunks);
          zlib.gunzip(buffer, (_err, dezipped) => {
            parser.parseString(dezipped.toString(), function (_err, result) {
              games = result.fantasy_content.users.user.games.game;
              resolve(games);
            });
          });
        });
      });

      request.on('error', (error) => {
        console.error(`Error on Get Request --> ${error}`);
        const newError = { error: `Error on Get Request --> ${error}` };
        resolve(newError);
      });

      request.end();
    } catch (err) {
      resolve({ error: 'failed to load data' });
    }
  });
};

export const getLeagueTeams = async (
  req: NextApiRequest,
  league_key: string
) => {
  return new Promise(async (resolve) => {
    try {
      let league = {};
      const token = await getToken({ req, secret });
      const options = {
        hostname: 'fantasysports.yahooapis.com',
        port: 443,
        path: `/fantasy/v2/league/${league_key}/teams`,
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
          const buffer = Buffer.concat(chunks);
          zlib.gunzip(buffer, (_err, dezipped) => {
            parser.parseString(dezipped.toString(), function (_err, result) {
              league = result.fantasy_content.league;
              resolve(league);
            });
          });
        });
      });

      request.on('error', (error) => {
        console.error(`Error on Get Request --> ${error}`);
        const newError = { error: `Error on Get Request --> ${error}` };
        resolve(newError);
      });

      request.end();
    } catch (err) {
      resolve({ error: 'failed to load data' });
    }
  });
};

export const getLeagueSettings = async (
  req: NextApiRequest,
  league_key: string
) => {
  return new Promise(async (resolve) => {
    try {
      let league = {};
      const token = await getToken({ req, secret });
      const options = {
        hostname: 'fantasysports.yahooapis.com',
        port: 443,
        path: `/fantasy/v2/league/${league_key}/settings`,
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
          const buffer = Buffer.concat(chunks);
          zlib.gunzip(buffer, (_err, dezipped) => {
            parser.parseString(dezipped.toString(), function (_err, result) {
              league = result.fantasy_content.league.settings;
              resolve(league);
            });
          });
        });
      });

      request.on('error', (error) => {
        console.error(`Error on Get Request --> ${error}`);
        const newError = { error: `Error on Get Request --> ${error}` };
        resolve(newError);
      });

      request.end();
    } catch (err) {
      resolve({ error: 'failed to load data' });
    }
  });
};

export const getWeeklyStats = async (req: NextApiRequest, team_key: string) => {
  let stats = await getWeekStats(req, team_key, '0');
  const week = stats.week;
  const result = [stats];
  for (let index = week - 1; index > 0; index--) {
    stats = await getWeekStats(req, team_key, String(index));
    result.push(stats);
  }
  return result;
};

export const getWeekStats = async (
  req: NextApiRequest,
  team_key: string,
  week: string
) => {
  return new Promise(async (resolve) => {
    try {
      let stats = {};
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
          const buffer = Buffer.concat(chunks);
          zlib.gunzip(buffer, (_err, dezipped) => {
            parser.parseString(dezipped.toString(), function (_err, result) {
              stats = result.fantasy_content.team.team_stats;
              resolve(stats);
            });
          });
        });
      });

      request.on('error', (error) => {
        console.error(`Error on Get Request --> ${error}`);
        const newError = { error: `Error on Get Request --> ${error}` };
        resolve(newError);
      });

      request.end();
    } catch (err) {
      resolve({ error: 'failed to load data' });
    }
  });
};
