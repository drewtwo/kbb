import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const StatCard = dynamic(() => import('../../components/StatCard'), {
  ssr: false,
});

const fetcher = (url: String) => fetch(url).then((res) => res.json());

const League = () => {
  const router = useRouter();
  const { id } = router.query;
  const league_info_route = `/api/leagueinfo/${id}`;
  const { data, error } = useSwr(league_info_route, fetcher);

  if (error) return <div>Failed to load teams</div>;
  if (!data) return <div>Loading...</div>;
  data.settings.stat_categories.stats.stat.map((stat) => {
    console.log(JSON.stringify(stat, null, 2));
  });
  return (
    <Layout>
      <p>League ID: {id}</p>
      <ul>
        {data.teams.teams.team.map((team) => (
          <li key={team.name}>
            <a>{`Team Name: ${JSON.stringify(team.name)}`}</a>
          </li>
        ))}
      </ul>
      <p>League Settings</p>
      <ul>
        {data.settings.stat_categories.stats.stat.map((stat) => (
          <div key={stat.name}>
            <StatCard
              name={stat.name}
              shortName={stat.display_name}
              delta={'1.1'}
              deltaDirection={1}
              currentValue={19}
              chartData={[1, 2, 3, 4, 1]}
            ></StatCard>
          </div>
        ))}
      </ul>
    </Layout>
  );
};

export default League;
