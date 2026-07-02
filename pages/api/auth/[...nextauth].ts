import NextAuth from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import { getYahooCallbackUrl } from '../../../lib/get-callback-url';

interface YahooProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
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
    // async session({ session, token, user }) { return session },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },

  // Events are useful for logging
  // https://next-auth.js.org/configuration/events
  events: {},

  // Enable debug messages in the console if you are having problems
  debug: false,
});
