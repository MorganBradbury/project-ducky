import {
  updateLinkedRole,
  updateServerRoles,
} from "../../api/services/discord-service";
import { FaceitService } from "../../api/services/faceit-service";
import { addUser } from "../../db/commands";
import { Player } from "../../types/Faceit/player";
import { updateNickname } from "../../utils/nicknameUtils";
import client from "../client";

const monitoredChannelId = "1327303978223931462"; // Replace with the ID of the channel to monitor

// Listen for messages in the server
client.on("messageCreate", async (message) => {
  console.log("message received", message.channel.id);
  // Ignore messages not from the monitored channel
  if (message.channel.id !== monitoredChannelId) return;

  // Ignore messages from the bot itself
  if (message.author.bot) return;

  // Get the Discord tag and message content
  const userTag = message.author.tag; // The user's Discord tag (e.g., username#1234)
  const faceitName = message.content; // The content of the message

  // Log the information
  console.log(`Message from ${userTag}: ${faceitName}`);

  try {
    const player: Player | null = await FaceitService?.getPlayer(faceitName);

    if (!player) {
      // Send an error reply
      await message.reply(
        `Invalid FACEIT nickname. Please make sure you are entering your name correctly. It is CASE SENSITIVE.`
      );
      return;
    }

    if (!message.member) {
      await message.reply(`Something went wrong. No member found.`);
      return;
    }

    await addUser(
      userTag,
      player.faceitName,
      player.faceitElo,
      player.gamePlayerId,
      player.id
    );
    // Update nickname and roles
    await updateNickname(message.member, player);
    await updateServerRoles(message.member, player);
    await updateLinkedRole(
      message.member,
      "1327306844581924977",
      "1327302146814775369"
    );

    // Confirm success to the user
    await message.reply(
      `FACEIT account successfully added! Tracked player: **${player.faceitName}** with **${player.faceitElo} ELO**.`
    );

    console.log(`User added to tracker: ${faceitName}`);
  } catch (error) {
    console.error("Error updating FACEIT level:", error);
    await message.reply({ content: `An error occurred: ${error}` });
  }
});
