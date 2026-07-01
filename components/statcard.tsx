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

interface Team {
  team_logo?: string;
  team_logos?: {
    team_logo: {
      url: string;
    };
  };
}

export function generateAvatar(team: Team): string {
  if (typeof team.team_logo === 'string') {
    return team.team_logo as string;
  } else if (
    team.team_logos &&
    typeof team.team_logos.team_logo.url === 'string'
  ) {
    return team.team_logos.team_logo.url;
  } else {
    return 'https://i.imgur.com/vRAtM3i.jpg';
  }
}

function generateLabels(chartData: (string | number)[]): number[] {
  const array: number[] = [];
  for (let i = 0; i < chartData.length; i++) {
    array[i] = i + 1;
  }
  return array;
}

interface StatCardProps {
  name: string;
  shortName: string;
  delta: number | string;
  deltaDirection: number;
  currentValue: string;
  chartData: (string | number)[];
}

const StatCard = ({
  name,
  shortName,
  delta,
  deltaDirection,
  currentValue,
  chartData,
}: StatCardProps) => (
  <div>
    <Line
      datasetIdKey="test"
      data={{
        labels: generateLabels(chartData),
        datasets: [
          {
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
