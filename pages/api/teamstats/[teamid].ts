import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import { parseString } from 'xml2js';
import { getWeeklyStats } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
};

export default async function weekStats(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { teamid } = req.query;
    if (teamid !== undefined) {
      const weekly_stats = await getWeeklyStats(req, teamid);
      res.status(200).json({ stats_by_week: weekly_stats });
    } else {
      res.status(500).json({ error: 'no team id provided' });
    }
  } catch (err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
