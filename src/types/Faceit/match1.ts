import { SystemUser } from "../system-user";

export type Match = {
  matchId: string;
  mapName: string;
  trackedTeam: {
    teamId: string;
    faction: string;
    trackedPlayers: SystemUser[];
  };
  voiceChannelId?: string;
};
