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
