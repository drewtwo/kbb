import useSwr from 'swr';
import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import leagueStyles from '../components/leagues.module.css';
import Layout from '../components/layout';
import { FantasyContent, Game, Team, TeamsContainer, ErrorResponse } from '../types/yahooFantasy';

const LeagueCard = dynamic(() => import('../components/leaguecard'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Index() {
  const { data, error } = useSwr('/api/teams', fetcher);

  if (error) return <div>Failed to load users</div>;
  if (!data) return <div>Loading...</div>;

  // Type guard to check if data is an error response
  if ('error' in data && typeof (data as ErrorResponse).error === 'string') {
    return <div>Error: {(data as ErrorResponse).error}</div>;
  }

  // Type guard to check if data has users
  const fantasyContent = data as FantasyContent;
  if (!fantasyContent.users) {
    return <div>No users data available</div>;
  }

  // Ensure users is an array
  const usersArray = Array.isArray(fantasyContent.users.user)
    ? fantasyContent.users.user
    : [fantasyContent.users.user];

  const games: Game[] = [];
  usersArray.forEach((user) => {
    if (user.games) {
      const gamesArray = Array.isArray(user.games.game)
        ? user.games.game
        : [user.games.game];
      games.push(...gamesArray);
    }
  });

  return (
    <Layout>
      <div className={leagueStyles.grid}>
        {games.map((game: Game) => {
          if (!game.teams) {
            return null;
          }

          const teamsContainer = game.teams as TeamsContainer;
          const teamArray = Array.isArray(teamsContainer.team)
            ? teamsContainer.team
            : [teamsContainer.team];

          return teamArray.map((team: Team) => (
            <LeagueCard
              key={team.team_key}
              game={game}
              team={team}
            ></LeagueCard>
          ));
        })}
      </div>
    </Layout>
  );
}
