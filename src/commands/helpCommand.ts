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
        // Command name and description
        const commandInfo = `/${cmd.name}: ${cmd.description}`;

        // If the command has options (parameters), list them
        if (cmd.options && cmd.options.length > 0) {
          const optionsDescription = cmd.options
            .map((option) => {
              // Each option's name and description
              return `**${option.name}**: ${
                option.description || "No description"
              }`;
            })
            .join("\n");

          embed.addFields({
            name: commandInfo,
            value: `Parameters:\n${optionsDescription}`,
          });
        } else {
          // If no options, just display the command with its description
          embed.addFields({
            name: commandInfo,
            value: "No parameters required.",
          });
        }
      });

      // Send the help embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating help command:", error);
      await interaction.reply("Failed to show the help menu.");
    }
  },
};
