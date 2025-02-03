// embedService.ts

import { EmbedBuilder, TextChannel } from "discord.js";
import { config } from "../../../config";
import { EMBED_COLOURS, EMPTY_FIELD, getMapEmoji, getSkillLevelEmoji, LINKS } from "../../../constants";
import { Match } from "../../../types/Faceit/match";
import { FaceitService } from "../faceit-service";
import {
  checkIfAlreadySent,
  deleteAnalysisEmbeds,
  deleteLiveScoreCard,
  findMatchMessage,
  formatMapInfo,
  formattedMapName,
  generateMapDataTable,
  generatePlayerStatsTable,
  prepareScoreUpdate,
} from "../../../utils/faceitHelper";
import client from "../../../bot/client";
import { getAllUsers } from "../../../db/commands";
import { SystemUser } from "../../../types/system-user";

export async function sendEmbedMessage(
  embed: EmbedBuilder,
  channelId: string,
  matchId?: string
) {
  try {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;
    if (await checkIfAlreadySent(matchId || null, channel)) {
      console.log(`Embed already sent for matchId: ${matchId}`);
      return;
    }

    return channel.send({
      embeds: [embed],
    });
  } catch (error) {
    console.error("Error sending embedMessage", error);
  }
}

export async function matchEndNotification(match: Match) {
  try {
    const playerStatsData = await FaceitService.getPlayerStats(
      match.matchId,
      match.trackedTeam.trackedPlayers.map((player) => player.faceitId || '')
    );

    const playerStatsTable = await generatePlayerStatsTable(
      playerStatsData,
      match
    );
    const finalScore = await FaceitService.getMatchScore(
      match.matchId,
      match.trackedTeam.faction,
      true
    );
    const mapWin = await FaceitService.getMatchResult(
      match.matchId,
      match.trackedTeam.faction
    );

    const { formattedMapName, mapEmoji } = formatMapInfo(match.mapName);

    const embed = new EmbedBuilder()
      .setColor(`#${mapWin ? EMBED_COLOURS.MAP_WIN : EMBED_COLOURS.MAP_LOSS}`)
      .setTitle(
        `${mapEmoji}  ${formattedMapName}  (${finalScore.join(":") || "N/A"})`
      )
      .addFields(
        {
          name: "Scoreboard (K/D/A)",
          value: `${playerStatsTable.join("\n")}`,
        },
        {
          name: "Match page",
          value: `[🔗 Link](${LINKS.MATCHROOM}/${match?.matchId})`,
        }
      )
      .setTimestamp();

    await sendEmbedMessage(embed, config.BOT_UPDATES_CHANNEL_ID, match.matchId);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
}

export const createMatchAnalysisEmbed = (
  matchId: string,
  playersData: any,
  gameData: any
) => {
  // Sorting the game data: first by most played times, then by average win percentage if needed
  const sortedMapData = gameData.sort((a: any, b: any) => {
    const aWinPercentage = parseFloat(a.averageWinPercentage);
    const bWinPercentage = parseFloat(b.averageWinPercentage);

    if (b.totalPlayedTimes === a.totalPlayedTimes) {
      return bWinPercentage - aWinPercentage;
    }
    return b.totalPlayedTimes - a.totalPlayedTimes;
  });

  // Extracting teams and their players
  const homeFaction = playersData.homeFaction;
  const enemyFaction = playersData.enemyFaction;

  const homeFactionCaptain = homeFaction.find((player: any) => player.captain);
  const enemyFactionCaptain = enemyFaction.find(
    (player: any) => player.captain
  );

  // Adding skill level icons next to each player name
  const homePlayers = homeFaction
    .map(
      (player: any) =>
        `${getSkillLevelEmoji(player.faceitLevel)} ${player.nickname}${
          player.captain ? "*" : ""
        }`
    )
    .join("\n");
  const enemyPlayers = enemyFaction
    .map(
      (player: any) =>
        `${getSkillLevelEmoji(player.faceitLevel)} ${player.nickname}${
          player.captain ? "*" : ""
        }`
    )
    .join("\n");

  // Getting most likely picks and bans with map emojis
  const mostLikelyPicks = sortedMapData
    .slice(0, 4)
    .map(
      (map: any) =>
        `${getMapEmoji(map.mapName)} ${formattedMapName(map.mapName)}`
    )
    .join("\n");

  // Sort maps in ascending order of played times for most likely bans
  const mostLikelyBans = sortedMapData
    .slice()
    .sort((a: any, b: any) => a.totalPlayedTimes - b.totalPlayedTimes) // Sort by least played first
    .slice(0, 4) // Take the least played 3 maps
    .map(
      (map: any) =>
        `${getMapEmoji(map.mapName)} ${formattedMapName(map.mapName)}`
    )
    .join("\n");

  // Creating the map stats table content (without map icons)
  const mapDataTable = sortedMapData
    .map((map: any) => {
      // Ensure averageWinPercentage is a valid number by parsing the string to a float
      const formattedWinPercentage =
        map.totalPlayedTimes === 0 ||
        isNaN(parseFloat(map.averageWinPercentage))
          ? "N/A"
          : Math.ceil(parseFloat(map.averageWinPercentage)).toString() + "%"; // Round up the win percentage to nearest whole number
      return `\`${formattedMapName(map.mapName).padEnd(
        12
      )} | ${map.totalPlayedTimes
        .toString()
        .padEnd(6)} | ${formattedWinPercentage.padEnd(6)}\``;
    })
    .join("\n");

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle("Matchroom Analysis")
    .addFields(
      {
        name: `Team ${homeFactionCaptain.nickname}`,
        value: homePlayers,
        inline: true,
      },
      {
        name: `Team ${enemyFactionCaptain.nickname}`,
        value: enemyPlayers,
        inline: true,
      },
      {
        name: `Map stats for Team ${enemyFactionCaptain.nickname} (Last 50 games)`,
        value:
          "`Map name     | Played | Win % `\n" +
          "`-------------|--------|-------`\n" +
          mapDataTable,
      },
      { name: "They likely pick", value: mostLikelyPicks, inline: true },
      { name: "They likely ban", value: mostLikelyBans, inline: true },
      {
        name: "Match page",
        value: `[🔗 Link](${LINKS.MATCHROOM}/${matchId})`,
        inline: false,
      }
    )
    .setFooter({ text: `${matchId}` })
    .setColor("#ff5733");



  // Pass the embed and the button to sendEmbedMessage
  sendEmbedMessage(embed, config.MATCHROOM_ANALYSIS_CHANNEL_ID);
  return;
};

export async function createLiveScoreCard(match: Match) {
  const homePlayers = match.trackedTeam.trackedPlayers
    .map((player: any) => `${player.faceitUsername}`)
    .join("\n");

  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );

  const { formattedMapName, mapEmoji } = formatMapInfo(match.mapName);

  const embed = new EmbedBuilder()
    .setTitle(`${mapEmoji}  ${formattedMapName}  (${matchScore.join(":")})`)
    .addFields(
      {
        name: `Players in game`,
        value: homePlayers,
        inline: true,
      },
      EMPTY_FIELD,
      {
        name: "Match page",
        value: `[🔗 Link](${LINKS.MATCHROOM}/${match?.matchId})`,
        inline: true,
      }
    )
    .setFooter({ text: `${match.matchId}` })
    .setColor(`#${EMBED_COLOURS.LIVE_SCORE}`);

  await sendEmbedMessage(
    embed,
    config.BOT_LIVE_SCORE_CARDS_CHANNEL,
    match.matchId
  );
}

