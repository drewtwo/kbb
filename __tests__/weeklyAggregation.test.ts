/**
 * Unit tests for the multi-week stat aggregation utilities in utils/yahooData.ts
 *
 * These tests verify that:
 *  - aggregateWeeklyStats correctly sums numeric stats across all weeks
 *  - aggregateWeeklyStats handles the "60" (IP) stat_id "X/Y" format
 *  - aggregateWeeklyStats skips error responses without crashing
 *  - aggregateWeeklyStats skips malformed week entries without crashing
 *  - aggregateWeeklyStats returns null when no valid weeks are found
 *  - aggregateWeeklyStats returns null for empty input
 *  - SEASON_START_WEEK and SEASON_END_WEEK default to 1 and 15 respectively
 */

import {
  aggregateWeeklyStats,
  SEASON_START_WEEK,
  SEASON_END_WEEK,
} from '../utils/yahooData';
import type { AggregatedTeamStats } from '../utils/yahooData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a minimal fantasy_content object that extractStatsFromWeekContent
 * can parse, containing the provided stat entries.
 */
function buildWeekContent(
  stats: Array<{ stat_id: string; value: string }>
): unknown {
  return {
    team: {
      team_stats: {
        stats: {
          stat: stats.length === 1 ? stats[0] : stats,
        },
      },
    },
  };
}

// ─── aggregateWeeklyStats ─────────────────────────────────────────────────────

