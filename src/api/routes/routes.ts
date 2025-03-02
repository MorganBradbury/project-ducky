import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateAllLiveMatchScores,
  updateLeaderboard,
} from "../controllers/matchesController";
import { createUser } from "../controllers/userController";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateAllLiveMatchScores);
apiRoutes.post("/archivethreads", archiveMatches);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
apiRoutes.post("/createverifieduser", createUser);
