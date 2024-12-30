import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../../../db/commands";
import {
  removeAllUnicodeNicknames,
  updateAllUnicodeNicknames,
} from "../../../api/services/DiscordService";

export const leaderboardCommand = {
  name: "leaderboard",
  description: "Displays the leaderboard of tracked users by ELO.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      removeAllUnicodeNicknames();
      const users = await getAllUsers();

      if (users.length === 0) {
        await interaction.reply("No users are currently being tracked.");
        return;
      }

      // Sort users by ELO in descending order
      const sortedUsers = users.sort((a, b) => b.previousElo - a.previousElo);

      // Helper function to get rank emoji
      const getRankEmoji = (rank: number) => {
        const emojiMap: { [key: number]: string } = {
          1: "1️⃣",
          2: "2️⃣",
          3: "3️⃣",
        };
        return emojiMap[rank] || `${rank}.`;
      };

      // Split the leaderboard into two columns
      const halfwayIndex = Math.ceil(sortedUsers.length / 2);
      const leftColumn = sortedUsers.slice(0, halfwayIndex);
      const rightColumn = sortedUsers.slice(halfwayIndex);

      // Helper function to format a column
      const formatColumn = (column: typeof sortedUsers, offset: number) =>
        column
          .map((user, index) => {
            const rank = index + offset + 1;
            return `${getRankEmoji(rank)} **${user.faceitUsername}**: ${
              user.previousElo
            } ELO`;
          })
          .join("\n");

      // Format both columns
      const leftColumnText = formatColumn(leftColumn, 0);
      const rightColumnText = formatColumn(rightColumn, halfwayIndex);

      // Create embed with two fields for columns
      const embed = new EmbedBuilder()
        .setTitle("Leaderboard standings")
        .setColor("#FFD700")
        .addFields(
          {
            name: "Leaderboard",
            value: leftColumnText || "No players",
            inline: true,
          },
          {
            name: "...",
            value: rightColumnText,
            inline: true,
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error generating leaderboard:", error);
      await interaction.reply("Failed to display the leaderboard.");
    }
  },
};
