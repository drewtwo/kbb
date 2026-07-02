import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeagueTeams, convertGameIdToLeagueKey } from '../../../utils/yahooData';

type ResponseData = {
  error?: string;
  teams?: unknown;
};

/**
 * API endpoint for fetching game/league team data by game ID.
 * Accepts a game ID (e.g. "411.l.12345") and returns the league teams
 * nested under a `teams` key so the game page can access them via
 * data.teams.league.teams.team.
 */
export default async function gameInfo(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { gameid } = req.query;

    if (gameid === undefined || gameid === null) {
      res.status(400).json({ error: 'No game ID provided' });
      return;
    }

    const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;
    const leagueKey = convertGameIdToLeagueKey(gameIdStr);

    const leagueTeams = await getLeagueTeams(req, leagueKey);

    // Check if the underlying call returned an error object
    if (
      leagueTeams &&
      typeof leagueTeams === 'object' &&
      'error' in (leagueTeams as Record<string, unknown>)
    ) {
      const errObj = leagueTeams as { error: string; statusCode?: number };
      console.error(`[gameinfo] getLeagueTeams returned error: ${errObj.error}`);
      res.status(errObj.statusCode ?? 500).json({ error: errObj.error });
      return;
    }

    // Return teams wrapped so the client can access data.teams.league.teams.team
    res.status(200).json({ teams: leagueTeams });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[gameinfo] Exception: ${errorMsg}`);
    res.status(500).json({ error: `Failed to load game data: ${errorMsg}` });
  }
}
