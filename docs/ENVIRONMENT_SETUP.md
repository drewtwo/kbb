# Environment Setup Guide

This document explains how to set up environment variables for local development and production deployments.

## Overview

The application uses NextAuth for authentication with Yahoo OAuth provider. Proper environment configuration is critical for the application to function correctly.

## NEXTAUTH_URL Behavior

The application implements intelligent NEXTAUTH_URL resolution that automatically adapts to different deployment environments:

### Local Development
- If `NEXTAUTH_URL` is not set, defaults to `http://localhost:3000`
- You can explicitly set it in `.env.local` if running on a different port

### Vercel Preview Deployments
- If `NEXTAUTH_URL` is not set, automatically uses `https://{VERCEL_URL}`
- `VERCEL_URL` is automatically provided by Vercel for preview deployments
- No additional configuration needed for preview deployments

### Production Deployment
- Must explicitly set `NEXTAUTH_URL` to your production domain
- Example: `NEXTAUTH_URL=https://yourdomain.com`
- This is configured as a GitHub Secret

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

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `NEXTAUTH_SECRET` | Secure secret for NextAuth (generate with `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | Your production domain (e.g., `https://yourdomain.com`) | Yes |
| `YAHOO_AUTH_URL` | Yahoo OAuth authorization URL | Yes |
| `YAHOO_TOKEN_URL` | Yahoo OAuth token URL | Yes |
| `YAHOO_CLIENT_ID` | Yahoo OAuth Client ID | Yes |
| `YAHOO_CLIENT_SECRET` | Yahoo OAuth Client Secret | Yes |

### 2. GitHub Actions Workflow

The `.github/workflows/setup-env.yml` workflow automatically:

1. Triggers on push to `main` and `develop` branches
2. Triggers on pull requests to `main` and `develop` branches
3. Creates `.env.local` from GitHub Secrets
4. Verifies the environment file was created successfully
5. Runs linting, type checking, and build validation

The workflow ensures that sensitive credentials are never committed to the repository.

### 3. Preview Deployments (Vercel)

For Vercel preview deployments:

1. The `VERCEL_URL` environment variable is automatically provided by Vercel
2. If `NEXTAUTH_URL` is not set in GitHub Secrets, the NextAuth configuration will automatically use `https://{VERCEL_URL}`
3. No additional configuration is needed for preview deployments

## Environment Variables Reference

### Required Variables

- **NEXTAUTH_SECRET**: Secret key for NextAuth JWT signing and encryption
- **NEXTAUTH_URL**: The URL where your application is deployed (required for production, optional for local/preview)
- **YAHOO_CLIENT_ID**: Yahoo OAuth Client ID
- **YAHOO_CLIENT_SECRET**: Yahoo OAuth Client Secret
- **YAHOO_AUTH_URL**: Yahoo OAuth authorization endpoint
- **YAHOO_TOKEN_URL**: Yahoo OAuth token endpoint

### Optional Variables

- **VERCEL_URL**: Automatically provided by Vercel for preview deployments (used when NEXTAUTH_URL is not set)

## Troubleshooting

### 500 Error on Login

**Symptom**: Getting a 500 error when attempting to log in.

**Causes**:
1. `NEXTAUTH_SECRET` is not set or is empty
2. `NEXTAUTH_URL` doesn't match the actual application URL
3. OAuth provider credentials are incorrect or expired

**Solution**:
1. Verify all required environment variables are set in `.env.local`
2. Check that `NEXTAUTH_SECRET` is a non-empty string
3. Verify `NEXTAUTH_URL` matches your application's URL
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
   - Production: `https://yourdomain.com/api/auth/callback/yahoo`
   - Preview: `https://{VERCEL_URL}/api/auth/callback/yahoo`
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
1. `NEXTAUTH_URL` is not set in GitHub Secrets for production
2. `NEXTAUTH_URL` is set to an incorrect URL
3. OAuth provider redirect URIs don't match the deployment URL

**Solution**:
1. For production: Ensure `NEXTAUTH_URL` is set in GitHub Secrets to your production domain
2. For preview deployments: Leave `NEXTAUTH_URL` unset in secrets, the system will use `VERCEL_URL` automatically
3. Update OAuth provider redirect URIs to match your deployment URL
4. Check the NextAuth logs to see what URL is being used

## Security Best Practices

1. **Never commit `.env.local`**: This file is already in `.gitignore`
2. **Rotate secrets regularly**: Periodically regenerate `NEXTAUTH_SECRET` and OAuth credentials
3. **Use strong secrets**: Always generate secrets with sufficient entropy (e.g., `openssl rand -base64 32`)
4. **Limit OAuth scopes**: Only request the minimum permissions needed
5. **Keep dependencies updated**: Regularly update NextAuth and other security-related packages
6. **Use HTTPS in production**: Always use HTTPS URLs for production deployments
7. **Verify OAuth redirect URIs**: Ensure redirect URIs in OAuth provider settings exactly match your deployment URLs

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Yahoo OAuth Documentation](https://developer.yahoo.com/oauth2/guide/)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
