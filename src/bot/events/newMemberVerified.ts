import { TextChannel } from "discord.js";
import { FaceitService } from "../../api/services/faceitService";
import { addUser, deleteUser } from "../../db/dbCommands";
import { Player } from "../../types/Faceit/player";
import { updateNickname } from "../../utils/nicknameUtils";
import client from "../client";
import {
  updateLinkedRole,
  updateServerRoles,
} from "../../api/services/rolesService";
import {
  sendNewUserNotification,
  updateLeaderboardEmbed,
} from "../../api/services/embedService";
import { config } from "../../config";

const monitoredChannelId = "1327303978223931462"; // Replace with the ID of the channel to monitor

// Listen for messages in the server
client.on("messageCreate", async (message) => {
  // Ignore messages not from the monitored channel
  if (message.channel.id !== monitoredChannelId) return;

  // Ignore messages from the bot itself
  if (message.author.bot) return;

  // Role ID to check
  const roleIdToCheck = "1327302146814775369";

  // Check if the author has the specified role
  const hasRole = message.member?.roles.cache.has(roleIdToCheck);

  // Check if the message mentions another user
  const hasMentions = message.mentions.users.size > 0;

  // Logic to delete the message
  if (hasRole) {
    if (!hasMentions) {
      await message.delete();
      console.log(
        `Message deleted because author has role ${roleIdToCheck} but the message didn't contain mentions.`
      );
    }
    return;
  }

  // Proceed with further logic if the message isn't deleted
  const userTag = message.author.tag; // The user's Discord tag (e.g., username#1234)
  const faceitName = message.content; // The content of the message

  console.log(`Message from ${userTag}: ${faceitName}`);

  try {
    const player: Player | null = await FaceitService?.getPlayer(faceitName);

    if (!player) {
      await message.reply(
        `Invalid FACEIT nickname. Please make sure you are entering your name correctly. It is CASE SENSITIVE.`
      );
      return;
    }

    if (!message.member) {
      await message.reply(`Something went wrong. No member found.`);
      return;
    }

    try {
      await deleteUser(message.author.tag);
    } catch (error) {
      console.log(`User doesn't already exist: ${message.author.tag}`);
    }
    // Add the user to the database and update roles/nicknames
    await addUser(
      userTag,
      player.faceitName,
      player.faceitElo,
      player.gamePlayerId,
      player.id
    );
    await updateNickname(message.member, player);
    await updateServerRoles(message.member, player);
    await updateLinkedRole(
      message.member,
      "1327306844581924977",
      "1327302146814775369"
    );

    console.log(`User added to tracker: ${faceitName}`);

    // Now, delete all messages in the channel containing the user's ID
    const channel = message.channel;
    const messages = await channel.messages.fetch({ limit: 15 });

    // Find messages to delete: any message containing the user's ID, from the user, or containing specific keywords
    const messagesToDelete = messages.filter(
      (msg) =>
        msg.content.includes(message.author.id) ||
        msg.author.id === message.author.id ||
        msg.content.includes("Invalid FACEIT nickname") ||
        msg.content.includes("An error occurred")
    );

    await Promise.all(
      messagesToDelete.map(async (msg) => {
        try {
          await msg.delete();
          console.log(`Deleted message from ${msg.author.tag}`);

          if (msg.reference?.messageId) {
            const referencedMessage = await channel.messages.fetch(
              msg.reference.messageId
            );
            if (referencedMessage) {
              await referencedMessage.delete();
              console.log(
                `Deleted referenced message from ${referencedMessage.author.tag}`
              );
            }
          }
        } catch (error) {
          console.error(
            `Error deleting message from ${msg.author.tag}:`,
            error
          );
        }
      })
    );

    // Send a welcome message
    const welcomeChannelId = config.CHANNEL_GENERAL;
    const welcomeChannel = await client.channels.fetch(welcomeChannelId);
    const totalUsers = message.guild?.memberCount;
    await (welcomeChannel as TextChannel).send(
      `👋  Hi <@${message.author.id}>. Welcome to Duckclub. You are duck #${totalUsers}.\n\n` +
        `Here are some useful channels you can check out:\n\n` + // Line break here
        `<#${config.CHANNEL_GENERAL}>: A place to chat and interact with the community.\n` +
        `<#${config.CHANNEL_LIVE_MATCHES}>: Stay up-to-date with ongoing matches.\n` +
        `<#${config.CHANNEL_MATCH_RESULTS}>: Check out the latest match results.\n` +
        `<#${config.CHANNEL_MAP_ANALYSIS}>: Bot-generated analysis for your matches. This shows the opponents pick/ ban habbits to help you pick the best map\n` +
        `<#${config.CHANNEL_LEADERBOARD}>: See the current standings and rankings within the discord.\n` +
        `<#${config.CHANNEL_UPDATES}>: Get information on the latest updates for CS`
    );

    console.log(`Sent welcome message to channel ${welcomeChannelId}`);
    await sendNewUserNotification(userTag, player.id);
    updateLeaderboardEmbed();
  } catch (error) {
    console.error("Error processing message:", error);
    await message.reply({ content: `An error occurred: ${error}` });
  }
});
