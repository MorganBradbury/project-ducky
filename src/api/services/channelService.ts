import { VoiceChannel } from "discord.js";
import client from "../../bot/client";
import { config } from "../../config";
import { SystemUser } from "../../types/systemUser";
import axios, { AxiosError } from "axios";
import { ENDPOINTS } from "../../constants";

export const getMatchVoiceChannelId = async (
  matchingPlayers: SystemUser[]
): Promise<string | null> => {
  try {
    const channels = await client.guilds
      .fetch(config.DISCORD_GUILD_ID)
      .then((guild) => guild.channels.fetch());
    return (
      Array.from(channels.values()).find(
        (channel) =>
          channel instanceof VoiceChannel &&
          channel.members.some((member) =>
            matchingPlayers.some(
              (player) => player.discordUsername === member.user.username
            )
          )
      )?.id ?? null
    );
  } catch (error) {
    console.error("Error finding match voice channel:", error);
    return null;
  }
};

export const updateVoiceChannelStatus = async (
  channelId: string,
  status: string
): Promise<boolean> => {
  try {
    const { status: responseStatus } = await axios.put(
      ENDPOINTS.voiceStatus(channelId),
      { status },
      {
        headers: {
          Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return responseStatus === 204;
  } catch (error) {
    if ((error as AxiosError).response?.status === 429) {
      console.error(
        `Rate limit hit! Retry after ${
          (error as AxiosError).response?.headers["retry-after"]
        } seconds`
      );
    } else {
      console.error("Error updating voice channel status:", error);
    }
    return false;
  }
};
