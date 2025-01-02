import { Request, Response } from "express";
import {
  cancelMatch,
  endMatch,
  sendPrematchAnalysis,
  startMatch,
} from "../services/MatchesService"; // Centralized match flow logic
import { updateVoiceChannelStatus } from "../services/DiscordService";
import { FaceitService } from "../services/FaceitService";
import { getMatchDataFromDb } from "../../db/commands";
import { AcceptedEventTypes } from "../../constants";
import { getScoreStatusText } from "../../utils/faceitHelper";

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
      //await sendPrematchAnalysis(matchId);
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

  const match = await getMatchDataFromDb(matchId);
  if (!match) {
    console.log(`No match data found for ${matchId} in DB`);
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

  res.status(200).json({ message: "Live scores updated successfully" });
};
