import express from "express";
import {
  handleMatchesHook,
  updateLiveScores,
} from "../controllers/MatchesController";
import { getPlayerCount } from "../controllers/MinecraftController";
import { updateAllVoiceChannels } from "../controllers/DiscordController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/minecraft/playercount", getPlayerCount);

apiRoutes.post("/reset-discord-vcs", updateAllVoiceChannels);
