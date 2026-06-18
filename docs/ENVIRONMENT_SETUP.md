# Environment Setup Guide

This document explains how to set up environment variables for local development and production deployments.

## Overview

The application uses NextAuth for authentication with support for GitHub and Yahoo OAuth providers. Proper environment configuration is critical for the application to function correctly.

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

### 3. Configure GitHub OAuth

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: KBB (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret**
5. Add these to `.env.local`:
   ```
   GITHUB_ID=your_client_id
   GITHUB_SECRET=your_client_secret
   ```

### 4. Configure Yahoo OAuth

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

### 5. Set NEXTAUTH_URL

For local development:
```
NEXTAUTH_URL=http://localhost:3000
```

### 6. Start the Development Server

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

| Secret Name | Description |
|-------------|-------------|
| `NEXTAUTH_SECRET` | Secure secret for NextAuth (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your production domain (e.g., `https://yourdomain.com`) |
| `GITHUB_ID` | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `YAHOO_AUTH_URL` | Yahoo OAuth authorization URL |
| `YAHOO_TOKEN_URL` | Yahoo OAuth token URL |
| `YAHOO_CLIENT_ID` | Yahoo OAuth Client ID |
| `YAHOO_CLIENT_SECRET` | Yahoo OAuth Client Secret |

### 2. GitHub Actions Workflow

The `.github/workflows/setup-env.yml` workflow automatically:

1. Triggers on push to `main` and `develop` branches
2. Triggers on pull requests to `main` and `develop` branches
3. Creates `.env.local` from GitHub Secrets
4. Verifies the environment file was created successfully

The workflow ensures that sensitive credentials are never committed to the repository.

## Environment Variables Reference

### Required Variables

- **NEXTAUTH_SECRET**: Secret key for NextAuth JWT signing and encryption
- **NEXTAUTH_URL**: The URL where your application is deployed
- **GITHUB_ID**: GitHub OAuth App Client ID
- **GITHUB_SECRET**: GitHub OAuth App Client Secret
- **YAHOO_CLIENT_ID**: Yahoo OAuth Client ID
- **YAHOO_CLIENT_SECRET**: Yahoo OAuth Client Secret
- **YAHOO_AUTH_URL**: Yahoo OAuth authorization endpoint
- **YAHOO_TOKEN_URL**: Yahoo OAuth token endpoint

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
   - Local: `http://localhost:3000/api/auth/callback/[provider]`
   - Production: `https://yourdomain.com/api/auth/callback/[provider]`
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

## Security Best Practices

1. **Never commit `.env.local`**: This file is already in `.gitignore`
2. **Rotate secrets regularly**: Periodically regenerate `NEXTAUTH_SECRET` and OAuth credentials
3. **Use strong secrets**: Always generate secrets with sufficient entropy (e.g., `openssl rand -base64 32`)
4. **Limit OAuth scopes**: Only request the minimum permissions needed
5. **Keep dependencies updated**: Regularly update NextAuth and other security-related packages

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Yahoo OAuth Documentation](https://developer.yahoo.com/oauth2/guide/)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)
