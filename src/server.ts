import express from "express";
import bodyParser from "body-parser";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// API endpoint to trigger the auto-update
app.post("/api/autoupdateelo", async (req, res) => {
  try {
    console.log("Received request to run auto-update Elo.");
    await runAutoUpdateElo();
    res.status(200).send({ message: "Elo auto-update triggered successfully." });
  } catch (error) {
    console.error("Error during auto-update Elo:", error);
    res.status(500).send({ error: "Failed to run auto-update Elo." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on http://localhost:${port}`);
});
