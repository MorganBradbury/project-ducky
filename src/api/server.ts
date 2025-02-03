import express from "express";
import { apiRoutes } from "./routes/api-routes";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = process.env.PORT || 3000;

// Initialize PrismaClient once and share it
export const prisma = new PrismaClient();

// Middleware
app.use(express.json());

// Mount the API routes
app.use("/api", apiRoutes);

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
