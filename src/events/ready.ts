import { REST, Routes } from "discord.js";
import { client } from "../bot";
import { config } from "../config";
import { commands } from "../commands";

client.once("ready", async () => {
  console.log(`${client.user?.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(config.DISCORD_BOT_TOKEN);

  try {
    console.log("Refreshing application (/) commands...");
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
      body: commands,
    });
    console.log("Successfully reloaded commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
});
