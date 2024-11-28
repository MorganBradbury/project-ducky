export type MatchDetails = {
  matchId: string;
  mapName: string;
  matchLink: string;
  matchingPlayers: string[];
  faction: string; // Faction name will be added here
  results?: MatchFinishedDetails;
};

export type MatchFinishedDetails = {
  finalScore: string;
  winningTeam: string;
  win: boolean;
};
