/**
 * Yahoo Fantasy Sports API Type Definitions
 * Comprehensive types for games, teams, leagues, and stats data structures
 */

export interface ErrorResponse {
  error: string;
}

export interface Stat {
  stat_id: string;
  value: string;
}

export interface StatsContainer {
  stat: Stat | Stat[];
}

export interface WeekStats {
  week?: string | number;
  stats: StatsContainer;
}

export interface Team {
  team_key: string;
  team_id: string;
  name: string;
  url?: string;
  logo?: string;
  division_id?: string;
  managers?: unknown;
}

export interface TeamsContainer {
  team: Team | Team[];
}

export interface Game {
  game_key: string;
  name: string;
  code: string;
  type: string;
  url: string;
  season: string;
  is_finished: number;
  teams?: TeamsContainer;
}

export interface GamesContainer {
  game: Game | Game[];
}

export interface User {
  user_key: string;
  games?: GamesContainer;
}

export interface UsersContainer {
  user: User | User[];
}

export interface FantasyContent {
  users?: UsersContainer;
  games?: GamesContainer;
  leagues?: unknown;
  teams?: unknown;
  team?: unknown;
  league?: unknown;
}

export interface StatCategory {
  stat_id: string;
  name: string;
  display_name: string;
  group?: string;
  position_type?: string;
  is_only_display_stat?: number;
  sort_order?: string;
}

export interface StatCategoriesContainer {
  stat: StatCategory | StatCategory[];
}

export interface StatsContainer2 {
  stats: StatCategoriesContainer;
}

export interface Settings {
  stat_categories?: StatsContainer2;
  [key: string]: unknown;
}

export interface LeagueInfo {
  league_key?: string;
  league_id?: string;
  name?: string;
  url?: string;
  logo?: string;
  draft_status?: string;
  num_teams?: number;
  scoring_type?: string;
  league_update_timestamp?: string;
  settings?: Settings;
  teams?: TeamsContainer;
}

export interface ApiResponse {
  teams?: unknown;
  settings?: unknown;
  stats_by_week?: unknown[];
  error?: string;
  [key: string]: unknown;
}

export interface WeeklyStatsData {
  stats_by_week: WeekStats[];
}

export interface SettingsData {
  settings: Settings;
}

export interface LeagueTeamsData {
  teams: TeamsContainer;
}
