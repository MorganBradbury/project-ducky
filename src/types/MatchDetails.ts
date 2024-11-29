import { SystemUser } from "./SystemUser";

export type MatchDetails = {
  matchId: string;
  mapName: string;
  matchLink: string;
  matchingPlayers: SystemUser[];
  faction: string; // Faction name will be added here
  results?: MatchFinishedDetails;
};

export type MatchFinishedDetails = {
  finalScore: string;
  win: boolean;
};
