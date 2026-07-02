declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      YAHOO_AUTH_URL: string;
      YAHOO_TOKEN_URL: string;
      YAHOO_CLIENT_ID: string;
      YAHOO_CLIENT_SECRET: string;
      /** @deprecated YAHOO_CALLBACK_URL is auto-generated at runtime from NEXTAUTH_URL. Do not set manually. */
      YAHOO_CALLBACK_URL?: string;
      NODE_ENV: 'development' | 'production';
      GITHUB_ID: string;
      GITHUB_SECRET: string;
      NEXTAUTH_URL?: string;
      NEXTAUTH_SECRET: string; // Required in production, validated at runtime
      VERCEL_URL?: string;
      /**
       * First week of the season to include in multi-week stat aggregation (1-based, inclusive).
       * Defaults to 1 when not set.
       * @example "1"
       */
      NEXT_PUBLIC_SEASON_START_WEEK?: string;
      /**
       * Last week of the season to include in multi-week stat aggregation (1-based, inclusive).
       * Defaults to 15 when not set.
       * @example "15"
       */
      NEXT_PUBLIC_SEASON_END_WEEK?: string;
    }
  }
}

export {};
