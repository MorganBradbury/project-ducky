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
import { MatchDetails } from "./types/MatchDetails";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Helper function to handle match start/finish logic
const handleMatchStatus = async (matchData: MatchDetails) => {
  const matchExists = await checkMatchExists(matchData.matchId);
  if (!matchData?.results) {
    // Match has started
    if (!matchExists) {
      await insertMatch(matchData);
      await sendMatchStartNotification(matchData);
      await updateVoiceChannelName("1309222763994808374", true); // Update voice channel on match start
    }
  } else {
    // Match has finished
    await runAutoUpdateElo(matchData.matchingPlayers);
    await markMatchComplete(matchData.matchId);
    await sendMatchFinishNotification(matchData);
    await updateVoiceChannelName("1309222763994808374", false); // Update voice channel on match end
  }
};

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const receivedData = req.body;
    console.log("Received webhook data:", receivedData);

    const { event, payload } = receivedData;

    if (event === "match_status_ready" || event === "match_status_finished") {
      const matchData = await faceitApiClient.getMatchDetails(payload?.id);
      if (matchData) {
        await handleMatchStatus(matchData);
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
