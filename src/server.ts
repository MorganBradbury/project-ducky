import express, { Request, Response } from "express";
import { runAutoUpdateElo } from "./auto/autoUpdateElo";
import { faceitApiClient } from "./services/FaceitService";
import {
  getAllUsers,
  insertMatch,
  markMatchComplete,
  updateUserFaceitId,
} from "./db/commands";
import { config } from "./config";
import {
  sendMatchFinishNotification,
  sendMatchStartNotification,
} from "./services/discordHandler";

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

// Assuming you have a database connection (e.g., with Sequelize, Prisma, or raw SQL)
// and a function `getPlayerData(faceitNickname)` that fetches data from the Faceit API.

async function updatePlayerIds() {
  try {
    // Fetch all users from the database
    const users = await getAllUsers(); // Replace with your actual DB query to fetch all users

    // Loop through the users
    for (const user of users) {
      const { faceitUsername, userId } = user; // Extract Faceit nickname and user ID

      if (!faceitUsername) {
        continue;
      }

      try {
        // Get player data from Faceit API
        const playerData = await faceitApiClient.getPlayerData(faceitUsername);

        if (!playerData || !playerData.player_id) {
          continue;
        }

        // Update the user's record with the player_id
        await updateUserFaceitId(
          userId,
          playerData.game_player_id,
          playerData.player_id
        ); // Replace with your DB update query
        console.log(
          `Updated player_id for user ID ${userId} (${faceitUsername}).`
        );
      } catch (err) {
        console.error(
          `Error fetching player data for nickname: ${faceitUsername}`,
          err
        );
      }
    }

    console.log("All users processed.");
  } catch (err) {
    console.error("Error updating player IDs:", err);
  }
}

// Call the function
updatePlayerIds();

// Webhook callback endpoint
app.post("/api/webhook", async (req: Request, res: Response): Promise<void> => {
  return updatePlayerIds();

  // try {
  //   const receivedData = req.body;
  //   console.log("Received webhook data:", receivedData);

  //   if (receivedData?.event == "match_status_ready") {
  //     const matchData = await faceitApiClient.getMatchDetails(
  //       receivedData.payload?.id
  //     );

  //     console.log("match data retrieved: ", matchData);

  //     if (matchData) {
  //       if (!matchData?.results) {
  //         insertMatch(matchData);
  //         sendMatchStartNotification(matchData);
  //       } else {
  //         markMatchComplete(matchData?.matchId);
  //         sendMatchFinishNotification(matchData);
  //       }
  //     }
  //   }

  //   if (receivedData?.event == "match_status_finished") {
  //   }
  //   res.status(200).json({ message: "Webhook processed successfully!" });
  // } catch (error) {
  //   console.error("Error handling webhook:", error);
  //   res.status(500).json({ error: "Internal Server Error" });
  // }
});

// Start the server
app.listen(port, () => {
  console.log(`API server is running on port ${port}`);
});
