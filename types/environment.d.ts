declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      YAHOO_AUTH_URL: string;
      YAHOO_TOKEN_URL: string;
      YAHOO_CLIENT_ID: string;
      YAHOO_CLIENT_SECRET: string;
      YAHOO_CALLBACK_URL: string;
      NODE_ENV: 'development' | 'production';
      GITHUB_ID: string;
      GITHUB_SECRET: string;
      SECRET: string;
    }
  }
}
