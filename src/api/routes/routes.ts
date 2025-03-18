import express from "express";
import {
  archiveMatches,
  handleMatchesHook,
  updateAllLiveMatchScores,
  updateLeaderboard,
} from "../controllers/matchesController";
import {
  createUser,
  deleteSingleUser,
  getPlayerStatsLast30,
} from "../controllers/userController";
import { sendRetakeJoinMessage } from "../services/userService";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updatelivescores", updateAllLiveMatchScores);
apiRoutes.post("/archivethreads", archiveMatches);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
apiRoutes.post("/createverifieduser", createUser);
apiRoutes.delete("/deleteuser", deleteSingleUser);
apiRoutes.get("/getplayerstats/:userTag", getPlayerStatsLast30);

apiRoutes.get("/join/:ip/:port/:retakeNumber", async (req, res) => {
  const { ip, port, retakeNumber } = req.params;
  const steamConnectLink = `steam://connect/${ip}:${port}`;
  await sendRetakeJoinMessage(retakeNumber, steamConnectLink);
  res.redirect(steamConnectLink);
});
