import { REST, Routes, Interaction } from "discord.js";
import client from "./client";
import { config } from "../config";
import { commands, commandsMap } from "./commands";
import "./events/autorole1";
import "./events/voicestates";
import "./events/ai";
import "./events/leaver";

// Refresh commands and log ready status
client.once("ready", async () => {
  console.log(`${client.user?.tag} is online!`);
  try {
    console.log("Refreshing application (/) commands...");
    await new REST({ version: "10" })
      .setToken(config.DISCORD_BOT_TOKEN)
      .put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
        body: commands,
      });
    console.log("Commands refreshed.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
});

// Handle interactions
client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commandsMap.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error with command ${interaction.commandName}:`, error);
      await interaction.reply("An error occurred.");
    }
  }
});

// Login bot
client
  .login(config.DISCORD_BOT_TOKEN)
  .then(() => console.log("Bot logged in and running!"))
  .catch((error) => console.error("Login failed:", error));
