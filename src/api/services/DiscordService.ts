import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  EmbedBuilder,
  VoiceChannel,
  GuildMember,
  Role,
  ChannelType,
} from "discord.js";
import { MatchDetails } from "../../types/MatchDetails";
import { SystemUser } from "../../types/SystemUser";
import { FaceitService } from "./FaceitService";
import { FaceitPlayer } from "../../types/FaceitPlayer";
import axios from "axios";
import { PermissionFlagsBits } from "discord.js";
import { config } from "../../config";
import { updateNickname } from "../../utils/nicknameUtils";
import { updateUserElo } from "../../db/commands";

// Initialize the Discord client
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

// Function to create a new voice channel in a specific category
export const createNewVoiceChannel = async (
  channelName: string,
  parentId: string,
  voiceScoresChannel?: boolean
): Promise<string | null> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found");
      return null;
    }

    // Fetch the @everyone role for the guild
    const everyoneRole = guild.roles.everyone;

    // Build the permission overrides based on the flag
    const permissionOverrides = voiceScoresChannel
      ? [
          {
            id: everyoneRole.id, // The @everyone role ID
            deny: [PermissionFlagsBits.Connect], // Use the PermissionFlagsBits enum
          },
        ]
      : undefined; // No overrides if the flag is false

    // Create the new voice channel
    const channel = await guild.channels.create({
      name: channelName,
      type: 2, // 2 = Voice channel
      parent: parentId, // Fixed category ID
      bitrate: 64000,
      permissionOverwrites: permissionOverrides, // Apply overrides conditionally
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

// Function to get the applicable voice channel based on matching players' usernames
export const getApplicableVoiceChannel = async (
  matchingPlayers: SystemUser[]
): Promise<{ channelId: string; channelName: string } | string> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channels = await guild.channels.fetch();

    for (const [channelId, channel] of channels) {
      if (channel instanceof VoiceChannel) {
        for (const member of channel.members.values()) {
          if (
            matchingPlayers.some(
              (player) => player.discordUsername === member.user.username
            )
          ) {
            return { channelId, channelName: channel.name };
          }
        }
      }
    }

    return "No channel found";
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
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(voiceChannelId);

    if (channel instanceof VoiceChannel) {
      const newName =
        matchOngoing && channel.members.size > 0
          ? `${gamersVcName} [LIVE]`
          : `${gamersVcName}`;

      const url = `https://discord.com/api/v10/channels/${voiceChannelId}`;
      const payload = { name: newName };

      try {
        const response = await axios.patch(url, payload, {
          headers: {
            Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        console.log(`Updated voice channel name to: ${newName}`);
      } catch (error: any) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"];
          console.error(`Rate limit hit! Retry after ${retryAfter} seconds.`);
        } else {
          throw error;
        }
      }
    } else {
      console.log("The specified channel is not a VoiceChannel.");
    }
  } catch (error) {
    console.error("Error updating voice channel name:", error);
    return;
  }
};

// Function to delete a voice channel by ID
export const deleteVoiceChannel = async (voiceChannelId: string) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found");
      return false;
    }

    const channel = await guild.channels.fetch(voiceChannelId);
    if (!channel) {
      console.error(`Channel with ID ${voiceChannelId} not found.`);
      return false;
    }

    if (channel instanceof VoiceChannel) {
      await channel.delete();
      console.log(
        `Voice channel with ID ${voiceChannelId} deleted successfully.`
      );
      return true;
    } else {
      console.error(
        `Channel with ID ${voiceChannelId} is not a voice channel.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `Error deleting voice channel with ID ${voiceChannelId}:`,
      error
    );
    return false;
  }
};

export const sendMatchFinishNotification = async (
  matchDetails: MatchDetails
) => {
  try {
    const playerDetails = await Promise.all(
      matchDetails.matchingPlayers.map(async (player) => {
        const eloDifference = await FaceitService.calculateEloDifference(
          player.previousElo,
          player.gamePlayerId
        );
        return `**${player.faceitUsername}**: ${eloDifference || ""}`;
      })
    );

    // Determine win/loss based on finalScore or eloDifference
    const finalScore = matchDetails.results?.finalScore;
    const isWin =
      finalScore !== undefined
        ? matchDetails.results?.win
        : playerDetails.some((detail) => detail.includes("+"));

    const embed = new EmbedBuilder()
      .setTitle(`🚨  Match finished update (${isWin ? "WIN" : "LOSS"})`)
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
        {
          name: "Players",
          value: playerDetails.join("\n"),
        }
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

// Main function to update Elo
export const runEloUpdate = async (users: SystemUser[]) => {
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
          const player: FaceitPlayer | null = await FaceitService.getPlayerData(
            gamePlayerId
          );

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
            updateServerRoles(member, player),
          ]);
        } catch (error) {
          console.log(`Error processing user ${discordUsername}:`, error);
        }
      })
    );

    console.log("Auto-update completed!");
  } catch (error) {
    console.log("Error running auto-update:", error);
  }
};

/**
 * Updates a member's roles based on their Faceit skill level.
 * Removes any roles containing "Level" and assigns the appropriate "Level [skill_level]" role.
 *
 * @param {GuildMember} member - The Discord guild member to update.
 * @param {FaceitPlayer} player - The Faceit player data containing the skill level.
 */
export const updateServerRoles = async (
  member: GuildMember,
  player: FaceitPlayer
) => {
  try {
    if (!member || !player) {
      console.error("Member or player data is missing.");
      return;
    }

    const guild = await client.guilds.fetch(config.GUILD_ID); // Cache the guild object
    const skillLevelRoleName = `Level ${player.skill_level}`;

    // Fetch all roles in the guild
    const roles = await guild.roles.fetch();

    // Find the role that matches the current skill level
    const targetRole = roles.find((role) => role.name === skillLevelRoleName);

    if (!targetRole) {
      console.warn(`Role ${skillLevelRoleName} not found in the guild.`);
      return;
    }

    // Remove all roles containing "Level" from the member
    const levelRoles = member.roles.cache.filter((role: Role) =>
      role.name.includes("Level")
    );

    await Promise.all(
      levelRoles.map((role: Role) =>
        member.roles.remove(role).catch(console.error)
      )
    );

    // Assign the correct role based on skill level
    if (!member.roles.cache.has(targetRole.id)) {
      await member.roles.add(targetRole);
      console.log(
        `Assigned role ${skillLevelRoleName} to member ${member.user.tag}.`
      );
    }
  } catch (error) {
    console.error("Error updating server roles:", error);
  }
};

// Function to manage the Minecraft voice channel
export const updateMinecraftVoiceChannel = async (
  playerCount: number // This is the number of active players
): Promise<{ message: string }> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);

    // Dynamically fetch all channels from the guild
    const allChannels = await guild.channels.fetch(); // Fetches all channels directly from Discord

    // Ensure we are working with the correct category ID
    const categoryId = config.VC_MINECRAFT_FEED_CATEGORY_ID;

    // Filter channels that belong to the specified category and are voice channels
    const channelsInCategory = allChannels.filter(
      (channel) =>
        channel && channel.parentId === categoryId && channel.type === 2 // 2 is for voice channels
    );

    // If no active players, delete all voice channels in the category
    if (playerCount === 0) {
      // Check if there are any channels to delete
      if (channelsInCategory.size > 0) {
        console.log("Deleting channels:", channelsInCategory.size);
        for (const channel of channelsInCategory.values()) {
          // Null check before accessing channel properties
          if (channel && channel.id) {
            try {
              console.log(`Deleting channel with ID: ${channel.id}`);
              await deleteVoiceChannel(channel.id); // Delete the channel
            } catch (error) {
              console.error(
                `Failed to delete channel with ID ${channel.id}:`,
                error
              );
            }
          }
        }
        return { message: "All channels deleted due to no active players." };
      } else {
        return {
          message: "No channels to delete, none found in the category.",
        };
      }
    }

    // Create a new voice channel with the active player count
    const channelName = `🟢 ${playerCount}`;
    const existingActiveChannel = channelsInCategory.find(
      (channel: any) => channel && channel.name.startsWith("🟢")
    );

    // If there's an existing ACTIVE channel and its name doesn't match the current player count
    if (existingActiveChannel && existingActiveChannel.name !== channelName) {
      console.log(`Deleting old ACTIVE channel: ${existingActiveChannel.id}`);
      await deleteVoiceChannel(existingActiveChannel.id);

      // Create a new channel with the updated player count
      await createNewVoiceChannel(channelName, categoryId, true);
    } else if (!existingActiveChannel) {
      // If there's no existing ACTIVE channel, create one
      await createNewVoiceChannel(channelName, categoryId, true);
    }

    return { message: "Voice channel updated successfully." };
  } catch (error: any) {
    console.error("Error updating Minecraft voice channel:", error);
    return { message: error.message };
  }
};

/**
 * Updates all voice channels in a Discord server to have the same emoji 🟠 in their names,
 * ignoring specified categories and skipping occupied channels. Channels are reordered alphabetically.
 */
export async function resetVoiceChannelStates(): Promise<void> {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId)
      throw new Error("GUILD_ID is not set in environment variables.");

    const guild = await client.guilds.fetch(guildId);
    if (!guild) throw new Error(`Guild with ID ${guildId} not found.`);

    const channels = await guild.channels.fetch();

    // Define an ignore list for categories
    const ignoreCategories: string[] = [
      "Category-To-Skip-1",
      "Category-To-Skip-2",
    ];

    // Group channels by category (parentId) and filter voice channels
    const categories: Record<string, VoiceChannel[]> = {};

    channels.forEach((channel) => {
      if (
        channel?.type === ChannelType.GuildVoice &&
        channel.id !== guild.afkChannelId
      ) {
        const categoryId = channel.parentId || "no-category";

        // Skip channels in ignored categories
        const categoryName = channel.parent?.name;
        if (categoryName && ignoreCategories.includes(categoryName)) {
          console.log(`Skipping category: ${categoryName}`);
          return;
        }

        if (!categories[categoryId]) categories[categoryId] = [];
        categories[categoryId].push(channel as VoiceChannel);
      }
    });

    // Process each category
    for (const [categoryId, voiceChannels] of Object.entries(categories)) {
      const categoryName = voiceChannels[0]?.parent?.name || "Uncategorized";

      console.log(`Processing category: ${categoryName}`);

      // Rename and sort channels in the current category
      const updatedChannels = await Promise.all(
        voiceChannels.map(async (channel) => {
          if (channel.members.size > 0) {
            console.log(`Skipping channel ${channel.name} as it is occupied.`);
            return channel;
          }

          const newName = `🟠 ${channel.name.replace(/^🟠 /, "")}`; // Avoid duplicate emojis
          if (channel.name !== newName) {
            console.log(
              `Renaming empty channel: ${channel.name} -> ${newName}`
            );
            await channel.setName(newName);
          }
          return channel;
        })
      );

      // Sort and reorder channels within the category
      const sortedChannels = updatedChannels.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      await Promise.all(
        sortedChannels.map((channel, index) => channel.setPosition(index))
      );

      console.log(
        `Updated and reordered channels in category: ${categoryName}`
      );
    }

    console.log("Voice channels updated and reordered successfully.");
  } catch (error) {
    console.error("Error updating voice channels:", error);
  }
}

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
