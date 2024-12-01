import { SystemUser } from "./SystemUser";

export type MatchDetails = {
  matchId: string;
  mapName: string;
  matchingPlayers: SystemUser[];
  teamId: string;
  results?: MatchFinishedDetails;
  voiceChannelId?: string;
  activeScoresChannelId?: string;
  isComplete: boolean;
  currentResult?: string;
};

export type MatchFinishedDetails = {
  finalScore: string;
  win: boolean;
};
