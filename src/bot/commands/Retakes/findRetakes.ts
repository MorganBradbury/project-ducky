import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

export const retakesCommand = {
  name: "retakes",
  description: "Start a retakes game on a selected map",
  options: [
    {
      name: "mapname",
      type: 3, // STRING type
      description: "Select a map to play retakes on",
      required: true,
      choices: [
        { name: "Mirage", value: "de_mirage" },
        { name: "Nuke", value: "de_nuke" },
        { name: "Inferno", value: "de_inferno" },
      ],
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const mapName = interaction.options.getString("mapname");

      const embed = new EmbedBuilder()
        .setTitle("Retakes Game")
        .setColor("#FFA500")
        .setDescription(`A retakes game is starting on **${mapName}**!`);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error executing retakes command:", error);
      await interaction.reply({
        content: `Failed to start retakes game: ${error}`,
        ephemeral: true,
      });
    }
  },
};
