import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { getAllUsers, updateUserElo } from "../db/models/userModel";
import { getFaceitLevel } from "../services/FaceitService";
import { DISCORD_BOT_TOKEN, GUILD_ID, BOT_UPDATES_CHANNEL_ID } from "../config";
import { updateNickname } from "../utils/nicknameUtils";

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

// Main function to update Elo
export const runAutoUpdateElo = async () => {
  try {
    const users = await getAllUsers();
    const embedFields: any[] = [];

    for (const user of users) {
      const { discordUsername, faceitUsername, previousElo } = user;

      try {
        const faceitPlayer = await getFaceitLevel(faceitUsername);
        if (!faceitPlayer) { continue };

        const member = await fetchGuildMember(discordUsername);
        if (!member) continue;

        await updateUserNickname(member, faceitPlayer);
        await updateUserElo(user.userId, faceitPlayer.elo);

        const eloDifference = faceitPlayer.elo - previousElo;
        const eloChange =
          eloDifference > 0
            ? `🟢 **\`+${eloDifference}\`**`
            : `🔴 **\`-${Math.abs(eloDifference)}\`**`;

        if(faceitPlayer.elo != previousElo){
          embedFields.push({
            name: `${discordUsername}`,
            value: `**Faceit Username:** ${faceitUsername}\n**Previous Elo:** ${previousElo}\n**New Elo:** ${faceitPlayer.elo}\n**Change:** ${eloChange}\n\n`,
          });
        }
      } catch (error) {
        logError(`Error processing user ${discordUsername}:`, error);
      }
    }

    if (embedFields.length > 0) {
      const channel = (await client.channels.fetch(BOT_UPDATES_CHANNEL_ID)) as TextChannel;
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Nickname Auto-Update Summary")
        .setColor("#00FF00")
        .addFields(embedFields)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    console.log("Auto-update completed!");
  } catch (error) {
    logError("Error running auto-update:", error);
  }
};

// Log in to Discord client
if (!client.isReady()) {
  client.login(DISCORD_BOT_TOKEN).catch(console.error);
}

const fetchGuildMember = async (discordUsername: string): Promise<GuildMember | null> => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch({
      query: discordUsername,
      limit: 1,
    });

    // Check if `members.first()` is undefined, and return null in that case
    const member = members.first();
    return member ?? null;
  } catch (error) {
    logError(`Error fetching member ${discordUsername}:`, error);
    return null;
  }
};

const updateUserNickname = async (member: GuildMember, faceitPlayer: any) => {
  try {
    await updateNickname(member, faceitPlayer);
  } catch (error) {
    logError(`Error updating nickname for ${member.user.username}:`, error);
  }
};
