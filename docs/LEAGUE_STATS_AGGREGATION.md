# League Standings — Direct API Approach

This document explains how league standings are fetched and surfaced through
the application, and describes the migration away from the previous multi-week
stat aggregation approach.

---

## Overview

League standings are fetched directly from the Yahoo Fantasy Sports
**`/standings`** endpoint in a single API call. The response includes each
team's win/loss/tie record, points for/against, and overall rank — everything
needed to display a standings table without any additional aggregation.

---

## Architecture

```
Browser
  └─ GET /api/leagueinfo/[id]
        ├─ getLeagueTeams()      → list of teams in the league
        ├─ getLeagueSettings()   → stat categories / league config
        └─ getLeagueStandings()  → StandingsTeam[] (rank, W/L/T, PF, PA)
              └─ extractStandingsFromLeagueContent()  (called internally)
```

`getLeagueStandings` calls `extractStandingsFromLeagueContent` internally and
returns a ready-to-use `StandingsTeam[]` (or an `ErrorResponse` on failure).
The `/api/leagueinfo/[id]` endpoint includes the array in the response JSON
under the `standings` key.

---

## API Response Shape

```json
{
  "teams": { ... },
  "settings": { ... },
  "standings": [
    {
      "team_key": "411.l.12345.t.1",
      "team_id": "1",
      "name": "My Team",
      "team_standings": {
        "rank": "1",
        "outcome_totals": {
          "wins": "10",
          "losses": "4",
          "ties": "0",
          "percentage": ".714"
        },
        "points_for": "850.5",
        "points_against": "720.0"
      }
    }
  ]
}
```

---

## Key Functions

### `getLeagueStandings(req, league_key)`

**File:** `utils/yahooData.ts`

Fetches `/fantasy/v2/league/{league_key}/standings`, decompresses and parses
the XML response, then calls `extractStandingsFromLeagueContent` internally.

- Returns `StandingsTeam[]` on success.
- Returns an `ErrorResponse` on any HTTP, network, token, or parse failure.

### `extractStandingsFromLeagueContent(fantasyContent)`

**File:** `utils/yahooData.ts`

Safely extracts the standings teams array from the raw `fantasy_content`
object. Handles the xml2js `explicitArray: false` quirk (single-team leagues
return an object instead of an array). Teams missing `team_standings` are
included with a warning so standings columns can show `"-"`.

### `/api/leagueinfo/[id]` endpoint

**File:** `pages/api/leagueinfo/[id].ts`

Fetches teams, settings, and standings in parallel. Standings are non-fatal —
if `getLeagueStandings` returns an error the endpoint still responds with
`teams` and `settings` so the rest of the page can render.

---

## Data Types

```typescript
/** Win/loss/tie record and scoring totals for a single team. */
interface StandingsTeamRecord {
  rank: string;
  outcome_totals: {
    wins: string;
    losses: string;
    ties: string;
    percentage: string;
  };
  points_for: string;
  points_against: string;
  playoff_seed?: string;
}

/** A single team entry in the standings response. */
interface StandingsTeam {
  team_key: string;
  team_id: string;
  name: string;
  team_standings: StandingsTeamRecord;
}
```

---

## Migration from Multi-Week Aggregation

Prior to this change the application used a `getLeagueAggregatedStats` function
that issued up to `teams × weeks` requests to the Yahoo API (e.g. 150 requests
for 10 teams × 15 weeks) and summed each stat manually. This approach was
replaced with a single `/standings` call because:

- The `/standings` endpoint already contains the authoritative rank, W/L/T
  record, and points totals — no aggregation is needed.
- A single request is dramatically faster and less likely to hit Yahoo rate
  limits.
- The response structure is simpler and easier to maintain.

### Removed items

| Item | File | Status |
|------|------|--------|
| `getLeagueAggregatedStats` | `utils/yahooData.ts` | Deprecated (kept for backwards compatibility) |
| `aggregateWeeklyStats` | `utils/yahooData.ts` | Retained (used by `getWeeklyStats`) |
| `SEASON_START_WEEK` | `utils/yahooData.ts` | Deprecated (kept for backwards compatibility) |
| `SEASON_END_WEEK` | `utils/yahooData.ts` | Deprecated (kept for backwards compatibility) |
| `aggregated_stats` response key | `pages/api/leagueinfo/[id].ts` | Removed |
| `NEXT_PUBLIC_SEASON_START_WEEK` env var | `.env.example` | Removed |
| `NEXT_PUBLIC_SEASON_END_WEEK` env var | `.env.example` | Removed |

If you have `NEXT_PUBLIC_SEASON_START_WEEK` or `NEXT_PUBLIC_SEASON_END_WEEK`
set in your `.env.local` or hosting environment, they can safely be removed.
