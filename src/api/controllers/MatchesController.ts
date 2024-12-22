import { Request, Response } from "express";
import { cancelMatch, endMatch, startMatch } from "../services/MatchesService"; // Centralized match flow logic
import {
  createNewVoiceChannel,
  deleteVoiceChannel,
  getChannelNameById,
} from "../services/DiscordService";
import { FaceitService } from "../services/FaceitService";
import {
  getMatchDataFromDb,
  updateLiveScoresChannelIdForMatch,
} from "../../db/commands";
import { config } from "../../config";
import { ChannelIcons } from "../../constants";

enum AcceptedEventTypes {
  match_ready = "match_status_ready",
  match_finished = "match_status_finished",
  match_cancelled = "match_status_cancelled",
}

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
  const matchId = req?.body?.matchId;

  const match = await getMatchDataFromDb(matchId);
  if (!match || !match.voiceChannel?.liveScoresChannelId) {
    console.log(
      `No match data found for ${matchId} in DB or no live scores channel ID exists.`
    );
    return;
  }

  const activeMatchLiveScore = await FaceitService.getMatchScore(
    matchId,
    match?.trackedTeam.faction,
    false
  );

  const scoresChannelName = await getChannelNameById(
    match.voiceChannel.liveScoresChannelId
  );
  const currentScore = scoresChannelName?.split(" ")[2];
  const actualScore = activeMatchLiveScore.join(":");

  if (currentScore !== actualScore) {
    await deleteVoiceChannel(match.voiceChannel?.liveScoresChannelId);

    const newChannelName = `${ChannelIcons.Active} (${
      match.voiceChannel.name
    }) ${actualScore || "0:0"}`;
    const newLiveScoresChannel = await createNewVoiceChannel(
      newChannelName,
      config.VC_ACTIVE_SCORES_CATEGORY_ID,
      true
    );

    if (newLiveScoresChannel) {
      await updateLiveScoresChannelIdForMatch(matchId, newLiveScoresChannel);
    }
  }

  res.status(200).json({ message: "Webhook data received and processed." });
};
