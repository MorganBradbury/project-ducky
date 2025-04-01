import dotenv from "dotenv";
dotenv.config();

// Load and validate environment variables
export const config = {
  FACEIT_API_KEY: process.env.FACEIT_API_KEY || "",
  FACEIT_CLIENT_ID: process.env.FACEIT_CLIENT_ID || "",
  FACEIT_REDIRECT_URI: process.env.FACEIT_REDIRECT_URI || "",
  FACEIT_CLIENT_SECRET: process.env.FACEIT_CLIENT_SECRET || "",

  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",

  CHANNEL_MATCH_RESULTS: process.env.CHANNEL_MATCH_RESULTS || "",
  CHANNEL_LIVE_MATCHES: process.env.CHANNEL_LIVE_MATCHES || "",
  CHANNEL_JOIN_REQUESTS: process.env.CHANNEL_JOIN_REQUESTS || "",
  CHANNEL_LEADERBOARD: process.env.CHANNEL_LEADERBOARD || "",
  CHANNEL_GENERAL: process.env.CHANNEL_GENERAL || "",

  REDIS_MATCH_MESSAGING_QUEUE: process.env.REDIS_URL || "",
};
