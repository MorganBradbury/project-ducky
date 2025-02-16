import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { fetchRetakeServers } from "../../../api/services/retakeService";
import { getMapEmoji } from "../../../constants";

const findServerLocation = (countryCode: string): string => {
  const countryMap: Record<string, { name: string; flag: string }> = {
    fr: { name: "France", flag: "🇫🇷" },
    gb: { name: "UK", flag: "🇬🇧" },
    nl: { name: "Netherlands", flag: "🇳🇱" },
    dk: { name: "Denmark", flag: "🇩🇰" },
    de: { name: "Germany", flag: "🇩🇪" },
  };

  const country = countryMap[countryCode.toLowerCase()];
  return country ? `${country.flag} ${country.name}` : "Unknown Country";
};

const mapNameLookup = (mapName: string): string => {
  const map: Record<string, string> = {
    de_mirage: "Mirage",
    de_nuke: "Nuke",
    de_dust2: "Dust2",
    de_ancient: "Ancient",
    de_anubis: "Anubis",
    de_inferno: "Inferno",
    de_train: "Train",
  };

  return map[mapName.toLowerCase()] || "Unknown Map";
};

// Utility function to pad Connect IP field to exactly 46 characters
const padConnectIP = (ip: string, port: string): string => {
  const ipString = `${ip}:${port}`;
  const targetLength = 21;
  const paddingLength = targetLength - ipString.length;
  if (paddingLength > 0) {
    return ipString + " ".repeat(paddingLength); // Pad with spaces if the length is less than 46
  }
  return ipString; // If already 46 or more, return the string as is
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
      const mapName =
        interaction.options.getString("mapname", true) || "de_mirage";
      // Acknowledge the interaction
      await interaction.deferReply();

      // Fetch retake servers for the selected map
      const retakeServers = await fetchRetakeServers(mapName);

      if (!retakeServers || retakeServers.length === 0) {
        await interaction.editReply({
          content: `No retake servers found for map: **${mapName}**`,
        });
        return;
      }

      // Generate the embeds asynchronously and wait for all to resolve
      const embeds = await Promise.all(
        retakeServers.map(async (server: any, index: number) => {
          const mapIcon = await getMapEmoji(mapName);
          const paddedConnectIP = padConnectIP(server.IP, server.Port); // Pad Connect IP to 46 characters
          return new EmbedBuilder()
            .setColor("#FFA500")
            .setTitle(
              `Retakes #${index + 1} ${
                server.Online === 0
                  ? "[ᴇᴍᴘᴛʏ]"
                  : `[${server.Online}/${server.TotalSlots}]`
              }`
            )
            .setDescription(
              `${mapIcon} ${mapNameLookup(mapName)}   /   ${findServerLocation(
                server.CountryCode
              )}\n` + `**Connect IP:**  \`${paddedConnectIP}\``
            );
        })
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
