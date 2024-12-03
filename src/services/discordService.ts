import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  EmbedBuilder,
  VoiceChannel,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { MatchDetails } from "../types/MatchDetails";
import { config } from "../config";
import { SystemUser } from "../types/SystemUser";
import { faceitApiClient } from "./FaceitService";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { updateNickname } from "../utils/nicknameUtils";
import { updateUserElo } from "../db/commands";

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Ensure client readiness before making API calls
const ensureClientReady = async (): Promise<void> => {
  if (!client.isReady()) {
    await new Promise<void>((resolve) => client.once("ready", () => resolve()));
    console.log("Discord client is ready!");
  }
};

// Function to create a new voice channel in a specific category
export const createNewVoiceChannel = async (
  channelName: string,
  parentId: string,
  voiceScoresChannel?: boolean
): Promise<string | null> => {
  try {
    await ensureClientReady();
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) throw new Error("Guild not found");

    const parentCategory = guild.channels.cache.get(parentId);
    if (!parentCategory || parentCategory.type !== ChannelType.GuildCategory) {
      console.error(`Parent category with ID ${parentId} not found.`);
      return null;
    }

    const permissionOverrides = voiceScoresChannel
      ? [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.Connect],
          },
        ]
      : undefined;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: parentId,
      bitrate: 64000,
      userLimit: 1,
      permissionOverwrites: permissionOverrides,
    });

    console.log(`Created new voice channel: ${channel.name}`);
    return channel.id;
  } catch (error) {
    console.error("Error creating voice channel:", error);
    return null;
  }
};

