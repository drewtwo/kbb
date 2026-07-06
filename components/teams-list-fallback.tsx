import React from 'react';
import Link from 'next/link';
import styles from './standings.module.css';

/**
 * A minimal team entry used by the fallback list.
 * Matches the shape of `TeamData` from `utils/yahooData` but is declared
 * locally so this component has no server-side import dependency.
 */
export interface FallbackTeam {
  team_key: string;
  team_id: string;
  name: string;
}

interface TeamsListFallbackProps {
  /**
   * The league key / game ID used to build per-team detail links
   * (e.g. "411.l.12345").
   */
  gameId: string;
  /**
   * Array of teams to display.  When empty or undefined, a "no teams"
   * message is rendered instead.
   */
  teams: FallbackTeam[];
}

/**
 * Fallback component rendered on the game page when standings data is
 * unavailable (e.g. the Yahoo `/standings` endpoint returned an error or the
 * season has not yet started).
 *
 * Displays a simple list of team names, each linking to the individual team
 * stats page, so users can still navigate to team-level data even without
 * full standings.
 */
const TeamsListFallback: React.FC<TeamsListFallbackProps> = ({ gameId, teams }) => {
  if (!teams || teams.length === 0) {
    return (
      <div className={styles.standingsEmpty}>
        <p>
          <strong>No team data available.</strong> Neither standings nor basic
          team information could be loaded for this league. This can happen when
          the league has not yet been set up or when there was a temporary error
          communicating with Yahoo Fantasy Sports.
        </p>
        <p>
          <em>Tip:</em> Check the browser console and server logs for{' '}
          <code>[leagueinfo API]</code> and{' '}
          <code>[yahooData]</code> messages to trace where the data was lost.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.standingsEmpty}>
        <p>
          <strong>Standings unavailable.</strong> Full standings data could not
          be loaded from Yahoo Fantasy Sports. The teams in this league are
          listed below — click a team name to view its individual stats page.
        </p>
        <p>
          <em>Tip:</em> Check the browser console and server logs for{' '}
          <code>[yahooData] extractStandingsFromLeagueContent</code> and{' '}
          <code>[leagueinfo API]</code> messages to trace where the standings
          data was lost.
        </p>
      </div>

      <table className={styles.standingsTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>Team Name</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team: FallbackTeam, idx: number) => (
            <tr key={team.team_id}>
              <td className={styles.rankCell}>{idx + 1}</td>
              <td className={styles.teamNameCell}>
                <Link href={`/game/${gameId}/team/${team.team_id}`}>
                  {team.name}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamsListFallback;
