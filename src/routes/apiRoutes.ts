import express from "express";
import { handleWebhook } from "../controllers/matchesController";

export const apiRoutes = express.Router();

// Webhook callback endpoint
apiRoutes.post("/webhook", handleWebhook);
