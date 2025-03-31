// src/services/redis.service.ts
import { createClient, RedisClientType } from "redis";

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
    });

    this.client.on("error", (err: any) => {
      console.error("Redis Client Error:", err);
      this.isConnected = false;
    });

    this.client.on("connect", () => {
      console.log("Successfully connected to Redis");
      this.isConnected = true;
    });
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Publish a message to a Redis channel
   * @param channel - The channel to publish to
   * @param message - The message to publish
   * @returns Number of clients that received the message
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.isConnected) {
      await this.connect();
    }
    const result = await this.client.publish(channel, message);
    return result;
  }

  /**
   * Publish a JSON object to a Redis channel
   * @param channel - The channel to publish to
   * @param data - The object to publish (will be stringified)
   * @returns Number of clients that received the message
   */
  async publishJSON(channel: string, data: any): Promise<number> {
    return this.publish(channel, JSON.stringify(data));
  }

  /**
   * Subscribe to a Redis channel
   * @param channel - The channel to subscribe to
   * @param callback - Function to call when a message is received
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    await this.client.subscribe(channel, (message: string) => {
      callback(message);
    });

    console.log(`Subscribed to channel: ${channel}`);
  }

  /**
   * Store a key-value pair in Redis
   * @param key - The key to store
   * @param value - The value to store
   * @param ttl - Time to live in seconds (optional)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (ttl) {
      await this.client.set(key, value, { EX: ttl });
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Retrieve a value from Redis by key
   * @param key - The key to retrieve
   * @returns The stored value or null if not found
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    return await this.client.get(key);
  }
}
