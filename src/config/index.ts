import dotenv from "dotenv";
dotenv.config();

export const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const GUILD_ID = process.env.GUILD_ID || "";
export const BOT_UPDATES_CHANNEL_ID = process.env.BOT_UPDATES_CHANNEL_ID || "";

if (
  !FACEIT_API_KEY ||
  !DISCORD_BOT_TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID ||
  !BOT_UPDATES_CHANNEL_ID
) {
  throw new Error("Missing required environment variables!");
}
