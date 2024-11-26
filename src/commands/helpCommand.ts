import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { commandsMap } from "../commands"; // Import the commands map

export const helpCommand = {
  name: "help",
  description: "Shows a list of all available commands.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      // Start building the embed
      const embed = new EmbedBuilder()
        .setTitle("Available Commands")
        .setColor("#00FF00")
        .setDescription("Here are all the commands you can use:");

      // Loop through all commands and add them to the embed
      commandsMap.forEach((cmd) => {
        // Ensure the description is valid (between 1 and 100 characters)
        if (
          cmd.description &&
          cmd.description.length > 0 &&
          cmd.description.length <= 100
        ) {
          embed.addFields({
            name: `/${cmd.name}`,
            value: cmd.description,
          });
        } else {
          console.warn(`Command /${cmd.name} has an invalid description.`);
        }
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating help command:", error);
      await interaction.reply("Failed to show the help menu.");
    }
  },
};
