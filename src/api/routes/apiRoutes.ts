import express from "express";
import {
  handleMatchesHook,
  updateLiveScores,
} from "../controllers/MatchesController";
import { getPlayerCount } from "../controllers/MinecraftController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/minecraft/playercount", getPlayerCount);
