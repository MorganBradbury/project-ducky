import express, { Request, Response } from "express";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { faceitApiClient } from "./services/FaceitService";
import {
  checkMatchExists,
  insertMatch,
  markMatchComplete,
} from "./db/commands";
import {
  sendMatchFinishNotification,
  sendMatchStartNotification,
  updateVoiceChannelName,
} from "./services/discordHandler";
import { MatchDetails } from "./types/MatchDetails";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Helper to handle match start logic
const runMatchStartFlow = async (matchId: string) => {
  console.log("runMatchStartFlow", matchId);
  const matchData = await faceitApiClient.getMatchDetails(matchId);

  if (matchData) {
    console.log("runMatchStartFlow: matchData", matchData);
    await insertMatch(matchData);
    await sendMatchStartNotification(matchData);
    await updateVoiceChannelName("1309222763994808374", true);
  } else {
    console.log(`runMatchStartFlow: No match data found for ID ${matchId}`);
  }
};

// Helper to handle match end logic
const runMatchEndFlow = async (matchId: string) => {
  console.log("runMatchEndFlow", matchId);
  const matchData = await faceitApiClient.getMatchDetails(matchId);

  if (matchData) {
    console.log("runMatchEndFlow: matchData", matchData);
    await runAutoUpdateElo(matchData.matchingPlayers);
    await markMatchComplete(matchData.matchId);
    await sendMatchFinishNotification(matchData);
    await updateVoiceChannelName("1309222763994808374", false);
  } else {
    console.log(`runMatchEndFlow: No match data found for ID ${matchId}`);
  }
};

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, payload } = req.body;
    const matchId = payload?.id;

    if (!matchId) {
      res.status(400).json({ message: "No match ID provided in webhook" });
      return; // Prevent further execution
    }

    const isMatchInDb = await checkMatchExists(matchId);

    if (event === "match_status_ready") {
      if (isMatchInDb) {
        res.status(409).json({ message: "This match already exists." });
        return; // Prevent further execution
      }
      await runMatchStartFlow(matchId);
      res.status(200).json({ message: "Match workflow started" });
      return; // Prevent further execution
    }

    if (event === "match_status_finished") {
      if (!isMatchInDb) {
        res.status(404).json({ message: "Match not found in database." });
        return; // Prevent further execution
      }
      await runMatchEndFlow(matchId);
      res.status(200).json({ message: "Match end workflow completed" });
      return; // Prevent further execution
    }

    // If no valid event is matched, respond with 400
    res.status(400).json({ message: "Unsupported event type" });
  } catch (error) {
    console.error("Error handling webhook:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
