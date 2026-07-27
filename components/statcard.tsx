import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './statcard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
  shortName: _shortName,
  delta,
  deltaDirection,
  currentValue,
  chartData,
}: StatCardProps) => {
  // Determine if delta is positive or negative
  const isDeltaPositive = deltaDirection > 0;
  const isDeltaNegative = deltaDirection < 0;

  // Determine chart color based on delta direction
  const chartColor = isDeltaPositive
    ? 'rgba(34, 197, 94, 0.5)'
    : isDeltaNegative
      ? 'rgba(239, 68, 68, 0.5)'
      : 'rgba(59, 130, 246, 0.5)';

  const borderColor = isDeltaPositive
    ? 'rgba(34, 197, 94, 1)'
    : isDeltaNegative
      ? 'rgba(239, 68, 68, 1)'
      : 'rgba(59, 130, 246, 1)';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 12,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 11,
        },
        borderColor: borderColor,
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#9ca3af',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#9ca3af',
        },
      },
    },
  };

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{name}</h3>
        <div className={styles.valueContainer}>
          <span className={styles.currentValue}>{currentValue}</span>
          <div
            className={`${styles.deltaIndicator} ${
              isDeltaPositive
                ? styles.deltaPositive
                : isDeltaNegative
                  ? styles.deltaNegative
                  : styles.deltaNeutral
            }`}
          >
            <span className={styles.deltaArrow}>
              {isDeltaPositive ? '↑' : isDeltaNegative ? '↓' : '→'}
            </span>
            <span className={styles.deltaValue}>{delta}</span>
          </div>
        </div>
      </div>
      <div className={styles.chartContainer}>
        <Line
          datasetIdKey="test"
          data={{
            labels: generateLabels(chartData),
            datasets: [
              {
                label: name,
                data: chartData,
                borderColor: borderColor,
                backgroundColor: chartColor,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
              },
            ],
          }}
          options={chartOptions}
        />
      </div>
    </div>
  );
};

export default StatCard;
