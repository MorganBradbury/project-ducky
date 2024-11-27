import { client } from "./bot";
import { DISCORD_BOT_TOKEN } from "./config";
import "./events/ready";
import "./events/interaction";

client.login(DISCORD_BOT_TOKEN).then(() => {
  console.log("Bot logged in and running!");
});
