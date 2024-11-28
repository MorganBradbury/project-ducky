import express, { Request, Response } from "express";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { sendMatchStartNotification } from "./services/discordHandler";
import { insertMatch } from "./db/commands";
import { MatchDetails } from "./types/MatchDetails";
import { faceitApiClient } from "./services/FaceitService";

const app = express();

// Use the PORT environment variable or default to 3000 for local development
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // No need for body-parser anymore

// Endpoint to trigger Elo update
app.post(
  "/api/autoupdateelo",
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Received request to run auto-update Elo.");
      await runAutoUpdateElo(); // Run the function and wait for its completion
      res
        .status(200)
        .json({ message: "Elo auto-update completed successfully." });
    } catch (error) {
      console.error("Error during auto-update Elo:", error);
      res.status(500).json({ error: "Failed to run auto-update Elo." });
    }
  }
);

// Function to handle the match processing
export const processMatch = async (webhookData: any) => {
  try {
    const matchId = webhookData.match_id;

    if (!matchId) {
      return "Match ID is required";
    }

    const matchDetails: MatchDetails | null =
      await faceitApiClient.getMatchDetails(matchId);

    if (!matchDetails) {
      return console.log("Match details not found");
    }

    // Insert match details into the database
    await insertMatch(matchDetails);

    // Send a "Match Started" notification to Discord
    await sendMatchStartNotification(matchDetails);

    return null; // No error, everything went fine
  } catch (error) {
    console.error("Error processing match:", error);
    return "Internal Server Error";
  }
};

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookData = req.body;
    console.log("Received webhook data:", webhookData);

    await processMatch(webhookData);

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
