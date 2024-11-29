import express, { Request, Response } from "express";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { faceitApiClient } from "./services/FaceitService";
import {
  checkMatchExists,
  insertMatch,
  isMatchComplete,
  markMatchComplete,
} from "./db/commands";
import {
  sendMatchFinishNotification,
  sendMatchStartNotification,
  updateVoiceChannelName,
} from "./services/discordHandler";
import { SystemUser } from "./types/SystemUser";

const app = express();

// Use the PORT environment variable or default to 3000 for local development
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // No need for body-parser anymore

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const receivedData = req.body;
    console.log("Received webhook data:", receivedData);

    if (
      receivedData?.event == "match_status_ready" ||
      receivedData?.event == "match_status_finished"
    ) {
      const matchData = await faceitApiClient.getMatchDetails(
        receivedData.payload?.id
      );
      if (matchData) {
        const matchExists = await checkMatchExists(matchData?.matchId);

        console.log("match data retrieved: ", matchData);
        if (matchData) {
          if (!matchData?.results) {
            if (!matchExists) {
              insertMatch(matchData);
              sendMatchStartNotification(matchData);
              // Update voice channels when the match starts
              await updateVoiceChannelName(matchData.matchingPlayers);
            }
          } else {
            runAutoUpdateElo(matchData?.matchingPlayers);
            markMatchComplete(matchData?.matchId);
            sendMatchFinishNotification(matchData);
            await updateVoiceChannelName(matchData.matchingPlayers, true);
          }
        }
      }
    }
    res.status(200).json({ message: "Webhook processed successfully!" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
