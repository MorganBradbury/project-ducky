// embedService.ts

import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { config } from "../../config";
import {
  EMBED_COLOURS,
  EMPTY_FIELD,
  getMapEmoji,
  getSkillLevelEmoji,
  LINKS,
} from "../../constants";
import { Match } from "../../types/Faceit/match";
import { FaceitService } from "./faceitService";
import {
  checkIfAlreadySent,
  formatMapInfo,
  formattedMapName,
  generatePlayerStatsTable,
  getScoreStatusText,
} from "../../utils/faceitHelper";
import client from "../client";
import { getAllUsers, getMatchDataFromDb } from "../../db/dbCommands";
import { SystemUser } from "../../types/systemUser";
import { updateVoiceChannelStatus } from "./channelService";

export async function sendEmbedMessage(
  embed: EmbedBuilder,
  channelId: string,
  matchId?: string
) {
  try {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    // Prevent duplicate embeds
    if (await checkIfAlreadySent(matchId || null, channel)) {
      console.log(`Embed already sent for matchId: ${matchId}`);
      return;
    }

    // Fetch last message in the channel
    const messages = await channel.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();

    if (lastMessage) {
      if (channelId === config.CHANNEL_LEADERBOARD) {
        // Replace existing leaderboard embed
        await lastMessage.edit({ embeds: [embed] });
        console.log(`Replaced embed in leaderboard message.`);
      } else {
        // Get existing embeds
        const existingEmbeds = lastMessage.embeds.map((embedData) =>
          EmbedBuilder.from(embedData)
        );

        // Check total size of existing embeds + new embed
        const totalSize = getTotalEmbedSize([...existingEmbeds, embed]);

        if (existingEmbeds.length < 10 && totalSize <= 6000) {
          // Append the new embed if the limit isn't reached
          await lastMessage.edit({ embeds: [...existingEmbeds, embed] });
          console.log(`Appended new embed to existing message.`);
        } else {
          // If embed limit or size is exceeded, send a new message
          await channel.send({ embeds: [embed] });
          console.log(`Embed limit or size exceeded, sent a new message.`);
        }
      }
    } else {
      // If no message exists, send a new one
      await channel.send({ embeds: [embed] });
      console.log(`Sent new embed message.`);
    }
  } catch (error) {
    console.error("Error sending embedMessage", error);
  }
}

// Helper function to calculate total embed size
function getTotalEmbedSize(embeds: EmbedBuilder[]): number {
  return embeds.reduce((acc, embed) => {
    return (
      acc +
      (embed.data.title?.length || 0) +
      (embed.data.description?.length || 0) +
      (embed.data.footer?.text?.length || 0) +
      (embed.data.author?.name?.length || 0) +
      (embed.data.fields ?? []).reduce(
        (sum, field) =>
          sum + (field.name?.length || 0) + (field.value?.length || 0),
        0
      )
    );
  }, 0);
}

