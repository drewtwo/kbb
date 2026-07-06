import React, { useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { StatCategory, LeagueAggregatedStats } from '../utils/yahooData';
import { buildChartData, TEAM_COLORS } from '../utils/yahooData';
import styles from './league-stats-chart.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface LeagueStatsChartProps {
  /** Aggregated season stats for all teams, keyed by team_key. */
  aggregatedStats: LeagueAggregatedStats;
  /** Stat categories available for selection. */
  statCategories: StatCategory[];
}

/**
 * Renders a bar chart comparing all teams for a selected stat category.
 * A dropdown allows the user to switch between available stat categories.
 */
const LeagueStatsChart: React.FC<LeagueStatsChartProps> = ({
  aggregatedStats,
  statCategories,
}) => {
  const [selectedStatId, setSelectedStatId] = useState<string>(
    statCategories.length > 0 ? statCategories[0].stat_id : ''
  );

  const handleStatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatId(e.target.value);
    },
    []
  );

  if (statCategories.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <p>No stat categories available to display.</p>
      </div>
    );
  }

  const selectedCategory: StatCategory | undefined = statCategories.find(
    (cat: StatCategory) => cat.stat_id === selectedStatId
  );

  const chartData = buildChartData(aggregatedStats, selectedStatId, TEAM_COLORS);

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: selectedCategory
          ? `${selectedCategory.display_name} — All Teams`
          : 'League Stats',
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1a1a2e',
        padding: { bottom: 12 },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) {
              return `${context.label}: N/A`;
            }
            return `${context.label}: ${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
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
      <div className={styles.chartHeader}>
        <label htmlFor="stat-select" className={styles.selectLabel}>
          Stat Category:
        </label>
        <select
          id="stat-select"
          className={styles.statSelect}
          value={selectedStatId}
          onChange={handleStatChange}
        >
          {statCategories.map((cat: StatCategory) => (
            <option key={cat.stat_id} value={cat.stat_id}>
              {cat.display_name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.chartWrapper}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default LeagueStatsChart;
