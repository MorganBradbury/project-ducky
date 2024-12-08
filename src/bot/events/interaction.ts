import { client } from "../bot";
import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  Interaction,
} from "discord.js";
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
  } else if (interaction.isButton()) {
    // Handle button interactions
    if (interaction.customId === "join_game") {
      //@ts-ignore
      const gameData = client.gameData;

      if (!gameData) {
        await interaction.reply({
          content: "No game is currently running.",
          ephemeral: true,
        });
        return;
      }

      const userId = interaction.user.id;

      // Check if user already joined
      if (gameData.participants.includes(userId)) {
        await interaction.reply({
          content: "You already joined!",
          ephemeral: true,
        });
        return;
      }

      // Add the user to participants
      gameData.participants.push(userId);

      // Check if the game is now full
      if (gameData.participants.length >= gameData.maxPlayers) {
        const summary = `The game is full! Participants:\n${gameData.participants
          .map((id: string) => `<@${id}>`)
          .join("\n")}`;
        await interaction.message.edit({
          components: [],
        });
        if (interaction.channel?.isTextBased()) {
          //@ts-ignore
          await interaction.channel.send(summary);
        }
      } else {
        // Acknowledge the user's participation
        await interaction.reply({
          content: `You've joined! ${gameData.participants.length}/${gameData.maxPlayers} slots filled.`,
          ephemeral: true,
        });
      }
    }
  }
});
