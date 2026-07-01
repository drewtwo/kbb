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
    teams: {
      team: YahooTeam[];
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
