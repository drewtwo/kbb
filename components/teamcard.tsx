import Link from 'next/link';
import Image from 'next/image';
import styles from './teamcard.module.css';
import type { YahooGame, YahooTeam } from '../types/yahooFantasy';

interface TeamCardProps {
  game: YahooGame;
  team: YahooTeam;
}

export function generateAvatar(team: YahooTeam): string {
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

const TeamCard = ({ game, team }: TeamCardProps) => {
  const gameId = team.team_key.split('.t')[0];
  const avatarUrl = generateAvatar(team);

  return (
    <Link href={`/game/${gameId}`}>
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.imageContainer}>
            <Image
              src={avatarUrl}
              alt={team.name || 'Team logo'}
              className={styles.image}
              width={120}
              height={120}
              priority={false}
            />
          </div>
          <p className={styles.teamName}>{team.name}</p>
          <p className={styles.gameName}>{game.name}</p>
          <p className={styles.season}>{game.season}</p>
        </div>
      </div>
    </Link>
  );
};

export default TeamCard;
