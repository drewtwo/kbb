import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import './styles.css';

// Use the <SessionProvider> to improve performance and allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({ Component, pageProps }: AppProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SessionProvider as any)({
      session: pageProps.session,
      children: <Component {...pageProps} />,
    })
  );
}