describe('aggregateWeeklyStats', () => {
  const TEAM_KEY: string = '411.l.12345.t.1';
  const TEAM_NAME: string = 'Test Team';

  it('returns null for an empty array', () => {
    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [],
      TEAM_KEY,
      TEAM_NAME
    );
    expect(result).toBeNull();
  });

  it('returns null when all weeks are error responses', () => {
    const errorWeeks: unknown[] = [
      { error: 'HTTP Error: 404', statusCode: 404 },
      { error: 'HTTP Error: 500', statusCode: 500 },
    ];
    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      errorWeeks,
      TEAM_KEY,
      TEAM_NAME
    );
    expect(result).toBeNull();
  });

  it('returns null when all weeks have malformed content', () => {
    const malformedWeeks: unknown[] = [null, undefined, {}, { team: null }];
    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      malformedWeeks,
      TEAM_KEY,
      TEAM_NAME
    );
    expect(result).toBeNull();
  });

  it('sums stats correctly across a single week', () => {
    const week1: unknown = buildWeekContent([
      { stat_id: '7', value: '10' },
      { stat_id: '12', value: '3' },
    ]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    expect(result!.stats['7']).toBe(10);
    expect(result!.stats['12']).toBe(3);
    expect(result!.weeks_counted).toBe(1);
    expect(result!.team_key).toBe(TEAM_KEY);
    expect(result!.team_name).toBe(TEAM_NAME);
  });

  it('sums stats correctly across multiple weeks', () => {
    const week1: unknown = buildWeekContent([
      { stat_id: '7', value: '10' },
      { stat_id: '12', value: '3' },
    ]);
    const week2: unknown = buildWeekContent([
      { stat_id: '7', value: '5' },
      { stat_id: '12', value: '7' },
    ]);
    const week3: unknown = buildWeekContent([
      { stat_id: '7', value: '8' },
      { stat_id: '12', value: '2' },
    ]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1, week2, week3],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // 10 + 5 + 8 = 23
    expect(result!.stats['7']).toBe(23);
    // 3 + 7 + 2 = 12
    expect(result!.stats['12']).toBe(12);
    expect(result!.weeks_counted).toBe(3);
  });

  it('handles 15 weeks of data correctly', () => {
    const weeks: unknown[] = Array.from({ length: 15 }, (_, i: number) =>
      buildWeekContent([
        { stat_id: '7', value: String(i + 1) },
      ])
    );

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      weeks,
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // Sum of 1..15 = 120
    expect(result!.stats['7']).toBe(120);
    expect(result!.weeks_counted).toBe(15);
  });

  it('handles stat_id "60" (IP) with "X/Y" format by using the numerator', () => {
    const week1: unknown = buildWeekContent([
      { stat_id: '60', value: '45/3' },
    ]);
    const week2: unknown = buildWeekContent([
      { stat_id: '60', value: '30/1' },
    ]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1, week2],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // 45 + 30 = 75
    expect(result!.stats['60']).toBe(75);
  });

  it('skips error-response weeks and still aggregates valid weeks', () => {
    const validWeek: unknown = buildWeekContent([
      { stat_id: '7', value: '10' },
    ]);
    const errorWeek: unknown = { error: 'HTTP Error: 503', statusCode: 503 };

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [validWeek, errorWeek, validWeek],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // 10 + 10 = 20 (error week skipped)
    expect(result!.stats['7']).toBe(20);
    expect(result!.weeks_counted).toBe(2);
  });

  it('skips malformed weeks and still aggregates valid weeks', () => {
    const validWeek: unknown = buildWeekContent([
      { stat_id: '7', value: '5' },
    ]);
    const malformedWeek: unknown = { team: { team_stats: null } };

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [validWeek, malformedWeek, validWeek],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // 5 + 5 = 10 (malformed week skipped)
    expect(result!.stats['7']).toBe(10);
    expect(result!.weeks_counted).toBe(2);
  });

  it('treats non-numeric stat values as 0 and does not include them', () => {
    const week1: unknown = buildWeekContent([
      { stat_id: '7', value: 'N/A' },
      { stat_id: '12', value: '5' },
    ]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    // 'N/A' is NaN — should not be added
    expect(result!.stats['7']).toBeUndefined();
    expect(result!.stats['12']).toBe(5);
    expect(result!.weeks_counted).toBe(1);
  });

  it('handles a single-stat week (xml2js non-array form)', () => {
    // xml2js with explicitArray:false returns a plain object (not array) for
    // a single stat — buildWeekContent already handles this for length === 1
    const week1: unknown = buildWeekContent([{ stat_id: '7', value: '42' }]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    expect(result!.stats['7']).toBe(42);
    expect(result!.weeks_counted).toBe(1);
  });

  it('accumulates stats that appear in some weeks but not others', () => {
    const week1: unknown = buildWeekContent([
      { stat_id: '7', value: '10' },
    ]);
    const week2: unknown = buildWeekContent([
      { stat_id: '7', value: '5' },
      { stat_id: '99', value: '3' },
    ]);

    const result: AggregatedTeamStats | null = aggregateWeeklyStats(
      [week1, week2],
      TEAM_KEY,
      TEAM_NAME
    );

    expect(result).not.toBeNull();
    expect(result!.stats['7']).toBe(15);
    // stat 99 only appeared in week 2
    expect(result!.stats['99']).toBe(3);
    expect(result!.weeks_counted).toBe(2);
  });
});

// ─── Season week-range constants ──────────────────────────────────────────────

describe('SEASON_START_WEEK and SEASON_END_WEEK', () => {
  it('SEASON_START_WEEK is a positive integer', () => {
    expect(typeof SEASON_START_WEEK).toBe('number');
    expect(Number.isInteger(SEASON_START_WEEK)).toBe(true);
    expect(SEASON_START_WEEK).toBeGreaterThan(0);
  });

  it('SEASON_END_WEEK is a positive integer >= SEASON_START_WEEK', () => {
    expect(typeof SEASON_END_WEEK).toBe('number');
    expect(Number.isInteger(SEASON_END_WEEK)).toBe(true);
    expect(SEASON_END_WEEK).toBeGreaterThanOrEqual(SEASON_START_WEEK);
  });

  it('defaults to week 1 for SEASON_START_WEEK when env var is not set', () => {
    // When NEXT_PUBLIC_SEASON_START_WEEK is not set, the default should be 1
    if (!process.env.NEXT_PUBLIC_SEASON_START_WEEK) {
      expect(SEASON_START_WEEK).toBe(1);
    }
  });

  it('defaults to week 15 for SEASON_END_WEEK when env var is not set', () => {
    // When NEXT_PUBLIC_SEASON_END_WEEK is not set, the default should be 15
    if (!process.env.NEXT_PUBLIC_SEASON_END_WEEK) {
      expect(SEASON_END_WEEK).toBe(15);
    }
  });
});
