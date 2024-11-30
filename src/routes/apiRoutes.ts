import express from "express";
import { createChannel, handleWebhook } from "../controllers/matchesController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleWebhook);
apiRoutes.post("/setlivescores", createChannel);
