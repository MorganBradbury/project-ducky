import { Request, Response } from "express";
import { endMatch, startMatch } from "../services/matchesService"; // Centralized match flow logic
import {
  createActiveScoresChannel,
  deleteVoiceChannel,
} from "../services/discordService";
import { randomUUID } from "crypto";

enum AcceptedEventTypes {
  match_ready = "match_status_ready",
  match_finished = "match_status_finished",
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

export const createChannel = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("Message received from worker!", req.body);
  res.status(200).json({ message: "Webhook data received and processed." });
};
