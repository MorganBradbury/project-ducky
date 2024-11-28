import express from "express";
import bodyParser from "body-parser";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";

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
    console.log("Error during auto-update Elo:", error);
    res.status(500).send({ error: "Failed to run auto-update Elo." });
  }
});

// Webhook callback endpoint
app.post("/api/webhook", (req, res) => {
  try {
    const webhookData = req.body;
    console.log("Received webhook data:", webhookData);

    // Process the incoming data (e.g., check match status, update scores, etc.)

    res.status(200).send("Webhook received successfully!");
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
