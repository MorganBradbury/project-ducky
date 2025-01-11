import { EmbedBuilder, Message, TextChannel, ThreadChannel } from "discord.js";
import { Match } from "../../../types/Faceit/match";
import { FaceitService } from "../faceit-service";
import { formattedMapName } from "../../../utils/faceitHelper";
import { ChannelIcons, getMapEmoji } from "../../../constants";
import { config } from "../../../config";
import client from "../../../bot/client";

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
      },
      {
        name: "Link to match",
        value: `[Click here](https://www.faceit.com/en/cs2/room/${match?.matchId})`,
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

export const sendEmbedMessage = async (
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
