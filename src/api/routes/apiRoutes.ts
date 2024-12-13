import express from "express";
import {
  handleWebhook,
  updateLiveScores,
} from "../controllers/matchesController";
import MinecraftController from "../controllers/minecraftController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleWebhook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/minecraft/playercount", MinecraftController.getPlayerCount);
