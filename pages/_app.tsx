import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { SessionProviderProps } from 'next-auth/react';
import type { AppProps } from 'next/app';
import React from 'react';
import './styles.css';

// Wrapper to fix type compatibility with React 19
const SessionProvider = NextAuthSessionProvider as React.FC<SessionProviderProps>;

// Use the <SessionProvider> to improve performance and allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({ Component, pageProps }: AppProps) {
  const { session, ...restPageProps } = pageProps;
  return (
    <SessionProvider session={session}>
      <Component {...restPageProps} />
    </SessionProvider>
  );
}
