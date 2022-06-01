import useSwr from 'swr';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const LeagueCard = dynamic(() => import('../components/LeagueCard'), {
  ssr: false,
});

const fetcher = (url: String) => fetch(url).then((res) => res.json());

export default function Index() {
  const { data, error } = useSwr('/api/teams', fetcher);

  if (error) return <div>Failed to load users</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <div>
      {data.map((game) =>
        Array.isArray(game.teams.team) ? (
          game.teams.team.map((inner_team) => (
            <LeagueCard
              key={inner_team.team_key}
              game={game}
              team={inner_team}
            ></LeagueCard>
          ))
        ) : (
          <LeagueCard
            key={game.teams.team.team_key}
            game={game}
            team={game.teams.team}
          ></LeagueCard>
        )
      )}
    </div>
  );
}
