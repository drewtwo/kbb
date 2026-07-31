import { useEffect } from 'react';

/**
 * Custom signin page that directly redirects to Yahoo OAuth.
 * This page bypasses NextAuth's signIn() function to avoid state conflicts
 * that can cause session expiration errors. Instead, it directly constructs
 * the OAuth authorization URL and redirects to it.
 */
export default function SignIn() {
  useEffect(() => {
    // Directly redirect to Yahoo OAuth endpoint to bypass NextAuth state conflicts
    const clientId = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/callback/yahoo`;
    const state = Math.random().toString(36).substring(7);
    
    // Store state in sessionStorage for verification during callback
    sessionStorage.setItem('oauth_state', state);
    
    const yahooAuthUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${encodeURIComponent(clientId || '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;
    
    window.location.href = yahooAuthUrl;
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Redirecting to Yahoo signin...</p>
    </div>
  );
}
