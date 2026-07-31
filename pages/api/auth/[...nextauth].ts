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

// ============================================================================
// NEXTAUTH_URL Bootstrap Block
// ============================================================================
// This block sets process.env.NEXTAUTH_URL dynamically if it is not already set.
// This ensures that NextAuth always has a valid base URL for OAuth callbacks,
// even in Vercel production deployments where NEXTAUTH_URL is not explicitly set.
//
// Resolution order:
// 1. Already set — do nothing
// 2. VERCEL_PROJECT_PRODUCTION_URL — set to https://${VERCEL_PROJECT_PRODUCTION_URL}
// 3. VERCEL_URL — set to https://${VERCEL_URL}
// ============================================================================
if (!process.env.NEXTAUTH_URL) {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    console.info(
      '[NextAuth] NEXTAUTH_URL bootstrapped from VERCEL_PROJECT_PRODUCTION_URL:',
      process.env.NEXTAUTH_URL
    );
  } else if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    console.info('[NextAuth] NEXTAUTH_URL bootstrapped from VERCEL_URL:', process.env.NEXTAUTH_URL);
  }
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

// Get the Yahoo callback URL and log it for debugging.
// This is used only for informational/debug purposes; NextAuth derives the
// actual callback URL from NEXTAUTH_URL automatically.
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
    signIn: '/auth/signin',  // Displays signin buttons
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

      const userId: string = (token.sub as string | undefined) ?? 'unknown';
      if (token.error) {
        console.warn(
          `[kbb:auth] session callback: token error detected for user "${userId}": ${token.error}`
        );
      } else {
        console.info(
          `[kbb:auth] session callback: session hydrated for user "${userId}" — error present: false`
        );
      }

      return session;
    },
    async jwt({ token, account, user }): Promise<RefreshableJWT> {
      const jwtToken: RefreshableJWT = token as RefreshableJWT;

      // Initial sign in
      if (account && user) {
        console.info('[kbb:auth] jwt callback: initial sign-in for user', user.id);
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
        const expiresAt: string = new Date(jwtToken.accessTokenExpires).toISOString();
        console.info(
          `[kbb:auth] jwt callback: token still valid for user "${jwtToken.sub ?? 'unknown'}" — expires at ${expiresAt}`
        );
        return jwtToken;
      }

      // Access token has expired, try to refresh it
      if (jwtToken.refreshToken) {
        console.info(
          `[kbb:auth] jwt callback: access token expired for user "${jwtToken.sub ?? 'unknown'}" — triggering refresh`
        );
        return refreshAccessToken(jwtToken);
      }

      // No refresh token available - return as-is and let the client handle sign-in
      console.warn(
        `[kbb:auth] jwt callback: no refresh token available for user "${jwtToken.sub ?? 'unknown'}" — setting RefreshAccessTokenError`
      );
      jwtToken.error = 'RefreshAccessTokenError';
      return jwtToken;
    },
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events
  events: {
    async signIn({ user }) {
      console.info(`[kbb:auth] event signIn: user "${user.id}" (${user.email ?? 'no email'}) signed in`);
    },
    async signOut({ token }) {
      const jwtToken: RefreshableJWT = token as RefreshableJWT;
      console.info(`[kbb:auth] event signOut: user "${jwtToken.sub ?? 'unknown'}" signed out`);
    },
    async session({ token }) {
      const jwtToken: RefreshableJWT = token as RefreshableJWT;
      console.debug(
        `[kbb:auth] event session: session accessed for user "${jwtToken.sub ?? 'unknown'}" — error: ${jwtToken.error ?? 'none'}`
      );
    },
    async createUser({ user }) {
      console.info(`[kbb:auth] event createUser: new user created — id="${user.id}" email="${user.email ?? 'no email'}"`);
    },
  },

  // Enable debug messages in the console if you are having problems
  debug: true,
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
    const url: string | undefined = process.env.YAHOO_TOKEN_URL;
    const clientId: string | undefined = process.env.YAHOO_CLIENT_ID;
    const clientSecret: string | undefined = process.env.YAHOO_CLIENT_SECRET;
    const refreshToken: string | undefined = token.refreshToken;

    if (!url || !clientId || !clientSecret) {
      console.error('[kbb:auth] refreshAccessToken: missing Yahoo token refresh environment variables');
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    if (!refreshToken) {
      console.error('[kbb:auth] refreshAccessToken: no refresh token available');
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    // Build the redirect_uri from the same logic used for the initial OAuth flow
    const redirectUri: string = getYahooCallbackUrl();

    // Mask the client ID for logging (show first 6 chars only)
    const maskedClientId: string =
      clientId.length > 6 ? `${clientId.slice(0, 6)}…` : '***';

    console.info(
      '[kbb:auth] refreshAccessToken: initiating token refresh',
      JSON.stringify({
        tokenUrl: url,
        grant_type: 'refresh_token',
        redirect_uri: redirectUri,
        client_id: maskedClientId,
      })
    );

    // Yahoo requires HTTP Basic Auth (Base64-encoded "client_id:client_secret")
    // for the token endpoint. Sending credentials in the request body causes a
    // 401 "invalid_client" error.
    const basicAuthCredentials: string = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuthCredentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: redirectUri,
      }),
    });

    const responseText: string = await response.text();

    console.info(
      `[kbb:auth] refreshAccessToken: Yahoo token endpoint responded — HTTP ${response.status}`,
      JSON.stringify({ status: response.status, body: responseText })
    );

    let refreshedTokens: Record<string, unknown> = {};
    try {
      refreshedTokens = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        '[kbb:auth] refreshAccessToken: failed to parse Yahoo refresh response',
        parseError,
        responseText
      );
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    if (!response.ok || typeof refreshedTokens.access_token !== 'string') {
      console.error(
        `[kbb:auth] refreshAccessToken: token refresh failed — HTTP ${response.status}`,
        JSON.stringify({ status: response.status, responseBody: refreshedTokens })
      );
      token.error = 'RefreshAccessTokenError';
      return token;
    }

    const accessToken: string = refreshedTokens.access_token as string;
    const nextRefreshToken: string | undefined =
      typeof refreshedTokens.refresh_token === 'string'
        ? refreshedTokens.refresh_token
        : token.refreshToken;
    const expiresIn: number =
      typeof refreshedTokens.expires_in === 'number'
        ? refreshedTokens.expires_in
        : typeof refreshedTokens.expires_in === 'string'
        ? Number(refreshedTokens.expires_in)
        : 3600;

    token.accessToken = accessToken;
    token.accessTokenExpires = Date.now() + expiresIn * 1000;
    token.refreshToken = nextRefreshToken;

    const newExpiryIso: string = new Date(token.accessTokenExpires).toISOString();
    console.info(
      `[kbb:auth] refreshAccessToken: token refresh succeeded — new access token expires at ${newExpiryIso}`
    );

    return token;
  } catch (error) {
    console.error('[kbb:auth] refreshAccessToken: unexpected error during token refresh', error);
    token.error = 'RefreshAccessTokenError';
    return token;
  }
}
