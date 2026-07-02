import Link from 'next/link';
import Image from 'next/image';
import type { AggregatedTeamStats } from '../utils/yahooData';

interface Team {
  team_logo?: string;
  team_logos?: {
    team_logo: {
      url: string;
    };
  };
  team_key: string;
  name: string;
}

interface Game {
  name: string;
  season: string;
}

interface LeagueCardProps {
  game: Game;
  team: Team;
  /** Optional aggregated season stats for this team, keyed by stat_id. */
  aggregatedStats?: AggregatedTeamStats;
}

export function generateAvatar(team: Team): string {
  if (typeof team.team_logo === 'string') {
    return team.team_logo;
  } else if (
    team.team_logos &&
    typeof team.team_logos.team_logo.url === 'string'
  ) {
    return team.team_logos.team_logo.url;
  } else {
    return 'https://i.imgur.com/vRAtM3i.jpg';
  }
}

/**
 * Formats a numeric stat value for display.
 * Rounds to at most 3 decimal places and removes trailing zeros.
 */
function formatStatValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return parseFloat(value.toFixed(3)).toString();
}

/**
 * Returns a sorted list of [stat_id, value] pairs from the aggregated stats
 * object, ordered by stat_id numerically so the display is consistent.
 */
function getSortedStatEntries(stats: Record<string, number>): [string, number][] {
  return Object.entries(stats).sort(
    ([a], [b]) => Number(a) - Number(b)
  );
}

const LeagueCard = ({ game, team, aggregatedStats }: LeagueCardProps) => (
  <div>
    <Link href={`/game/${team.team_key.split('.t')[0]}`}>
      <div>
        <p>{team.name}</p>
        <p>{game.name}</p>
        <p>{game.season}</p>
        <Image
          src={generateAvatar(team)}
          alt={'image not found'}
          width={500}
          height={500}
        />
      </div>
    </Link>

    {aggregatedStats && (
      <div>
        <p>
          Season stats ({aggregatedStats.weeks_counted} week
          {aggregatedStats.weeks_counted !== 1 ? 's' : ''} aggregated)
        </p>
        <ul>
          {getSortedStatEntries(aggregatedStats.stats).map(([stat_id, value]) => (
            <li key={stat_id}>
              Stat {stat_id}: {formatStatValue(value)}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default LeagueCard;