export async function updateLiveScoreCard(match: Match) {
  const targetMessage = await findMatchMessage(
    match.matchId,
    config.BOT_LIVE_SCORE_CARDS_CHANNEL
  );

  if (!targetMessage) {
    console.error(`No message found with matchId: ${match.matchId}`);
    return;
  }

  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );

  const newScore = matchScore.join(":");
  const { shouldUpdate, updatedEmbed } = prepareScoreUpdate(
    targetMessage,
    match,
    newScore
  );

  if (shouldUpdate && updatedEmbed) {
    await targetMessage.edit({ embeds: [updatedEmbed] });
    console.log(`Live score updated for matchId: ${match.matchId}`);
  }
}

export async function deleteMatchCards(
  matchId?: string,
  forceDelete?: boolean
) {
  const channelIDs = [
    config.MATCHROOM_ANALYSIS_CHANNEL_ID,
    config.BOT_LIVE_SCORE_CARDS_CHANNEL,
  ];

  for (const channelId of channelIDs) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} is invalid or not text-based.`);
        continue;
      }

      const messages = await channel.messages.fetch({ limit: 100 });

      if (channelId === config.BOT_LIVE_SCORE_CARDS_CHANNEL) {
        await deleteLiveScoreCard(messages, matchId);
      } else if (channelId === config.MATCHROOM_ANALYSIS_CHANNEL_ID) {
        await deleteAnalysisEmbeds(messages, forceDelete);
      }
    } catch (error) {
      console.error(
        `Failed to process messages in channel ${channelId}:`,
        error
      );
    }
  }
}

export async function sendNewUserNotification(
  userName: string,
  faceitId: string
) {
  const embed = new EmbedBuilder()
    .setTitle(`New user: ${userName}`)
    .addFields(
      { name: "FACEIT ID", value: faceitId },
      {
        name: "🔗 Webhook",
        value: `[Link](${LINKS.WEBHOOK})`,
      }
    )
    .setColor("#c2a042");

  await sendEmbedMessage(embed, config.NEW_USER_CHANNEL);
}

export async function updateLeaderboardEmbed() {
  const channel = await client.channels.fetch(config.LEADERBOARD_CHANNEL);
  if (!channel || !channel.isTextBased()) return;
  try {
    let messages = await channel.messages.fetch({ limit: 5 });
    while (messages.size > 0) {
      for (const message of messages.values()) {
        await message.delete();
      }
      messages = await channel.messages.fetch({ limit: 5 });
    }
  } catch (error) {
    console.error("Error deleting messages:", error);
  }

  const users = await getAllUsers();

  // Sort users by ELO in descending order
  const sortedUsers = users.sort((a, b) => b.previousElo - a.previousElo);

  // Format the full leaderboard into one string
  let leaderboardText = formatLeaderboardTable(sortedUsers, 0, true);

  // Ensure description does not exceed 4096 characters
  if (leaderboardText.length > 4096) {
    leaderboardText = leaderboardText.substring(0, 4093) + "..."; // Truncate if necessary
  }

  const currentDate = new Date();
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
  const currentMonthName = monthFormatter.format(currentDate);
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`🟢  Leaderboard (${currentMonthName})`)
    .setColor(`#${EMBED_COLOURS.ANALYSIS}`)
    .setTimestamp()
    .setDescription(leaderboardText);

  // Send the embed
  await sendEmbedMessage(embed, config.LEADERBOARD_CHANNEL);
}

