import express from "express";
import {
  handleMatchesHook,
  updateLiveScores,
} from "../controllers/matches-controller";
import { getPlayerCount } from "../controllers/minecraft-controller";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/minecraft/playercount", getPlayerCount);
