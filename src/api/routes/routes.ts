import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateLeaderboard,
  updateLiveScores,
} from "../controllers/matchesController";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/archivethreads", archiveMatches);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
