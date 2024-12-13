import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../../db/commands";
import { minecraftActivePlayers } from "../../api/services/minecraftService";

export const getMinecraftActivePlayers = {
  name: "list_minecraft_players_active",
  description: "List all users currently on the Minecraft server",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const users = await minecraftActivePlayers();

      if (users === null || users.length === 0) {
        await interaction.reply("No players are currently on the server");
        return;
      }

      const userList = users.map((user) => `**${user}**`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Minecraft server active players")
        .setColor("#00FF00")
        .setDescription(userList);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching minecraft players:", error);
      await interaction.reply(`Failed to get server players: ${error}`);
    }
  },
};
