import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

/**
 * Custom signin page that delegates to NextAuth's signIn() function.
 * Using NextAuth's built-in signIn() ensures proper PKCE/state parameter
 * management, CSRF protection, and session creation through NextAuth's
 * callback handler — avoiding the session expiration errors that occur
 * when the OAuth flow is initiated outside of NextAuth.
 */
export default function SignIn() {
  useEffect(() => {
    // Use NextAuth's signIn() so that state, nonce, and PKCE parameters are
    // generated and verified by NextAuth itself, preventing OAuthSessionCheck
    // and state-mismatch errors during the callback.
    void signIn('yahoo', { callbackUrl: '/' });
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Redirecting to Yahoo signin...</p>
    </div>
  );
}
