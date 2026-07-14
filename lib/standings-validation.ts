import type { StandingsTeam, TeamData } from '../utils/yahooData';

/**
 * Returns true when a standings entry has the minimum team identity fields
 * required to render a table row. Entries that are missing `team_standings`
 * are still considered valid because the table renders placeholders for those.
 */
export const isValidStandingsEntry = (team: unknown): team is StandingsTeam => {
  if (!team || typeof team !== 'object') {
    return false;
  }

  const candidate = team as Partial<StandingsTeam>;
  return (
    typeof candidate.team_key === 'string' &&
    typeof candidate.team_id === 'string' &&
    typeof candidate.name === 'string'
  );
};

/**
 * Accepts a standings payload when it contains at least one renderable team.
 * Invalid entries are ignored rather than forcing the entire standings view to
 * fall back to the unavailable banner.
 */
export const isValidStandingsArray = (standings: unknown): standings is StandingsTeam[] => {
  if (!Array.isArray(standings) || standings.length === 0) {
    return false;
  }

  return standings.some(isValidStandingsEntry);
};

export const getRenderableStandings = (standings: unknown): StandingsTeam[] | undefined => {
  if (!Array.isArray(standings) || standings.length === 0) {
    return undefined;
  }

  const renderableStandings = standings.filter(isValidStandingsEntry);
  return renderableStandings.length > 0 ? renderableStandings : undefined;
};

export const isValidTeamsArray = (teams: unknown): teams is TeamData[] => {
  if (!Array.isArray(teams) || teams.length === 0) {
    return false;
  }

  return teams.every((team: unknown) => {
    if (!team || typeof team !== 'object') {
      return false;
    }

    const candidate = team as Partial<TeamData>;
    return (
      typeof candidate.team_key === 'string' &&
      typeof candidate.team_id === 'string' &&
      typeof candidate.name === 'string'
    );
  });
};
