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
        .setColor("#03D7FC")
        .setDescription("Here are all the commands you can use:");

      // Loop through all commands and add them to the embed
      commandsMap.forEach((cmd) => {
        // Command and description in the desired format
        let commandInfo = `\`/${cmd.name}\``;

        // Add parameters if they exist
        if (cmd.options && cmd.options.length > 0) {
          const optionsDescription = cmd.options
            .map((option) => {
              // Each option's name in angle brackets and description in normal text
              return `\`<${option.name}>\``;
            })
            .join(" "); // Join them on the same line with space

          // Append the options to the command
          commandInfo += ` ${optionsDescription} - ${cmd.description}`;
        } else {
          // No options, just the command with description
          commandInfo += ` - ${cmd.description}`;
        }

        // Add to the embed as a single line
        embed.addFields({
          name: "\u200b", // Invisible space to keep the field structure valid
          value: commandInfo,
        });
      });

      // Send the help embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating help command:", error);
      await interaction.reply("Failed to show the help menu.");
    }
  },
};
