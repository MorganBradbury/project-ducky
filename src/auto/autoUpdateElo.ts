import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  GuildMember,
  EmbedBuilder,
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

// Fetch guild member by Discord username
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

  const embedFields: any[] = [];

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

      // Update the database with the new Elo
      try {
        await updateUserElo(user.userId, faceitPlayer.elo); // Assuming `userId` is the user's DB primary key
        console.log(
          `Updated previousElo for ${discordUsername} in the database.`
        );
      } catch (dbError) {
        logError(
          `Failed to update previousElo for ${discordUsername} in the database:`,
          dbError
        );
      }

      // Add the user update to the embed fields
      const eloDifference = faceitPlayer.elo - previousElo;
      const eloChange =
        eloDifference > 0
          ? `**\`+${eloDifference}\`**` // Green for positive changes
          : `**\`-${Math.abs(eloDifference)}\`**`; // Red for negative changes

      embedFields.push({
        name: `${discordUsername}`,
        value: `**Faceit Username:** ${faceitUsername}\n**Previous Elo:** ${previousElo}\n**New Elo:** ${
          faceitPlayer.elo
        }\n**Change:** ${
          eloDifference > 0 ? `🟢 ${eloChange}` : `🔴 ${eloChange}`
        }`,
      });
    } catch (error) {
      logError(`Error updating Faceit level for ${discordUsername}:`, error);
    }
  }

  if (embedFields.length > 0) {
    try {
      const channel = await client.channels.fetch(BOT_UPDATES_CHANNEL_ID);

      if (!channel || !(channel instanceof TextChannel)) {
        throw new Error("The fetched channel is not a TextChannel.");
      }

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Nickname Auto-Update Summary")
        .setColor("#00FF00")
        .addFields(embedFields)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log("Summary embed sent to the bot-updates channel.");
    } catch (embedError) {
      logError(
        "Failed to send summary embed to the bot-updates channel:",
        embedError
      );
    }
  } else {
    console.log("No updates to send.");
  }

  console.log("Auto-update completed!");
  process.exit(0);
});

// Log in to Discord with your bot token
client.login(DISCORD_BOT_TOKEN).catch(console.error);
