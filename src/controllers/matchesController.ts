import { Request, Response } from "express";
import { cancelMatch, endMatch, startMatch } from "../services/matchesService"; // Centralized match flow logic
import {
  createNewVoiceChannel,
  deleteVoiceChannel,
} from "../services/discordService";
import { randomUUID } from "crypto";
import { faceitApiClient } from "../services/FaceitService";
import {
  checkMatchExists,
  getMatchDataFromDb,
  updateActiveScoresChannelId,
} from "../db/commands";
import { config } from "../config";

enum AcceptedEventTypes {
  match_ready = "match_status_ready",
  match_finished = "match_status_finished",
  match_cancelled = "match_status_cancelled",
}

// Main controller function to handle the webhook for match events
export const handleWebhook = async (
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
    ];

    if (!matchId || !eventId) {
      console.log("No match id/ event present:", { matchId, eventId });
      return;
    }

    if (!acceptedHookEvents.includes(eventId)) {
      console.log(`Event type ${eventId} is not supported.`);
      return;
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
  console.log("Message received from worker!", req.body);
  const matchId = req?.body?.matchId;

  const doesMatchExist = await checkMatchExists(matchId);
  if (!doesMatchExist) {
    console.log(`No match found for ${matchId} from the DB`);
    return;
  }

  let matchData = await faceitApiClient.getMatchDetails(matchId);
  if (!matchData) {
    console.log(`No match data found for ${matchId} from FACEIT API.`);
    return;
  }

  const activeMatchLiveScore = await faceitApiClient.getActiveMatchScore(
    matchId,
    matchData?.teamId
  );

  const matchFromDb = await getMatchDataFromDb(matchId);

  if (
    !matchFromDb ||
    !matchFromDb?.activeScoresChannelId ||
    !activeMatchLiveScore
  ) {
    console.log("No match data found for", matchId);
  }

  if (activeMatchLiveScore != matchFromDb?.currentResult) {
    if (matchFromDb?.activeScoresChannelId) {
      await deleteVoiceChannel(matchFromDb?.activeScoresChannelId);
      const activeScore =
        activeMatchLiveScore != null ? activeMatchLiveScore : "0:0";
      const newChannelName = `🚨 LIVE: (CS) ${activeScore} 🔒`;

      const newActiveScoresChannel = await createNewVoiceChannel(
        newChannelName,
        config.VC_ACTIVE_SCORES_CATEGORY_ID,
        true
      );

      await updateActiveScoresChannelId(
        matchId,
        //@ts-ignore
        newActiveScoresChannel,
        activeMatchLiveScore
      );
    }
  }

  res.status(200).json({ message: "Webhook data received and processed." });
};
