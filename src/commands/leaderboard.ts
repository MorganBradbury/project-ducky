import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../db/models/commands";

export const leaderboardCommand = {
  name: "leaderboard",
  description: "Displays the leaderboard of tracked users by ELO.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const users = await getAllUsers();

      if (users.length === 0) {
        await interaction.reply("No users are currently being tracked.");
        return;
      }

      // Sort users by ELO in descending order
      const sortedUsers = users.sort((a, b) => b.previousElo - a.previousElo);

      // Map users into leaderboard format
      const leaderboard = sortedUsers
        .map((user, index) => {
          const rankEmoji =
            index === 0
              ? "🏆"
              : index === 1
              ? "🥈"
              : index === 2
              ? "🥉"
              : `${index + 1}.`;
          return `${rankEmoji} **${user.faceitUsername}** > ${user.previousElo} ELO`;
        })
        .join("\n\u200B\n"); // Add spacing between lines

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("🏅 Faceit Leaderboard")
        .setColor("#FFD700")
        .setDescription(leaderboard);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating leaderboard:", error);
      await interaction.reply("Failed to display the leaderboard.");
    }
  },
};
