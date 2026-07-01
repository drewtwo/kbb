import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeagueTeams, getLeagueSettings } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { id } = req.query;
    if (id !== undefined && id !== null) {
      const league_teams = await getLeagueTeams(req, id);
      const league_settings = await getLeagueSettings(req, id);
      // console.log(league_info);
      res.status(200).json({ teams: league_teams, settings: league_settings });
    } else {
      res.status(500).json({ error: 'no league id provided' });
    }
  } catch (_err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
