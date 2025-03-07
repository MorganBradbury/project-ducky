import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateAllLiveMatchScores,
  updateLeaderboard,
} from "../controllers/matchesController";
import { createUser, deleteSingleUser } from "../controllers/userController";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateAllLiveMatchScores);
apiRoutes.post("/archivethreads", archiveMatches);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
apiRoutes.post("/createverifieduser", createUser);
apiRoutes.delete("/deleteuser", deleteSingleUser);

apiRoutes.get("/join/:ip/:port", (req, res) => {
  const { ip, port } = req.params;
  const steamConnectLink = `steam://connect/${ip}:${port}`;

  res.redirect(steamConnectLink);
});