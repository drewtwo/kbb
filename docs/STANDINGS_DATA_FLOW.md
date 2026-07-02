# Standings Data Flow

This document explains how league standings data travels from the Yahoo Fantasy
Sports API through the Next.js back-end and into the browser, and provides a
troubleshooting guide for the most common failure modes.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Key Files](#key-files)
4. [Step-by-Step Flow](#step-by-step-flow)
5. [Logging Reference](#logging-reference)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Type Reference](#type-reference)

---

## Overview

League standings are fetched server-side via the Yahoo Fantasy Sports REST API
(`/fantasy/v2/league/{league_key}/standings`), parsed from XML into JSON, and
then surfaced to the browser through the `/api/leagueinfo/[id]` Next.js API
route. The React page at `/game/[gameid]` consumes the API response and renders
the data using the `StandingsTable` component.

---

## Data Flow Diagram

```
Browser (SWR)
    │
    │  GET /api/leagueinfo/{league_key}
    ▼
pages/api/leagueinfo/[id].ts          ← orchestrates all league data fetching
    │
    ├─ getLeagueTeams()   ─────────────► Yahoo API /league/{key}/teams
    ├─ getLeagueSettings() ────────────► Yahoo API /league/{key}/settings
    └─ getLeagueStandings() ───────────► Yahoo API /league/{key}/standings
                                              │
                                              │  gzip → XML → JSON (xml2js)
                                              ▼
                                    fantasy_content.league.teams.team[]
                                              │
                                              ▼
                              extractStandingsFromLeagueContent()
                              (utils/yahooData.ts)
                                              │
                                              ▼
                                    StandingsTeam[]  (sorted by rank)
                                              │
    ◄─────────────────────────────────────────┘
    JSON response: { standings: StandingsTeam[], is_finished: boolean, … }
    │
    ▼
pages/game/[gameid]/index.tsx
    │  isValidStandingsArray() — defensive validation
    ▼
components/standings-table.tsx        ← renders the table (or empty-state msg)
```

---

## Key Files

| File | Role |
|------|------|
| `utils/yahooData.ts` | `getLeagueStandings()` fetches raw XML; `extractStandingsFromLeagueContent()` parses it |
| `pages/api/leagueinfo/[id].ts` | API route — orchestrates fetch + extraction, returns JSON |
| `pages/game/[gameid]/index.tsx` | React page — consumes API, validates data, renders table |
| `components/standings-table.tsx` | Presentational component — renders table or empty-state |
| `components/standings.module.css` | CSS module for the table and empty-state styles |

---

## Step-by-Step Flow

### 1. `getLeagueStandings()` — `utils/yahooData.ts`

- Validates the NextAuth JWT token.
- Makes an HTTPS GET request to:
  ```
  https://fantasysports.yahooapis.com/fantasy/v2/league/{league_key}/standings
  ```
- Decompresses the gzip response.
- Parses the XML with `xml2js` (`explicitArray: false`).
- Resolves with `fantasy_content` (the root object) or an `ErrorResponse`.

> **Important:** `xml2js` with `explicitArray: false` returns a **plain object**
> (not an array) when there is only one `<team>` element. The extraction
> function handles this by wrapping single objects in an array.

### 2. `extractStandingsFromLeagueContent()` — `utils/yahooData.ts`

Walks the parsed JSON tree:

```
fantasy_content
  └─ league
       └─ teams
            └─ team   ← object (1 team) OR array (multiple teams)
```

Returns `StandingsTeam[] | null`. Returns `null` at the first missing level and
logs a descriptive `console.error` message identifying exactly which property
was absent.

Also filters out any non-object entries that may appear in the team array due to
malformed API responses, and logs a `console.warn` for teams that are present
but missing the `team_standings` sub-object.

### 3. API Route — `pages/api/leagueinfo/[id].ts`

- Calls `getLeagueStandings()` and `extractStandingsFromLeagueContent()`.
- Standings failure is **non-fatal** — the route still responds with teams and
  settings even if standings extraction fails.
- Logs the full extraction result (team count, per-team rank/wins summary) at
  the `[leagueinfo API]` log prefix.
- Includes `standings` and `is_finished` in the JSON response only when they
  are successfully extracted.

### 4. React Page — `pages/game/[gameid]/index.tsx`

- Fetches `/api/leagueinfo/{gameId}` via SWR.
- Runs `isValidStandingsArray()` to defensively validate the received standings
  before passing them to `StandingsTable`.
- Logs a `console.warn` if standings were received but failed validation.
- Renders `<StandingsTable>` when standings are valid, or a fallback `<p>` when
  they are absent.

### 5. `StandingsTable` — `components/standings-table.tsx`

- Renders a winner banner when `isFinished === true` and a rank-1 team exists.
- Renders an empty-state diagnostic message (styled amber box) when the
  `standings` array is empty.
- Uses `??` fallbacks for every standings field so a missing `team_standings`
  object never causes a runtime crash — all cells display `"-"` instead.

---

## Logging Reference

All log messages are prefixed so they can be filtered easily in server logs or
the browser console.

| Prefix | Location | Level |
|--------|----------|-------|
| `[yahooData] extractStandingsFromLeagueContent:` | `utils/yahooData.ts` | `log` / `error` / `warn` |
| `[leagueinfo API]` | `pages/api/leagueinfo/[id].ts` | `log` / `warn` / `error` |
| `[GamePage]` | `pages/game/[gameid]/index.tsx` | `log` / `warn` |
| `[StandingsTable]` | `components/standings-table.tsx` | `warn` |

### Useful log messages to look for

```
[yahooData] extractStandingsFromLeagueContent: called
[yahooData] extractStandingsFromLeagueContent: fantasyContent top-level keys: [...]
[yahooData] extractStandingsFromLeagueContent: found N team(s) (isArray=true/false)
[yahooData] extractStandingsFromLeagueContent: returning N valid team(s)

[leagueinfo API] league_standings fetched successfully, type: object | keys: [...]
[leagueinfo API] extractStandingsFromLeagueContent succeeded: N team(s)
[leagueinfo API] standings[0]: team_id=1 name="..." rank=1 wins=10

[GamePage] Rendering standings table with N team(s), isFinished=false
[GamePage] standings data received from API but failed validation — falling back to "no standings" message.
```

---

## Troubleshooting Guide

### Problem: "No standings data available." shown on the league page

Work through the following checks in order:

#### 1. Check the API response in the browser

Open DevTools → Network → find the `/api/leagueinfo/{id}` request.

- **`standings` key is absent from the JSON response** → the extraction failed
  server-side. Check server logs for `[leagueinfo API]` and
  `[yahooData] extractStandingsFromLeagueContent` messages.
- **`standings` key is present but empty array** → the API returned teams but
  they were all filtered out. Check for `[yahooData] extractStandingsFromLeagueContent`
  warn messages about invalid team entries.
- **`standings` key is present with data** → the page-level validation
  (`isValidStandingsArray`) rejected it. Check the browser console for
  `[GamePage] standings data received from API but failed validation`.

#### 2. Check server logs for extraction errors

Look for any of these messages:

```
[yahooData] extractStandingsFromLeagueContent: league property is missing from fantasy_content.
[yahooData] extractStandingsFromLeagueContent: league.teams is missing.
[yahooData] extractStandingsFromLeagueContent: league.teams.team is missing.
```

Each message includes the keys that *were* present, which helps identify where
the Yahoo API response structure differs from what is expected.

#### 3. Check for Yahoo API errors

```
[yahooData] getLeagueStandings HTTP Error: 401 - Unauthorized
[yahooData] getLeagueStandings HTTP Error: 404 - Not Found
[leagueinfo API] getLeagueStandings returned error (non-fatal): ...
```

- **401** — The OAuth access token has expired. The user needs to re-authenticate.
- **404** — The league key is incorrect or the league does not exist.
- **503 / 5xx** — Transient Yahoo API error. Retry after a short delay.

#### 4. Check for XML / decompression errors

```
[yahooData] getLeagueStandings Decompression error: ...
[yahooData] getLeagueStandings XML parsing error: ...
```

These indicate that the Yahoo API returned a non-gzip or non-XML response
(e.g. an HTML error page). Check the raw response body.

#### 5. Verify the league key format

The league key must be in the format `{game_id}.l.{league_id}`, for example
`411.l.12345`. A bare numeric game ID will not return standings.

---

## Type Reference

```typescript
// A single team's win/loss record and scoring totals
interface StandingsTeamRecord {
  rank: string;                  // "1" = first place
  outcome_totals: {
    wins: string;
    losses: string;
    ties: string;
    percentage: string;          // e.g. ".667"
  };
  points_for: string;            // total fantasy points scored
  points_against: string;        // total fantasy points scored against
  playoff_seed?: string;         // absent during in-progress seasons
}

// A single team entry in the standings response
interface StandingsTeam {
  team_key: string;              // e.g. "411.l.12345.t.1"
  team_id: string;               // e.g. "1"
  name: string;                  // e.g. "The Mighty Ducks"
  team_standings: StandingsTeamRecord;
}

// The shape of fantasy_content returned by /standings
interface LeagueStandingsContent {
  league?: {
    league_key?: string;
    league_id?: string;
    name?: string;
    is_finished?: string;        // "1" = finished, "0" or absent = in progress
    teams?: {
      team?: StandingsTeam | StandingsTeam[];  // single object when only 1 team
    };
  };
}
```