// Function to format leaderboard data
function formatLeaderboardTable(
  users: SystemUser[],
  startIndex: number,
  showHeaders: boolean
): string {
  const columnWidths = {
    player: 11, // Player column width
    elo: 4, // Elo column width
    change: 6,
    position: 4,
  };

  // Function to format player names
  function formatPlayerName(index: number, playerName: string): string {
    let formattedName = `${index + 1}.${playerName}`.padEnd(
      columnWidths.player
    );
    if (formattedName.length > columnWidths.player) {
      formattedName = formattedName.substring(0, columnWidths.player); // Trim and add "."
    }
    return formattedName;
  }

  // Format the leaderboard table
  let output = "";

  if (showHeaders) {
    output += "`Player      | Elo  | Diff  | Pos `" + "\n";
  }

  output += users
    .map((user, index) => {
      const formattedElo = `${user.previousElo
        .toString()
        .padEnd(columnWidths.elo)}`;
      const changeThisMonth =
        Number(user.startOfMonthElo) === user.previousElo
          ? `💤`
          : Number(user.startOfMonthElo) > user.previousElo
          ? `🔻-${Number(user.startOfMonthElo) - user.previousElo}`
          : `🔥+${user.previousElo - Number(user.startOfMonthElo)}`;
      const currentIndex = index + 1;
      const startingPosition = user.startOfMonthPosition || 1;
      const formattedPositionChange =
        user.startOfMonthPosition === currentIndex
          ? ""
          : startingPosition  > currentIndex
          ? `🔼${startingPosition - currentIndex}`
          : `🔻${currentIndex - startingPosition}`;

      return `\`${formatPlayerName(
        startIndex + index,
        user.faceitUsername
      )} | ${formattedElo} | ${changeThisMonth.padEnd(
        columnWidths.change
      )}| ${formattedPositionChange.padEnd(columnWidths.position)}\``;
    })
    .join("\n");

  return output;
}
