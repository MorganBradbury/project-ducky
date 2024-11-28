import express from "express";
import bodyParser from "body-parser";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { updateVoiceChannelNames } from "./auto/voiceChannelScoreUpdater";

const app = express();

// Use the PORT environment variable or default to 3000 for local development
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Endpoint to trigger Elo update
app.post("/api/autoupdateelo", async (req, res) => {
  try {
    console.log("Received request to run auto-update Elo.");
    await runAutoUpdateElo(); // Run the function and wait for its completion
    res
      .status(200)
      .send({ message: "Elo auto-update completed successfully." });
  } catch (error) {
    console.error("Error during auto-update Elo:", error);
    res.status(500).send({ error: "Failed to run auto-update Elo." });
  }
});

app.post("/api/updateVoiceChats", async (req, res) => {
  try {
    await updateVoiceChannelNames();
    res
      .status(200)
      .send({ message: "Voice channel names updated successfully." });
  } catch (error) {
    console.error("Error updating voice channels:", error);
    res.status(500).send({ error: "Failed to update voice channel names." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
