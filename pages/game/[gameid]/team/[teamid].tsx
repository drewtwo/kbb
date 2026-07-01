import { useRouter } from 'next/router';
import Layout from '../../../../components/layout';
import useSwr from 'swr';
import dynamic from 'next/dynamic';

const StatCard = dynamic(() => import('../../../../components/statcard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Stat {
  stat_id: string;
  value: string;
}

interface WeekStats {
  stats: {
    stat: Stat[];
  };
}

interface WeeklyStatsData {
  stats_by_week: WeekStats[];
}

interface StatCategory {
  stat_id: string;
  name: string;
  display_name: string;
}

export function generateChartData(stat_id: string, weekly_stats_data: WeeklyStatsData): (string | number)[] {
  const dataset: (string | number)[] = [];
  weekly_stats_data.stats_by_week.forEach((stats) => {
    stats.stats.stat.forEach((stat) => {
      if (stat.stat_id === stat_id) {
        if (stat_id === '60') {
          const value = stat.value.split('/')[0];
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

export function generateDelta(stat_id: string, weekly_stats_data: WeeklyStatsData): number | string {
  let this_week_value: string | number = 0;
  let last_week_value: string | number = 0;
  const this_week = weekly_stats_data.stats_by_week[0];
  const last_week = weekly_stats_data.stats_by_week[1];
  this_week.stats.stat.forEach((stat) => {
    if (stat.stat_id === stat_id) {
      if (stat_id === '60') {
        const value = stat.value.split('/')[0];
        this_week_value = value;
      } else {
        this_week_value = stat.value;
      }
    }
  });
  last_week.stats.stat.forEach((stat) => {
    if (stat.stat_id === stat_id) {
      if (stat_id === '60') {
        const value = stat.value.split('/')[0];
        last_week_value = value;
      } else {
        last_week_value = stat.value;
      }
    }
  });
  const delta = Number(this_week_value) - Number(last_week_value);
  return delta % 1 === 0 ? delta : delta.toFixed(3);
}

export function generateCurrentValue(stat_id: string, weekly_stats_data: WeeklyStatsData): string {
  const this_week = weekly_stats_data.stats_by_week[0];
  let value = '';
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
  const gameIdStr = Array.isArray(gameid) ? gameid[0] : gameid;
  const teamIdStr = Array.isArray(teamid) ? teamid[0] : teamid;
  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const team_stats_route = `/api/teamstats/${gameIdStr}.t.${teamIdStr}`;
  const stats_response = useSwr(gameIdStr ? league_info_route : null, fetcher);
  const weekly_stat_response = useSwr(teamIdStr ? team_stats_route : null, fetcher);

  if (stats_response.error || weekly_stat_response.error)
    return <div>Failed to load teams</div>;
  if (!stats_response.data || !weekly_stat_response.data)
    return <div>Loading...</div>;

  return (
    <Layout>
      <p>League Stats</p>
      <div>
        {stats_response.data.settings.stat_categories.stats.stat.map((stat: StatCategory) => (
          <div key={stat.name}>
            <StatCard
              name={stat.name}
              shortName={stat.display_name}
              delta={generateDelta(stat.stat_id, weekly_stat_response.data)}
              deltaDirection={
                Number(generateDelta(stat.stat_id, weekly_stat_response.data)) > 0
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
