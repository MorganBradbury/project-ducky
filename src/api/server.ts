import express from "express";
import { apiRoutes } from "./routes/routes";
import { PrismaClient } from "@prisma/client";
import { FaceitService } from "./services/faceitService";

const app = express();
const port = process.env.PORT || 3000;

// Initialize PrismaClient once and share it
export const prisma = new PrismaClient();

// Middleware
app.use(express.json());

// Mount the API routes
app.use("/api", apiRoutes);

// Start the server
app.listen(port, async () => {
  console.log(`API server is running on port ${port}`);
  const getMyStats = await FaceitService.getPlayerStatsLast20Games('316f8df9-2a80-4b03-bc22-e98d7cce7ace');
  console.log(getMyStats);
});
