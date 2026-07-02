import { SessionProvider } from 'next-auth/react';
import type { SessionProviderProps } from 'next-auth/react';
import type { AppProps } from 'next/app';
import React from 'react';
import './styles.css';

// Use the <SessionProvider> to improve performance and allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session as any}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
