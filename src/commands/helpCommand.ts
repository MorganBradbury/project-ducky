import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { commandsMap } from "../commands"; // Import the commands map

export const helpCommand = {
  name: "help",
  description: "Shows a list of all available commands.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      // Generate the command list in a single string
      const commandList = Array.from(commandsMap.values())
        .map((cmd) => {
          const params = cmd.options?.length
            ? cmd.options
                .map(
                  (opt: { name: string; description: string }) =>
                    `<${opt.name}>`
                )
                .join(" ")
            : "";
          return `/${cmd.name} ${params} - ${cmd.description}`;
        })
        .join("\n"); // Join commands with no extra blank lines

      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle("Available Commands")
        .setColor("#00FF00")
        .setDescription(
          `Here are all the commands you can use:\n\n${commandList}`
        );

      // Send the embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error generating help command:", error);
      await interaction.reply("Failed to show the help menu.");
    }
  },
};
