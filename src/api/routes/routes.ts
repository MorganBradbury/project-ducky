import express from "express";
import {
  handleMatchesHook,
  updateLeaderboard,
} from "../controllers/matchesController";
import {
  createUser,
  deleteSingleUser,
  getPlayerStatsLast30,
  transferUsers,
} from "../controllers/userController";

export const apiRoutes = express.Router();

apiRoutes.post("/webhook", handleMatchesHook);
apiRoutes.post("/updateleaderboard", updateLeaderboard);
apiRoutes.post("/createverifieduser", createUser);
apiRoutes.delete("/deleteuser", deleteSingleUser);
apiRoutes.get("/getplayerstats/:userTag", getPlayerStatsLast30);
apiRoutes.post("/transfer", transferUsers);
