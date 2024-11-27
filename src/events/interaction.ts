import { client } from "../bot";
import { ChatInputCommandInteraction } from "discord.js";
import { commandsMap } from "../commands/index";

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  // Narrow the interaction to ChatInputCommandInteraction
  if (interaction.isChatInputCommand()) {
    const command = commandsMap.get(interaction.commandName);
    if (command) {
      try {
        await command.execute(interaction as ChatInputCommandInteraction); // Explicitly cast
      } catch (error) {
        console.error(
          `Error executing command ${interaction.commandName}:`,
          error
        );
        await interaction.reply("There was an error executing the command.");
      }
    }
  }
});
