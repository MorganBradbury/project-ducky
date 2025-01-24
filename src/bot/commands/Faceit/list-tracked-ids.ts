import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getAllUsers } from "../../../db/commands";

export const listUserIdsCommand = {
  name: "list_tracked_ids",
  description: "List all users currently being tracked (ids)",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const users = await getAllUsers();
      if (users.length === 0) {
        await interaction.reply("No users are currently being tracked.");
        return;
      }

      const userList = users.map((user) => `${user.faceitId}`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Tracked Users")
        .setColor("#00FF00")
        .setDescription(userList);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      await interaction.reply(`Failed to list users: ${error}`);
    }
  },
};
