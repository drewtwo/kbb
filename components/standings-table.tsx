import React from 'react';
import Link from 'next/link';
import type { StandingsTeam } from '../utils/yahooData';
import styles from './standings.module.css';

interface StandingsTableProps {
  /** The league key prefix used to build team detail links (e.g. "411.l.12345"). */
  gameId: string;
  /** Array of standings teams, expected to be sorted by rank ascending. */
  standings: StandingsTeam[];
  /** When true, renders a winner banner above the table for the rank-1 team. */
  isFinished: boolean;
}

/**
 * Renders a full league standings table.
 *
 * Columns: Rank | Team Name | W | L | T | Pts For | Pts Against | Playoff Seed
 *
 * When `isFinished` is true, a winner banner (🏆 + team name) is shown above
 * the table for the team with rank "1".
 */
const StandingsTable: React.FC<StandingsTableProps> = ({ gameId, standings, isFinished }) => {
  const winner: StandingsTeam | undefined = isFinished
    ? standings.find((t: StandingsTeam) => t.team_standings?.rank === '1')
    : undefined;

  return (
    <div>
      {isFinished && winner && (
        <div className={styles.winnerBanner}>
          <span className={styles.trophy}>🏆</span>
          <span>{winner.name}</span>
          <span className={styles.winnerLabel}>League Champion</span>
        </div>
      )}

      <table className={styles.standingsTable}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team Name</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th>Pts For</th>
            <th>Pts Against</th>
            <th>Playoff Seed</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team: StandingsTeam) => {
            const record = team.team_standings;
            const wins: string = record?.outcome_totals?.wins ?? '-';
            const losses: string = record?.outcome_totals?.losses ?? '-';
            const ties: string = record?.outcome_totals?.ties ?? '-';
            const ptsFor: string = record?.points_for ?? '-';
            const ptsAgainst: string = record?.points_against ?? '-';
            const playoffSeed: string = record?.playoff_seed ?? '-';
            const rank: string = record?.rank ?? '-';

            return (
              <tr key={team.team_id}>
                <td className={styles.rankCell}>{rank}</td>
                <td className={styles.teamNameCell}>
                  <Link href={`/game/${gameId}/team/${team.team_id}`}>
                    {team.name}
                  </Link>
                </td>
                <td>{wins}</td>
                <td>{losses}</td>
                <td>{ties}</td>
                <td>{ptsFor}</td>
                <td>{ptsAgainst}</td>
                <td>{playoffSeed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StandingsTable;
