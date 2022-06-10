import { UserCard } from 'react-ui-cards';

export function generateAvatar(team) {
  if (typeof team.team_logo === 'string' || team.team_logo instanceof String) {
    return team.team_logo;
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

const LeagueCard = ({ game, team }) => (
  <UserCard
    float
    href={`/game/${team.team_key.split('.t')[0]}`}
    header="https://i.imgur.com/vRAtM3i.jpg"
    avatar={generateAvatar(team)}
    name={team.name}
    positionName={`${game.name} ${game.season}`}
  />
);

export default LeagueCard;
