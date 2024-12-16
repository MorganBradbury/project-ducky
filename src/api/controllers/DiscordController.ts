import { Request, Response } from "express";
import { resetVoiceChannelStates } from "../services/DiscordService";

export const updateAllVoiceChannels = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Call the service function to update voice channels
    await resetVoiceChannelStates();

    // Send success response
    res.status(200).json({
      status: "success",
      message: "Voice channels updated successfully.",
    });
  } catch (error: any) {
    // Handle any errors that occur
    res.status(500).json({
      status: "error",
      message: `Unable to update voice channels: ${error.message}`,
      error: error.message,
    });
  }
};
