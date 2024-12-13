import express from "express";
import { apiRoutes } from "../api/routes/apiRoutes";
import MinecraftController from "./controllers/minecraftController";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Mount the API routes
app.use("/api", apiRoutes);

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
