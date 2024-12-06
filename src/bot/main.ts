import { client } from "./bot";
import { config } from "../config";
import "./events/ready";
import "./events/interaction";
import "./events/autoRole";

client.login(config.DISCORD_BOT_TOKEN).then(() => {
  console.log("Bot logged in and running!");
});
