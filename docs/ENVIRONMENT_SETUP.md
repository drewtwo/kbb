# Environment Setup Guide

This document explains how to set up environment variables for local development and production deployments.

## Overview

The application uses NextAuth for authentication with Yahoo OAuth provider. Proper environment configuration is critical for the application to function correctly.

## Build-Time Environment Validation

**NEW**: The application now validates required environment variables at build time. This ensures that all critical secrets are set before the build proceeds, preventing runtime failures.

### How It Works

1. During the build process (`next build`), the application checks for required environment variables
2. If any required variables are missing or empty, the build fails with a clear error message
3. This validation runs in production builds and CI/CD pipelines
4. Local development builds also validate, but with warnings for missing recommended variables

### Required Variables for Build-Time Validation

The following variables are **REQUIRED** and must be set before building:

- **NEXTAUTH_SECRET**: Secret key for NextAuth JWT signing and encryption

### Recommended Variables

The following variables are **RECOMMENDED** for proper functionality:

- **NEXTAUTH_URL**: The URL where your application is deployed (optional for Vercel, required for non-Vercel production)
- **YAHOO_CLIENT_ID**: Yahoo OAuth Client ID
- **YAHOO_CLIENT_SECRET**: Yahoo OAuth Client Secret
- **YAHOO_AUTH_URL**: Yahoo OAuth authorization endpoint
- **YAHOO_TOKEN_URL**: Yahoo OAuth token endpoint

## CRITICAL: NEXTAUTH_SECRET Requirement

**NEXTAUTH_SECRET is REQUIRED for all deployments (local, preview, and production).**

- **What it is**: A secret key used to sign and encrypt JWT tokens for authentication
- **Why it's required**: Without it, authentication will fail with a 500 error
- **How to generate**: `openssl rand -base64 32`
- **Where to set it**:
  - Local development: `.env.local` file
  - Production/GitHub Actions: GitHub Secrets (Settings > Secrets and variables > Actions)
  - Vercel preview deployments: GitHub Secrets (will be passed to Vercel)

If `NEXTAUTH_SECRET` is missing, the application will throw a clear error message during the build explaining how to fix it.

## NEXTAUTH_URL Behavior

The application implements intelligent NEXTAUTH_URL resolution that automatically adapts to different deployment environments:

### Local Development
- If `NEXTAUTH_URL` is not set, defaults to `http://localhost:3000`
- You can explicitly set it in `.env.local` if running on a different port

### Vercel Production Deployments
- If `NEXTAUTH_URL` is not set, automatically uses `https://{VERCEL_PROJECT_PRODUCTION_URL}`
- `VERCEL_PROJECT_PRODUCTION_URL` is automatically provided by Vercel for production deployments
- No additional configuration needed for production deployments
- **NEXTAUTH_URL does NOT need to be set as a GitHub Secret for Vercel production**

### Vercel Preview Deployments
- If `NEXTAUTH_URL` is not set, automatically uses `https://{VERCEL_URL}`
- `VERCEL_URL` is automatically provided by Vercel for preview deployments
- No additional configuration needed for preview deployments

### Non-Vercel Production Deployment
- Must explicitly set `NEXTAUTH_URL` to your production domain
- Example: `NEXTAUTH_URL=https://yourdomain.com`
- This is configured as a GitHub Secret

## NEXTAUTH_URL Bootstrap Logic

The application now includes a bootstrap block in `pages/api/auth/[...nextauth].ts` that automatically sets `process.env.NEXTAUTH_URL` at runtime if it is not already set. This ensures that NextAuth always has a valid base URL for OAuth callbacks.

### Bootstrap Resolution Order

1. **Already set** — If `NEXTAUTH_URL` is already defined, use it as-is
2. **VERCEL_PROJECT_PRODUCTION_URL** — If set (Vercel production), use `https://{VERCEL_PROJECT_PRODUCTION_URL}`
3. **VERCEL_URL** — If set (Vercel preview), use `https://{VERCEL_URL}`

### Bootstrap Logging

When the bootstrap block sets `NEXTAUTH_URL`, it logs an informational message to the Vercel function logs:
```
[NextAuth] NEXTAUTH_URL bootstrapped from VERCEL_PROJECT_PRODUCTION_URL: https://my-app.vercel.app
```

This makes it easy to verify which source was used for the URL resolution in production logs.

## YAHOO_CALLBACK_URL Auto-Generation

The `YAHOO_CALLBACK_URL` is **automatically generated at runtime** by `lib/get-callback-url.ts` and
does **not** need to be set as an environment variable anywhere — not in `.env.local`, not in GitHub
Secrets, and not in CI/CD pipelines.

### How It Works

The `getYahooCallbackUrl()` utility resolves the base URL using the following priority order:

