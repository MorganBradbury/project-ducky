import { SystemUser } from "../types/system-user";
import { getAllUsers } from "../db/commands";
import { FaceitService } from "../api/services/faceit-service";

export const getTrackedPlayers = async (teams: any): Promise<SystemUser[]> => {
  const allTrackedUsers = await getAllUsers();
  const allMatchPlayers = [...teams.faction1.roster, ...teams.faction2.roster];
  const trackedPlayers = allTrackedUsers.filter((user: SystemUser) =>
    allMatchPlayers?.some(
      (matchPlayer) => user.faceitId === matchPlayer.player_id
    )
  );

  return trackedPlayers;
};

export const getTeamFaction = async (
  teams: any
): Promise<{ teamId: string; faction: string }> => {
  const allTrackedUsers = await getAllUsers();
  const trackedPlayers = allTrackedUsers.filter((user: SystemUser) =>
    teams?.faction1?.roster
      .map((player: any) => player.player_id)
      .includes(user.faceitId)
  );

  const faction: "faction1" | "faction2" =
    trackedPlayers.length > 0 ? "faction1" : "faction2";

  return {
    teamId: teams[faction]?.faction_id,
    faction,
  };
};

export const calculateEloDifference = async (
  previous: number,
  gamePlayerId: string
) => {
  const player = await FaceitService.getPlayer(gamePlayerId);

  if (!player) {
    console.log("Could not find player by ID", gamePlayerId);
    return null;
  }

  let eloNumbers = [previous, player.faceitElo];
  const didPlayerGain = player.faceitElo > previous;
  eloNumbers = didPlayerGain ? eloNumbers : eloNumbers.reverse();

  return {
    operator: didPlayerGain ? "+" : "-",
    difference: eloNumbers[1] - eloNumbers[0],
    newElo: player.faceitElo,
  };
};

// Optimized case variations generator
export const generateOptimizedCaseVariations = (str: string): string[] => [
  str.toLowerCase(),
  str.toUpperCase(),
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
  str.length > 1
    ? str.slice(0, -1) + str.charAt(str.length - 1).toUpperCase()
    : str,
  str,
];

export const getScoreStatusText = (mapName: string, score: string = "0:0") => {
  return `LIVE: ${mapName.replace("de_", "").toUpperCase()} (${score})`;
};

// Strip 'de_' and capitalize the first letter of the map name
export const formattedMapName = (mapName: string) =>
  mapName.replace(/^de_/, "").replace(/\b\w/g, (char) => char.toUpperCase());

export const aggregateEnemyFactionData = async (enemyFaction: any[]) => {
  const mapStats = new Map<
    string,
    { totalPlayedTimes: number; totalWins: number; totalWinPercentage: number }
  >();
  let totalPlayedTimes = 0,
    totalWins = 0,
    totalWinPercentage = 0;

  for (const player of enemyFaction) {
    try {
      const playerMapStats = await FaceitService.getMapStatsByPlayer(
        player.playerId
      );
      if (!playerMapStats) return null;

      playerMapStats.forEach((mapStat) => {
        if (!mapStats.has(mapStat.mapName)) {
          mapStats.set(mapStat.mapName, {
            totalPlayedTimes: 0,
            totalWins: 0,
            totalWinPercentage: 0,
          });
        }
        const mapData = mapStats.get(mapStat.mapName)!;
        mapData.totalPlayedTimes += mapStat.playedTimes;
        mapData.totalWins += mapStat.wins;
        mapData.totalWinPercentage += mapStat.winPercentage;
      });

      totalPlayedTimes += playerMapStats.reduce(
        (acc, stat) => acc + stat.playedTimes,
        0
      );
      totalWins += playerMapStats.reduce((acc, stat) => acc + stat.wins, 0);
      totalWinPercentage += playerMapStats.reduce(
        (acc, stat) => acc + stat.winPercentage,
        0
      );
    } catch (error) {
      console.error(
        `Error fetching map stats for player ${player.nickname}:`,
        error
      );
    }
  }

  return { totalPlayedTimes, totalWins, totalWinPercentage, mapStats };
};

export const formatMapData = (
  mapStats: Map<string, any>,
  playerCount: number
) => {
  return Array.from(mapStats.entries()).map(([mapName, stats]) => ({
    mapName,
    totalPlayedTimes: stats.totalPlayedTimes,
    totalWins: stats.totalWins,
    averageWinPercentage: (stats.totalWinPercentage / playerCount).toFixed(2),
  }));
};
