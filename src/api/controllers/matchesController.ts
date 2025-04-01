import { Request, Response } from "express";
import {
  cancelMatch,
  endMatch,
  getMatchAnalysis,
  startMatch,
} from "../services/matchesService"; // Centralized match flow logic
import { FaceitService } from "../services/faceitService";
import { getAllUsers, updatePlayerEloAndPosition } from "../../db/dbCommands";
import { AcceptedEventTypes } from "../../constants";
import { updateLeaderboardEmbed } from "../services/embedService";

// Main controller function to handle the webhook for match events
export const handleMatchesHook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Pre req checks before logic.
    const matchId = req.body?.payload?.id;
    const eventId = req.body?.event;
    const acceptedHookEvents = [
      AcceptedEventTypes.match_ready,
      AcceptedEventTypes.match_finished,
      AcceptedEventTypes.match_cancelled,
      AcceptedEventTypes.match_created,
    ];

    if (!matchId || !eventId) {
      console.log("No match id/ event present:", { matchId, eventId });
      return;
    }

    if (!acceptedHookEvents.includes(eventId)) {
      console.log(`Event type ${eventId} is not supported.`);
      return;
    }

    if (eventId === AcceptedEventTypes.match_created) {
      await getMatchAnalysis(matchId);
    }

    // Match has just started
    if (eventId === AcceptedEventTypes.match_ready) {
      await startMatch(matchId);
    }

    // Match has just finished.
    if (eventId === AcceptedEventTypes.match_finished) {
      await endMatch(matchId);
    }

    if (eventId === AcceptedEventTypes.match_cancelled) {
      await cancelMatch(matchId);
    }

    res.status(200).json({ message: "Webhook data received and processed." });
    return;
  } catch (error) {
    console.error("Error occured in handleWebhook", {
      error,
      matchId: req?.body?.payload?.id,
      eventId: req?.body?.event,
    });
  }
};

export const updateLeaderboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const users = await getAllUsers();

  // Get player data for all users and map them to an array with Elo and userId
  const playerDataPromises = users.map(async (user) => {
    const playerData = await FaceitService.getPlayer(user.gamePlayerId);
    if (playerData === null) {
      return null; // Skip if no player data
    }
    return {
      userId: user.userId,
      faceitElo: playerData.faceitElo,
    };
  });

  // Wait for all the player data promises to resolve
  const playerDataArray = await Promise.all(playerDataPromises);

  // Filter out null results (users with no player data)
  const validPlayerData = playerDataArray.filter((data) => data !== null);

  // Sort players by Elo in descending order (highest Elo first)
  validPlayerData.sort((a, b) => b.faceitElo - a.faceitElo);

  // Update Elo and position based on sorted data
  for (let i = 0; i < validPlayerData.length; i++) {
    const { userId, faceitElo } = validPlayerData[i];
    const startOfMonthPosition = i + 1; // Position based on sorted order
    await updatePlayerEloAndPosition(
      userId,
      String(faceitElo),
      startOfMonthPosition
    );
  }

  updateLeaderboardEmbed();

  res.send("Leaderboard updated");
};
