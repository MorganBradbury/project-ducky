import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { fetchRetakeServers } from "../../../api/services/retakeService";

export const retakesCommand = {
  name: "retakes",
  description: "Find a retake server on xplay.gg",
  options: [
    {
      name: "mapname",
      type: 3, // STRING type
      description: "What map?",
      required: true,
      choices: [
        { name: "Mirage", value: "de_mirage" },
        { name: "Nuke", value: "de_nuke" },
        { name: "Inferno", value: "de_inferno" },
        { name: "Anubis", value: "de_anubis" },
        { name: "Dust 2", value: "de_nuke" },
        { name: "Ancient", value: "de_ancient" },
        { name: "Train", value: "de_train" },
      ],
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const mapName = interaction.options.getString("mapname", true);

      // Acknowledge the interaction
      await interaction.deferReply({ ephemeral: true });

      // Fetch retake servers for the selected map
      const retakeServers = await fetchRetakeServers(mapName);

      if (!retakeServers || retakeServers.length === 0) {
        await interaction.editReply({
          content: `No retake servers found for map: **${mapName}**`,
        });
        return;
      }

      const findServerLocation = (countryCode: string): string => {
        const countryMap: Record<string, string> = {
          fr: "France",
          gb: "United Kingdom",
          nl: "Netherlands",
          dk: "Denmark",
          de: "Germany",
        };

        return countryMap[countryCode.toLowerCase()] || "Unknown Country";
      };

      // Create embeds for each server
      const embeds = retakeServers.map((server: any) =>
        new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle(`Server ID: ${server.ID}`)
          .setDescription(
            `**Map:** ${server.CurrentMap}\n` +
              `**Location:** ${findServerLocation(server.CountryCode)}\n` +
              `**Players:** ${server.Online}/${server.TotalSlots}\n` +
              `**Connect IP:** \`${server.IP}:${server.Port}\``
          )
      );

      // Send all embeds in the response
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error executing retakes command:", error);
      await interaction.editReply({
        content:
          "An error occurred while fetching retake servers. Please try again later.",
      });
    }
  },
};
