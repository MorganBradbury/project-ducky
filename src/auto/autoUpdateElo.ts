import { Client, GatewayIntentBits, Partials, GuildMember } from "discord.js";
import { updateUserElo } from "../db/commands";
import { updateNickname } from "../utils/nicknameUtils";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { faceitApiClient } from "../services/FaceitService";
import { SystemUser } from "../types/SystemUser"; // Assuming SystemUser is defined in your types

// Initialize the Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Message, Partials.Channel],
});

// Helper function for logging errors
const logError = (message: string, error: any) => {
  console.error(message, error);
};

// Main function to update Elo
export const runAutoUpdateElo = async (users: SystemUser[]) => {
  try {
    if (!users.length) {
      console.log("No users provided for update.");
      return;
    }

    const guild = await client.guilds.fetch(config.GUILD_ID); // Cache the guild object

    await Promise.all(
      users.map(async (user) => {
        const { discordUsername, previousElo, gamePlayerId } = user;

        try {
          const player: FaceitPlayer | null =
            await faceitApiClient.getPlayerDataById(gamePlayerId);

          if (!player || player.faceit_elo === previousElo) return; // Skip unchanged users

          const member =
            guild.members.cache.find((m) => m.user.tag === discordUsername) ??
            (await guild.members
              .fetch({ query: discordUsername, limit: 1 })
              .then((m) => m.first()));

          if (!member) return; // Skip if member not found

          await Promise.all([
            updateNickname(member, player),
            updateUserElo(user.userId, player.faceit_elo),
          ]);
        } catch (error) {
          logError(`Error processing user ${discordUsername}:`, error);
        }
      })
    );

    console.log("Auto-update completed!");
  } catch (error) {
    logError("Error running auto-update:", error);
  }
};

// Log in to the Discord client
if (!client.isReady()) {
  client.login(config.DISCORD_BOT_TOKEN).catch(console.error);
}
