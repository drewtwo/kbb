# Environment Variable Loading Flow

This document explains how environment variables are loaded and validated in the KBB application, particularly during the build process.

## Overview

The application uses a multi-stage environment variable loading system to ensure that:
1. Required secrets are available at build time
2. Configuration is properly validated before the build proceeds
3. Clear error messages guide developers when variables are missing

## Loading Stages

### Stage 1: Local Development (.env.local)

When running `npm run dev` or `yarn dev`:

1. **Next.js Development Server** automatically loads `.env.local` via its built-in dotenv support
2. **lib/validate-env.js** also loads `.env.local` when imported, ensuring variables are available
3. The application starts with all environment variables in place

**File:** `.env.local` (not committed to git, created locally)

### Stage 2: Build Time (next.config.js)

When running `npm run build` or `yarn build`:

1. **next.config.js** is executed by Next.js during the build process
2. **Synchronous dotenv loading** happens first:
   ```javascript
   const dotenv = require('dotenv');
   dotenv.config({ path: envLocalPath });
   ```
3. **Synchronous validation** is performed:
   ```javascript
   const { validateEnvironmentOrThrow } = require('./lib/validate-env.js');
   validateEnvironmentOrThrow();
   ```
4. If validation fails, the build stops immediately with a clear error message
5. If validation passes, the Next.js build proceeds

**Files:** `next.config.js`, `lib/validate-env.js`

### Stage 3: CI/CD Pipeline (GitHub Actions)

When pushing to main/develop or creating a pull request:

1. **setup-env.yml workflow** runs automatically
2. **Dependencies are installed** via `yarn install --frozen-lockfile`
3. **.env.local is created** from GitHub Secrets:
   ```bash
   cat > .env.local << EOF
   NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }}
   YAHOO_CLIENT_ID=${{ secrets.YAHOO_CLIENT_ID }}
   # ... other variables
   EOF
   ```
4. **Verification step** checks that .env.local was created and contains required variables
5. **Pre-build validation** checks GitHub Secrets directly
6. **Build step** runs `yarn build`, which triggers next.config.js validation
7. If any step fails, the workflow stops and the build is blocked

**File:** `.github/workflows/setup-env.yml`

## Environment Variables

### Required Variables

These variables **must** be set for the build to succeed:

- **NEXTAUTH_SECRET**: A secret key for NextAuth.js session encryption
  - Generate: `openssl rand -base64 32`
  - Must be at least 32 characters
  - Keep this secret and never commit it to git

### Recommended Variables

These variables are **recommended** for full functionality but won't block the build:

- **NEXTAUTH_URL**: The URL where the application is deployed
  - Local: `http://localhost:3000`
  - Production: `https://yourdomain.com`
  
- **YAHOO_CLIENT_ID**: OAuth client ID from Yahoo
- **YAHOO_CLIENT_SECRET**: OAuth client secret from Yahoo
- **YAHOO_AUTH_URL**: Yahoo's authorization endpoint
- **YAHOO_TOKEN_URL**: Yahoo's token endpoint

## Validation Logic

The validation is performed by `lib/validate-env.js`:

```javascript
function validateEnvironmentOrThrow() {
  // 1. Check all REQUIRED_ENV_VARS
  // 2. Check all RECOMMENDED_ENV_VARS
  // 3. If any required vars are missing, throw error with helpful message
  // 4. If recommended vars are missing, log warning but continue
}
```

### Error Messages

When required variables are missing, you'll see:

```
❌ Environment validation failed!

The following REQUIRED environment variables are missing or empty:
  • NEXTAUTH_SECRET

📋 How to fix:
  1. Generate a secret: openssl rand -base64 32
  2. For local development: Add to .env.local
  3. For production: Add as GitHub Secret

📚 For more information, see docs/ENVIRONMENT_SETUP.md
```

## Debugging Build-Time Validation Failures

### Local Development

If `yarn build` fails with validation errors:

1. **Check .env.local exists:**
   ```bash
   ls -la .env.local
   ```

2. **Verify required variables are set:**
   ```bash
   grep NEXTAUTH_SECRET .env.local
   ```

3. **Check for empty values:**
   ```bash
   cat .env.local | grep "=$"  # Shows empty variables
   ```

4. **Generate missing secrets:**
   ```bash
   openssl rand -base64 32
   ```

5. **Add to .env.local:**
   ```bash
   echo "NEXTAUTH_SECRET=<generated-secret>" >> .env.local
   ```

### GitHub Actions

If the workflow fails:

1. **Check the workflow logs:**
   - Go to Actions tab in GitHub
   - Click the failed workflow run
   - Look for the "Verify .env.local" or "Build" step

2. **Common issues:**
   - **NEXTAUTH_SECRET not set in GitHub Secrets**
     - Go to Settings > Secrets and variables > Actions
     - Click "New repository secret"
     - Name: `NEXTAUTH_SECRET`
     - Value: `openssl rand -base64 32`
   
   - **Empty secret value**
     - Secrets cannot be empty
     - Generate a new value and update the secret

3. **Verify secrets are set:**
   - Go to Settings > Secrets and variables > Actions
   - You should see `NEXTAUTH_SECRET` listed
   - Click it to verify it's not empty (you can't see the value, but you can edit it)

## Module System

The validation module uses **CommonJS** (not ES6 modules) for compatibility:

- **lib/validate-env.js**: Uses `module.exports` and `require()`
- **next.config.js**: Uses `require()` to import the validation module
- **package.json build script**: Calls `node lib/validate-env.js` directly

This ensures synchronous loading and validation during the build process.

## Dotenv Configuration

The application uses the `dotenv` package (added as a dev dependency) to load `.env.local`:

- **next.config.js**: Loads `.env.local` synchronously at build time
- **lib/validate-env.js**: Loads `.env.local` when the module is imported
- **Next.js dev server**: Automatically loads `.env.local` during development

This multi-layer approach ensures environment variables are available in all contexts.

## Best Practices

1. **Never commit .env.local to git**
   - Add to `.gitignore` (already done)
   - Each developer creates their own local copy

2. **Use GitHub Secrets for CI/CD**
   - Never commit secrets to the repository
   - Use the GitHub UI to manage secrets securely

3. **Generate strong secrets**
   - Use `openssl rand -base64 32` for NEXTAUTH_SECRET
   - Use at least 32 characters for security

4. **Keep secrets synchronized**
   - Local .env.local should match GitHub Secrets
   - Update both when changing secrets

5. **Document required variables**
   - Keep REQUIRED_ENV_VARS list updated in lib/validate-env.js
   - Update this documentation when adding new required variables

## Related Documentation

- **ENVIRONMENT_SETUP.md**: Step-by-step setup guide for developers
- **next.config.js**: Build-time configuration and validation
- **lib/validate-env.js**: Validation logic and error messages
- **.github/workflows/setup-env.yml**: CI/CD pipeline configuration
