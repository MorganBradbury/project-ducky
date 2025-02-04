import { Request, Response } from "express";
import {
  cancelMatch,
  endMatch,
  getMatchAnalysis,
  startMatch,
} from "../services/matchesService"; // Centralized match flow logic
import { FaceitService } from "../services/faceitService";
import {
  getAllUsers,
  getMatchDataFromDb,
  isMatchProcessed,
  updatePlayerEloAndPosition,
} from "../../db/dbCommands";
import { AcceptedEventTypes } from "../../constants";
import { getScoreStatusText } from "../../utils/faceitHelper";
import { updateVoiceChannelStatus } from "../services/channelService";
import {
  updateLeaderboardEmbed,
  updateLiveScoreCard,
} from "../services/embedService";
import { processEmbedsToThreads } from "../services/threadService";

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
      console.log("Request received for match being configured: ", req.body);
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

export const updateLiveScores = async (
  req: Request,
  res: Response
): Promise<void> => {
  const matchId = req?.body?.matchId;
  const isMatchAlreadyProcessed = await isMatchProcessed(matchId);
  if (isMatchAlreadyProcessed) {
    return;
  }
  const match = await getMatchDataFromDb(matchId);

  if (!match) {
    console.log(`No match data found for ${matchId} in DB`);
    res.status(200).json({ message: "Match data not found", match });
    return;
  }

  const liveScore = await FaceitService.getMatchScore(
    matchId,
    match?.trackedTeam.faction,
    false
  );

  if (match?.voiceChannelId) {
    const status = await getScoreStatusText(match.mapName, liveScore.join(":"));
    await updateVoiceChannelStatus(match.voiceChannelId, status);
  }

  await updateLiveScoreCard(match);

  res.status(200).json({ message: "Live scores updated successfully" });
};

export const archiveMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  await processEmbedsToThreads();

  res.status(200).json({ message: "Threads archived" });
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
