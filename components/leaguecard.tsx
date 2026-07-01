import Link from 'next/link';
import Image from 'next/image';

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
}

export function generateAvatar(team: Team): string {
  if (typeof team.team_logo === 'string' || team.team_logo instanceof String) {
    return team.team_logo as string;
  } else if (
    team.team_logos &&
    (typeof team.team_logos.team_logo.url === 'string' ||
      team.team_logos.team_logo.url instanceof String)
  ) {
    return team.team_logos.team_logo.url;
  } else {
    return 'https://i.imgur.com/vRAtM3i.jpg';
  }
}

const LeagueCard = ({ game, team }: LeagueCardProps) => (
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
  </div>
);

export default LeagueCard;
