import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

/**
 * Custom signin page that automatically redirects to Yahoo OAuth.
 * This page handles direct navigation to /api/auth/signin by immediately
 * initiating the Yahoo signin flow.
 */
export default function SignIn() {
  useEffect(() => {
    // Automatically redirect to Yahoo signin
    signIn('yahoo', { redirect: true, callbackUrl: '/' });
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Redirecting to Yahoo signin...</p>
    </div>
  );
}
