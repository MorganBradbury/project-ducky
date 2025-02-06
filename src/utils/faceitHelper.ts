import { SystemUser } from "../types/systemUser";
import { checkMatchExists, getAllUsers } from "../db/dbCommands";
import { FaceitService } from "../api/services/faceitService";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import client from "../bot/client";
import { Match } from "../types/Faceit/match";
import { getMapEmoji, getSkillLevelEmoji } from "../constants";
import { config } from "../config";

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

export async function checkIfAlreadySent(
  matchId: string | null,
  channel: TextChannel
): Promise<boolean> {
  if (!matchId) {
    return false;
  }
  const messages = await channel.messages.fetch({ limit: 5 });

  return messages.some((message: Message) =>
    message.embeds.some((embedMsg: any) =>
      embedMsg.footer?.text?.includes(matchId)
    )
  );
}

export async function generatePlayerStatsTable(
  playerStatsData: PlayerStats[],
  match: Match
) {
  return Promise.all(
    playerStatsData
      .sort((a: any, b: any) => b.kills - a.kills)
      .map(async (stat) => {
        const player = match.trackedTeam.trackedPlayers.find(
          (player) => player.faceitId === stat.playerId
        );

        const playerLevel = await FaceitService.getPlayer(
          player?.gamePlayerId || ""
        );

        const skillLevelForPlayer = getSkillLevelEmoji(
          playerLevel?.skillLevel || 1
        );

        const eloChange = await calculateEloDifference(
          player?.previousElo || 0,
          player?.gamePlayerId || ""
        );

        const playerName = player?.faceitUsername || "Unknown";
        const name =
          playerName.length > 10
            ? `${playerName.substring(0, 8)}..`
            : playerName.padEnd(10, " ");

        const kda = `${stat.kills}/${stat.deaths}/${stat.assists}`;
        const paddedKDA = kda.padEnd(8, " ");

        const elo =
          `${eloChange?.operator}${eloChange?.difference} (${eloChange?.newElo})`.padEnd(
            3,
            " "
          );

        // Return player stats with the level icon
        return `${skillLevelForPlayer} \`${name} ${paddedKDA} ${elo}\``;
      })
  );
}

export function formatMapInfo(mapName: string) {
  const mapEmoji = getMapEmoji(mapName);
  const formattedMapName = mapName
    .replace(/^de_/, "")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return { mapEmoji, formattedMapName };
}

export async function findMatchMessage(matchId: string, channelId: string) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    console.error("Invalid channel or not a text-based channel.");
    return null;
  }

  const messages = await channel.messages.fetch({ limit: 25 });
  return messages.find((message) =>
    message.embeds.some((embed) => embed.footer?.text === matchId)
  );
}

export function prepareScoreUpdate(
  targetMessage: Message,
  match: Match,
  newScore: string
) {
  const updatedEmbeds = targetMessage.embeds.map((embed) => {
    // Check if this embed is the one for the match
    if (embed.footer?.text === match.matchId) {
      const currentTitle = embed.title;
      const currentScore = currentTitle?.split(" (")[1]?.split(")")[0];

      if (currentScore === newScore) {
        return embed; // No changes needed
      }

      const { mapEmoji, formattedMapName } = formatMapInfo(match.mapName);
      return EmbedBuilder.from(embed).setTitle(
        `${mapEmoji}  ${formattedMapName}  (${newScore})`
      );
    }
    return embed; // Leave other embeds unchanged
  });

  return { updatedEmbeds };
}
