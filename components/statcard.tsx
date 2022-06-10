import { CryptoCard } from 'react-ui-cards';

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

const StatCard = ({
  name,
  shortName,
  delta,
  deltaDirection,
  currentValue,
  chartData,
}) => (
  <CryptoCard
    currencyName={name}
    currencyPrice={currentValue}
    currencyShortName={shortName}
    trend={delta}
    trendDirection={deltaDirection}
    chartColor={'green'}
    chartData={chartData}
  />
);

export default StatCard;
