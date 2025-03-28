import express from "express";
import { apiRoutes } from "./routes/routes";
import prisma from "../prismaClient";
import authRoutes from "./routes/authRoutes";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Mount the API routes
app.use("/api", apiRoutes);
app.use("/auth", authRoutes);

// Gracefully close Prisma on process termination
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
app.listen(port, async () => {
  console.log(`API server is running on port ${port}`);
});
