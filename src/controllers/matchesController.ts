import { Request, Response } from "express";
import { checkMatchExists } from "../db/commands";
import { runMatchFlow } from "../services/matchesService"; // Centralized match flow logic

// Helper function to handle sending the response
const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string
) => {
  res.status(statusCode).json({ message });
};

// Helper function to check for the presence of match ID in the webhook payload
const extractMatchId = (req: Request) => {
  return req.body?.payload?.id;
};

// Main controller function to handle the webhook for match events
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const matchId = extractMatchId(req);

    // Ensure match ID is present in the webhook payload
    if (!matchId) {
      sendErrorResponse(res, 400, "No match ID provided in webhook");
      return;
    }

    const isMatchInDb = await checkMatchExists(matchId);

    switch (req.body.event) {
      case "match_status_ready":
        return handleMatchStart(res, isMatchInDb, matchId);

      case "match_status_finished":
        return handleMatchEnd(res, isMatchInDb, matchId);

      default:
        return sendErrorResponse(res, 400, "Unsupported event type");
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Function to handle match start event
const handleMatchStart = async (
  res: Response,
  isMatchInDb: boolean,
  matchId: string
) => {
  if (isMatchInDb) {
    return sendErrorResponse(res, 409, "This match already exists.");
  }

  try {
    await runMatchFlow(matchId, "match_status_ready");
    res.status(200).json({ message: "Match workflow started" });
  } catch (error) {
    console.error("Error during match start flow:", error);
    res.status(500).json({ message: "Error processing match start" });
  }
};

// Function to handle match end event
const handleMatchEnd = async (
  res: Response,
  isMatchInDb: boolean,
  matchId: string
) => {
  if (!isMatchInDb) {
    return sendErrorResponse(res, 404, "Match not found in database.");
  }

  try {
    await runMatchFlow(matchId, "match_status_finished");
    res.status(200).json({ message: "Match end workflow completed" });
  } catch (error) {
    console.error("Error during match end flow:", error);
    res.status(500).json({ message: "Error processing match end" });
  }
};
