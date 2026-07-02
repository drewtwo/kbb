# League Stats Multi-Week Aggregation

This document explains how the multi-week stat aggregation feature works, how
the data flows through the application, and how to configure the week range for
different seasons.

---

## Overview

Yahoo Fantasy Baseball stats are returned on a **per-week** basis by the Yahoo
Fantasy Sports API.  To display meaningful season-level statistics for each
team in a league, the application must:

1. Fetch stats for **every week** in the season for **every team**.
2. **Sum** (aggregate) each stat across all weeks.
3. Return the aggregated totals to the front-end for display.

Prior to this fix, the `/api/leagueinfo/[id]` endpoint only returned team
metadata and league settings — it did not fetch or aggregate any weekly stats.
As a result, the league stats view showed no per-team season totals.

---

## Architecture

```
Browser
  └─ GET /api/leagueinfo/[id]
        ├─ getLeagueTeams()         → list of teams in the league
        ├─ getLeagueSettings()      → stat categories / league config
        └─ getLeagueAggregatedStats()
              ├─ extractTeamsFromLeagueContent()   → team list
              └─ for each team:
                    for each week (SEASON_START_WEEK … SEASON_END_WEEK):
                        getWeekStats(team_key, week)   → raw fantasy_content
                    aggregateWeeklyStats(weeklyStats, team_key, team_name)
                        → AggregatedTeamStats { stats: Record<stat_id, number> }
```

The aggregated result is included in the API response as `aggregated_stats`:

```json
{
  "teams": { ... },
  "settings": { ... },
  "aggregated_stats": {
    "teams": {
      "411.l.12345.t.1": {
        "team_key": "411.l.12345.t.1",
        "team_name": "My Team",
        "stats": {
          "7":  120,
          "12": 45,
          "60": 210
        },
        "weeks_counted": 15
      }
    },
    "week_range": { "start": 1, "end": 15 }
  }
}
```

---

## Key Functions

### `aggregateWeeklyStats(weeklyStats, teamKey, teamName)`

**File:** `utils/yahooData.ts`

Sums the stats from an array of raw `fantasy_content` week objects for a
single team.

- Each week's stats are extracted via `extractStatsFromWeekContent()`.
- Numeric values are summed per `stat_id`.
- **Stat ID `60` (Innings Pitched):** Yahoo returns this as `"X/Y"` (e.g.
  `"45/3"`).  Only the numerator (`X`) is used to avoid fractional
  accumulation errors.
- Error responses (from failed week fetches) and malformed week entries are
  **skipped** rather than causing the whole aggregation to fail.
- Returns `null` if no valid weeks were found.

### `getLeagueAggregatedStats(req, leagueTeamsContent, startWeek?, endWeek?)`

**File:** `utils/yahooData.ts`

Orchestrates the full aggregation for all teams in a league:

1. Extracts the team list from `leagueTeamsContent`.
2. For each team, fetches all weeks in `[startWeek, endWeek]` **in parallel**
   using `Promise.all`.
3. Calls `aggregateWeeklyStats` for each team.
4. Returns a `LeagueAggregatedStats` object.

### `/api/leagueinfo/[id]` endpoint

**File:** `pages/api/leagueinfo/[id].ts`

Extended to call `getLeagueAggregatedStats` and include the result in the
response JSON under the `aggregated_stats` key.  If aggregation fails (e.g.
due to a Yahoo API error), the endpoint still returns `teams` and `settings`
so the rest of the page can render — the `aggregated_stats` key is simply
omitted.

---

## Configuring the Week Range

The week range is controlled by two environment variables:

| Variable                        | Default | Description                                      |
|---------------------------------|---------|--------------------------------------------------|
| `NEXT_PUBLIC_SEASON_START_WEEK` | `1`     | First week to include in aggregation (inclusive) |
| `NEXT_PUBLIC_SEASON_END_WEEK`   | `15`    | Last week to include in aggregation (inclusive)  |

Set these in your `.env.local` (development) or in your hosting provider's
environment configuration (production):

```dotenv
# .env.local
NEXT_PUBLIC_SEASON_START_WEEK=1
NEXT_PUBLIC_SEASON_END_WEEK=15
```

The values are parsed at **module load time** in `utils/yahooData.ts` and
exported as `SEASON_START_WEEK` and `SEASON_END_WEEK`.  Invalid or missing
values fall back to the defaults.

### Changing the season length

If your league runs for a different number of weeks (e.g. 20 weeks), simply
update `NEXT_PUBLIC_SEASON_END_WEEK`:

```dotenv
NEXT_PUBLIC_SEASON_END_WEEK=20
```

You can also pass `startWeek` and `endWeek` directly to
`getLeagueAggregatedStats` if you need programmatic control:

```typescript
const stats = await getLeagueAggregatedStats(req, leagueTeamsContent, 3, 12);
```

---

## Performance Considerations

- **Parallel fetching per team:** All week requests for a single team are
  issued in parallel via `Promise.all`, reducing latency significantly
  compared to sequential fetching.
- **Sequential across teams:** Teams are processed sequentially to avoid
  overwhelming the Yahoo API with too many simultaneous connections.
- **Graceful degradation:** A failed week or team does not abort the entire
  aggregation — it is skipped and logged.

For a league with 10 teams and 15 weeks, the endpoint issues up to
`10 × 15 = 150` requests to the Yahoo API (15 in parallel per team).
If Yahoo rate-limits the application, consider reducing the parallelism or
adding a caching layer.

---

## Testing

Unit tests for the aggregation logic live in:

```
__tests__/weeklyAggregation.test.ts
```

They cover:

- Correct summation across 1, 3, and 15 weeks
- Handling of the `stat_id "60"` IP format
- Skipping of error responses and malformed week entries
- Accumulation of stats that appear in only some weeks
- Default values for `SEASON_START_WEEK` and `SEASON_END_WEEK`

Run the tests with:

```bash
yarn test
```

---

## Data Types

The following TypeScript types are exported from `utils/yahooData.ts`:

```typescript
/** Aggregated stats for a single team across all weeks. */
interface AggregatedTeamStats {
  team_key: string;
  team_name: string;
  stats: Record<string, number>; // keyed by stat_id
  weeks_counted: number;
}

/** Aggregated stats for all teams in a league. */
interface LeagueAggregatedStats {
  teams: Record<string, AggregatedTeamStats>; // keyed by team_key
  week_range: {
    start: number;
    end: number;
  };
}
```
