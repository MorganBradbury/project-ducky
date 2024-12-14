import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../../../db/commands";

export const listUsersCommand = {
  name: "list_users",
  description: "List all users currently being tracked.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const users = await getAllUsers();
      if (users.length === 0) {
        await interaction.reply("No users are currently being tracked.");
        return;
      }

      const userList = users
        .map(
          (user) =>
            `**${user.discordUsername}** (FACEIT: ${user.faceitUsername})`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Tracked Users")
        .setColor("#00FF00")
        .setDescription(userList);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error fetching users:", error);
      await interaction.reply(`Failed to list users: ${error}`);
    }
  },
};