1. **`NEXTAUTH_URL`** — used when explicitly set (local development or production)
2. **`VERCEL_PROJECT_PRODUCTION_URL`** — used automatically for Vercel production deployments (prefixed with `https://`)
3. **`VERCEL_URL`** — used automatically for Vercel preview deployments (prefixed with `https://`)
4. **`http://localhost:3000`** — fallback for local development when neither variable is set

The Yahoo callback path `/api/auth/callback/yahoo` is then appended to the resolved base URL.

### Examples

| Environment | Variable Set | Generated Callback URL |
|---|---|---|
| Local dev | `NEXTAUTH_URL=http://localhost:3000` | `http://localhost:3000/api/auth/callback/yahoo` |
| Local dev (no var) | _(none)_ | `http://localhost:3000/api/auth/callback/yahoo` |
| Production (non-Vercel) | `NEXTAUTH_URL=https://yourdomain.com` | `https://yourdomain.com/api/auth/callback/yahoo` |
| Vercel production | `VERCEL_PROJECT_PRODUCTION_URL=my-app.vercel.app` | `https://my-app.vercel.app/api/auth/callback/yahoo` |
| Vercel preview | `VERCEL_URL=my-app-abc123.vercel.app` | `https://my-app-abc123.vercel.app/api/auth/callback/yahoo` |

### No Manual Configuration Needed

You do **not** need to:
- Set `YAHOO_CALLBACK_URL` in `.env.local`
- Add `YAHOO_CALLBACK_URL` as a GitHub Secret
- Configure `YAHOO_CALLBACK_URL` in any CI/CD pipeline

Simply ensure `NEXTAUTH_URL` is set correctly for your environment (or rely on `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` for Vercel deployments) and the callback URL will be derived automatically.

## Local Development Setup

### 1. Create `.env.local` File

Copy the `.env.example` file to create your local environment configuration:

```bash
cp .env.example .env.local
```

### 2. Generate NEXTAUTH_SECRET

Generate a secure secret key using OpenSSL:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET` in `.env.local`.

**This step is REQUIRED** — the application will not start without this secret, and the build will fail if it's missing.

### 3. Configure Yahoo OAuth

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps)
2. Create a new application
3. Configure the OAuth settings:
   - **Redirect URIs**: `http://localhost:3000/api/auth/callback/yahoo`
4. Copy the **Client ID** and **Client Secret**
5. Add these to `.env.local`:
   ```
   YAHOO_CLIENT_ID=your_client_id
   YAHOO_CLIENT_SECRET=your_client_secret
   YAHOO_AUTH_URL=https://api.login.yahoo.com/oauth2/request_auth
   YAHOO_TOKEN_URL=https://api.login.yahoo.com/oauth2/get_token
   ```

### 4. Set NEXTAUTH_URL (Optional for Local Development)

For local development, you can leave `NEXTAUTH_URL` unset (it will default to `http://localhost:3000`) or explicitly set it:
```
NEXTAUTH_URL=http://localhost:3000
```

If you're running the development server on a different port, set it accordingly:
```
NEXTAUTH_URL=http://localhost:3001
```

### 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application should now be accessible at `http://localhost:3000`.

## Production Deployment (GitHub Actions)

### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings > Secrets and variables > Actions**
2. Click "New repository secret"
3. Add each of the following secrets:

| Secret Name | Description | Required | Build-Time Validation |
|-------------|-------------|----------|----------------------|
| `NEXTAUTH_SECRET` | Secure secret for NextAuth (generate with `openssl rand -base64 32`) | **YES** | **YES** |
| `NEXTAUTH_URL` | Your production domain (e.g., `https://yourdomain.com`) — **only for non-Vercel production** | Conditional | No |
| `YAHOO_AUTH_URL` | Yahoo OAuth authorization URL | Yes | No |
| `YAHOO_TOKEN_URL` | Yahoo OAuth token URL | Yes | No |
| `YAHOO_CLIENT_ID` | Yahoo OAuth Client ID | Yes | No |
| `YAHOO_CLIENT_SECRET` | Yahoo OAuth Client Secret | Yes | No |

**CRITICAL**: `NEXTAUTH_SECRET` is **REQUIRED** for production deployments and is validated at build time. Without it, the build will fail with a clear error message.

**Note on NEXTAUTH_URL for Vercel**: If you are deploying to Vercel, you do **NOT** need to set `NEXTAUTH_URL` as a GitHub Secret. It will be automatically bootstrapped at runtime from `VERCEL_PROJECT_PRODUCTION_URL` (for production) or `VERCEL_URL` (for preview deployments).

**Note**: `YAHOO_CALLBACK_URL` is **not** required as a GitHub Secret and should **not** be set manually. It is automatically generated at runtime by `lib/get-callback-url.ts` using the value of `NEXTAUTH_URL` (or `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` for Vercel deployments).

### 2. GitHub Actions Workflow

