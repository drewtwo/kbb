# Standings Data Debug Guide

This guide explains how to collect, interpret, and share diagnostic logs when standings data fails to load in the KBB application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Enabling Diagnostic Logging](#enabling-diagnostic-logging)
3. [Collecting Logs](#collecting-logs)
4. [Interpreting Diagnostic Output](#interpreting-diagnostic-output)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Sharing Diagnostic Information](#sharing-diagnostic-information)

---

## Quick Start

If standings data is not loading:

1. **Enable diagnostic logging** by setting `NEXT_PUBLIC_DEBUG_STANDINGS=true` in your `.env.local` file
2. **Restart the development server** (`yarn dev`)
3. **Reproduce the issue** by navigating to a league page
4. **Check the browser console** (F12 → Console tab) and **server logs** for diagnostic output
5. **Collect the logs** and share them with the development team

---

## Enabling Diagnostic Logging

### For Local Development

1. Create or edit `.env.local` in the project root:

```bash
# Add this line to enable diagnostic logging
NEXT_PUBLIC_DEBUG_STANDINGS=true
```

2. Restart the development server:

```bash
yarn dev
```

3. The application will now output detailed diagnostic information to:
   - **Browser console** (client-side logs)
   - **Terminal/server logs** (server-side logs)

### For Production/Staging

To enable diagnostic logging in a deployed environment:

1. Set the environment variable `NEXT_PUBLIC_DEBUG_STANDINGS=true` in your deployment platform:
   - **Vercel**: Project Settings → Environment Variables
   - **Other platforms**: Follow your platform's documentation

2. Redeploy the application

3. Collect logs from your platform's logging service

---

## Collecting Logs

### Browser Console Logs (Client-Side)

1. Open the browser's Developer Tools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Safari**: Enable Developer Menu first, then press `Cmd+Option+I`

2. Navigate to the **Console** tab

3. Reproduce the issue by navigating to a league page

4. Look for messages starting with:
   - `[DIAG:game-page]` - Client-side validation logs
   - `[GamePage]` - General game page logs

5. **Copy all relevant logs** to a text file or screenshot

### Server Logs (Server-Side)

1. **For local development**: Check the terminal where you ran `yarn dev`

2. **For deployed environments**: Access your platform's logging service:
   - **Vercel**: Deployments → Logs
   - **Other platforms**: Follow your platform's documentation

3. Look for messages starting with:
   - `[DIAG:yahooData]` - Yahoo API data extraction logs
   - `[DIAG:leagueinfo-api]` - League info API endpoint logs
   - `[yahooData]` - General Yahoo data logs
   - `[leagueinfo API]` - General league info API logs

4. **Copy all relevant logs** to a text file

### Complete Log Collection Checklist

When collecting logs, ensure you have:

- [ ] **Browser console output** (full console from page load to error)
- [ ] **Server logs** (full server output from request start to completion)
- [ ] **Network tab** (optional but helpful):
  - Open DevTools → Network tab
  - Reload the page
  - Look for the `/api/leagueinfo/{id}` request
  - Check the Response tab for any error messages
- [ ] **League ID** that was being accessed when the issue occurred
- [ ] **Timestamp** of when the issue occurred
- [ ] **Browser and OS** information

---

## Interpreting Diagnostic Output

### Log Message Prefixes

Diagnostic logs use standardized prefixes to indicate their source:

| Prefix | Source | Description |
|--------|--------|-------------|
| `[DIAG:yahooData]` | `utils/yahooData.ts` | Yahoo API data extraction |
| `[DIAG:leagueinfo-api]` | `pages/api/leagueinfo/[id].ts` | League info API endpoint |
| `[DIAG:game-page]` | `pages/game/[gameid]/index.tsx` | Client-side game page |
| `[yahooData]` | `utils/yahooData.ts` | General Yahoo data logs |
| `[leagueinfo API]` | `pages/api/leagueinfo/[id].ts` | General API logs |
| `[GamePage]` | `pages/game/[gameid]/index.tsx` | General game page logs |

### Key Diagnostic Information

#### 1. HTTP Response Logs

```
[DIAG:getLeagueStandings] HTTP Response: status=200 OK {
  'content-type': 'application/xml',
  'content-encoding': 'gzip',
  'x-rate-limit-remaining': '4999',
  'x-rate-limit-reset': '1234567890'
}
```

**What to look for:**
- `status=200` indicates a successful HTTP request
- `status=401` indicates authentication failure
- `status=429` indicates rate limiting
- `x-rate-limit-remaining` shows remaining API calls

#### 2. Structure Validation Logs

```
[DIAG:extractStandingsFromLeagueContent] fantasyContent structure {
  topLevelKeys: ['league'],
  structure: 'Object{3 keys}\n  .league_key: String\n  .name: String\n  .teams: Object{1 keys}'
}
```

**What to look for:**
- Expected keys: `league`, `teams`, `team`
- If keys are missing, the API response structure has changed

#### 3. Validation Failure Logs

```
[DIAG:extractStandingsFromLeagueContent] Validation failed at: league.teams.team property check {
  reason: 'league.teams.team is missing',
  context: { teamsContainerKeys: ['count'] }
}
```

**What to look for:**
- The exact validation step that failed
- The reason for the failure
- Context information showing what was present instead

#### 4. Team Count Logs

```
[DIAG:extractStandingsFromLeagueContent] Found 12 team(s) {
  isArray: true,
  teamCount: 12
}
```

**What to look for:**
- Confirms the number of teams extracted
- `isArray: true` means multiple teams; `false` means single team

### Sample Complete Log Sequence

Here's what a successful standings load looks like:

```
[leagueinfo API] Fetching data for league id: "411.l.12345"
[leagueinfo API] Starting parallel fetch: teams, settings, standings
[leagueinfo API] league_teams fetched successfully, type: object
[leagueinfo API] league_settings fetched successfully, type: object
[leagueinfo API] league_standings fetched successfully, type: object | isNull: false | keys: league
[DIAG:leagueinfo-api] league_standings fetched successfully {
  type: 'object',
  isNull: false,
  structure: 'Object{1 keys}\n  .league: Object{5 keys}'
}
[yahooData] extractStandingsFromLeagueContent: called
[DIAG:extractStandingsFromLeagueContent] Function called
[DIAG:extractStandingsFromLeagueContent] fantasyContent structure {
  topLevelKeys: ['league'],
  structure: 'Object{1 keys}\n  .league: Object{5 keys}'
}
[DIAG:extractStandingsFromLeagueContent] league object found {
  keys: ['league_key', 'league_id', 'name', 'is_finished', 'teams'],
  league_key: '411.l.12345',
  name: 'My League',
  is_finished: '0'
}
[DIAG:extractStandingsFromLeagueContent] teamsContainer found { keys: ['team'] }
[DIAG:extractStandingsFromLeagueContent] Found 12 team(s) { isArray: true, teamCount: 12 }
[DIAG:extractStandingsFromLeagueContent] Returning 12 valid team(s) { validTeams: 12, totalTeams: 12 }
[leagueinfo API] extractStandingsFromLeagueContent succeeded: 12 team(s)
[leagueinfo API] Sending response — standings present: true | standings count: 12 | aggregated_stats present: true | is_finished: false
[GamePage] Rendering standings table with 12 team(s), isFinished=false
```

---

## Common Issues and Solutions

### Issue 1: "league property is missing from fantasy_content"

**Symptom:**
```
[DIAG:extractStandingsFromLeagueContent] Validation failed at: league property check {
  reason: 'league property is missing from fantasy_content',
  context: { availableKeys: ['error'] }
}
```

**Possible Causes:**
1. **API returned an error** - Check if `availableKeys` contains `error`
2. **Authentication failure** - Token may be expired or invalid
3. **Invalid league ID** - The league ID may not exist or be inaccessible

**Solutions:**
1. Check the `error` field in the response
2. Try logging out and back in to refresh the authentication token
3. Verify the league ID is correct
4. Check if the Yahoo Fantasy API is experiencing issues

### Issue 2: "league.teams is missing"

**Symptom:**
```
[DIAG:extractStandingsFromLeagueContent] Validation failed at: league.teams property check {
  reason: 'league.teams is missing',
  context: { leagueKeys: ['league_key', 'league_id', 'name'] }
}
```

**Possible Causes:**
1. **League has no teams** - Unusual but possible in edge cases
2. **API response structure changed** - Yahoo may have updated their API
3. **Partial response** - The API may have returned incomplete data

**Solutions:**
1. Verify the league has teams in Yahoo Fantasy
2. Check if Yahoo has announced API changes
3. Try again later (may be a temporary API issue)
4. Contact support with the full diagnostic logs

### Issue 3: "league.teams.team is missing"

**Symptom:**
```
[DIAG:extractStandingsFromLeagueContent] Validation failed at: league.teams.team property check {
  reason: 'league.teams.team is missing',
  context: { teamsContainerKeys: ['count'] }
}
```

**Possible Causes:**
1. **API response structure changed** - Yahoo may have updated their API format
2. **XML parsing issue** - The response may not have been parsed correctly
3. **Empty teams container** - The teams container exists but has no team data

**Solutions:**
1. Check the full diagnostic dump for the actual response structure
2. Verify the XML parsing is working correctly
3. Contact support with the full diagnostic logs

### Issue 4: HTTP Error 401 (Unauthorized)

**Symptom:**
```
[DIAG:getLeagueStandings] HTTP Error: 401 {
  statusMessage: 'Unauthorized',
  headers: { ... }
}
```

**Possible Causes:**
1. **Expired authentication token** - OAuth token has expired
2. **Invalid credentials** - OAuth credentials are incorrect
3. **Token revoked** - User revoked access in Yahoo account settings

**Solutions:**
1. Log out and log back in to refresh the token
2. Check Yahoo account settings to ensure the app has permission
3. Re-authorize the application

### Issue 5: HTTP Error 429 (Rate Limited)

**Symptom:**
```
[DIAG:getLeagueStandings] HTTP Response: status=429 Too Many Requests {
  'x-rate-limit-remaining': '0',
  'x-rate-limit-reset': '1234567890'
}
```

**Possible Causes:**
1. **Too many API requests** - The application has exceeded Yahoo's rate limit
2. **Multiple users/sessions** - Multiple users accessing the app simultaneously

**Solutions:**
1. Wait for the rate limit to reset (check `x-rate-limit-reset` header)
2. Reduce the frequency of API requests
3. Implement request caching

---

## Sharing Diagnostic Information

When reporting a standings data issue, include:

### 1. **Diagnostic Logs**

Provide the complete log output from both:
- Browser console (client-side)
- Server logs (server-side)

**Format:** Copy-paste the logs into a text file or code block

### 2. **League Information**

- League ID (e.g., `411.l.12345`)
- League name
- Number of teams in the league
- League status (active, finished, etc.)

### 3. **Environment Information**

- **Browser:** Chrome, Firefox, Safari, Edge (with version)
- **OS:** Windows, macOS, Linux (with version)
- **Deployment:** Local development, Vercel, other (with URL if applicable)

### 4. **Steps to Reproduce**

Provide clear steps to reproduce the issue:

1. Log in with account X
2. Navigate to league Y
3. Observe standings not loading
4. Check console for errors

### 5. **Expected vs. Actual Behavior**

- **Expected:** Standings table displays with all teams and their records
- **Actual:** Error message or blank standings section

### 6. **Screenshots**

- Screenshot of the error message (if any)
- Screenshot of the browser console with diagnostic logs
- Screenshot of the Network tab showing the API response

---

## Advanced Debugging

### Inspecting the Raw API Response

1. Open DevTools → Network tab
2. Reload the page
3. Find the `/api/leagueinfo/{id}` request
4. Click on it and go to the **Response** tab
5. Look for the `standings` field in the JSON response

### Checking Rate Limit Status

Look for these headers in the API response:

```
x-rate-limit-limit: 2000
x-rate-limit-remaining: 1999
x-rate-limit-reset: 1234567890
```

The `x-rate-limit-reset` value is a Unix timestamp indicating when the rate limit resets.

### Enabling Maximum Verbosity

For even more detailed logs, you can modify the diagnostic logger in `utils/diagnosticLogger.ts` to always log (not just when the environment variable is set). This should only be done for debugging purposes.

---

## Troubleshooting Checklist

- [ ] Diagnostic logging is enabled (`NEXT_PUBLIC_DEBUG_STANDINGS=true`)
- [ ] Development server has been restarted after enabling logging
- [ ] Browser cache has been cleared (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- [ ] You're logged in with a valid Yahoo Fantasy account
- [ ] The league ID is correct and accessible
- [ ] No HTTP 401 or 429 errors in the logs
- [ ] The API response contains the expected structure
- [ ] All required fields are present in the standings data

---

## Getting Help

If you've collected diagnostic logs and still need help:

1. **Check existing issues** on GitHub for similar problems
2. **Create a new issue** with:
   - Complete diagnostic logs
   - Steps to reproduce
   - Environment information
   - Screenshots (if applicable)
3. **Contact the development team** with the diagnostic information

---

## Related Documentation

- [Yahoo Fantasy API Documentation](https://developer.yahoo.com/fantasy/rest_api_guide/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Project README](../README.md)
