import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueAggregatedStats,
  isErrorResponse,
  SEASON_START_WEEK,
  SEASON_END_WEEK,
} from '../../../utils/yahooData';
import type { LeagueAggregatedStats } from '../../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
  /** Aggregated stats for every team across all weeks of the season. */
  aggregated_stats?: LeagueAggregatedStats;
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

    const league_teams = await getLeagueTeams(req, id);
    const league_settings = await getLeagueSettings(req, id);

    // Surface any error returned by the Yahoo API utilities
    if (isErrorResponse(league_teams)) {
      console.error('[leagueinfo API] getLeagueTeams returned error:', league_teams.error);
      const statusCode: number =
        typeof league_teams.statusCode === 'number' ? league_teams.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league teams: ${league_teams.error}` });
      return;
    }

    if (isErrorResponse(league_settings)) {
      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league settings: ${league_settings.error}` });
      return;
    }

    // Aggregate weekly stats for all teams across all weeks of the season.
    // A failure here is non-fatal — we still return teams and settings so the
    // rest of the page can render.
    console.log(
      `[leagueinfo API] Aggregating league stats for weeks ${SEASON_START_WEEK}-${SEASON_END_WEEK}`
    );
    const aggregated_stats: LeagueAggregatedStats | null = await getLeagueAggregatedStats(
      req,
      league_teams,
      SEASON_START_WEEK,
      SEASON_END_WEEK
    );

    if (!aggregated_stats) {
      console.warn(
        '[leagueinfo API] getLeagueAggregatedStats returned null — responding without aggregated stats'
      );
    } else {
      console.log(
        `[leagueinfo API] Successfully aggregated stats for ${Object.keys(aggregated_stats.teams).length} teams`
      );
    }

    res.status(200).json({
      teams: league_teams,
      settings: league_settings,
      ...(aggregated_stats ? { aggregated_stats } : {}),
    });
  } catch (_err) {
    const message = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    res.status(500).json({ error: 'failed to load data' });
  }
}
