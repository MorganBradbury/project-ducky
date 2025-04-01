export interface SystemUser {
  userId: number;
  discordUsername: string;
  faceitUsername: string;
  previousElo: number;
  gamePlayerId: string;
  faceitId: string | null; // Change here to allow null
  startOfMonthElo: string | null;
  startOfMonthPosition: number | null;
  gamesPlayedThisMonth?: number | null;
}
