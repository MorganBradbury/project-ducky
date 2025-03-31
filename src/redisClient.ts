import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

class RedisService {
  private static instance: RedisService;
  private client;

  private constructor() {
    this.client = createClient({ url: process.env.REDIS_URL });

    this.client.on("error", (err) => console.error("Redis Client Error", err));

    this.client
      .connect()
      .catch((err) => console.error("Redis Connection Error:", err));
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient() {
    return this.client;
  }
}

// Export the singleton instance
export default RedisService.getInstance().getClient();
