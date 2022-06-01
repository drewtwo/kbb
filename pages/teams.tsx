import Layout from '../components/layout';

export default function Page() {
  return (
    <Layout>
      <h1>Teams Example</h1>
      <p>The examples below show responses from the Teams endpoints.</p>
      <p>
        <em>You must be signed in to see responses.</em>
      </p>
      <h2>JSON Web Token</h2>
      <p>/api/examples/jwt</p>
      <iframe src="/api/examples/jwt" />
      <h2>Teams Response</h2>
      <p>/api/teams/</p>
      <iframe src="/api/teams" />
    </Layout>
  );
}
