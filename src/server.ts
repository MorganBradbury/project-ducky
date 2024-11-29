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
// const handleMatchStatus = async (matchData: MatchDetails) => {
//   console.log("matchData", matchData);
//   const matchExists = await checkMatchExists(matchData.matchId);
//   console.log("matchExists", matchExists);

//   // Explicit check for undefined or null results
//   if (matchData?.results == null) {
//     console.log("Match has started, no results yet");
//     // Match has started
//     console.log(matchExists);
//     if (!matchExists) {
//       await insertMatch(matchData);
//       await sendMatchStartNotification(matchData);
//       await updateVoiceChannelName("1309222763994808374", true); // Update voice channel on match start
//     }
//   } else {
//     console.log("Match has finished");
//     // Match has finished
//     await runAutoUpdateElo(matchData.matchingPlayers);
//     await markMatchComplete(matchData.matchId);
//     await sendMatchFinishNotification(matchData);
//     await updateVoiceChannelName("1309222763994808374", false); // Update voice channel on match end
//   }
// };

const runMatchStartFlow = async (matchId: string) => {
  console.log("runMatchStartFlow", matchId);

  const matchData = await faceitApiClient.getMatchDetails(matchId);

  if (matchData) {
    console.log("runMatchStartFlow: matchData", matchData);
    await insertMatch(matchData);
    await sendMatchStartNotification(matchData);
    await updateVoiceChannelName("1309222763994808374", true);
  } else {
    console.log(`runMatchStartFlow: No match data found by ID ${matchId}`);
  }
};

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
    console.log(`runMatchEndFlow: No match data found by ID ${matchId}`);
  }
};

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, payload } = req.body;
    const matchId = payload?.id;

    if (!matchId) {
      res.status(500).json({ message: "No match ID provided in webhook" });
    }

    const isMatchInDb = await checkMatchExists(matchId);
    if (event === "match_status_ready") {
      if (isMatchInDb) {
        res.status(500).json({ message: "This match already exists." });
      }
      await runMatchStartFlow(matchId);
      res.status(200).json({ message: "Match workflow started" });
    }

    if (event === "match_status_finished" && isMatchInDb) {
      await runMatchEndFlow(matchId);
    }

    // if (event === "match_status_ready" || event === "match_status_finished") {
    //   const matchData = await faceitApiClient.getMatchDetails(payload?.id);
    //   if (matchData) {
    //     await handleMatchStatus(matchData);
    //   }
    // }
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
