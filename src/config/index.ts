import dotenv from "dotenv";
dotenv.config();

export const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const GUILD_ID = process.env.GUILD_ID || "";
export const BOT_UPDATES_CHANNEL_ID = process.env.BOT_UPDATES_CHANNEL_ID || "";

export const MYSQL_HOST = process.env.MYSQLHOST || "";
export const MYSQL_USER = process.env.MYSQLUSER || "";
export const MYSQL_PASSWORD = process.env.MYSQLPASSWORD || "";
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "";
export const MYSQL_PORT = Number(process.env.MYSQLPORT) || 3306;

if (
  !FACEIT_API_KEY ||
  !DISCORD_BOT_TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID ||
  !BOT_UPDATES_CHANNEL_ID ||
  !MYSQL_HOST ||
  !MYSQL_USER ||
  !MYSQL_PASSWORD ||
  !MYSQL_DATABASE ||
  !MYSQL_PORT
) {
  throw new Error("Missing required environment variables!");
}

export const dbConfig = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  port: MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
