import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

function generateLabels(chartData) {
  var array = [];
  var i = 1;
  for (let i = 0; i < chartData.length; i++) {
    array[i] = i + 1;
  }
  return array;
}

const StatCard = ({
  name,
  shortName,
  delta,
  deltaDirection,
  currentValue,
  chartData,
}) => (
  <div>
    <Line
      datasetIdKey="test"
      data={{
        labels: generateLabels(chartData),
        datasets: [
          {
            id: 1,
            label: name,
            data: chartData,
          },
        ],
      }}
    />
  </div>
  // <CryptoCard
  //   currencyName={name}
  //   currencyPrice={currentValue}
  //   currencyShortName={shortName}
  //   trend={delta}
  //   trendDirection={deltaDirection}
  //   chartColor={'green'}
  //   chartData={chartData}
  // />
);

export default StatCard;
