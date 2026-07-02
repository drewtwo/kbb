/**
 * Unit tests for extractStandingsFromLeagueContent in utils/yahooData.ts
 *
 * These tests verify that:
 *  - extractStandingsFromLeagueContent returns null for null/non-object input
 *  - extractStandingsFromLeagueContent returns null when the league property is missing
 *  - extractStandingsFromLeagueContent returns null when league.teams is missing
 *  - extractStandingsFromLeagueContent returns null when league.teams.team is missing
 *  - extractStandingsFromLeagueContent normalises a single-team object into an array
 *  - extractStandingsFromLeagueContent passes through a multi-team array unchanged
 *  - extractStandingsFromLeagueContent filters out non-object entries in the team array
 *  - extractStandingsFromLeagueContent returns null when all team entries are invalid
 *  - extractStandingsFromLeagueContent includes teams that are missing team_standings
 *  - extractStandingsFromLeagueContent preserves rank ordering from the source array
 */

import {
  extractStandingsFromLeagueContent,
} from '../utils/yahooData';
import type { StandingsTeam, LeagueStandingsContent } from '../utils/yahooData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a minimal StandingsTeam fixture. */
function buildTeam(overrides: Partial<StandingsTeam> = {}): StandingsTeam {
  return {
    team_key: '411.l.99999.t.1',
    team_id: '1',
    name: 'Test Team',
    team_standings: {
      rank: '1',
      outcome_totals: {
        wins: '10',
        losses: '5',
        ties: '0',
        percentage: '.667',
      },
      points_for: '1234.50',
      points_against: '1100.00',
      playoff_seed: '1',
    },
    ...overrides,
  };
}

/** Wraps one or more team fixtures in a valid LeagueStandingsContent shape. */
function buildFantasyContent(
  teamField: StandingsTeam | StandingsTeam[] | undefined,
  leagueOverrides: Partial<LeagueStandingsContent['league']> = {}
): LeagueStandingsContent {
  return {
    league: {
      league_key: '411.l.99999',
      league_id: '99999',
      name: 'Test League',
      is_finished: '0',
      teams: teamField !== undefined ? { team: teamField } : undefined,
      ...leagueOverrides,
    },
  };
}

// ─── extractStandingsFromLeagueContent ───────────────────────────────────────

