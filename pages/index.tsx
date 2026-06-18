import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../components/layout';

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/teamstable');
    }
  }, [status, router]);

  return (
    <Layout>
      <h1>King Bee Baseball</h1>
      <p>Please sign in to continue.</p>
    </Layout>
  );
}
