import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import useSwr from 'swr';
import type { LeagueAggregatedStats, StandingsTeam } from '../../../utils/yahooData';
import StandingsTable from '../../../components/standings-table';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface GameInfoData {
  error?: string;
  teams?: {
    league?: {
      teams?: {
        team?: { name: string; team_id: string; team_key: string } | { name: string; team_id: string; team_key: string }[];
      };
    };
  };
  /** Aggregated season stats for all teams, keyed by team_key. */
  aggregated_stats?: LeagueAggregatedStats;
  /** League standings — one entry per team, sorted by rank. */
  standings?: StandingsTeam[];
  /** True when the season has finished. */
  is_finished?: boolean;
}

const League = () => {
  const router = useRouter();
  const { gameid } = router.query;
  const gameIdStr: string = Array.isArray(gameid) ? gameid[0] : (gameid ?? '');

  // Use the leagueinfo endpoint which now includes standings and aggregated_stats
  const league_info_route = `/api/leagueinfo/${gameIdStr}`;
  const { data, error } = useSwr<GameInfoData>(gameIdStr ? league_info_route : null, fetcher);

  if (error) return <div>Failed to load teams</div>;
  if (!data) return <div>Loading...</div>;

  if (data.error) {
    return (
      <Layout>
        <p>Error loading game data: {data.error}</p>
      </Layout>
    );
  }

  const standings: StandingsTeam[] | undefined = data.standings;
  const isFinished: boolean = data.is_finished ?? false;
  const aggregatedStats: LeagueAggregatedStats | undefined = data.aggregated_stats;

  if (aggregatedStats) {
    console.log(
      `[GamePage] Received aggregated stats for ${Object.keys(aggregatedStats.teams).length} teams`,
      `(weeks ${aggregatedStats.week_range.start}–${aggregatedStats.week_range.end})`
    );
  } else {
    console.warn('[GamePage] No aggregated_stats in API response — multi-week aggregation unavailable');
  }

  return (
    <Layout>
      <p>League ID: {gameid}</p>
      {aggregatedStats && (
        <p>
          Season stats aggregated across weeks {aggregatedStats.week_range.start}–
          {aggregatedStats.week_range.end}
        </p>
      )}
      {standings && standings.length > 0 ? (
        <StandingsTable
          gameId={gameIdStr}
          standings={standings}
          isFinished={isFinished}
        />
      ) : (
        <p>No standings data available.</p>
      )}
    </Layout>
  );
};

export default League;
