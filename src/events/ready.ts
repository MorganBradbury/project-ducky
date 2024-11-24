import { REST, Routes } from "discord.js";
import { client } from "../bot";
import { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } from "../config";
import { commands } from "../commands";

client.once("ready", async () => {
  console.log(`${client.user?.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);

  try {
    console.log("Refreshing application (/) commands...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("Successfully reloaded commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
});
