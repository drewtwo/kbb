import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLeagueTeams,
  getLeagueSettings,
  getLeagueStandings,
  getLeagueAggregatedStats,
  extractStandingsFromLeagueContent,
  isErrorResponse,
  SEASON_START_WEEK,
  SEASON_END_WEEK,
} from '../../../utils/yahooData';
import type { LeagueAggregatedStats, StandingsTeam, LeagueStandingsContent } from '../../../utils/yahooData';
import { diagLog, diagWarn, diagError, diagDump } from '../../../utils/diagnosticLogger';
import { summariseValue, diagnoseObjectShape, traceObjectPath } from '../../../utils/objectDumper';

type ResponseData = {
  name?: string;
  error?: string;
  teams?: unknown;
  settings?: unknown;
  /** Aggregated stats for every team across all weeks of the season. */
  aggregated_stats?: LeagueAggregatedStats;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
  /** True when the season has finished (derived from the standings response). */
  is_finished?: boolean;
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
    diagLog('[leagueinfo API]', `Request method: ${req.method ?? 'unknown'}, league id: "${leagueIdStr}"`);

    // Fetch teams, settings, and standings in parallel
    console.log('[leagueinfo API] Starting parallel fetch: teams, settings, standings');
    diagLog('[leagueinfo API]', 'Initiating parallel fetch for teams, settings, and standings');

    const [league_teams, league_settings, league_standings] = await Promise.all([
      getLeagueTeams(req, id),
      getLeagueSettings(req, id),
      getLeagueStandings(req, id),
    ]);
    console.log('[leagueinfo API] Parallel fetch complete');
    diagLog('[leagueinfo API]', 'Parallel fetch complete — processing results');

    // ── Teams ──────────────────────────────────────────────────────────────
    if (isErrorResponse(league_teams)) {
      console.error('[leagueinfo API] getLeagueTeams returned error:', league_teams.error);
      diagError('[leagueinfo API]', `getLeagueTeams error — statusCode: ${league_teams.statusCode ?? 'N/A'}, message: ${league_teams.error}`);
      const statusCode: number =
        typeof league_teams.statusCode === 'number' ? league_teams.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league teams: ${league_teams.error}` });
      return;
    }
    console.log('[leagueinfo API] league_teams fetched successfully, type:', typeof league_teams);
    diagLog('[leagueinfo API]', `league_teams OK — ${summariseValue(league_teams)}`);

    // ── Settings ───────────────────────────────────────────────────────────
    if (isErrorResponse(league_settings)) {
      console.error('[leagueinfo API] getLeagueSettings returned error:', league_settings.error);
      diagError('[leagueinfo API]', `getLeagueSettings error — statusCode: ${league_settings.statusCode ?? 'N/A'}, message: ${league_settings.error}`);
      const statusCode: number =
        typeof league_settings.statusCode === 'number' ? league_settings.statusCode : 500;
      res.status(statusCode).json({ error: `Failed to load league settings: ${league_settings.error}` });
      return;
    }
    console.log('[leagueinfo API] league_settings fetched successfully, type:', typeof league_settings);
    diagLog('[leagueinfo API]', `league_settings OK — ${summariseValue(league_settings)}`);

    // ── Standings ──────────────────────────────────────────────────────────
    let standings: StandingsTeam[] | undefined;
    let is_finished: boolean | undefined;

    if (isErrorResponse(league_standings)) {
      console.warn(
        '[leagueinfo API] getLeagueStandings returned error (non-fatal):',
        league_standings.error
      );
      diagWarn(
        '[leagueinfo API]',
        `getLeagueStandings error (non-fatal) — statusCode: ${league_standings.statusCode ?? 'N/A'}, ` +
        `message: ${league_standings.error}. Standings will be omitted from the response.`
      );
    } else {
      // Log the raw shape of the standings response for diagnostic purposes
      console.log(
        '[leagueinfo API] league_standings fetched successfully, type:', typeof league_standings,
        '| isNull:', league_standings === null,
        '| keys:', league_standings && typeof league_standings === 'object'
          ? Object.keys(league_standings as object)
          : 'N/A'
      );

      diagLog(
        '[leagueinfo API]',
        `league_standings raw shape — ${summariseValue(league_standings)}`
      );

      // Dump the full standings response for deep inspection
      diagDump('[leagueinfo API]', 'league_standings (full)', league_standings);

      // Trace the expected extraction path
      if (league_standings && typeof league_standings === 'object') {
        diagLog(
          '[leagueinfo API]',
          traceObjectPath(league_standings, 'league.teams.team')
        );
        diagLog(
          '[leagueinfo API]',
          diagnoseObjectShape(
            league_standings,
            ['league'],
            'league_standings (fantasy_content)'
          )
        );

        // Diagnose the league sub-object if present
        const leagueObj: unknown = (league_standings as Record<string, unknown>).league;
        if (leagueObj && typeof leagueObj === 'object') {
          diagLog(
            '[leagueinfo API]',
            diagnoseObjectShape(
              leagueObj,
              ['league_key', 'league_id', 'name', 'is_finished', 'teams'],
              'league_standings.league'
            )
          );

          // Diagnose the teams sub-object if present
          const teamsObj: unknown = (leagueObj as Record<string, unknown>).teams;
          if (teamsObj && typeof teamsObj === 'object') {
            diagLog(
              '[leagueinfo API]',
              diagnoseObjectShape(
                teamsObj,
                ['team'],
                'league_standings.league.teams'
              )
            );
          } else {
            diagWarn(
              '[leagueinfo API]',
              `league_standings.league.teams is ${summariseValue(teamsObj)} — ` +
              'extraction will fail at the teams step'
            );
          }
        } else {
          diagWarn(
            '[leagueinfo API]',
            `league_standings.league is ${summariseValue(leagueObj)} — ` +
            'extraction will fail at the league step'
          );
        }
      }

      // ── Run extraction ─────────────────────────────────────────────────
      diagLog('[leagueinfo API]', 'Calling extractStandingsFromLeagueContent...');
      const extractedStandings: StandingsTeam[] | null = extractStandingsFromLeagueContent(league_standings);

      if (extractedStandings) {
        standings = extractedStandings;
        console.log(
          `[leagueinfo API] extractStandingsFromLeagueContent succeeded: ${standings.length} team(s)`
        );
        diagLog(
          '[leagueinfo API]',
          `Extraction succeeded — ${standings.length} team(s) extracted`
        );

        // Log a brief summary of each team's standings entry for traceability
        standings.forEach((t: StandingsTeam, i: number) => {
          console.log(
            `[leagueinfo API]   standings[${i}]: team_id=${t.team_id} name="${t.name}" rank=${t.team_standings?.rank ?? 'N/A'} wins=${t.team_standings?.outcome_totals?.wins ?? 'N/A'}`
          );
          diagLog(
            '[leagueinfo API]',
            `standings[${i}]: team_key=${t.team_key} team_id=${t.team_id} name="${t.name}" ` +
            `rank=${t.team_standings?.rank ?? 'N/A'} ` +
            `wins=${t.team_standings?.outcome_totals?.wins ?? 'N/A'} ` +
            `losses=${t.team_standings?.outcome_totals?.losses ?? 'N/A'} ` +
            `ties=${t.team_standings?.outcome_totals?.ties ?? 'N/A'} ` +
            `pts_for=${t.team_standings?.points_for ?? 'N/A'} ` +
            `pts_against=${t.team_standings?.points_against ?? 'N/A'}`
          );
        });
      } else {
        console.warn('[leagueinfo API] extractStandingsFromLeagueContent returned null — omitting standings from response');
        diagWarn(
          '[leagueinfo API]',
          'extractStandingsFromLeagueContent returned null. ' +
          'Check the [yahooData] extractStandingsFromLeagueContent log messages above for the exact failure step. ' +
          'Standings will be omitted from the API response.'
        );
      }

      // ── Extract is_finished ────────────────────────────────────────────
      const standingsContent: LeagueStandingsContent = league_standings as LeagueStandingsContent;
      if (standingsContent?.league?.is_finished !== undefined) {
        is_finished = standingsContent.league.is_finished === '1';
        console.log(`[leagueinfo API] is_finished extracted: ${is_finished} (raw: "${standingsContent.league.is_finished}")`);
        diagLog(
          '[leagueinfo API]',
          `is_finished: ${is_finished} (raw value: "${standingsContent.league.is_finished}")`
        );
      } else {
        console.log('[leagueinfo API] is_finished not present in standings response — defaulting to false');
        diagLog(
          '[leagueinfo API]',
          'is_finished field absent from standings league object — will default to false on the client'
        );
      }
    }

    // ── Aggregate weekly stats ─────────────────────────────────────────────
    console.log(
      `[leagueinfo API] Aggregating league stats for weeks ${SEASON_START_WEEK}-${SEASON_END_WEEK}`
    );
    diagLog(
      '[leagueinfo API]',
      `Starting weekly stats aggregation for weeks ${SEASON_START_WEEK}–${SEASON_END_WEEK}`
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
      diagWarn(
        '[leagueinfo API]',
        'getLeagueAggregatedStats returned null — aggregated_stats will be omitted from the response'
      );
    } else {
      const teamCount: number = Object.keys(aggregated_stats.teams).length;
      console.log(
        `[leagueinfo API] Successfully aggregated stats for ${teamCount} teams`
      );
      diagLog(
        '[leagueinfo API]',
        `Aggregation complete — ${teamCount} team(s), ` +
        `weeks ${aggregated_stats.week_range.start}–${aggregated_stats.week_range.end}`
      );
    }

    // ── Build and send response ────────────────────────────────────────────
    const responsePayload: ResponseData = {
      teams: league_teams,
      settings: league_settings,
      ...(aggregated_stats ? { aggregated_stats } : {}),
      ...(standings ? { standings } : {}),
      ...(is_finished !== undefined ? { is_finished } : {}),
    };

    console.log(
      '[leagueinfo API] Sending response — standings present:', !!standings,
      '| standings count:', standings?.length ?? 0,
      '| aggregated_stats present:', !!aggregated_stats,
      '| is_finished:', is_finished
    );

    diagLog(
      '[leagueinfo API]',
      `Response payload keys: [${Object.keys(responsePayload).join(', ')}] | ` +
      `standings: ${standings ? standings.length + ' team(s)' : 'absent'} | ` +
      `aggregated_stats: ${aggregated_stats ? 'present' : 'absent'} | ` +
      `is_finished: ${is_finished ?? 'absent'}`
    );

    res.status(200).json(responsePayload);
  } catch (_err) {
    const message: string = _err instanceof Error ? _err.message : 'Unknown error';
    console.error('[leagueinfo API] Unexpected error:', message);
    diagError(
      '[leagueinfo API]',
      `Unexpected exception — ${message}. Stack: ${_err instanceof Error ? (_err.stack ?? message) : message}`
    );
    res.status(500).json({ error: 'failed to load data' });
  }
}
