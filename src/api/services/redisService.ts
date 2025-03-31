import { createClient, RedisClientType } from "redis";

export class RedisService {
  private publishClient: RedisClientType;
  private subscribeClient: RedisClientType;
  private isPublishConnected: boolean = false;
  private isSubscribeConnected: boolean = false;

  constructor(redisUrl: string) {
    // Create separate clients for publishing and subscribing
    this.publishClient = createClient({
      url: redisUrl,
    });

    this.subscribeClient = createClient({
      url: redisUrl,
    });

    // Set up event handlers for publish client
    this.publishClient.on("error", (err) => {
      console.error("Redis Publish Client Error:", err);
      this.isPublishConnected = false;
    });

    this.publishClient.on("connect", () => {
      console.log("Successfully connected to Redis (publish client)");
      this.isPublishConnected = true;
    });

    // Set up event handlers for subscribe client
    this.subscribeClient.on("error", (err) => {
      console.error("Redis Subscribe Client Error:", err);
      this.isSubscribeConnected = false;
    });

    this.subscribeClient.on("connect", () => {
      console.log("Successfully connected to Redis (subscribe client)");
      this.isSubscribeConnected = true;
    });
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (!this.isPublishConnected) {
      await this.publishClient.connect();
    }
    if (!this.isSubscribeConnected) {
      await this.subscribeClient.connect();
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.isPublishConnected) {
      await this.publishClient.quit();
      this.isPublishConnected = false;
    }
    if (this.isSubscribeConnected) {
      await this.subscribeClient.quit();
      this.isSubscribeConnected = false;
    }
  }

  /**
   * Publish a message to a Redis channel
   * @param channel - The channel to publish to
   * @param message - The message to publish
   * @returns Number of clients that received the message
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!this.isPublishConnected) {
      await this.publishClient.connect();
    }
    const result = await this.publishClient.publish(channel, message);
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
    if (!this.isSubscribeConnected) {
      await this.subscribeClient.connect();
    }

    await this.subscribeClient.subscribe(channel, (message) => {
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
    if (!this.isPublishConnected) {
      await this.publishClient.connect();
    }

    if (ttl) {
      await this.publishClient.set(key, value, { EX: ttl });
    } else {
      await this.publishClient.set(key, value);
    }
  }

  /**
   * Retrieve a value from Redis by key
   * @param key - The key to retrieve
   * @returns The stored value or null if not found
   */
  async get(key: string): Promise<string | null> {
    if (!this.isPublishConnected) {
      await this.publishClient.connect();
    }

    return await this.publishClient.get(key);
  }
}
