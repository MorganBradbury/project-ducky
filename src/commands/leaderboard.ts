import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../db/commands";

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

          const line = `${rankEmoji} **${user.faceitUsername}** > ${user.previousElo} ELO`;

          // Add spacing for the top 3 only
          return index < 3 ? `${line}\n\u200B` : line;
        })
        .join("\n"); // Regular spacing for lines beyond the top 3

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("FACEIT Leaderboard standings for Duckclub")
        .setColor("#FFD700")
        .setDescription(leaderboard);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error generating leaderboard:", error);
      await interaction.reply("Failed to display the leaderboard.");
    }
  },
};
