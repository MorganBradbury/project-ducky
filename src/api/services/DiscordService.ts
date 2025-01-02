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
import { SystemUser } from "../../types/SystemUser";
import { FaceitService } from "./FaceitService";
import axios from "axios";
import { PermissionFlagsBits } from "discord.js";
import { config } from "../../config";
import {
  removeExistingTag,
  removeUnicodeChars,
  toUnicodeStr,
  updateNickname,
} from "../../utils/nicknameUtils";
import { getAllUsers, updateUserElo } from "../../db/commands";
import { Player } from "../../types/Faceit/Player";
import { calculateEloDifference } from "../../utils/faceitHelper";
import { Match } from "../../types/Faceit/Match";
import { toUnicode } from "punycode";
import { numberToUnicode } from "../../utils/unicodeHelper";

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
export const getMatchVoiceChannelId = async (
  matchingPlayers: SystemUser[]
): Promise<string | null> => {
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
        } else {
          return null;
        }
      }
    }
  }

  return null;
};

// Function to update voice channel name with rate-limit checking
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

export const sendMatchFinishNotification = async (match: Match) => {
  try {
    // Get player stats using the getPlayerStats function
    const getPlayerStatsData = await FaceitService.getPlayerStats(
      match.matchId,
      match.trackedTeam.trackedPlayers.map((player) => player.faceitId)
    );

    // Sort the player stats by ADR in descending order
    const sortedPlayerStats = getPlayerStatsData.sort(
      (a, b) => parseFloat(b.ADR) - parseFloat(a.ADR)
    );

    // Define column widths for alignment
    const columnWidths = {
      name: 18, // Name column: 18 characters max
      stats: 18, // Stats column: 18 characters (e.g., 16/11/10 89ADR (46%))
      elo: 13, // Elo Change column: 13 characters (e.g., +25 (2100))
    };

    // Construct the table header
    const header = "`Name               | Stats               | Elo Change`";
    const separator =
      "`-------------------|---------------------|-------------`";

    // Construct table rows
    const playerStatsTable = await Promise.all(
      sortedPlayerStats.map(async (stat) => {
        const player = match.trackedTeam.trackedPlayers.find(
          (player) => player.faceitId === stat.playerId
        );
        const eloChange = await calculateEloDifference(
          player?.previousElo || 0,
          player?.gamePlayerId || ""
        );

        // Truncate or pad the player name to 18 characters
        const name =
          (player?.faceitUsername || "Unknown").length > 18
            ? `${(player?.faceitUsername || "Unknown").slice(0, 15)}...`
            : (player?.faceitUsername || "Unknown").padEnd(
                columnWidths.name,
                " "
              );

        // Format K/D/A stats and ensure the column width
        const kda = `${stat.kills}/${stat.deaths}/${stat.assists}`.padEnd(
          7,
          " "
        );
        const adr = `${stat.ADR}ADR`.padEnd(5, " "); // Add space between ADR and HS%

        // Remove the % sign from HS% and ensure it has correct spacing
        const hs = `${stat.hsPercentage.replace("%", "")}%`.padEnd(7, " "); // Ensure 7 characters in HS%

        // Elo change
        const elo =
          `${eloChange?.operator}${eloChange?.difference} (${eloChange?.newElo})`.padEnd(
            columnWidths.elo,
            " "
          );

        return `\`${name} | ${kda} ${adr} ${hs} | ${elo}\``;
      })
    );

    // Determine win/loss based on finalScore or eloDifference
    const finalScore = await FaceitService.getMatchScore(
      match.matchId,
      match.trackedTeam.faction,
      true
    );
    const didTeamWin = await FaceitService.getMatchResult(
      match.matchId,
      match.trackedTeam.faction
    );

    // Map Emoji using the format for custom emojis
    const mapEmoji = `:${match.mapName}:`; // Replace match.mapName with the emoji name like 'de_mirage'

    const embed = new EmbedBuilder()
      .setTitle(`🚨 New match finished`)
      .setColor(didTeamWin ? "#00FF00" : "#FF0000")
      .addFields(
        {
          name: "Map",
          value: `${mapEmoji} ${match.mapName}`,
        },
        {
          name: "Match Link",
          value: `[Click here](https://www.faceit.com/en/cs2/room/${match?.matchId})`,
        },
        {
          name: "Match Result",
          value: `${finalScore.join(" / ") || "N/A"} (${
            didTeamWin ? "WIN" : "LOSS"
          })`,
        },
        {
          name: "Players and Stats",
          value:
            `**Map Stats**\n` +
            "`Name               | Stats               | Elo Change`\n" +
            "`-------------------|---------------------|-------------`\n" +
            playerStatsTable.join("\n"),
        }
      )
      .setTimestamp();

    await sendEmbedMessage(embed);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
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
          const player: Player | null = await FaceitService.getPlayer(
            gamePlayerId
          );

          if (!player || player.faceitElo === previousElo) return; // Skip unchanged users

          const member =
            guild.members.cache.find((m) => m.user.tag === discordUsername) ??
            (await guild.members
              .fetch({ query: discordUsername, limit: 1 })
              .then((m) => m.first()));

          if (!member) return; // Skip if member not found

          await Promise.all([
            updateNickname(member, player),
            updateUserElo(user.userId, player.faceitElo),
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

export const updateServerRoles = async (
  member: GuildMember,
  player: Player
) => {
  try {
    if (!member || !player) {
      console.error("Member or player data is missing.");
      return;
    }

    const guild = await client.guilds.fetch(config.GUILD_ID); // Cache the guild object
    const skillLevelRoleName = `Level ${player.skillLevel}`;

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
    const categoryId = config.MC_CATEGORY_ID;

    // Filter channels that belong to the specified category and are voice channels
    const channelsInCategory = allChannels.filter(
      (channel) =>
        channel &&
        channel.parentId === categoryId &&
        channel.type === 2 && // 2 is for voice channels
        channel.name.includes("ᴘʟᴀʏᴇʀ(ꜱ)") // Only include channels with "PLAYERS" in the name
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
    const channelName = `🟢 ${numberToUnicode(playerCount)} ᴘʟᴀʏᴇʀ(ꜱ)`;
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
// Helper function to extract the number from the channel name
function extractNumberFromName(channelName: string): number | null {
  const match = channelName.match(/(\d+)/); // Match digits in the name
  return match ? parseInt(match[0], 10) : null;
}

// Helper function to reorder voice channels by their name numbers
async function reorderVoiceChannels(channels: VoiceChannel[]): Promise<void> {
  const sortedChannels = channels.sort((a, b) => {
    const aNumber = extractNumberFromName(a.name);
    const bNumber = extractNumberFromName(b.name);

    // Channels without a number will be pushed to the end
    if (aNumber === null && bNumber === null) return 0;
    if (aNumber === null) return 1;
    if (bNumber === null) return -1;

    return aNumber - bNumber;
  });

  // Set the positions based on the custom sorted order
  await Promise.all(
    sortedChannels.map((channel, index) => {
      if (channel.position !== index) {
        return channel.setPosition(index);
      }
    })
  );
}

export async function resetVoiceChannelStates(): Promise<void> {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      throw new Error("GUILD_ID is not set in environment variables.");
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new Error(`Guild with ID ${guildId} not found.`);
    }

    const channels = await guild.channels.fetch();

    // Group channels by category (parentId) and filter voice channels
    const categories: Record<string, VoiceChannel[]> = {};

    channels.forEach((channel) => {
      if (
        channel?.type === ChannelType.GuildVoice &&
        channel.id !== guild.afkChannelId
      ) {
        const categoryId = channel.parentId || "no-category";

        // Skip channels in ignored categories
        if (categoryId !== "no-category") {
          return;
        }

        if (!categories[categoryId]) categories[categoryId] = [];
        categories[categoryId].push(channel as VoiceChannel);
      }
    });

    // Process each category
    for (const [categoryId, voiceChannels] of Object.entries(categories)) {
      const categoryName = voiceChannels[0]?.parent?.name || "Uncategorized";

      // Rename channels based on occupancy and emojis.
      const updatedChannels = await Promise.all(
        voiceChannels.map(async (channel) => {
          let newName: string;
          if (channel.members.size > 0) {
            // Occupied channels: Ensure 🟢 is set
            newName = `🟢 ${channel.name.replace(/^🟠 |^🟢 /, "")}`; // Replace 🟠 or 🟢 with 🟢
          } else {
            // Empty channels: Ensure 🟠 is set
            newName = `🟠 ${channel.name.replace(/^🟠 |^🟢 /, "")}`; // Replace 🟠 or 🟢 with 🟠
          }

          // If the name is different, update it
          if (channel.name !== newName) {
            console.log(`Renaming channel: ${channel.name} -> ${newName}`);
            await channel.setName(newName);
          }

          return channel;
        })
      );

      // Reorder the channels based on their numbers in the names
      await reorderVoiceChannels(updatedChannels);
    }

    console.log("Voice channels updated and reordered successfully.");
  } catch (error) {
    console.error("Error updating voice channels:", error);
  }
}

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

export const createPrematchEmbed = (mapStats: PlayerMapsData[]) => {
  // Sort by playedTimes (desc) and then winPercentage (desc)
  const sortedStats = [...mapStats].sort((a, b) => {
    if (b.playedTimes === a.playedTimes) {
      return b.winPercentage - a.winPercentage;
    }
    return b.playedTimes - a.playedTimes;
  });

  // Generate the table content
  const tableRows = sortedStats
    .map(({ mapName, playedTimes, winPercentage }) => {
      const formattedWinPercentage =
        playedTimes === 0 || isNaN(winPercentage)
          ? "N/A"
          : winPercentage.toFixed(2);
      return `\`${mapName.padEnd(12)} | ${playedTimes
        .toString()
        .padEnd(6)} | ${formattedWinPercentage.padEnd(6)}\``;
    })
    .join("\n");

  // Analysis for most and least played maps
  const mostPlayedMaps = sortedStats
    .slice(0, 3)
    .map((map) => map.mapName)
    .join("\n ");
  const leastPlayedMaps = sortedStats
    .slice(-3)
    .map((map) => map.mapName)
    .join("\n ");

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle("Prematch Analysis")
    .setDescription(
      "**Map Stats**\n" +
        "`Map Name     | Played | Win %  `\n" +
        "`-------------|--------|--------`\n" +
        tableRows
    )
    .addFields(
      {
        name: "Captain's most played maps",
        value: mostPlayedMaps || "No maps found.",
        inline: false,
      },
      {
        name: "Captain is likely going to ban:",
        value: leastPlayedMaps || "No maps found.",
        inline: false,
      }
    )
    .setColor("#00AE86")
    .setFooter({ text: "Prematch analysis" })
    .setTimestamp();

  sendEmbedMessage(embed);

  return embed;
};

export const updateAllUnicodeNicknames = async () => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID); // Fetch the guild
    const members = await guild.members.fetch(); // Fetch all members

    const ownerId = guild.ownerId; // Get the server owner's ID

    // Loop through all members and get their server nickname
    members.forEach(async (member) => {
      // Skip the server owner
      if (member.id === ownerId) {
        return;
      }

      const nickname = member.nickname;
      console.log(`${member.user.tag} has the nickname: ${nickname}`);
      const findUser = await getAllUsers();
      const user = findUser.find(
        (user) => user.discordUsername === member.user.tag
      );

      // You can now modify the nickname if needed
      // Example: modify the nickname and update it
      if (nickname) {
        const newNickname = `${member.nickname} ${toUnicodeStr(
          `[${user?.previousElo}]`
        )}`;

        // If the nickname has changed, update it
        if (newNickname !== nickname) {
          member.setNickname(newNickname);
          console.log(
            `Updated ${member.user.tag}'s nickname to: ${newNickname}`
          );
        }
      }
    });
  } catch (error) {
    console.error("Error fetching members or updating nicknames:", error);
  }
};
export const removeAllUnicodeNicknames = async () => {
  try {
    const guild = await client.guilds.fetch(config.GUILD_ID); // Fetch the guild
    const members = await guild.members.fetch(); // Fetch all members

    const ownerId = guild.ownerId; // Get the server owner's ID

    // Loop through all members and get their server nickname
    members.forEach(async (member) => {
      // Skip the server owner
      if (member.id === ownerId) {
        return;
      }

      const nickname = member.nickname;
      console.log(`${member.user.tag} has the nickname: ${nickname}`);

      // You can now modify the nickname if needed
      // Example: modify the nickname and update it
      if (nickname) {
        const newNickname = removeUnicodeChars(nickname); // Assuming `removeExistingTag` is your function to modify the nickname

        // If the nickname has changed, update it
        if (newNickname !== nickname) {
          member.setNickname(newNickname);
          console.log(
            `Updated ${member.user.tag}'s nickname to: ${newNickname}`
          );
        }
      }
    });
  } catch (error) {
    console.error("Error fetching members or updating nicknames:", error);
  }
};

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
