import dotenv from "dotenv";
dotenv.config();

// Load and validate environment variables
export const config = {
  FACEIT_API_KEY: process.env.FACEIT_API_KEY || "",

  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",

  CHANNEL_MATCH_RESULTS: process.env.CHANNEL_MATCH_RESULTS || "",
  CHANNEL_MAP_ANALYSIS: process.env.CHANNEL_MAP_ANALYSIS || "",
  CHANNEL_LIVE_MATCHES: process.env.CHANNEL_LIVE_MATCHES || "",
  CHANNEL_JOIN_REQUESTS: process.env.CHANNEL_JOIN_REQUESTS || "",
  CHANNEL_LEADERBOARD: process.env.CHANNEL_LEADERBOARD || "",

  CHANNEL_GENERAL: process.env.CHANNEL_GENERAL || "",
  CHANNEL_UPDATES: process.env.CHANNEL_UPDATES || "",

  BOT_ID_PATCHBOT: process.env.BOT_ID_PATCHBOT || "",
};
