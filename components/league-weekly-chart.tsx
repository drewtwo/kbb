import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { StatCategory, LeagueWeeklyStats, StatEntry } from '../utils/yahooData';
import { TEAM_COLORS } from '../utils/yahooData';
import styles from './league-weekly-chart.module.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

interface LeagueWeeklyChartProps {
  /** Per-team per-week stats for the entire league (oldest week first). */
  weeklyStats: LeagueWeeklyStats;
  /** Stat categories available for selection. */
  statCategories: StatCategory[];
  /** The currently selected stat_id (controlled — no internal dropdown). */
  selectedStatId: string;
}

/**
 * Renders a line chart showing each team's weekly progression for the
 * selected stat category.  The selected stat is controlled externally —
 * no dropdown is rendered here; the parent page owns the selection state
 * and shares it with LeagueStatsChart via a single dropdown.
 */
const LeagueWeeklyChart: React.FC<LeagueWeeklyChartProps> = ({
  weeklyStats,
  statCategories,
  selectedStatId,
}) => {
  const teamKeys: string[] = Object.keys(weeklyStats);

  if (teamKeys.length === 0 || statCategories.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <p>No weekly data available to display.</p>
      </div>
    );
  }

  const selectedCategory: StatCategory | undefined = statCategories.find(
    (cat: StatCategory) => cat.stat_id === selectedStatId
  );

  // Determine the maximum number of weeks across all teams so labels are consistent
  const maxWeeks: number = Math.max(
    ...teamKeys.map((key: string) => weeklyStats[key].weekly.length)
  );

  if (maxWeeks === 0) {
    return (
      <div className={styles.chartEmpty}>
        <p>No weekly data available to display.</p>
      </div>
    );
  }

  // Build x-axis labels: "Week 1", "Week 2", …
  const labels: string[] = Array.from(
    { length: maxWeeks },
    (_: unknown, i: number) => `Week ${i + 1}`
  );

  // Build one dataset per team
  const datasets = teamKeys.map((teamKey: string, idx: number) => {
    const teamEntry = weeklyStats[teamKey];
    const color: string = TEAM_COLORS[idx % TEAM_COLORS.length];
    const solidColor: string = color.replace('0.8)', '1)');

    const data: (number | null)[] = teamEntry.weekly.map(
      (weekStats: StatEntry[]) => {
        if (!weekStats || weekStats.length === 0) {
          return null;
        }
        const entry: StatEntry | undefined = weekStats.find(
          (s: StatEntry) => s.stat_id === selectedStatId
        );
        if (!entry) {
          return null;
        }
        // For stat_id "60" (Innings Pitched), the value is "X/Y" — use the numerator
        const rawValue: string =
          entry.stat_id === '60'
            ? (entry.value?.split('/')[0] ?? '0')
            : (entry.value ?? '0');
        const numeric: number = Number(rawValue);
        return isNaN(numeric) ? null : numeric;
      }
    );

    return {
      label: teamEntry.team_name,
      data,
      borderColor: solidColor,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.3,
      spanGaps: true,
    };
  });

  const chartData = { labels, datasets };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          font: { size: 11 },
          boxWidth: 14,
          padding: 12,
        },
      },
      title: {
        display: true,
        text: selectedCategory
          ? `${selectedCategory.display_name} — Weekly Trend`
          : 'Weekly Trend',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#1a1a2e',
        padding: { bottom: 12 },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y;
            if (typeof value !== 'number' || isNaN(value)) {
              return `${context.dataset.label}: N/A`;
            }
            const formatted: string =
              value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
            return `${context.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 30,
          minRotation: 0,
          font: { size: 11 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11 } },
        grid: { color: '#e0e0e0' },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartWrapper}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default LeagueWeeklyChart;
