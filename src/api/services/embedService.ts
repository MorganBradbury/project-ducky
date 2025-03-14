// embedService.ts

import { ChannelType, EmbedBuilder, Message, TextChannel } from "discord.js";
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
  gameData: any,
  voiceChannelId: string
) => {
  const guild = client.guilds.cache.first();
  if (!guild) return console.error("Guild not found");

  const voiceChannel = guild.channels.cache.get(voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    return console.error("Invalid or non-existent voice channel");
  }

  // Extract room number from voice channel name
  const roomMatch = voiceChannel.name.match(/#(\d+)/);
  const roomNumber = roomMatch ? roomMatch[1] : "unknown";

  // Define text channel name based on room number
  const textChannelName = `📊┃map-analysis_room-${roomNumber}`;
  const analysisCategoryId = "1346453963154784267";

  // Check if text channel already exists under the fixed category
  let textChannel = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      ch.parentId === analysisCategoryId &&
      ch.name === textChannelName
  ) as TextChannel;

  // Create text channel if not found
  if (!textChannel) {
    textChannel = (await guild.channels.create({
      name: textChannelName,
      type: ChannelType.GuildText,
      parent: analysisCategoryId,
      topic: `Analysis for match ${matchId}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id, // Deny viewing permissions for everyone
          deny: ["ViewChannel", "SendMessages"],
        },
        {
          id: "1327302146814775369", // Allow specific role to view the channel
          allow: ["ViewChannel", "ReadMessageHistory"],
        },
      ],
    })) as TextChannel;
  }

  // Sort map data
  const sortedMapData = gameData.sort((a: any, b: any) =>
    b.totalPlayedTimes === a.totalPlayedTimes
      ? parseFloat(b.winPercentage) - parseFloat(a.winPercentage)
      : b.totalPlayedTimes - a.totalPlayedTimes
  );

  // Format player list (no splitting, no asterisks for captains)
  const formatPlayers = async (players: any[]) => {
    return (await Promise.all(
      players.map(async (player) => {
        const emoji = await getSkillLevelEmoji(player.faceitLevel);
        return `${emoji} ${player.nickname.replace(/[*_`~]/g, "\\$&")}`;
      })
    )).join("\n");
  };

  const homePlayers = await formatPlayers(playersData.homeFaction);
  const enemyPlayers = await formatPlayers(playersData.enemyFaction);

  // Format map stats table
  const mapDataTable = sortedMapData
    .map((map: any) => {
      const winPercent =
        map.totalPlayedTimes === 0 || isNaN(parseFloat(map.winPercentage))
          ? "N/A"
          : Math.round(parseFloat(map.winPercentage)) + "%";
      return `\`${formattedMapName(map.mapName).padEnd(
        19
      )} | ${map.totalPlayedTimes.toString().padEnd(6)} | ${winPercent.padEnd(
        6
      )}\``;
    })
    .join("\n");

  // Format commonly played and banned maps
  const formatMapData = async (
    maps: any[],
    sortFn = (a: any, b: any) => 0,
    limit = maps.length
  ) => {
    const sortedMaps = maps.slice().sort(sortFn).slice(0, limit);
    return (await Promise.all(
      sortedMaps.map(async (map) => {
        const emoji = await getMapEmoji(map.mapName);
        return `${emoji} ${formattedMapName(map.mapName)}`;
      })
    )).join("\n");
  };

  // Construct the embed
  const embed = new EmbedBuilder()
    .setTitle("Matchroom Analysis")
    .addFields(
      { name: "Home Team", value: homePlayers, inline: true },
      EMPTY_FIELD,
      { name: "Enemy Team", value: enemyPlayers, inline: true },
      {
        name: "Map Stats",
        value: "`Map name            | Played | Win % `\n" + mapDataTable,
      },
      {
        name: "They mostly play:",
        value: await formatMapData(sortedMapData, undefined, 4),
        inline: true,
      },
      EMPTY_FIELD,
      {
        name: "They will ban:",
        value: await formatMapData(
          sortedMapData,
          (a, b) => a.totalPlayedTimes - b.totalPlayedTimes,
          3
        ),
        inline: true,
      }
    )
    .setColor("#ff5733")
    .setTimestamp()
    .setURL(`${LINKS.MATCHROOM}/${matchId}`);

  sendEmbedMessage(embed, textChannel.id, matchId);
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


export async function updatePlayerStatsEmbed() {

  const leaderboardText = await formatPlayerStatsTable(); // Get the formatted leaderboard table
  return;

  const maxEmbedSize = 6000; // Discord's maximum embed size
  const maxFieldsPerEmbed = 25; // Maximum number of fields per embed

  // Split leaderboardText into multiple parts if necessary
  let currentEmbed = new EmbedBuilder()
    .setTitle(`Player stats for last 30`)
    .setColor(`#${EMBED_COLOURS.ANALYSIS}`)
    .setTimestamp();

  let currentFieldCount = 0;
  let currentEmbedSize = 0;
  
  for (const chunk of leaderboardText) {
    // Check if adding this chunk would exceed the embed size or field limit
    if (currentFieldCount >= maxFieldsPerEmbed || currentEmbedSize + chunk.length > maxEmbedSize) {
      // Send the current embed and start a new one
      await sendEmbedMessage(currentEmbed, '1350120783233548338');
      
      // Reset the embed for the next part
      currentEmbed = new EmbedBuilder()
        .setTitle(`Player stats for last 30`)
        .setColor(`#${EMBED_COLOURS.ANALYSIS}`)
        .setTimestamp();
      
      currentFieldCount = 0;
      currentEmbedSize = 0;
    }

    // Add the current chunk as a field
    currentEmbed.addFields({
      name: '\u200b', // Empty name for subsequent chunks
      value: chunk,
      inline: false,
    });
    
    currentFieldCount++;
    currentEmbedSize += chunk.length;
  }

  // Send any remaining embed content
  if (currentFieldCount > 0) {
    await sendEmbedMessage(currentEmbed, '1350120783233548338');
  }
}

async function formatPlayerStatsTable(): Promise<string[]> {
  const users = await getAllUsers();
  const stats = await Promise.all(
    users.map((user) => FaceitService.getPlayerStatsLast20Games(user.faceitId || ''))
  );

  // Define specific column widths for each field in the table
  const columnWidths = {
    player: 12,        // Player name column
    avgKills: 6,       // Kills column
    avgDeaths: 6,      // Deaths column
    hsPercentage: 5,   // HS% column
    kd: 6,             // KD column
    kr: 6,             // KR column
    winPercentage: 5,  // Win% column
    adr: 6,            // ADR column
    aces: 5,           // 5K column
    quadKills: 5,      // 4K column
    tripleKills: 5,    // 3K column
  };

  // Define the headers with appropriate column widths
  const headers = `\`Player     | K | D | HS | KD | KR | W% | ADR | 5K | 4K | 3K\`\n`;

  // Map each user's stats into a formatted row
  const rows = users.map((user, index) => {
    const stat = stats[index];
    return `${user.faceitUsername.padEnd(columnWidths.player)}| 
    ${stat.avgKills.padEnd(columnWidths.avgKills)}| 
    ${stat.avgDeaths.padEnd(columnWidths.avgDeaths)}| 
    ${stat.avgHs.padEnd(columnWidths.hsPercentage)}| 
    ${stat.KD.padEnd(columnWidths.kd)}| 
    ${stat.KR.padEnd(columnWidths.kr)}| 
    ${stat.winPercentage.padEnd(columnWidths.winPercentage)}| 
    ${stat.avgADR.padEnd(columnWidths.adr)}| 
    ${stat.aces.padEnd(columnWidths.aces)}| 
    ${stat.quadKills.padEnd(columnWidths.quadKills)}| 
    ${stat.tripleKills.padEnd(columnWidths.tripleKills)}`;
  });

  console.log(rows)

  return rows;
}




