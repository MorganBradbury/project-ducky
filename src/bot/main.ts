import { client } from "./bot";
import { config } from "../config";
import "./events/ready";
import "./events/interaction";
import "./events/autoRole";

// Login the bot
client
  .login(config.DISCORD_BOT_TOKEN)
  .then(() => {
    console.log("Bot logged in and running!");
  })
  .catch((error) => {
    console.error("Failed to log in:", error);
  });