The `.github/workflows/setup-env.yml` workflow automatically:

1. Triggers on push to `main` and `develop` branches
2. Triggers on pull requests to `main` and `develop` branches
3. Creates `.env.local` from GitHub Secrets (excluding `NEXTAUTH_URL` for Vercel deployments)
4. **`YAHOO_CALLBACK_URL` is auto-generated at runtime** — no workflow step is needed to set it
5. **`NEXTAUTH_URL` is auto-bootstrapped at runtime** — no workflow step is needed to set it for Vercel deployments
6. **Validates environment variables** before building (build will fail if required variables are missing)
7. Verifies the environment file was created successfully
8. Runs linting, type checking, and build validation

The workflow ensures that sensitive credentials are never committed to the repository and that the Yahoo callback URL is always correctly derived from your deployment URL at runtime.

### 3. Vercel Production Deployments

For Vercel production deployments:

1. The `VERCEL_PROJECT_PRODUCTION_URL` environment variable is automatically provided by Vercel
2. If `NEXTAUTH_URL` is not set in GitHub Secrets, the NextAuth bootstrap logic will automatically use `https://{VERCEL_PROJECT_PRODUCTION_URL}`
3. `YAHOO_CALLBACK_URL` will be automatically generated at runtime as `https://{VERCEL_PROJECT_PRODUCTION_URL}/api/auth/callback/yahoo`
4. No additional configuration is needed for production deployments
5. **NEXTAUTH_SECRET must still be set in GitHub Secrets** — it will be passed to Vercel automatically and validated at build time

### 4. Vercel Preview Deployments

For Vercel preview deployments:

1. The `VERCEL_URL` environment variable is automatically provided by Vercel
2. If `NEXTAUTH_URL` is not set in GitHub Secrets, the NextAuth bootstrap logic will automatically use `https://{VERCEL_URL}`
3. `YAHOO_CALLBACK_URL` will be automatically generated at runtime as `https://{VERCEL_URL}/api/auth/callback/yahoo`
4. No additional configuration is needed for preview deployments
5. **NEXTAUTH_SECRET must still be set in GitHub Secrets** — it will be passed to Vercel automatically and validated at build time

## Environment Variables Reference

### Required Variables (Build-Time Validation)

- **NEXTAUTH_SECRET**: Secret key for NextAuth JWT signing and encryption (**REQUIRED for all deployments, validated at build time**)

### Recommended Variables

- **NEXTAUTH_URL**: The URL where your application is deployed (required for non-Vercel production, optional for Vercel and local development)
- **YAHOO_CLIENT_ID**: Yahoo OAuth Client ID
- **YAHOO_CLIENT_SECRET**: Yahoo OAuth Client Secret
- **YAHOO_AUTH_URL**: Yahoo OAuth authorization endpoint
- **YAHOO_TOKEN_URL**: Yahoo OAuth token endpoint

### Auto-Generated Variables

- **YAHOO_CALLBACK_URL**: Automatically generated at runtime by `lib/get-callback-url.ts` from `NEXTAUTH_URL` (or `VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`). **Do not set this variable manually.**

### Auto-Bootstrapped Variables

- **NEXTAUTH_URL**: Automatically bootstrapped at runtime in `pages/api/auth/[...nextauth].ts` from `VERCEL_PROJECT_PRODUCTION_URL` (Vercel production) or `VERCEL_URL` (Vercel preview) if not already set. **Do not set this as a GitHub Secret for Vercel deployments.**

### Optional Variables

- **VERCEL_URL**: Automatically provided by Vercel for preview deployments (used when NEXTAUTH_URL is not set)
- **VERCEL_PROJECT_PRODUCTION_URL**: Automatically provided by Vercel for production deployments (used when NEXTAUTH_URL is not set)

## Troubleshooting

### Build Fails with "Environment validation failed"

**Symptom**: Build fails with error: "Environment validation failed. Please check the errors above..."

**Causes**:
1. `NEXTAUTH_SECRET` is not set in `.env.local` (local development)
2. `NEXTAUTH_SECRET` is not set in GitHub Secrets (production/preview deployments)
3. `NEXTAUTH_SECRET` is set to an empty string

**Solution**:
1. Generate a secret: `openssl rand -base64 32`
2. For local development: Add it to `.env.local`
3. For production: Add it as a GitHub Secret named `NEXTAUTH_SECRET`
4. Retry the build

### Application Fails to Start with "NEXTAUTH_SECRET is not defined"

**Symptom**: Application throws an error on startup: "NEXTAUTH_SECRET is not defined."

**Causes**:
1. `NEXTAUTH_SECRET` is not set in `.env.local` (local development)
2. `NEXTAUTH_SECRET` is not set in GitHub Secrets (production/preview deployments)
3. `NEXTAUTH_SECRET` is set to an empty string

