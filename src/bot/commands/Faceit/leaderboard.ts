import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getAllUsers } from "../../../db/commands";

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

      // Helper function to get rank emoji
      const getRankEmoji = (rank: number) => {
        const emojiMap: { [key: number]: string } = {
          1: "1️⃣",
          2: "2️⃣",
          3: "3️⃣",
        };
        return emojiMap[rank] || `${rank}.`;
      };

      // Calculate column sizes
      const columnSize = Math.ceil(sortedUsers.length / 3);
      const firstColumn = sortedUsers.slice(0, columnSize);
      const secondColumn = sortedUsers.slice(columnSize, columnSize * 2);
      const thirdColumn = sortedUsers.slice(columnSize * 2);

      // Helper function to format a column
      const formatColumn = (column: typeof sortedUsers, offset: number) =>
        column
          .map((user, index) => {
            const rank = index + offset + 1;
            return `${getRankEmoji(rank)} **${user.discordUsername}** (${
              user.previousElo
            })`;
          })
          .join("\n");

      // Format all three columns
      const firstColumnText = formatColumn(firstColumn, 0);
      const secondColumnText = formatColumn(secondColumn, columnSize);
      const thirdColumnText = formatColumn(thirdColumn, columnSize * 2);

      // Create embed with three fields for columns
      const embed = new EmbedBuilder()
        .setTitle("Leaderboard standings")
        .setColor("#FFD700")
        .addFields(
          {
            name: "Leaderboard",
            value: firstColumnText || "No players",
            inline: true,
          },
          {
            name: "\u200B",
            value: secondColumnText || "\u200B",
            inline: true,
          },
          {
            name: "\u200B",
            value: thirdColumnText || "\u200B",
            inline: true,
          }
        );

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error generating leaderboard:", error);
      await interaction.reply("Failed to display the leaderboard.");
    }
  },
};
