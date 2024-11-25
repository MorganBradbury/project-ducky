import { client } from "./bot";
import { DISCORD_BOT_TOKEN } from "./config";
import "./events/ready";
import "./events/interactionCreate";
import { initDatabase } from "./db/database";

// Initialize the database before starting the bot
initDatabase();

client.login(DISCORD_BOT_TOKEN).then(() => {
  console.log("Bot logged in and running!");
});
