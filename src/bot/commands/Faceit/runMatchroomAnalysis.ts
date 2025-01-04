import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getAllUsers } from "../../../db/commands";
import { getMatchAnalysis } from "../../../api/services/MatchesService";

export const matchAnalysisCommand = {
  name: "match_analysis",
  description: "Get match analysis from a provided match link.",
  options: [
    {
      name: "match_link",
      description: "The link to the match",
      type: 3, // String type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const matchLink = interaction.options.getString("match_link");

      if (!matchLink) {
        await interaction.reply("You must provide a match link.");
        return;
      }

      // Extract the matchId from the URL
      const matchId = matchLink.split("/").pop(); // assuming the match ID is the last part of the URL

      if (!matchId) {
        await interaction.reply(
          "Could not extract match ID from the provided link."
        );
        return;
      }

      // Call the getMatchAnalysis function with the extracted matchId
      getMatchAnalysis(matchId);

      await interaction.reply({
        content: `Match analysis for match ID: ${matchId} has been triggered.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error fetching match analysis:", error);
      await interaction.reply(`Failed to fetch match analysis: ${error}`);
    }
  },
};
