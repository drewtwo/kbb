import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueStandings,
  isErrorResponse,
} from '../../../utils/yahooData';
import type { StandingsTeam } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { id } = req.query;
    if (id === undefined || id === null) {
      res.status(400).json({ error: 'no league id provided' });
      return;
    }

    const leagueIdStr: string = Array.isArray(id) ? id[0] : id;
    console.log(`[leagueinfo API] Fetching data for league id: "${leagueIdStr}"`);

    // Fetch teams, settings, and standings in parallel
    console.log('[leagueinfo API] Starting parallel fetch: teams, settings, standings');
    const [league_teams, league_settings, league_standings] = await Promise.all([
      getLeagueTeams(req, id),
      getLeagueSettings(req, id),
      getLeagueStandings(req, id),
    ]);
    console.log('[leagueinfo API] Parallel fetch complete');

    // Surface any error returned by the Yahoo API utilities
    if (isErrorResponse(league_teams)) {
      console.error('[leagueinfo API] getLeagueTeams returned error:', league_teams.error);
      const statusCode: number =
        typeof league_teams.statusCode === 'number' ? league_teams.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league teams: ${league_teams.error}` });
      return;
    }
    console.log('[leagueinfo API] league_teams fetched successfully');

    if (isErrorResponse(league_settings)) {
      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league settings: ${league_settings.error}` });
      return;
    }
    console.log('[leagueinfo API] league_settings fetched successfully');

    // Standings are non-fatal — if the call failed we omit them from the response
    let standings: StandingsTeam[] | undefined;
    if (isErrorResponse(league_standings)) {
      console.warn(
        '[leagueinfo API] getLeagueStandings returned error (non-fatal):',
        league_standings.error
      );
    } else {
      standings = league_standings;
      console.log(
        `[leagueinfo API] standings fetched successfully: ${standings.length} team(s)`
      );
    }

    const responsePayload: ResponseData = {
      teams: league_teams,
      settings: league_settings,
      ...(standings ? { standings } : {}),
    };

    console.log(
      '[leagueinfo API] Sending response — standings present:', !!standings,
      '| standings count:', standings?.length ?? 0
    );

    res.status(200).json(responsePayload);
  } catch (_err) {
    const message: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    res.status(500).json({ error: 'failed to load data' });
  }
}
