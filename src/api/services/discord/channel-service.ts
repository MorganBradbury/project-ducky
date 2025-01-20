import { PermissionFlagsBits, VoiceChannel } from "discord.js";
import client from "../../../bot/client";
import { config } from "../../../config";
import { SystemUser } from "../../../types/system-user";
import axios from "axios";
import { numberToUnicode } from "../../../utils/unicodeHelper";

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

export const getMatchVoiceChannelId = async (
  matchingPlayers: SystemUser[]
): Promise<string | null> => {
  console.log("matches", matchingPlayers);

  const guild = await client.guilds.fetch(config.GUILD_ID);
  const channels = await guild.channels.fetch();

  // Iterate over channels
  for (const channel of channels.values()) {
    if (channel instanceof VoiceChannel) {
      // Check if any member in this channel matches the condition
      const hasMatchingMember = Array.from(channel.members.values()).some(
        (member) =>
          matchingPlayers.some(
            (player) => player.discordUsername === member.user.username
          )
      );

      if (hasMatchingMember) {
        return channel.id;
      }
    }
  }

  return null;
};

export const updateVoiceChannelName = async (
  voiceChannelId: string,
  voiceChannelName: string
) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(voiceChannelId);

    if (channel instanceof VoiceChannel) {
      const url = `https://discord.com/api/v10/channels/${voiceChannelId}`;
      const payload = { name: voiceChannelName };

      try {
        const response = await axios.patch(url, payload, {
          headers: {
            Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        console.log(`Updated voice channel name to: ${voiceChannelName}`);
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

export const getChannelNameById = async (
  channelId: string
): Promise<string | null> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(channelId);
    if (channel) {
      return channel.name;
    }

    return null;
  } catch (error) {
    console.error("Error fetching channel name by ID:", error);
    return null;
  }
};

export const updateVoiceChannelStatus = async (
  voiceChannelId: string,
  status: string
) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(voiceChannelId);

    if (channel instanceof VoiceChannel) {
      const url = `https://discord.com/api/v10/channels/${voiceChannelId}/voice-status`;
      const payload = { status };

      try {
        const response = await axios.put(url, payload, {
          headers: {
            Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status !== 204) {
          console.log(
            `Failed to update voice channel status: ${response.status}`
          );
        }
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
    console.error("Error updating voice channel status:", error);
    return;
  }
};
