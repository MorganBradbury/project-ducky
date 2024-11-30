import {
  Client,
  GatewayIntentBits,
  Partials,
  TextChannel,
  EmbedBuilder,
  VoiceChannel,
} from "discord.js";
import { MatchDetails } from "../types/MatchDetails";
import { config } from "../config/index";
import { SystemUser } from "../types/SystemUser";
import { faceitApiClient } from "./FaceitService";
import { FaceitPlayer } from "../types/FaceitPlayer";
import axios from "axios";

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
export const createActiveScoresChannel = async (
  channelName: string,
  userLimit: number = 1,
  bitrate: number = 64000
): Promise<string | null> => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found");
      return null;
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: 2, // 2 = Voice channel
      parent: "1312126985883095060", // Fixed category ID
      bitrate,
      userLimit,
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
) => {
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
            return channelId;
          }
        }
      }
    }

    return "No channel found";
  } catch (error) {
    console.log("Error finding applicable voice channel:", error);
    return "Error finding channel";
  }
};

// Function to update voice channel name with rate-limit checking
export const updateVoiceChannelName = async (
  voiceChannelId: string,
  matchOngoing: boolean
) => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = await guild.channels.fetch(voiceChannelId);

    if (channel instanceof VoiceChannel) {
      const newName =
        matchOngoing && channel.members.size > 0 ? "CS [🟢 LIVE]" : "CS";

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

// Function to get Elo difference
const getEloDifference = async (previousElo: number, gamePlayerId: string) => {
  const faceitPlayer: FaceitPlayer | null = await faceitApiClient.getPlayerData(
    gamePlayerId
  );

  if (!faceitPlayer?.faceit_elo) {
    return;
  }
  console.log("testing", faceitPlayer.faceit_elo + " : " + previousElo);
  if (faceitPlayer.faceit_elo > previousElo) {
    const eloChange = faceitPlayer.faceit_elo - previousElo;
    return `${`**\+${eloChange}\** (${faceitPlayer.faceit_elo})`}`;
  } else {
    const eloChange = previousElo - faceitPlayer?.faceit_elo;
    return `${`**\-${eloChange}\** (${faceitPlayer.faceit_elo})`}`;
  }
};

// Notify about a match finish
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
        return `**${player.faceitUsername}**: ${eloDifference || ""}`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle(
        `🚨  Match finished update (${
          matchDetails.results?.win ? "WIN" : "LOSS"
        })`
      )
      .setColor(matchDetails.results?.win ? "#00FF00" : "#FF0000")
      .addFields(
        { name: "Map", value: matchDetails.mapName },
        {
          name: "Match Link",
          value: `[Click here](${`https://www.faceit.com/en/cs2/room/`}${
            matchDetails?.matchId
          })`,
        },
        {
          name: "Match Result",
          value: `${matchDetails.results?.finalScore} (${
            matchDetails.results?.win ? "WIN" : "LOSS"
          })`,
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

// Ensure client is logged in before using it
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
