import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateLiveScores,
} from "../controllers/matches-controller";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateLiveScores);
apiRoutes.post("/archivethreads", archiveMatches);