describe('extractStandingsFromLeagueContent', () => {
  // ── Invalid / missing input ──────────────────────────────────────────────

  it('returns null for null input', () => {
    expect(extractStandingsFromLeagueContent(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractStandingsFromLeagueContent(undefined)).toBeNull();
  });

  it('returns null for a string input', () => {
    expect(extractStandingsFromLeagueContent('not-an-object')).toBeNull();
  });

  it('returns null for a number input', () => {
    expect(extractStandingsFromLeagueContent(42)).toBeNull();
  });

  it('returns null when the league property is missing', () => {
    expect(extractStandingsFromLeagueContent({})).toBeNull();
  });

  it('returns null when league.teams is missing', () => {
    const content: LeagueStandingsContent = {
      league: { league_key: '411.l.99999', name: 'Test League' },
    };
    expect(extractStandingsFromLeagueContent(content)).toBeNull();
  });

  it('returns null when league.teams.team is missing', () => {
    const content: LeagueStandingsContent = {
      league: {
        league_key: '411.l.99999',
        name: 'Test League',
        teams: {},
      },
    };
    expect(extractStandingsFromLeagueContent(content)).toBeNull();
  });

  // ── Single-team (xml2js non-array) form ──────────────────────────────────

  it('wraps a single-team object into a one-element array', () => {
    const team: StandingsTeam = buildTeam();
    const content: LeagueStandingsContent = buildFantasyContent(team);

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBe(1);
    expect(result![0].team_id).toBe('1');
    expect(result![0].name).toBe('Test Team');
  });

  // ── Multi-team (array) form ───────────────────────────────────────────────

  it('returns the full array when multiple teams are present', () => {
    const teams: StandingsTeam[] = [
      buildTeam({
        team_id: '1',
        name: 'Team Alpha',
        team_standings: {
          rank: '1',
          outcome_totals: { wins: '12', losses: '3', ties: '0', percentage: '.800' },
          points_for: '1500',
          points_against: '1200',
        },
      }),
      buildTeam({
        team_id: '2',
        name: 'Team Beta',
        team_standings: {
          rank: '2',
          outcome_totals: { wins: '10', losses: '5', ties: '0', percentage: '.667' },
          points_for: '1400',
          points_against: '1250',
        },
      }),
      buildTeam({
        team_id: '3',
        name: 'Team Gamma',
        team_standings: {
          rank: '3',
          outcome_totals: { wins: '8', losses: '7', ties: '0', percentage: '.533' },
          points_for: '1300',
          points_against: '1350',
        },
      }),
    ];
    const content: LeagueStandingsContent = buildFantasyContent(teams);

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result![0].name).toBe('Team Alpha');
    expect(result![1].name).toBe('Team Beta');
    expect(result![2].name).toBe('Team Gamma');
  });

  it('preserves the original rank ordering from the source array', () => {
    const teams: StandingsTeam[] = Array.from(
      { length: 10 },
      (_: unknown, i: number): StandingsTeam =>
        buildTeam({
          team_id: String(i + 1),
          name: `Team ${i + 1}`,
          team_standings: {
            rank: String(i + 1),
            outcome_totals: {
              wins: String(10 - i),
              losses: String(i),
              ties: '0',
              percentage: '.500',
            },
            points_for: '1000',
            points_against: '1000',
          },
        })
    );
    const content: LeagueStandingsContent = buildFantasyContent(teams);

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(10);
    result!.forEach((t: StandingsTeam, i: number) => {
      expect(t.team_standings.rank).toBe(String(i + 1));
    });
  });

  // ── Teams missing team_standings ─────────────────────────────────────────

  it('includes teams that are missing team_standings (renders with dashes)', () => {
    // Cast to bypass TypeScript required-field check — simulates a partial
    // response from the Yahoo API.
    const teamWithoutStandings: StandingsTeam = {
      team_key: '411.l.99999.t.5',
      team_id: '5',
      name: 'Incomplete Team',
    } as unknown as StandingsTeam;

    const content: LeagueStandingsContent = buildFantasyContent(teamWithoutStandings);

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].name).toBe('Incomplete Team');
    // team_standings should be absent — the caller handles this gracefully
    expect(result![0].team_standings).toBeUndefined();
  });

  // ── Invalid entries inside a team array ──────────────────────────────────

  it('filters out null entries within the team array', () => {
    const validTeam: StandingsTeam = buildTeam({ team_id: '1', name: 'Valid Team' });
    // Inject nulls to simulate a malformed API response
    const teamsWithNull: unknown[] = [validTeam, null, validTeam];
    const content: unknown = {
      league: {
        league_key: '411.l.99999',
        name: 'Test League',
        teams: { team: teamsWithNull },
      },
    };

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    // null entries should be filtered out, leaving 2 valid teams
    expect(result!.length).toBe(2);
    result!.forEach((t: StandingsTeam) => expect(t.name).toBe('Valid Team'));
  });

  it('returns null when all entries in the team array are invalid', () => {
    const content: unknown = {
      league: {
        league_key: '411.l.99999',
        name: 'Test League',
        teams: { team: [null, null, undefined] },
      },
    };

    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).toBeNull();
  });

  // ── is_finished metadata ─────────────────────────────────────────────────

  it('does not affect the returned teams array based on is_finished value', () => {
    const team: StandingsTeam = buildTeam();

    const contentFinished: LeagueStandingsContent = buildFantasyContent(team, {
      is_finished: '1',
    });
    const contentInProgress: LeagueStandingsContent = buildFantasyContent(team, {
      is_finished: '0',
    });

    const resultFinished: StandingsTeam[] | null =
      extractStandingsFromLeagueContent(contentFinished);
    const resultInProgress: StandingsTeam[] | null =
      extractStandingsFromLeagueContent(contentInProgress);

    expect(resultFinished).not.toBeNull();
    expect(resultFinished!.length).toBe(1);
    expect(resultInProgress).not.toBeNull();
    expect(resultInProgress!.length).toBe(1);
  });

  // ── Playoff seed (optional field) ────────────────────────────────────────

  it('handles teams where playoff_seed is absent', () => {
    const team: StandingsTeam = buildTeam();
    // Remove the optional playoff_seed field
    delete team.team_standings.playoff_seed;

    const content: LeagueStandingsContent = buildFantasyContent(team);
    const result: StandingsTeam[] | null = extractStandingsFromLeagueContent(content);

    expect(result).not.toBeNull();
    expect(result![0].team_standings.playoff_seed).toBeUndefined();
  });
});
