import { useRouter } from 'next/router';
import Layout from '../../../../components/layout';
import useSwr from 'swr';
import dynamic from 'next/dynamic';
import leagueStyles from '../../../../components/leagues.module.css';
import { WeekStats, ErrorResponse, StatsContainer, StatCategory } from '../../../../types/yahooFantasy';

const StatCard = dynamic(() => import('../../../../components/statcard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Stat {
  stat_id: string;
  value: string;
}

interface WeeklyStatsData {
  stats_by_week: WeekStats[];
}

interface SettingsData {
  settings: {
    stat_categories: {
      stats: {
        stat: StatCategory[];
      };
    };
  };
}

export function generateChartData(stat_id: string, weekly_stats_data: WeeklyStatsData): (string | number)[] {
  const dataset: (string | number)[] = [];
  weekly_stats_data.stats_by_week.forEach((stats) => {
    if (!stats.stats) return;
    const statsArray = Array.isArray(stats.stats.stat)
      ? stats.stats.stat
      : [stats.stats.stat];
    statsArray.forEach((stat: Stat) => {
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

  if (!this_week || !this_week.stats) {
    return 0;
  }

  if (!last_week || !last_week.stats) {
    return 0;
  }

  const thisWeekStatsArray = Array.isArray(this_week.stats.stat)
    ? this_week.stats.stat
    : [this_week.stats.stat];
  const lastWeekStatsArray = Array.isArray(last_week.stats.stat)
    ? last_week.stats.stat
    : [last_week.stats.stat];

  thisWeekStatsArray.forEach((stat: Stat) => {
    if (stat.stat_id === stat_id) {
      if (stat_id === '60') {
        const value = stat.value.split('/')[0];
        this_week_value = value;
      } else {
        this_week_value = stat.value;
      }
    }
  });

  lastWeekStatsArray.forEach((stat: Stat) => {
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

  if (!this_week || !this_week.stats) {
    return value;
  }

  const statsArray = Array.isArray(this_week.stats.stat)
    ? this_week.stats.stat
    : [this_week.stats.stat];

  statsArray.forEach((stat: Stat) => {
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

  // Type guards for stats_response
  if ('error' in stats_response.data && typeof (stats_response.data as any).error === 'string') {
    return <div>Error loading league info: {(stats_response.data as any).error}</div>;
  }

  // Type guards for weekly_stat_response
  if ('error' in weekly_stat_response.data && typeof (weekly_stat_response.data as any).error === 'string') {
    return <div>Error loading team stats: {(weekly_stat_response.data as any).error}</div>;
  }

  const settingsData = stats_response.data as any;
  if (!settingsData.settings || !settingsData.settings.stat_categories) {
    return <div>No settings data available</div>;
  }

  const statCategoriesData = settingsData.settings.stat_categories as any;
  if (!statCategoriesData.stats) {
    return <div>No stat categories available</div>;
  }

  const statsArray = Array.isArray(statCategoriesData.stats.stat)
    ? statCategoriesData.stats.stat
    : [statCategoriesData.stats.stat];

  const weeklyStatsData = weekly_stat_response.data as WeeklyStatsData;
  if (!weeklyStatsData.stats_by_week || weeklyStatsData.stats_by_week.length === 0) {
    return <div>No weekly stats available</div>;
  }

  return (
    <Layout>
      <p>League Stats</p>
      <div className={leagueStyles.grid2}>
        {statsArray.map((stat: StatCategory) => (
          <div key={stat.stat_id}>
            <StatCard
              name={stat.name}
              shortName={stat.display_name}
              delta={generateDelta(stat.stat_id, weeklyStatsData)}
              deltaDirection={
                Number(generateDelta(stat.stat_id, weeklyStatsData)) > 0
                  ? 1
                  : -1
              }
              currentValue={generateCurrentValue(
                stat.stat_id,
                weeklyStatsData
              )}
              chartData={generateChartData(
                stat.stat_id,
                weeklyStatsData
              )}
            ></StatCard>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Team;