export async function matchEndNotification(match: Match) {
  try {
    const playerStatsData = await FaceitService.getPlayerStats(
      match.matchId,
      match.trackedTeam.trackedPlayers.map((player) => player.faceitId || "")
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

    const formattedMapInfo = formatMapInfo(match.mapName);
    const mapEmoji = await getMapEmoji(match.mapName);

    const embed = new EmbedBuilder()
      .setColor(`#${mapWin ? EMBED_COLOURS.MAP_WIN : EMBED_COLOURS.MAP_LOSS}`)
      .setTitle(
        `${mapEmoji}  ${formattedMapInfo.formattedMapName}  (${
          finalScore.join(":") || "N/A"
        })`
      )
      .addFields({
        name: "Scoreboard (𝖪/𝖣/𝖠)",
        value: `${playerStatsTable.join("\n")}`,
      })
      .setURL(`${LINKS.MATCHROOM}/${match?.matchId}`)
      .setFooter({ text: `${match.matchQueue}` })
      .setTimestamp();

    await sendEmbedMessage(embed, config.CHANNEL_MATCH_RESULTS, match.matchId);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
}

export const createMatchAnalysisEmbed = async (
  matchId: string,
  playersData: any,
  gameData: any
) => {
  const sortedMapData = gameData.sort((a: any, b: any) =>
    b.totalPlayedTimes === a.totalPlayedTimes
      ? parseFloat(b.winPercentage) - parseFloat(a.winPercentage)
      : b.totalPlayedTimes - a.totalPlayedTimes
  );

  const formatPlayers = async (players: any[]) => {
    const formatted = await Promise.all(
      players.map(async (player) => {
        const emoji = await getSkillLevelEmoji(player.faceitLevel);
        return `${emoji} ${player.nickname.replace(/[*_`~]/g, "\\$&")}${
          player.captain ? "*" : ""
        }`;
      })
    );
    return [formatted.slice(0, 3).join("\n"), formatted.slice(3).join("\n")];
  };

  const formatMapData = async (
    maps: any[],
    sortFn = (a: any, b: any) => 0,
    limit = maps.length
  ) => {
    const sortedMaps = maps.slice().sort(sortFn).slice(0, limit);
    const formattedMaps = await Promise.all(
      sortedMaps.map(async (map) => {
        const emoji = await getMapEmoji(map.mapName);
        return `${emoji} ${formattedMapName(map.mapName)}`;
      })
    );
    return formattedMaps.join("\n");
  };

  const [homePlayers, enemyPlayers] = await Promise.all(
    [playersData.homeFaction, playersData.enemyFaction].map(
      async (faction) => ({
        captain: faction.find((player: any) => player.captain),
        columns: await formatPlayers(faction),
      })
    )
  );

  const mapDataTable = sortedMapData
    .map((map: any) => {
      const winPercent =
        map.totalPlayedTimes === 0 || isNaN(parseFloat(map.winPercentage))
          ? "N/A"
          : Math.round(parseFloat(map.winPercentage)) + "%";
      return `\`${formattedMapName(map.mapName).padEnd(
        12
      )} | ${map.totalPlayedTimes.toString().padEnd(6)} | ${winPercent.padEnd(
        6
      )}\``;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Matchroom Analysis")
    .addFields(
      {
        name: `Team ${homePlayers.captain.nickname}`,
        value: homePlayers.columns[0],
        inline: true,
      },
      { name: "\u200b", value: homePlayers.columns[1], inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: `Team ${enemyPlayers.captain.nickname}`,
        value: enemyPlayers.columns[0],
        inline: true,
      },
      { name: "\u200b", value: enemyPlayers.columns[1], inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: `Map stats for Team ${enemyPlayers.captain.nickname}`,
        value: "`Map name     | Played | Win % `\n" + mapDataTable,
      },
      {
        name: "They mostly play:",
        value: await formatMapData(sortedMapData, undefined, 4),
        inline: true,
      },
      {
        name: "They will ban:",
        value: await formatMapData(
          sortedMapData,
          (a, b) => a.totalPlayedTimes - b.totalPlayedTimes,
          3
        ),
        inline: true,
      },
      {
        name: "Matchroom page",
        value: `[🔗 Link](${LINKS.MATCHROOM}/${matchId})`,
        inline: false,
      }
    )
    .setFooter({ text: matchId })
    .setColor("#ff5733")
    .setTimestamp();

  sendEmbedMessage(embed, config.CHANNEL_MAP_ANALYSIS, matchId);
};

export async function createLiveScoreCard(match: Match) {
  const homePlayers = (
    await Promise.all(
      match.trackedTeam.trackedPlayers.map(async (player: SystemUser) => {
        const playerLevel = await FaceitService.getPlayer(
          player.gamePlayerId || ""
        );
        console.log(playerLevel);
        const skillEmoji = await getSkillLevelEmoji(
          playerLevel?.skillLevel || 1
        );
        return `${skillEmoji} ${player.faceitUsername}`;
      })
    )
  ).join("\n");

  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );

  const formattedMapInfo = formatMapInfo(match.mapName);
  const mapEmoji = await getMapEmoji(match.mapName);

  const embed = new EmbedBuilder()
    .setTitle(
      `${mapEmoji}  ${formattedMapInfo.formattedMapName}  (${matchScore.join(
        ":"
      )})`
    )
    .addFields(
      {
        name: `Player(s) in game...`,
        value: homePlayers,
        inline: true,
      },
      EMPTY_FIELD
    )
    .setURL(`${LINKS.MATCHROOM}/${match?.matchId}`)
    .setFooter({
      text: `FACEIT ${match.matchQueue}`,
    })
    .setTimestamp()
    .setColor(`#${EMBED_COLOURS.LIVE_SCORE}`);

  await sendEmbedMessage(embed, config.CHANNEL_LIVE_MATCHES, match.matchId);
}

export const updateLiveScoreCards = async () => {
  const channel = (await client.channels.fetch(
    config.CHANNEL_LIVE_MATCHES
  )) as TextChannel;
  const messages = await channel.messages.fetch();

  for (const msg of messages.values()) {
    let updated = false;

    const updatedEmbeds = (
      await Promise.all(
        msg.embeds.map(async (embed) => {
          const url = embed.url;
          if (!url) return null;

          // Split the URL by slashes and get the last part (matchId)
          const urlParts = url.split("/");
          const matchId = urlParts[urlParts.length - 1];

          if (!matchId) return null;

          const match = await getMatchDataFromDb(matchId);

          // If match doesn't exist, return null (embed will be removed)
          if (!match) return null;

          const score = await FaceitService.getMatchScore(
            matchId,
            match.trackedTeam.faction
          );
          const newScore = score.join(":");

          // Extract current score from the embed title
          const currentTitle = embed.title || "";
          const currentScoreMatch = currentTitle.match(/\((\d+:\d+)\)/);
          const currentScore = currentScoreMatch ? currentScoreMatch[1] : null;

          // If score hasn't changed, return the embed unchanged
          if (currentScore === newScore) return embed;

          // Update voice channel status if applicable
          if (match.voiceChannelId) {
            const status = await getScoreStatusText(match.mapName, newScore);
            await updateVoiceChannelStatus(match.voiceChannelId, status);
          }

          updated = true;
          return EmbedBuilder.from(embed).setTitle(
            `${currentTitle.split(" (")[0]} (${newScore})`
          );
        })
      )
    ).filter((embed) => embed !== null); // Remove null entries (deleted matches)

    // If all embeds were removed, delete the message
    if (updatedEmbeds.length === 0) {
      await msg.delete();
      continue;
    }

    // Only edit the message if at least one embed was updated
    if (updated) await msg.edit({ embeds: updatedEmbeds });
  }
};

export async function sendNewUserNotification(
  userName: string,
  faceitId: string
) {
  const message =
    `**New user**: ${userName}\n\n` +
    `**FACEIT ID**: ${faceitId}\n` +
    `**Webhook**: <${LINKS.WEBHOOK}>`;

  await client.channels.fetch(config.CHANNEL_JOIN_REQUESTS).then((channel) => {
    (channel as TextChannel).send(message);
  });
}

export async function updateLeaderboardEmbed() {
  const users = await getAllUsers();

  // Sort users by ELO in descending order
  const sortedUsers = users.sort((a, b) => b.previousElo - a.previousElo);

  // Format the full leaderboard into one string
  let leaderboardText = formatLeaderboardTable(sortedUsers, 0, true);

  // Ensure description does not exceed 4096 characters.
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
  await sendEmbedMessage(embed, config.CHANNEL_LEADERBOARD);
}

function formatLeaderboardTable(
  users: SystemUser[],
  startIndex: number,
  showHeaders: boolean
): string {
  const columnWidths = {
    player: 15, // Player column width
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
    output += "`Player          | Elo  | Diff  | Pos `" + "\n";
  }

  output += users
    .map((user, index) => {
      const formattedElo = `${user.previousElo
        .toString()
        .padEnd(columnWidths.elo)}`;
      // Leave the change empty if no change in elo
      const changeThisMonth =
        Number(user.startOfMonthElo) === user.previousElo
          ? "" // Leave empty when no change
          : Number(user.startOfMonthElo) > user.previousElo
          ? `- ${Number(user.startOfMonthElo) - user.previousElo}`
          : `+ ${user.previousElo - Number(user.startOfMonthElo)}`;

      const currentIndex = index + 1;
      const startingPosition = user.startOfMonthPosition || 1;
      const formattedPositionChange =
        user.startOfMonthPosition === 0
          ? "-"
          : user.startOfMonthPosition === currentIndex
          ? "" // No change in position
          : startingPosition > currentIndex
          ? `+${startingPosition - currentIndex}`
          : `-${currentIndex - startingPosition}`;

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
