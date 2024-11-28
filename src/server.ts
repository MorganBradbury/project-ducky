import express, { Request, Response } from "express";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { faceitApiClient } from "./services/FaceitService";
import { insertMatch } from "./db/commands";
import { config } from "./config";

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

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookData = req.body;
    console.log("Received webhook data:", webhookData);

    const matchData = await faceitApiClient.getMatchDetails(
      webhookData.payload?.id
    );

    const createMatchesTable = async (dbConnection: any) => {
      const dropTableQuery = "DROP TABLE IF EXISTS matches_played;";
      const createTableQuery = `
        CREATE TABLE matches_played (
          match_id VARCHAR(255) PRIMARY KEY,
          game_player_ids JSON,
          is_complete BOOLEAN,
          map_name VARCHAR(255),
          match_link VARCHAR(255),
          faction VARCHAR(255)
        );
      `;

      try {
        // Drop the table if it exists
        await dbConnection.query(dropTableQuery);
        console.log("Existing matches_played table dropped (if it existed)");

        // Create the new table
        await dbConnection.query(createTableQuery);
        console.log("matches_played table created successfully");
      } catch (error) {
        console.error("Error creating matches_played table:", error);
      }
    };

    createMatchesTable(config.MYSQL);
    if (matchData) {
      insertMatch(matchData);
    }
    console.log("match data retrieved: ", matchData);

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
