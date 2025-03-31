import express from "express";
import { apiRoutes } from "./routes/routes";
import prisma from "../prismaClient";
import authRoutes from "./routes/authRoutes";
import dotenv from "dotenv";
import { RedisService } from "./services/redisService";
import { config } from "../config";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Redis service
const redisUrl = config.REDIS_MATCH_MESSAGING_QUEUE || "FAILED";
export const redisService = new RedisService(redisUrl);

// Middleware
app.use(express.json());

// Mount the API routes
app.use("/api", apiRoutes);
app.use("/auth", authRoutes);

// Initialize services and start the server
async function startServer() {
  try {
    // Connect to Redis
    await redisService.connect();
    console.log("Redis service initialized successfully");

    // Optional: Setup any global subscriptions
    await redisService.subscribe("global-events", (message: string) => {
      console.log("Received global event:", message);
      // Process events as needed
    });

    // Start the Express server
    app.listen(port, () => {
      console.log(`API server is running on port ${port}`);

      // Example: publish application startup event
      redisService.publishJSON("system-events", {
        type: "startup",
        message: "API server started successfully",
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

// Gracefully close connections on process termination
process.on("SIGINT", async () => {
  console.log("Shutting down services...");
  await prisma.$disconnect();
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down services...");
  await prisma.$disconnect();
  await redisService.disconnect();
  process.exit(0);
});

// Start the application
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
