import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { fetchRetakeServers } from "../../../api/services/retakeService";

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

const mapNameLookup = (mapName: string): string => {
  const countryMap: Record<string, string> = {
    Mirage: "de_mirage",
    Nuke: "de_nuke",
    Dust2: "de_dust2",
    Ancient: "de_ancient",
    Anubis: "de_anubis",
    Inferno: "de_inferno",
    Train: "de_train",
  };

  return countryMap[mapName.toLowerCase()] || "Unknown Country";
};

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
        { name: "Dust 2", value: "de_dust2" },
        { name: "Ancient", value: "de_ancient" },
        { name: "Train", value: "de_train" },
      ],
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const mapName = mapNameLookup(
        interaction.options.getString("mapname", true) || "de_mirage"
      );

      // Acknowledge the interaction
      await interaction.deferReply({ ephemeral: true });

      // Ensure the map name is always 30 characters long by padding with spaces
      const paddedMapName = mapName.padEnd(70, " ");

      // Fetch retake servers for the selected map
      const retakeServers = await fetchRetakeServers(mapName);

      if (!retakeServers || retakeServers.length === 0) {
        await interaction.editReply({
          content: `No retake servers found for map: **${mapName}**`,
        });
        return;
      }

      // Create embeds for each server
      const embeds = retakeServers.map((server: any, index: number) =>
        new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle(`Retakes #${index + 1}`)
          .setDescription(
            `**Map:** ${paddedMapName}\n` + // Use padded map name here
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
