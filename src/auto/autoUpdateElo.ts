import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  GuildMember,
} from "discord.js";
import { getAllUsers, updateUserElo } from "../db/models/userModel"; // Import the updateUserElo function
import { getFaceitLevel } from "../services/FaceitService";
import { updateNickname } from "../services/DiscordService";
import { DISCORD_BOT_TOKEN, GUILD_ID, BOT_UPDATES_CHANNEL_ID } from "../config";

// Create a new Discord client with required intents
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

// Helper function for error logging
const logError = (message: string, error: any) => {
  console.error(message, error);
};

// Fetch guild member by discord username
const fetchGuildMember = async (discordUsername: string) => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });

    return members.size > 0 ? members.first() : null;
  } catch (error) {
    logError(`Error fetching member ${discordUsername}:`, error);
    return null;
  }
};

// Update user's nickname in Discord
const updateUserNickname = async (member: GuildMember, faceitPlayer: any) => {
  try {
    await updateNickname(member, faceitPlayer);
    console.log(`Successfully updated nickname for ${member.user.username}`);
  } catch (error) {
    logError(`Error updating nickname for ${member.user.username}:`, error);
  }
};

// Wait for the client to be ready
client.once("ready", async () => {
  console.log("Bot is ready, running auto-update...");

  const users = await getAllUsers();
  const updateMessages: string[] = [];

  for (const user of users) {
    const { discordUsername, faceitUsername, previousElo } = user;

    try {
      console.log(
        `Fetching Faceit level for ${discordUsername} (${faceitUsername})`
      );

      const faceitPlayer = await getFaceitLevel(faceitUsername);

      if (!faceitPlayer) {
        console.log(`No Faceit data found for ${faceitUsername}`);
        continue;
      }

      if (faceitPlayer.elo == previousElo) {
        console.log(`No Elo change for ${discordUsername}`);
        continue;
      }

      const member = await fetchGuildMember(discordUsername);

      if (!member) {
        console.log(
          `User with username ${discordUsername} not found in the guild.`
        );
        continue;
      }

      console.log(
        `Current nickname for ${discordUsername}: ${member.nickname}`
      );

      await updateUserNickname(member, faceitPlayer);

      // Add the update message to the array
      updateMessages.push(
        `${discordUsername} updated from ${previousElo} to ${
          faceitPlayer.elo
        }. (${
          previousElo > faceitPlayer.elo
            ? `-${previousElo - faceitPlayer.elo}`
            : `+${faceitPlayer.elo - previousElo}`
        })  (${faceitUsername})`
      );

      // Update the database with the new Elo
      try {
        await updateUserElo(user.userId, faceitPlayer.elo); // Assuming `id` is the user's DB primary key
        console.log(
          `Updated previousElo for ${discordUsername} in the database.`
        );
      } catch (dbError) {
        logError(
          `Failed to update previousElo for ${discordUsername} in the database:`,
          dbError
        );
      }
    } catch (error) {
      logError(`Error updating Faceit level for ${discordUsername}:`, error);
    }
  }

  if (updateMessages.length > 0) {
    try {
      const channel = await client.channels.fetch(BOT_UPDATES_CHANNEL_ID);

      if (!channel) {
        throw new Error("The fetched channel is not a TextChannel.");
      }

      const summaryMessage = updateMessages.join("\n");
      //@ts-ignore
      await channel.send(
        `⚠️ **Nickname auto-update summary**:\n${summaryMessage}\n\n`
      );
      console.log("Summary sent to the bot-updates channel.");
    } catch (error) {
      logError(
        "Error sending summary message to the bot-updates channel:",
        error
      );
    }
  }

  console.log("Auto-update completed!");
  process.exit(0);
});

// Log in to Discord with your bot token
client.login(DISCORD_BOT_TOKEN).catch(console.error);
