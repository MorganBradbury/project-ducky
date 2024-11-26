import express from "express";
import bodyParser from "body-parser";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { User } from "./types/User";
import { getAllUsers, updateUserFaceitId } from "./db/models/commands";
import { faceitApiClient } from "./services/FaceitService";

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

// New endpoint to update game player ID for all users
app.post("/api/updateAllPlayerIds", async (req, res) => {
  try {
    console.log("Starting process to update player IDs for all users...");

    // Fetch all users from the database
    const users: User[] = await getAllUsers();

    // Loop through each user to fetch their game player ID
    for (const user of users) {
      console.log(`Processing user: ${user.faceitUsername}`);

      // Fetch Faceit player data by nickname
      const playerData = await faceitApiClient.getPlayerData(
        user.faceitUsername
      );

      if (playerData && playerData.skill_level && playerData.faceit_elo) {
        console.log(`Updating user ID for ${user.faceitUsername}`);
        // Update the database with the retrieved game player ID
        await updateUserFaceitId(user.userId, playerData.game_player_id);
      } else {
        console.log(`Failed to fetch data for user: ${user.faceitUsername}`);
      }
    }

    res.status(200).send({ message: "All player IDs updated successfully." });
  } catch (error) {
    console.error("Error during player ID update process:", error);
    res.status(500).send({ error: "Failed to update player IDs." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
