import { isValidStandingsArray } from '../lib/standings-validation';

describe('isValidStandingsArray', () => {
  it('accepts a non-empty standings array when at least one team has the required identity fields', () => {
    const standings = [
      { team_key: '1', team_id: '1', name: 'Team One' },
      { team_key: '2', team_id: '2' },
    ] as Array<Record<string, unknown>>;

    expect(isValidStandingsArray(standings)).toBe(true);
  });

  it('rejects empty standings arrays', () => {
    expect(isValidStandingsArray([])).toBe(false);
  });
});
