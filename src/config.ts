import dotenv from "dotenv";
dotenv.config();

// Utility function to load and validate environment variables
const loadEnvVar = (key: string, defaultValue?: string) => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Load and validate environment variables
export const config = {
  FACEIT_API_KEY: loadEnvVar("FACEIT_API_KEY"),
  DISCORD_BOT_TOKEN: loadEnvVar("DISCORD_BOT_TOKEN"),
  CLIENT_ID: loadEnvVar("CLIENT_ID"),
  GUILD_ID: loadEnvVar("GUILD_ID"),
  BOT_UPDATES_CHANNEL_ID: loadEnvVar("BOT_UPDATES_CHANNEL_ID"),
  MATCHROOM_ANALYSIS_CHANNEL_ID: loadEnvVar("MATCHROOM_ANALYSIS_CHANNEL_ID"),
  SERVER_OWNER_ID: loadEnvVar("SERVER_OWNER_ID"),
  BOT_LIVE_SCORE_CARDS_CHANNEL: loadEnvVar("BOT_LIVE_SCORE_CARDS_CHANNEL"),

  MYSQL: {
    host: loadEnvVar("MYSQLHOST"),
    user: loadEnvVar("MYSQLUSER"),
    password: loadEnvVar("MYSQLPASSWORD"),
    database: loadEnvVar("MYSQL_DATABASE"),
    port: Number(loadEnvVar("MYSQLPORT", "3306")), // Default to 3306 if not set
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
};
