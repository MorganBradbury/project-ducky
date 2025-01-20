import { Request, Response } from "express";
import { minecraftActivePlayers } from "../services/minecraft-service";
import { updateMinecraftVoiceChannel } from "../services/discord/channel-service";

export const getPlayerCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Explicitly set return type as Promise<void>
  try {
    // Get the current player count from the Minecraft server
    const activePlayers = await minecraftActivePlayers();
    // Update the Minecraft voice channel
    await updateMinecraftVoiceChannel(activePlayers?.length || 0);

    // Send the response
    res.status(200).json({
      status: "success",
      playersOnline: activePlayers,
      message: "Loaded users",
    });
    return; // End the function after sending the response
  } catch (error: any) {
    // Handle any errors that occur
    res.status(500).json({
      status: "error",
      message:
        "Unable to query the Minecraft server or update Discord channels." +
        error.message,
      error: error.message,
    });
    return; // End the function after sending the response
  }
};
