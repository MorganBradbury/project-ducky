import express from "express";
import {
  handleWebhook,
  updateLiveScores,
} from "../controllers/matchesController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleWebhook);
apiRoutes.post("/updatelivescores", updateLiveScores);
