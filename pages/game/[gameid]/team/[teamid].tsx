import { useRouter } from 'next/router';
import Layout from '../../../../components/layout';
import useSwr from 'swr';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import leagueStyles from '../../../../components/leagues.module.css';
const StatCard = dynamic(() => import('../../../../components/statcard'), {
  ssr: false,
});

const fetcher = (url: String) => fetch(url).then((res) => res.json());

export function generateChartData(stat_id, weekly_stats_data) {
  var dataset = [];
  weekly_stats_data.stats_by_week.forEach((stats) => {
    stats.stats.stat.forEach((stat) => {
      if (stat.stat_id === stat_id) {
        if (stat_id == 60) {
          var value = stat.value.split('/')[0];
          dataset.push(value);
        } else {
          dataset.push(stat.value);
        }
      }
    });
  });
  console.log('stat id: ' + stat_id);
  return dataset.reverse();
}

export function generateDelta(stat_id, weekly_stats_data) {
  var this_week_value = 0;
  var last_week_value = 0;
  var this_week = weekly_stats_data.stats_by_week[0];
  var last_week = weekly_stats_data.stats_by_week[1];
  this_week.stats.stat.forEach((stat) => {
    if (stat.stat_id === stat_id) {
      if (stat_id == 60) {
        var value = stat.value.split('/')[0];
        this_week_value = value;
      } else {
        this_week_value = stat.value;
      }
    }
  });
  last_week.stats.stat.forEach((stat) => {
    if (stat.stat_id === stat_id) {
      if (stat_id == 60) {
        var value = stat.value.split('/')[0];
        last_week_value = value;
      } else {
        last_week_value = stat.value;
      }
    }
  });
  return (this_week_value - last_week_value) % 1 === 0
    ? this_week_value - last_week_value
    : (this_week_value - last_week_value).toFixed(3);
}

export function generateCurrentValue(stat_id, weekly_stats_data) {
  var this_week = weekly_stats_data.stats_by_week[0];
  var value = '';
  this_week.stats.stat.forEach((stat) => {
    if (stat.stat_id === stat_id) {
      value = stat.value;
      console.log(stat.value);
    }
  });
  return value;
}

const Team = () => {
  const router = useRouter();
  const { gameid, teamid } = router.query;
  const league_info_route = `/api/leagueinfo/${gameid}`;
  const team_stats_route = `/api/teamstats/${gameid}.t.${teamid}`;
  const stats_response = useSwr(league_info_route, fetcher);
  const weekly_stat_response = useSwr(team_stats_route, fetcher);

  if (stats_response.error || weekly_stat_response.error)
    return <div>Failed to load teams</div>;
  if (!stats_response.data || !weekly_stat_response.data)
    return <div>Loading...</div>;

  return (
    <Layout>
      <p>League Stats</p>
      <div className={leagueStyles.grid2}>
        {stats_response.data.settings.stat_categories.stats.stat.map((stat) => (
          <div key={stat.name}>
            <StatCard
              name={stat.name}
              shortName={stat.display_name}
              delta={generateDelta(stat.stat_id, weekly_stat_response.data)}
              deltaDirection={
                generateDelta(stat.stat_id, weekly_stat_response.data) > 0
                  ? 1
                  : -1
              }
              currentValue={generateCurrentValue(
                stat.stat_id,
                weekly_stat_response.data
              )}
              chartData={generateChartData(
                stat.stat_id,
                weekly_stat_response.data
              )}
            ></StatCard>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Team;
