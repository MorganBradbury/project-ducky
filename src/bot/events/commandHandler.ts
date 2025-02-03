import client from "../client";
import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { commandsMap } from "../commands/index";

client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isCommand()) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = commandsMap.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(interaction as ChatInputCommandInteraction);
        } catch (error) {
          console.error(
            `Error executing command ${interaction.commandName}:`,
            error
          );
          await interaction.reply("There was an error executing the command.");
        }
      }
    }
  }
});
