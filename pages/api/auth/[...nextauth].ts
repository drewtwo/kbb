import NextAuth from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { getYahooCallbackUrl } from '../../../lib/get-callback-url';

interface YahooProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

interface RefreshableJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

// Validate NEXTAUTH_SECRET at runtime
if (!process.env.NEXTAUTH_SECRET) {
  const errorMessage = [
    'NEXTAUTH_SECRET is not defined.',
    'This is a critical configuration error that prevents authentication from working.',
    '',
    'To fix this:',
    '1. Local Development: Add NEXTAUTH_SECRET to your .env.local file',
    '   Generate a secret with: openssl rand -base64 32',
    '',
    '2. Production/GitHub Actions: Add NEXTAUTH_SECRET as a GitHub Secret',
    '   - Go to Settings > Secrets and variables > Actions',
    '   - Click "New repository secret"',
    '   - Name: NEXTAUTH_SECRET',
    '   - Value: (generate with: openssl rand -base64 32)',
    '',
    'See docs/ENVIRONMENT_SETUP.md for detailed setup instructions.',
  ].join('\n');

  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Get the Yahoo callback URL and log it for debugging
const yahooCallbackUrl = getYahooCallbackUrl();
console.debug('[NextAuth] Yahoo OAuth callback URL:', yahooCallbackUrl);

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  // https://next-auth.js.org/configuration/providers
  providers: [
    {
      id: 'yahoo',
      name: 'Yahoo!',
      type: 'oauth',
      authorization: {
        url: process.env.YAHOO_AUTH_URL!,
        params: { scope: 'fspt-w profile' },
      },
      token: process.env.YAHOO_TOKEN_URL!,
      clientId: process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
      callbackUrl: yahooCallbackUrl,
      userinfo: 'https://api.login.yahoo.com/openid/v1/userinfo',
      profile: (profile: YahooProfile) => {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    } as OAuthConfig<YahooProfile>,
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `strategy` should be set to 'jwt' if no database is used.
    strategy: 'jwt',

    // Seconds - How long until an idle session expires and is no longer valid.
    // maxAge: 30 * 24 * 60 * 60, // 30 days

    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // JSON Web tokens are only used for sessions if the `strategy: 'jwt'` session
  // option is set - or by default if no database is specified.
  // https://next-auth.js.org/configuration/options#jwt
  jwt: {
    // A secret to use for key generation (you should set this explicitly)
    secret: process.env.NEXTAUTH_SECRET,
    // Set to true to use encryption (default: false)
    // You can define your own encode/decode functions for signing and encryption
    // if you want to override the default behaviour.
    // encode: async ({ secret, token, maxAge }) => {},
    // decode: async ({ secret, token, maxAge }) => {},
  },

  // You can define custom pages to override the built-in ones. These will be regular Next.js pages
  // so ensure that they are placed outside of the '/api' folder, e.g. signIn: '/auth/mycustom-signin'
  // The routes shown here are the default URLs that will be used when a custom
  // pages is not specified for that route.
  // https://next-auth.js.org/configuration/pages
  pages: {
    // signIn: '/auth/signin',  // Displays signin buttons
    // signOut: '/auth/signout', // Displays form with sign out button
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // Used for check email page
    // newUser: null // If set, new users will be directed here on first sign in
  },

  // Callbacks are asynchronous functions you can use to control what happens
  // when an action is performed.
  // https://next-auth.js.org/configuration/callbacks
  callbacks: {
    // async signIn({ user, account, profile, email, credentials }) { return true },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }: { session: Session; token: RefreshableJWT }) {
      // Hydrate session with user profile data and tokens from JWT
      if (session.user) {
        if (token.sub) session.user.id = token.sub as string;
        if (token.name && typeof token.name === 'string') session.user.name = token.name;
        if (token.email && typeof token.email === 'string') session.user.email = token.email;
        if (token.picture && typeof token.picture === 'string') session.user.image = token.picture;
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      if (token.error) {
        console.warn('[NextAuth] Session callback detected token error:', token.error);
      }
      return session;
    },
    async jwt({ token, account, user }): Promise<RefreshableJWT> {
      const jwtToken: RefreshableJWT = token as RefreshableJWT;

      // Initial sign in
      if (account && user) {
        console.info('[NextAuth] JWT callback initial sign-in for user', user.id);
        jwtToken.accessToken = account.access_token;
        jwtToken.refreshToken = account.refresh_token ?? jwtToken.refreshToken;
        if (account.expires_at) {
          jwtToken.accessTokenExpires = Number(account.expires_at) * 1000;
        } else if (account.expires_in) {
          jwtToken.accessTokenExpires = Date.now() + Number(account.expires_in) * 1000;
        }
        jwtToken.sub = user.id;
        if (user.name) jwtToken.name = user.name;
        if (user.email) jwtToken.email = user.email;
        if (user.image) jwtToken.picture = user.image;
        return jwtToken;
      }

      // Return previous token if the access token has not expired yet
      if (jwtToken.accessTokenExpires && Date.now() < jwtToken.accessTokenExpires) {
        return jwtToken;
      }

      // Access token has expired, try to refresh it
      if (jwtToken.refreshToken) {
        return refreshAccessToken(jwtToken);
      }

      // No refresh token available - return as-is and let the client handle sign-in
      jwtToken.error = 'RefreshAccessTokenError';
      return jwtToken;
    },
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events
  events: {},

  // Enable debug messages in the console if you are having problems
  debug: false,
  logger: {
    error(code, metadata) {
      console.error('[NextAuth][error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth][warn]', code);
    },
    debug(code, metadata) {
      console.debug('[NextAuth][debug]', code, metadata);
    },
  },
});

async function refreshAccessToken(token: RefreshableJWT): Promise<RefreshableJWT> {
  try {
    const url = process.env.YAHOO_TOKEN_URL;
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    const refreshToken = token.refreshToken;

    if (!url || !clientId || !clientSecret) {
      console.error('[NextAuth] Missing Yahoo token refresh environment variables');
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    if (!refreshToken) {
      console.error('[NextAuth] No refresh token available to refresh access token');
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const responseText = await response.text();
    let refreshedTokens: Record<string, unknown> = {};
    try {
      refreshedTokens = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[NextAuth] Failed to parse Yahoo refresh response', parseError, responseText);
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    if (!response.ok || typeof refreshedTokens.access_token !== 'string') {
      console.error('[NextAuth] Failed to refresh access token', response.status, refreshedTokens);
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    const accessToken = refreshedTokens.access_token as string;
    const nextRefreshToken = typeof refreshedTokens.refresh_token === 'string'
      ? refreshedTokens.refresh_token
      : token.refreshToken;
    const expiresIn = typeof refreshedTokens.expires_in === 'number'
      ? refreshedTokens.expires_in
      : typeof refreshedTokens.expires_in === 'string'
      ? Number(refreshedTokens.expires_in)
      : 3600;

    token.accessToken = accessToken;
    token.accessTokenExpires = Date.now() + expiresIn * 1000;
    token.refreshToken = nextRefreshToken;
    return token;
  } catch (error) {
    console.error('[NextAuth] Error refreshing access token', error);
    token.error = 'RefreshAccessTokenError';
    return token;
  }
}
