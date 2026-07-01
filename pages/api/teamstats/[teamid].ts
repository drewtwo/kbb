import type { NextApiRequest, NextApiResponse } from 'next';
import { getWeeklyStats } from '../../../utils/yahooData';
import { WeekStats, ErrorResponse } from '../../../types/yahooFantasy';

type ResponseData = {
  stats_by_week?: (WeekStats | ErrorResponse)[];
  error?: string;
};

export default async function weekStats(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { teamid } = req.query;
    if (teamid !== undefined && teamid !== null) {
      const weekly_stats = await getWeeklyStats(req, teamid);
      res.status(200).json({ stats_by_week: weekly_stats });
    } else {
      res.status(500).json({ error: 'no team id provided' });
    }
  } catch (err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
