import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { config } from "../../../config";
import client from "../../../bot/client";
import {
  ChannelIcons,
  getMapEmoji,
  getSkillLevelEmoji,
} from "../../../constants";
import { FaceitService } from "../faceit-service";
import {
  calculateEloDifference,
  formattedMapName,
} from "../../../utils/faceitHelper";
import { Match } from "../../../types/Faceit/match";

const sendEmbedMessage = async (
  embed: EmbedBuilder,
  components: any[] = [],
  channelId: string = config.BOT_UPDATES_CHANNEL_ID,
  threadId?: string // Optional thread ID parameter
) => {
  try {
    if (!client.isReady()) {
      console.error("Discord client is not ready!");
      return;
    }

    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    if (!channel) {
      console.log(`Channel with ID ${channelId} not found.`);
      return;
    }

    let targetChannelOrThread: TextChannel | ThreadChannel = channel;

    // If a threadId is provided, fetch the thread and use it as the target
    if (threadId) {
      const thread = await channel.threads.fetch(threadId);
      if (!thread || thread.archived) {
        console.error(`Thread with ID ${threadId} not found or is archived.`);
        return;
      }
      targetChannelOrThread = thread;
    }

    if (channelId === config.MATCHROOM_ANALYSIS_CHANNEL_ID) {
      // Fetch the last 10 messages from the target (channel or thread)
      const messages = await targetChannelOrThread.messages.fetch({
        limit: 10,
      });

      // Extract the matchId from the embed footer (using data.footer)
      const matchId = embed.data.footer?.text;

      if (!matchId) {
        console.error("No matchId found in embed footer!");
        return;
      }

      // Check if any of the last 10 messages contain an embed with the same matchId in the footer
      const duplicate = messages.some((message: Message) => {
        return message.embeds.some((embedMsg: any) => {
          console.log(`Does ${embed?.data?.footer?.text} include ${matchId}?`);
          return embedMsg.footer?.text?.includes(matchId); // Check for matching matchId in the footer
        });
      });

      if (duplicate) {
        console.log("Duplicate embed found, not sending the embed.");
        return;
      }
    }

    // Send the embed with the optional button in the components array
    return targetChannelOrThread.send({
      embeds: [embed],
      components, // If components (buttons) are passed, they will be included
    });
  } catch (error) {
    console.error("Error sending message to Discord channel or thread:", error);
  }
};

export const sendMatchFinishNotification = async (match: Match) => {
  try {
    const getPlayerStatsData = await FaceitService.getPlayerStats(
      match.matchId,
      match.trackedTeam.trackedPlayers.map((player) => player.faceitId)
    );

    // Sort players by kills in descending order
    getPlayerStatsData.sort((a: any, b: any) => b.kills - a.kills);

    const playerStatsTable = await Promise.all(
      getPlayerStatsData.map(async (stat) => {
        const player = match.trackedTeam.trackedPlayers.find(
          (player) => player.faceitId === stat.playerId
        );
        const eloChange = await calculateEloDifference(
          player?.previousElo || 0,
          player?.gamePlayerId || ""
        );

        const playerName = player?.faceitUsername || "Unknown";
        const name =
          playerName.length > 11
            ? `${playerName.substring(0, 9)}..`
            : playerName.padEnd(11, " ");

        const kda = `${stat.kills}/${stat.deaths}/${stat.assists}`;
        const paddedKDA = kda.padEnd(8, " ");

        const elo =
          `${eloChange?.operator}${eloChange?.difference} (${eloChange?.newElo})`.padEnd(
            3,
            " "
          );

        return `\`${name} ${paddedKDA}  ${elo}\``;
      })
    );

    const finalScore = await FaceitService.getMatchScore(
      match.matchId,
      match.trackedTeam.faction,
      true
    );
    const didTeamWin = await FaceitService.getMatchResult(
      match.matchId,
      match.trackedTeam.faction
    );

    // Strip 'de_' and capitalize the first letter of the map name
    const formattedMapName = match.mapName
      .replace(/^de_/, "")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const mapEmoji = getMapEmoji(match.mapName);

    const embed = new EmbedBuilder()
      .setTitle(`New match finished`)
      .setColor(didTeamWin ? "#00FF00" : "#FF0000")
      .addFields(
        {
          name: "Map",
          value: `${mapEmoji}  ${formattedMapName}`,
          inline: true,
        },
        {
          name: "Match Result",
          value: `${finalScore.join(" / ") || "N/A"}`,
          inline: true,
        },

        {
          name: "Link to match",
          value: `[Click here](https://www.faceit.com/en/cs2/room/${match?.matchId})`,
        },
        {
          name: "Players and Stats (K/D/A)",
          value: `${playerStatsTable.join("\n")}`,
        }
      )
      .setFooter({ text: "Match result" })
      .setTimestamp();

    await sendEmbedMessage(embed, [], config.BOT_UPDATES_CHANNEL_ID);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
};

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
        name: `Map stats for Team ${enemyFactionCaptain.nickname} (Last 30 games)`,
        value:
          "`Map name     | Played | Win % `\n" +
          "`-------------|--------|-------`\n" +
          mapDataTable,
      },
      { name: "They likely pick", value: mostLikelyPicks, inline: true },
      { name: "They likely ban", value: mostLikelyBans, inline: true }
    )
    .setFooter({ text: `${matchId}` })
    .setColor("#ff5733");

  // Create the "View Match" button
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setURL(`https://www.faceit.com/en/cs2/room/${matchId}`)
      .setLabel("View match")
      .setStyle(ButtonStyle.Link)
  );

  // Pass the embed and the button to sendEmbedMessage
  sendEmbedMessage(embed, [row], config.MATCHROOM_ANALYSIS_CHANNEL_ID);
  return;
};

