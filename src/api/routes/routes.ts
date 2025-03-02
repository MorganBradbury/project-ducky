import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateAllLiveMatchScores,
  updateLeaderboard,
} from "../controllers/matchesController";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateAllLiveMatchScores);
apiRoutes.post("/archivethreads", archiveMatches);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
