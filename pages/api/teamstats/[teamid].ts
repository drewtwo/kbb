import type { NextApiRequest, NextApiResponse } from 'next';
import { getWeeklyStats } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  stats_by_week?: unknown[];
};

export default async function weekStats(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { teamid } = req.query;

    if (teamid === undefined || teamid === null) {
      console.error('[teamstats API] No team id provided in request query');
      res.status(400).json({ error: 'no team id provided' });
      return;
    }

    const teamIdStr: string = Array.isArray(teamid) ? teamid[0] : teamid;
    console.log(`[teamstats API] Fetching weekly stats for team "${teamIdStr}"`);

    const weekly_stats: unknown[] = await getWeeklyStats(req, teamIdStr);

    if (!Array.isArray(weekly_stats) || weekly_stats.length === 0) {
      console.error(
        `[teamstats API] getWeeklyStats returned empty or invalid result for team "${teamIdStr}"`
      );
      res.status(500).json({
        error: `No weekly stats data available for team "${teamIdStr}"`,
      });
      return;
    }

    console.log(
      `[teamstats API] Successfully fetched ${weekly_stats.length} week(s) for team "${teamIdStr}"`
    );

    res.status(200).json({ stats_by_week: weekly_stats });
  } catch (_err) {
    const msg: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error(`[teamstats API] Unhandled exception: ${msg}`);
    res.status(500).json({ error: 'failed to load data' });
  }
}
