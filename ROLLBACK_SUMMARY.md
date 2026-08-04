# Rollback Summary: Graph Styling Commit

## Overview
This document summarizes the rollback of authentication-related changes to restore the codebase to the state of the graph styling commit (1ef8977).

## Target Commit
- **Commit Hash**: 1ef8977c69c33dcc04930a73f59302e6d03069bf
- **Branch**: ai/bugfix/rollback-to-graph-styling-commit

## Files Reverted

### 1. pages/api/auth/[...nextauth].ts
**Changes Made:**
- Removed the NEXTAUTH_URL bootstrap block that dynamically set NEXTAUTH_URL from Vercel environment variables
- Removed the call to `getYahooCallbackUrl()` and related logging
- Simplified the `refreshAccessToken` function by removing the dynamic redirect_uri generation
- Kept the core NextAuth configuration and token refresh logic intact

**Key Removals:**
- NEXTAUTH_URL bootstrap logic (lines that checked VERCEL_PROJECT_PRODUCTION_URL and VERCEL_URL)
- Import of `getYahooCallbackUrl` function
- Dynamic redirect_uri construction in refreshAccessToken

### 2. lib/get-callback-url.ts
**Changes Made:**
- Simplified the module to use a static YAHOO_CALLBACK_URL environment variable
- Removed the complex dynamic URL resolution logic that checked multiple environment variables
- Removed the `resolveBaseUrl()` helper function
- Kept the `getYahooCallbackUrl()` export for backward compatibility

**Before:**
- Dynamic resolution from NEXTAUTH_URL, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL, or localhost fallback
- Extensive documentation about URL resolution order

**After:**
- Simple environment variable lookup with localhost fallback
- Minimal implementation

### 3. pages/auth/signin.tsx
**Changes Made:**
- Removed the hardcoded callback URL from the signIn call
- Simplified the useEffect to call `signIn('yahoo')` without explicit callbackUrl parameter
- Kept the basic structure and comments about NextAuth's built-in parameter management

**Before:**
```typescript
void signIn('yahoo', { callbackUrl: 'https://kbb.vercel.app/api/auth/callback/yahoo' });
```

**After:**
```typescript
void signIn('yahoo');
```

### 4. utils/yahooData.ts
**Changes Made:**
- Removed the `TokenValidationResult` interface
- Replaced `validateTokenWithDetails()` function with a simpler `validateToken()` function
- Updated all 5 usages of `validateTokenWithDetails` to use the simpler `validateToken` function
- Simplified token validation error handling

**Removed Function:**
- `validateTokenWithDetails()` - Complex function that returned detailed error reasons and HTTP status codes

**New Function:**
```typescript
export const validateToken = (token: Record<string, unknown> | null): boolean => {
  if (!token) {
    console.error('[yahooData] validateToken: token is null or undefined');
    return false;
  }

  if (!token.accessToken) {
    console.error('[yahooData] validateToken: token does not have an accessToken property');
    return false;
  }

  return true;
};
```

**Updated Locations:**
- fetchTeams() - line ~811
- getLeagueTeams() - line ~942
- getLeagueSettings() - line ~1038
- getLeagueStandings() - line ~1160
- getWeekStats() - line ~1592

## Validation Results

### Lint Check
```
✖ 2 problems (0 errors, 2 warnings)
```
- Pre-existing warnings only (no new issues introduced)
- All files pass linting standards

### TypeCheck
```
Done in 5.35s
```
- All TypeScript type checks pass
- No type errors introduced

## Rationale

The rollback removes the following enhancements that were added after the graph styling commit:

1. **Dynamic NEXTAUTH_URL Bootstrap**: Removed automatic URL resolution from Vercel environment variables
2. **Complex Callback URL Generation**: Simplified from dynamic resolution to static environment variable
3. **Hardcoded Callback URL**: Removed hardcoded production URL from signin page
4. **Enhanced Token Validation**: Removed detailed token validation with error reasons and HTTP status codes

These changes restore the codebase to a simpler, more straightforward authentication implementation that was present at the graph styling commit.

## Files Modified
- pages/api/auth/[...nextauth].ts
- lib/get-callback-url.ts
- pages/auth/signin.tsx
- utils/yahooData.ts

## Testing Notes
- All linting checks pass
- All TypeScript type checks pass
- No breaking changes to public APIs
- The `getYahooCallbackUrl()` function remains exported for backward compatibility
- The `validateToken()` function provides the same basic validation as before
