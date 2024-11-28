import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { MatchDetails } from "../types/MatchDetails";
import { config } from "../config/index";

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Helper function to send an embed message to a specific channel
const sendEmbedMessage = async (embed: EmbedBuilder) => {
  try {
    const channel = (await client.channels.fetch(
      config.BOT_UPDATES_CHANNEL_ID
    )) as TextChannel;
    if (!channel) {
      console.log(
        `Channel with ID ${config.BOT_UPDATES_CHANNEL_ID} not found.`
      );
      return;
    }
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error sending message to Discord channel:", error);
  }
};

// Notify about a match start
export const sendMatchStartNotification = async (
  matchDetails: MatchDetails
) => {
  const embed = new EmbedBuilder()
    .setTitle("New Match Started!")
    .setColor("#00A2FF")
    .addFields(
      { name: "Map", value: matchDetails.mapName, inline: true },
      { name: "Match Link", value: matchDetails.matchLink, inline: true },
      {
        name: "Stack",
        value: matchDetails.matchingPlayers.map((p) => `${p}`).join("\n"),
      }
    )
    .setTimestamp();

  await sendEmbedMessage(embed);
};

// Notify about a match finish
export const sendMatchFinishNotification = async (
  channelId: string,
  matchDetails: MatchDetails,
  score: [number, number],
  isWin: boolean
) => {
  const embed = new EmbedBuilder()
    .setTitle("Match Finished!")
    .setColor(isWin ? "#00FF00" : "#FF0000")
    .addFields(
      { name: "Map", value: matchDetails.mapName, inline: true },
      { name: "Match Link", value: matchDetails.matchLink, inline: true },
      {
        name: "Match Result",
        value: `${score[0]}:${score[1]} (Your Team: ${isWin ? "Win" : "Loss"})`,
        inline: true,
      },
      {
        name: "Stack",
        value: matchDetails.matchingPlayers.map((p) => `${p}`).join("\n"),
      }
    )
    .setTimestamp();

  await sendEmbedMessage(embed);
};
