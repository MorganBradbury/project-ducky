import { SystemUser } from "./SystemUser";

export type MatchDetails = {
  matchId: string;
  mapName: string;
  matchingPlayers: SystemUser[];
  faction: string; // Faction name will be added here
  results?: MatchFinishedDetails;
  voiceChannelId?: string;
};

export type MatchFinishedDetails = {
  finalScore: string;
  win: boolean;
};
