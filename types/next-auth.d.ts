import type { Session as _Session } from "next-auth"
import type { JWT as _JWT } from "next-auth/jwt"

/** User profile data from Yahoo OAuth */
interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
}

/** Example on how to extend the built-in session types */
declare module "next-auth" {
  interface Session {
    /** User profile information from OAuth provider */
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Access token for API calls */
    accessToken?: string;
    /** Refresh token for token refresh */
    refreshToken?: string;
    /** Error from session refresh or token handling */
    error?: string;
  }
}

/** Example on how to extend the built-in types for JWT */
declare module "next-auth/jwt" {
  interface JWT {
    /** User ID from OAuth provider */
    sub?: string;
    /** User name */
    name?: string;
    /** User email */
    email?: string;
    /** User profile picture */
    picture?: string;
    /** OAuth access token */
    accessToken?: string;
    /** OAuth refresh token */
    refreshToken?: string;
  }
}
