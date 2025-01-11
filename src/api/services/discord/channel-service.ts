import { PermissionFlagsBits, VoiceChannel } from "discord.js";
import {
  Channel,
  CreateChannel,
  UpdateChannelStatus,
} from "../../../types/Discord/Channel";
import axios from "axios";
import { config } from "../../../config";
import client from "../../../bot/client";
import { SystemUser } from "../../../types/system-user";

export const createChannel = async (
  props: CreateChannel
): Promise<Channel | null> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guid not found", config.GUILD_ID);
      return null;
    }

    const channelCreated = await guild.channels.create({
      name: props.channelName,
      type: 2, // 2 = Voice channel
      parent: props.categoryId,
      bitrate: 64000,
      permissionOverwrites: props?.locked
        ? [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.Connect],
            },
          ]
        : undefined,
    });

    if (!channelCreated) {
      console.error("Error creating channel", { ...props });
      return null;
    }

    console.log(`Created new channel: ${channelCreated.name}`);

    return {
      id: channelCreated.id,
      name: channelCreated.name,
    };
  } catch (error) {
    console.error("Error in createChannel:", error);
    return null;
  }
};

export const getChannel = async (
  channelId: string
): Promise<Channel | null> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guid not found", config.GUILD_ID);
      return null;
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      console.error("Channel not found", channelId);
      return null;
    }

    console.log("getChannel success", channelId);

    return {
      id: channel?.id,
      name: channel.name,
    };
  } catch (error) {
    console.error("Error in getChannel:", error);
    return null;
  }
};

export const deleteChannel = async (channelId: string): Promise<boolean> => {
  try {
    let result = false;
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guid not found", config.GUILD_ID);
      return result;
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      console.error("Channel not found", channelId);
      return result;
    }

    await channel.delete();
    console.log("Channel deleted", channelId);
    result = true;

    return result;
  } catch (error) {
    console.error("Error in deleteChannel:", error);
    return false;
  }
};

export const updateChannelStatus = async (
  channel: UpdateChannelStatus
): Promise<boolean> => {
  try {
    let result = false;
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guid not found", config.GUILD_ID);
      return result;
    }

    const url = `https://discord.com/api/v10/channels/${channel.id}/voice-status`;
    const payload = { status: channel?.status };

    const { status: responseStatus } = await axios.put(url, payload, {
      headers: {
        Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    result = responseStatus === 204;

    return result;
  } catch (error) {
    console.error("Error in updateChannelStatus:", error);
    return false;
  }
};

export const findActiveVoiceChannel = async (
  matchingPlayers: SystemUser[]
): Promise<Channel | null> => {
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
        return { id: channel.id, name: channel.name };
      }
    }
  }

  return null;
};
