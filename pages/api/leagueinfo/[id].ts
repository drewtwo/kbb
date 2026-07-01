import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeagueTeams, getLeagueSettings } from '../../../utils/yahooData';
import { FantasyContent, ErrorResponse } from '../../../types/yahooFantasy';

type ResponseData = {
  teams?: FantasyContent;
  settings?: FantasyContent;
  error?: string;
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
      res.status(200).json({ teams: league_teams as FantasyContent, settings: league_settings as FantasyContent });
    } else {
      res.status(500).json({ error: 'no league id provided' });
    }
  } catch (err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