// Helper function to send an embed message to a specific channel
const sendEmbedMessage = async (embed: EmbedBuilder) => {
  try {
    await ensureClientReady();
    const channel = (await client.channels.fetch(
      config.BOT_UPDATES_CHANNEL_ID
    )) as TextChannel;

    if (!channel) {
      console.error(
        `Channel with ID ${config.BOT_UPDATES_CHANNEL_ID} not found.`
      );
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error sending message to Discord channel:", error);
  }
};

// Function to get the applicable voice channel based on matching players' usernames
export const getApplicableVoiceChannel = async (
  matchingPlayers: SystemUser[]
): Promise<{ channelId: string; channelName: string } | string> => {
  try {
    await ensureClientReady();
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channels = guild.channels.cache;

    const applicableChannel = channels
      .filter(
        (channel): channel is VoiceChannel => channel instanceof VoiceChannel
      )
      .find((channel) =>
        channel.members.some((member) =>
          matchingPlayers.some(
            (player) => player.discordUsername === member.user.username
          )
        )
      );

    return applicableChannel
      ? { channelId: applicableChannel.id, channelName: applicableChannel.name }
      : "No channel found";
  } catch (error) {
    console.error("Error finding applicable voice channel:", error);
    return "Error finding channel";
  }
};

// Function to update voice channel name with rate-limit checking
export const updateVoiceChannelName = async (
  voiceChannelId: string,
  gamersVcName: string,
  matchOngoing: boolean
) => {
  try {
    await ensureClientReady();
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(voiceChannelId);

    if (channel instanceof VoiceChannel) {
      const newName =
        matchOngoing && channel.members.size > 0
          ? `${gamersVcName} [🟢 LIVE]`
          : `${gamersVcName}`;

      await channel.edit({ name: newName });
      console.log(`Updated voice channel name to: ${newName}`);
    } else {
      console.error("The specified channel is not a VoiceChannel.");
    }
  } catch (error) {
    console.error("Error updating voice channel name:", error);
  }
};

// Function to delete a voice channel by ID
export const deleteVoiceChannel = async (
  voiceChannelId: string
): Promise<boolean> => {
  try {
    await ensureClientReady();
    const guild = await client.guilds.fetch(config.GUILD_ID);

    const channel = await guild.channels.fetch(voiceChannelId);
    if (channel && channel instanceof VoiceChannel) {
      await channel.delete();
      console.log(
        `Voice channel with ID ${voiceChannelId} deleted successfully.`
      );
      return true;
    }

    console.warn(
      `Channel with ID ${voiceChannelId} not found or not a VoiceChannel.`
    );
    return true; // Idempotent
  } catch (error) {
    console.error(
      `Error deleting voice channel with ID ${voiceChannelId}:`,
      error
    );
    return false;
  }
};

// Helper function to calculate Elo difference
const getEloDifference = async (
  previousElo: number,
  gamePlayerId: string
): Promise<string | undefined> => {
  const faceitPlayer = await faceitApiClient.getPlayerData(gamePlayerId);
  if (!faceitPlayer?.faceit_elo) return;

  const eloChange = faceitPlayer.faceit_elo - previousElo;
  return eloChange > 0
    ? `**+${eloChange}** (${faceitPlayer.faceit_elo})`
    : `**-${Math.abs(eloChange)}** (${faceitPlayer.faceit_elo})`;
};

// Function to send a match finish notification
export const sendMatchFinishNotification = async (
  matchDetails: MatchDetails
) => {
  try {
    const playerDetails = await Promise.all(
      matchDetails.matchingPlayers.map(async (player) => {
        const eloDifference = await getEloDifference(
          player.previousElo,
          player.gamePlayerId
        );
        return `**${player.faceitUsername}**: ${eloDifference || "N/A"}`;
      })
    );

    const finalScore = matchDetails.results?.finalScore;
    const isWin =
      matchDetails.results?.win ??
      playerDetails.some((detail) => detail.includes("+"));

    const embed = new EmbedBuilder()
      .setTitle(`🚨 Match finished update (${isWin ? "WIN" : "LOSS"})`)
      .setColor(isWin ? "#00FF00" : "#FF0000")
      .addFields(
        { name: "Map", value: matchDetails.mapName },
        {
          name: "Match Link",
          value: `[Click here](https://www.faceit.com/en/cs2/room/${matchDetails?.matchId})`,
        },
        {
          name: "Match Result",
          value: `${finalScore || "N/A"} (${isWin ? "WIN" : "LOSS"})`,
        },
        { name: "Players", value: playerDetails.join("\n") }
      )
      .setTimestamp();

    await sendEmbedMessage(embed);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
};

// Helper function to get all users in a voice channel
export const getUsersInVoiceChannel = async (voiceChannelId: string) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found.");
      return [];
    }

    const channel = await guild.channels.fetch(voiceChannelId);
    if (!channel || !(channel instanceof VoiceChannel)) {
      console.error(
        `Channel with ID ${voiceChannelId} is not a valid voice channel.`
      );
      return [];
    }

    // Fetch and return members in the voice channel
    return Array.from(channel.members.values());
  } catch (error) {
    console.error(
      `Error fetching users from voice channel ${voiceChannelId}:`,
      error
    );
    return [];
  }
};

// Helper function to move a user to a specific voice channel
export const moveUserToChannel = async (
  userId: string,
  newChannelId: string
) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const member = await guild.members.fetch(userId);

    if (!member.voice.channelId) {
      console.log(
        `User ${userId} is not currently in a voice channel. Skipping move.`
      );
      return;
    }

    console.log(
      `User ${userId} is in channel ${member.voice.channelId}. Moving to ${newChannelId}`
    );

    // Use Discord.js method to move the user
    await member.voice.setChannel(newChannelId);

    console.log(`Moved user ${userId} to channel ${newChannelId}`);
  } catch (error) {
    console.error(
      `Error moving user ${userId} to channel ${newChannelId}:`,
      error
    );
  }
};

export const updateDiscordProfiles = async (users: SystemUser[]) => {
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
            await faceitApiClient.getPlayerData(gamePlayerId);

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
          console.error(`Error processing user ${discordUsername}:`, error);
        }
      })
    );

    console.log("Auto-update completed!");
  } catch (error) {
    console.error("Error running auto-update:", error);
  }
};

// Log in to the Discord client
client.login(config.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Error logging in to Discord:", error);
});