export const createLiveScoreCard = async (match: Match) => {
  // Adding skill level icons next to each player name
  const homePlayers = match.trackedTeam.trackedPlayers
    .map((player: any) => `${player.faceitUsername}`)
    .join("\n");

  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle("Live match")
    .addFields(
      {
        name: `Players in game`,
        value: homePlayers,
        inline: true,
      },
      {
        name: `Map`,
        value: `${getMapEmoji(match.mapName)} ${formattedMapName(
          match.mapName
        )}`,
        inline: true,
      },
      {
        name: "Live score",
        value: `${ChannelIcons.Active} ${matchScore.join(":")}`,
        inline: true,
      },
      {
        name: "Link to match",
        value: `[Click here](https://www.faceit.com/en/cs2/room/${match?.matchId})`,
        inline: true,
      }
    )
    .setFooter({ text: `${match.matchId}` })
    .setColor("#464dd4");

  // Pass the embed and the button to sendEmbedMessage
  sendEmbedMessage(embed, [], config.BOT_LIVE_SCORE_CARDS_CHANNEL);
  return;
};

export const updateLiveScoreCard = async (match: Match) => {
  // Get the Discord client and fetch the channel
  const channel = await client.channels.fetch(
    config.BOT_LIVE_SCORE_CARDS_CHANNEL
  );
  if (!channel || !channel.isTextBased()) {
    console.error("Invalid channel or not a text-based channel.");
    return;
  }

  // Fetch the last 10 messages from the channel
  const messages = await channel.messages.fetch({ limit: 10 });

  // Find the message with the embed containing the matchId in its footer
  const targetMessage = messages.find((message) =>
    message.embeds.some((embed) => embed.footer?.text === match.matchId)
  );

  if (!targetMessage) {
    console.error(`No message found with matchId: ${match.matchId}`);
    return;
  }

  // Retrieve the latest match score
  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );
  const newScore = `${ChannelIcons.Active} ${matchScore.join(":")}`;

  // Extract the embed and find the current score
  const embed = targetMessage.embeds[0];
  const currentScoreField = embed.fields.find(
    (field) => field.name === "Live score"
  );

  // If the score hasn't changed, skip the update
  if (currentScoreField?.value === newScore) {
    return;
  }

  // Update the embed with the new score
  const updatedEmbed = EmbedBuilder.from(embed).setFields(
    embed.fields.map((field) =>
      field.name === "Live score" ? { ...field, value: newScore } : field
    )
  );

  // Edit the message with the updated embed
  await targetMessage.edit({ embeds: [updatedEmbed] });
  console.log(`Live score updated for matchId: ${match.matchId}`);
};

export const deleteMatchCards = async (matchId: string) => {
  const channelIDs = [
    config.MATCHROOM_ANALYSIS_CHANNEL_ID,
    config.BOT_LIVE_SCORE_CARDS_CHANNEL,
  ];
  for (const channelId of channelIDs) {
    try {
      // Fetch the Discord channel
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} is invalid or not text-based.`);
        continue; // Skip to the next channel
      }

      // Fetch the last 10 messages from the channel
      const messages = await channel.messages.fetch({ limit: 10 });

      // Find the message with the embed containing the matchId in its footer
      const targetMessage = messages.find((message) =>
        message.embeds.some((embed) => embed.footer?.text === matchId)
      );

      if (!targetMessage) {
        continue; // Skip to the next channel
      }

      // Delete the message
      await targetMessage.delete();
      console.log(
        `Live score card deleted for matchId: ${matchId} in channel ${channelId}`
      );
    } catch (error) {
      console.error(
        `Failed to delete match card in channel ${channelId}:`,
        error
      );
    }
  }
};

export async function sendNewUserNotification(
  userName: string,
  faceitId: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("New user notification")
    .addFields(
      { name: "User", value: userName },
      { name: "FACEIT ID", value: faceitId },
      {
        name: "🔗 Link to Webhook",
        value:
          "[Click here](https://developers.faceit.com/apps/2205acb7-7fb4-4ce4-8a23-871375ee03fa/webhooks/af22807c-f17a-4947-8829-5757ef6a2e34/edit)",
      }
    )
    .setColor("#c2a042");

  await sendEmbedMessage(embed, [], "1327588452719530027");

  return;
}
