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

  // Store match as a Redis hash
  public async addMatch(matchId: string, matchData: Record<string, string>) {
    try {
      await this.client.hSet(`${matchId}`, matchData);
      console.log(`Match ${matchId} added to Redis.`);

      // Publish an event to notify workers
      await this.client.publish("match_added", matchId);
      console.log(`Published event: match_added for ${matchId}`);
    } catch (error) {
      console.error("Error adding match to Redis:", error);
    }
  }
}

// Export the singleton instance
export default RedisService.getInstance();
