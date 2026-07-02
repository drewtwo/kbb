/**
 * Type definitions for Yahoo Fantasy Sports API responses
 */

export interface YahooTeamLogo {
  url: string;
  size?: string;
}

export interface YahooTeam {
  team_key: string;
  team_id: string;
  name: string;
  team_logo?: string;
  team_logos?: {
    team_logo: YahooTeamLogo;
  };
}

export interface YahooGame {
  game_key: string;
  game_id: string;
  name: string;
  season: string;
  teams: {
    team: YahooTeam | YahooTeam[];
  };
}

export interface YahooLeagueTeams {
  league: {
    league_key?: string;
    league_id?: string;
    name?: string;
    teams: {
      /** xml2js with explicitArray:false may return a single object or an array */
      team: YahooTeam | YahooTeam[];
    };
  };
}

export interface YahooStatCategory {
  stat_id: string;
  name: string;
  display_name: string;
}

export interface YahooLeagueSettings {
  league: {
    settings: {
      stat_categories: {
        stats: {
          stat: YahooStatCategory[];
        };
      };
    };
  };
}

export interface YahooStat {
  stat_id: string;
  value: string;
}

export interface YahooWeekStats {
  week: number;
  stats: {
    stat: YahooStat[];
  };
}

export interface YahooFantasyContent {
  users?: {
    user: {
      games: {
        game: YahooGame | YahooGame[];
      };
    };
  };
  league?: YahooLeagueTeams | YahooLeagueSettings;
  team?: {
    team_stats: YahooWeekStats;
  };
}

/**
 * Response shape returned by /api/gameinfo/[gameid].
 * `teams` is the raw fantasy_content from getLeagueTeams, which has the
 * structure: { league: { teams: { team: YahooTeam | YahooTeam[] } } }
 */
export interface GameInfoApiResponse {
  error?: string;
  teams?: YahooLeagueTeams;
}

/**
 * Extracted games response from getTeams.
 * This is the transformed response after extracting from the nested
 * fantasy_content structure.
 */
export interface ExtractedGamesResponse {
  games: YahooGame[];
}

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  error: string;
  statusCode?: number;
}

// ─── Standings types ─────────────────────────────────────────────────────────

/**
 * Win/loss/tie record and scoring totals for a single team in the standings.
 * Mirrors the `team_standings` node returned by the Yahoo Fantasy
 * /league/{key}/standings endpoint (parsed via xml2js explicitArray:false).
 */
export interface YahooTeamStandingsRecord {
  /** Overall rank in the league (1 = first place). */
  rank: string;
  /** Number of wins. */
  outcome_totals: {
    wins: string;
    losses: string;
    ties: string;
    percentage: string;
  };
  /** Total fantasy points scored by this team across all weeks. */
  points_for: string;
  /** Total fantasy points scored against this team across all weeks. */
  points_against: string;
  /** Playoff seed (may be absent for in-progress seasons). */
  playoff_seed?: string;
}

/**
 * A single team entry as returned inside the standings response.
 * Extends the base team fields with a `team_standings` property.
 */
export interface YahooStandingsTeam {
  team_key: string;
  team_id: string;
  name: string;
  team_logos?: {
    team_logo: YahooTeamLogo;
  };
  /** Standings-specific data for this team. */
  team_standings: YahooTeamStandingsRecord;
}

/**
 * The full `fantasy_content` shape returned by the /standings endpoint.
 * The `league` node includes an `is_finished` flag in addition to the
 * standard team list.
 */
export interface YahooLeagueStandingsContent {
  league: {
    league_key?: string;
    league_id?: string;
    name?: string;
    /** "1" when the season is finished, "0" (or absent) otherwise. */
    is_finished?: string;
    teams: {
      /** xml2js with explicitArray:false may return a single object or an array */
      team: YahooStandingsTeam | YahooStandingsTeam[];
    };
  };
}
