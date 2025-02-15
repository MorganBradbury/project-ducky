import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { fetchRetakeServers } from "../../../api/services/retakeService";

export const retakesCommand = {
  data: new SlashCommandBuilder()
    .setName("retakes")
    .setDescription("Choose a map for retakes.")
    .addStringOption((option) =>
      option
        .setName("map")
        .setDescription("Select a map for retakes")
        .setRequired(true)
        .addChoices(
          { name: "Dust2", value: "de_dust2" },
          { name: "Mirage", value: "de_mirage" },
          { name: "Inferno", value: "de_inferno" },
          { name: "Vertigo", value: "de_vertigo" },
          { name: "Overpass", value: "de_overpass" }
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const mapName = interaction.options.getString("map", true);

    try {
      // Show that the bot is processing the request
      await interaction.deferReply({ ephemeral: true });

      // Fetch retake servers based on the selected map
      const retakeServers = await fetchRetakeServers(mapName);

      if (!retakeServers.message || retakeServers.message.length === 0) {
        await interaction.editReply({
          content: `No retake servers found for map: ${mapName}`,
        });
        return;
      }

      // Build the message with server details
      const serverDetailsMessage = retakeServers
        .map((server: any) => {
          return [
            `**Server ID:** ${server.ID}`,
            `**Map:** ${server.CurrentMap}`,
            `**Players:** ${server.Online}/${server.TotalSlots}`,
            `**Connect IP:** ${server.IP}:${server.Port}`,
            "",
          ].join("\n");
        })
        .join("\n");

      // Send the server details message
      await interaction.editReply({
        content: `Here are the available retake servers for map **${mapName}**:\n\n${serverDetailsMessage}`,
      });
    } catch (error) {
      console.error("Error in retakes command:", error);
      await interaction.editReply({
        content:
          "An error occurred while fetching retake servers. Please try again later.",
      });
    }
  },
};
