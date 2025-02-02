import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { config } from "../../../config";
import client from "../../../bot/client";
import {
  EMBED_COLOURS,
  EMPTY_FIELD,
  getMapEmoji,
  LINKS,
} from "../../../constants";
import { FaceitService } from "../faceit-service";
import {
  calculateEloDifference,
  formattedMapName,
} from "../../../utils/faceitHelper";
import { Match } from "../../../types/Faceit/match";
import { checkMatchExists } from "../../../db/commands";

const checkIfAlreadySent = async (
  matchId: string | null,
  channel: TextChannel
): Promise<boolean> => {
  if (!matchId) {
    return false;
  }
  const messages = await channel.messages.fetch({ limit: 5 });

  return messages.some((message: Message) =>
    message.embeds.some((embedMsg: any) =>
      embedMsg.footer?.text?.includes(matchId)
    )
  );
};

const sendEmbedMessage = async (
  embed: EmbedBuilder,
  channelId: string,
  matchId?: string
) => {
  try {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;
    if (await checkIfAlreadySent(matchId || null, channel)) {
      return;
    }

    return channel.send({
      embeds: [embed],
    });
  } catch (error) {
    console.error("Error sending embedMessage", error);
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
    const mapWin = await FaceitService.getMatchResult(
      match.matchId,
      match.trackedTeam.faction
    );

    // Strip 'de_' and capitalize the first letter of the map name
    const formattedMapName = match.mapName
      .replace(/^de_/, "")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const mapEmoji = getMapEmoji(match.mapName);

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
};

export const createMatchAnalysisEmbed = (
  matchId: string,
  playersData: any,
  gameData: any
) => {
  // Sorting the game data by most played times, then by average win percentage
  const sortedMapData = gameData.sort((a: any, b: any) => {
    const aWinPercentage = parseFloat(a.averageWinPercentage);
    const bWinPercentage = parseFloat(b.averageWinPercentage);

    if (b.totalPlayedTimes === a.totalPlayedTimes) {
      return bWinPercentage - aWinPercentage;
    }
    return b.totalPlayedTimes - a.totalPlayedTimes;
  });

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
    .setTitle(`Map stats (Team ${playersData.homeFaction[0]?.nickname})`)
    .addFields(
      {
        name: `Map stats for other team (Last 50 games)`,
        value:
          "`Map name     | Played | Win % `\n" +
          "`-------------|--------|-------`\n" +
          mapDataTable,
      },
      {
        name: "Match page",
        value: `[🔗 Link](${LINKS.MATCHROOM}/${matchId})`,
      }
    )
    .setFooter({ text: `${matchId}` })
    .setColor(`#${EMBED_COLOURS.ANALYSIS}`)
    .setTimestamp();

  // Send the embed to the designated channel
  sendEmbedMessage(embed, config.MATCHROOM_ANALYSIS_CHANNEL_ID, matchId);
  return;
};

export const createLiveScoreCard = async (match: Match) => {
  // Adding skill level icons next to each player name
  const homePlayers = match.trackedTeam.trackedPlayers
    .map((player: any) => `${player.faceitUsername}`)
    .join("\n");

  // Get the match score
  const matchScore = await FaceitService.getMatchScore(
    match.matchId,
    match.trackedTeam.faction,
    false
  );
  const score = matchScore.join(":");

  // Format map name and get its emoji
  const mapEmoji = getMapEmoji(match.mapName);
  const mapName = formattedMapName(match.mapName);

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle(`${mapEmoji}  ${mapName}  (${score})`) // Updated title format
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

  // Pass the embed and the button to sendEmbedMessage
  sendEmbedMessage(embed, config.BOT_LIVE_SCORE_CARDS_CHANNEL, match.matchId);
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
  const newScore = matchScore.join(":");

  // Extract the embed and check if the score needs updating
  const embed = targetMessage.embeds[0];
  const currentTitle = embed.title;
  const currentScore = currentTitle?.split(" (")[1]?.split(")")[0]; // Extract current score from title

  // If the score hasn't changed, skip the update
  if (currentScore === newScore) {
    return;
  }

  // Format map name and get its emoji
  const mapEmoji = getMapEmoji(match.mapName);
  const mapName = formattedMapName(match.mapName);

  // Update the embed with the new score in the title
  const updatedEmbed = EmbedBuilder.from(embed).setTitle(
    `${mapEmoji}  ${mapName}  (${newScore})`
  );

  // Edit the message with the updated embed
  await targetMessage.edit({ embeds: [updatedEmbed] });
  console.log(`Live score updated for matchId: ${match.matchId}`);
};

export const deleteMatchCards = async (
  matchId?: string,
  forceDelete?: boolean
) => {
  const channelIDs = [
    config.MATCHROOM_ANALYSIS_CHANNEL_ID, // New functionality
    config.BOT_LIVE_SCORE_CARDS_CHANNEL, // Old functionality
  ];

  for (const channelId of channelIDs) {
    try {
      // Fetch the Discord channel
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} is invalid or not text-based.`);
        continue; // Skip to the next channel.
      }

      // Fetch the last 100 messages from the channel (increase limit to check more)
      const messages = await channel.messages.fetch({ limit: 100 });

      if (channelId === config.BOT_LIVE_SCORE_CARDS_CHANNEL) {
        // Old functionality: delete single messages based on matchId in footer
        const targetMessage = messages.find((message) =>
          message.embeds.some((embed) => embed.footer?.text === matchId)
        );

        if (targetMessage) {
          await targetMessage.delete();
          console.log(
            `Live score card deleted for matchId: ${matchId} in channel ${channelId}`
          );
        }
      } else if (channelId === config.MATCHROOM_ANALYSIS_CHANNEL_ID) {
        // New functionality: delete embeds older than 10 minutes or with matchId not in DB
        for (const message of messages.values()) {
          // Check if the message has embeds
          for (const embed of message.embeds) {
            const matchIdFromFooter = embed.footer?.text;

            if (!matchIdFromFooter) continue; // Skip if there's no matchId in the footer

            // Check if the match exists in the database
            const doesExist = await checkMatchExists(matchIdFromFooter);

            // Check if the embed is older than 10 minutes
            const isOlderThan5Minutes =
              Date.now() - message.createdAt.getTime() > 5 * 60 * 1000;

            // If the match doesn't exist or the embed is too old, delete it
            if ((!doesExist && isOlderThan5Minutes) || forceDelete) {
              await message.delete();
              console.log(
                `Deleted embed for matchId: ${matchIdFromFooter} in channel ${matchIdFromFooter}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to process messages in channel ${channelId}:`,
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
    .setTitle(`New user: ${userName}`)
    .addFields(
      { name: "FACEIT ID", value: faceitId },
      {
        name: "🔗 Webhook",
        value: `[Link](${LINKS.WEBHOOK})`,
      }
    )
    .setColor("#c2a042");

  await sendEmbedMessage(embed, "1327588452719530027");

  return;
}
