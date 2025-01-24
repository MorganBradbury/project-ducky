import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { commandsMap } from ".";

export const helpCommand = {
  name: "help",
  description: "Shows a list of all available commands.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      const commandFields = Array.from(commandsMap.values())
        .map((cmd) => {
          const optionsText = cmd.options?.length
            ? " " + cmd.options.map((opt) => `\`<${opt.name}>\``).join(" ")
            : "";

          return `\`/${cmd.name}\`${optionsText} - ${cmd.description}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("Available Commands")
        .setColor("#03D7FC")
        .setDescription(
          "Here are all the commands you can use:\n\n" + commandFields
        );

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error generating help command:", error);
      await interaction.reply("Failed to show the help menu.");
    }
  },
};
