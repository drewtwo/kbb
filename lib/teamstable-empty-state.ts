const SPORT_LABELS: Record<string, string> = {
  mlb: 'MLB',
  nba: 'NBA',
  nfl: 'NFL',
  nhl: 'NHL',
  all: 'any sport',
};

export function getEmptyLeaguesMessage(sport: string): string {
  const label = SPORT_LABELS[sport] ?? sport;

  if (sport === 'all') {
    return "You don't have any leagues in any sport";
  }

  return `You don't have any ${label} leagues`;
}

export function isEmptyLeagueError(errorMessage?: string): boolean {
  const normalized = errorMessage?.toLowerCase() ?? '';

  return normalized.includes('no leagues')
    || normalized.includes('no teams')
    || normalized.includes('not found');
}
