import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import { parseString } from 'xml2js';
import { getLeagueTeams, getLeagueSettings } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { id } = req.query;
    if (id !== undefined) {
      const league_teams = await getLeagueTeams(req, id);
      const league_settings = await getLeagueSettings(req, id);
      // console.log(league_info);
      res.status(200).json({ teams: league_teams, settings: league_settings });
    } else {
      res.status(500).json({ error: 'no league id provided' });
    }
  } catch (err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