**Solution**:
1. Generate a secret: `openssl rand -base64 32`
2. For local development: Add it to `.env.local`
3. For production: Add it as a GitHub Secret named `NEXTAUTH_SECRET`
4. Restart the application

### 500 Error on Login

**Symptom**: Getting a 500 error when attempting to log in.

**Causes**:
1. `NEXTAUTH_SECRET` is not set or is empty
2. `NEXTAUTH_URL` doesn't match the actual application URL
3. OAuth provider credentials are incorrect or expired

**Solution**:
1. Verify all required environment variables are set in `.env.local`
2. Check that `NEXTAUTH_SECRET` is a non-empty string
3. Verify `NEXTAUTH_URL` matches your application's URL (or is unset for Vercel to use automatic bootstrap)
4. Regenerate OAuth credentials if they're expired
5. Check application logs for detailed error messages

### OAuth Provider Not Working

**Symptom**: OAuth login button doesn't work or shows an error.

**Causes**:
1. Redirect URI in OAuth provider settings doesn't match the application
2. Client ID or Client Secret is incorrect
3. OAuth provider credentials have been revoked

**Solution**:
1. Verify the redirect URI in your OAuth provider settings matches:
   - Local: `http://localhost:3000/api/auth/callback/yahoo`
   - Production (non-Vercel): `https://yourdomain.com/api/auth/callback/yahoo`
   - Vercel production: `https://{VERCEL_PROJECT_PRODUCTION_URL}/api/auth/callback/yahoo`
   - Vercel preview: `https://{VERCEL_URL}/api/auth/callback/yahoo`
2. Double-check Client ID and Client Secret values
3. Regenerate credentials if needed
4. Check browser console for detailed error messages

### Environment Variables Not Loading

**Symptom**: Application starts but environment variables are undefined.

**Causes**:
1. `.env.local` file doesn't exist
2. `.env.local` is in the wrong location (should be in project root)
3. Development server wasn't restarted after creating `.env.local`

**Solution**:
1. Verify `.env.local` exists in the project root directory
2. Restart the development server: `npm run dev`
3. Check that variable names match exactly (case-sensitive)

### NEXTAUTH_URL Not Being Set Correctly

**Symptom**: Application works locally but fails on preview or production deployment.

**Causes**:
1. `NEXTAUTH_URL` is not set in GitHub Secrets for non-Vercel production
2. `NEXTAUTH_URL` is set to an incorrect URL
3. OAuth provider redirect URIs don't match the deployment URL
4. Bootstrap logic is not being triggered on Vercel

**Solution**:
1. For non-Vercel production: Ensure `NEXTAUTH_URL` is set in GitHub Secrets to your production domain
2. For Vercel deployments: Leave `NEXTAUTH_URL` unset in GitHub Secrets; the bootstrap logic will automatically set it from `VERCEL_PROJECT_PRODUCTION_URL` (production) or `VERCEL_URL` (preview)
3. Check the Vercel function logs to see which source was used for URL bootstrap: `[NextAuth] NEXTAUTH_URL bootstrapped from VERCEL_PROJECT_PRODUCTION_URL: ...`
4. Update OAuth provider redirect URIs to match your deployment URL
5. Check the NextAuth logs to see what URL is being used

### Session Expired Error

**Symptom**: User gets logged out unexpectedly or sees "session expired" error.

**Causes**:
1. `NEXTAUTH_URL` changed between requests (URL mismatch)
2. `NEXTAUTH_SECRET` was rotated or changed
3. JWT token has expired
4. OAuth provider revoked the refresh token

**Solution**:
1. Verify `NEXTAUTH_URL` is consistent across all requests (check bootstrap logs in Vercel)
2. If `NEXTAUTH_SECRET` was rotated, users will need to log in again
3. Check the NextAuth logs for token expiration details
4. Verify OAuth provider credentials are still valid
5. Check browser console for detailed error messages

## Security Best Practices

1. **Never commit `.env.local`**: This file is already in `.gitignore`
2. **Rotate secrets regularly**: Periodically regenerate `NEXTAUTH_SECRET` and OAuth credentials
3. **Use strong secrets**: Always generate secrets with sufficient entropy (e.g., `openssl rand -base64 32`)
4. **Limit OAuth scopes**: Only request the minimum permissions needed
5. **Keep dependencies updated**: Regularly update NextAuth and other security-related packages
6. **Use HTTPS in production**: Always use HTTPS URLs for production deployments
7. **Verify OAuth redirect URIs**: Ensure redirect URIs in OAuth provider settings exactly match your deployment URLs
8. **Protect GitHub Secrets**: Limit access to GitHub Secrets to authorized team members only
9. **Monitor build failures**: Pay attention to build-time validation errors — they indicate missing or misconfigured secrets

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Yahoo OAuth Documentation](https://developer.yahoo.com/oauth2/guide/)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
