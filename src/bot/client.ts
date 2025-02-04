import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "../config";
import {
  deleteLiveScoreCard,
  updateLeaderboardEmbed,
} from "../api/services/embedService";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates, // Needed for voice channel updates
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Log in the client
(async () => {
  try {
    await client.login(config.DISCORD_BOT_TOKEN);
    console.log("Bot logged in successfully!");
    // deleteLiveScoreCard("1-fb19355e-c020-41f7-b986-dfe62412b6ad");
    updateLeaderboardEmbed();
  } catch (error) {
    console.error("Error logging in to Discord:", error);
  }
})();

export default client;
