import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
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
    // Ensure the client is logged in before accessing channels
    if (!client.isReady()) {
      console.error("Discord client is not ready!");
      return;
    }

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

export const sendMatchStartNotification = async (
  matchDetails: MatchDetails
) => {
  try {
    console.log("matchdetails", matchDetails);
    const embed = new EmbedBuilder()
      .setTitle("🚨  New Match Started!")
      .setColor("#00A2FF")
      .addFields(
        { name: "Map", value: matchDetails.mapName[0] },
        {
          name: "Match Link",
          value: `[Click here](${matchDetails.matchLink})`, // Use markdown for clickable link
        },
        {
          name: "Players",
          value: matchDetails.matchingPlayers
            .map((p: string) => p) // Explicitly type as string
            .join("\n"), // Join players with newline
        }
      )
      .setTimestamp();

    await sendEmbedMessage(embed);
  } catch (error) {
    console.error("Error sending match start notification:", error);
  }
};

// Notify about a match finish
export const sendMatchFinishNotification = async (
  matchDetails: MatchDetails
) => {
  try {
    const embed = new EmbedBuilder()
      .setTitle("Match Finished!")
      .setColor(matchDetails.results?.win ? "#00FF00" : "#FF0000")
      .addFields(
        { name: "Map", value: matchDetails.mapName[0] },
        {
          name: "Match Link",
          value: `[Click here](${matchDetails.matchLink})`, // Use markdown for clickable link
        },
        {
          name: "Match Result",
          value: `${matchDetails.results?.finalScore} (${
            matchDetails.results?.win ? "WIN" : "LOSS"
          })`,
        },
        {
          name: "Stack",
          value: matchDetails.matchingPlayers
            .map((p: string) => p) // Explicitly type as string
            .join("\n"),
        }
      )
      .setTimestamp();

    await sendEmbedMessage(embed);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
};

// Ensure client is logged in before using it
const loginBot = async () => {
  try {
    if (!client.isReady()) {
      await client.login(config.DISCORD_BOT_TOKEN);
    }
  } catch (error) {
    console.error("Error logging in to Discord:", error);
  }
};

// Log in to the Discord client
loginBot();
