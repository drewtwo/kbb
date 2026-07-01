declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      YAHOO_CALLBACK_URL: string;
      NODE_ENV: 'development' | 'production';
      NEXTAUTH_URL?: string;
      NEXTAUTH_SECRET?: string;
      VERCEL_URL?: string;
    }
  }
}

export {};
