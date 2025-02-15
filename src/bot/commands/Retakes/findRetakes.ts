import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import { fetchRetakeServers } from "../../../api/services/retakeService";

// This command is registered with autocomplete for selecting a map
export const retakesCommand = {
  name: "retakes",
  description: "Choose a map for retakes.",
  options: [
    {
      name: "map",
      description: "Select a map for retakes",
      type: 3, // String type
      required: true,
      autocomplete: true, // Enable autocomplete for map selection
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    // Handle the retakes command after a map is selected
    const mapName = interaction.options.getString("map");

    // Fetch retake servers based on the selected map
    const retakeServers = await fetchRetakeServers(mapName || "de_mirage");

    if (!retakeServers.message || retakeServers.message.length === 0) {
      await interaction.reply({
        content: `No retake servers found for map: ${mapName}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Build the message with server details
    let serverDetailsMessage = "";
    retakeServers.message.forEach((server: any) => {
      serverDetailsMessage += `**Server ID:** ${server.ID}\n`;
      serverDetailsMessage += `**Map:** ${server.CurrentMap}\n`;
      serverDetailsMessage += `**Players:** ${server.Online}/${server.TotalSlots}\n`;
      serverDetailsMessage += `**Connect IP:** ${server.IP}:${server.Port}\n\n`;
    });

    // Send the server details message
    await interaction.reply({
      content: `Here are the available retake servers for map **${mapName}**:\n\n${serverDetailsMessage}`,
    });
  },
  // Autocomplete handler for the map selection
  autocomplete: async (interaction: AutocompleteInteraction) => {
    const focusedOption = interaction.options.getFocused();
    const mapOptions = [
      "dust2",
      "mirage",
      "inferno",
      "vertigo",
      "overpass",
      // Add more maps as needed
    ];

    // Filter map options based on user input
    const filteredOptions = mapOptions.filter((map) =>
      map.toLowerCase().includes(focusedOption.toLowerCase())
    );

    // Respond with filtered map options
    await interaction.respond(
      filteredOptions.map((map) => ({ name: map, value: map }))
    );
  },
};
