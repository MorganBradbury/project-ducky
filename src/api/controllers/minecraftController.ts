import { Request, Response } from "express";
import { updateMinecraftVoiceChannel } from "../services/discordService";
import { minecraftActivePlayers } from "../services/minecraftService";

export const getPlayerCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get the current player count from the Minecraft server
    const activePlayers = await minecraftActivePlayers();

    if (
      activePlayers === null ||
      activePlayers.length == 0 ||
      activePlayers == undefined
    ) {
      // Handle the error if player count is unavailable
      res.status(500).json({
        status: "error",
        message: "Unable to fetch the player count from the Minecraft server.",
      });
    }

    // Update the Minecraft voice channel
    if (activePlayers != undefined) {
      await updateMinecraftVoiceChannel(activePlayers?.length);
    }

    res.status(200).json({
      status: "success",
      playersOnline: activePlayers,
      message: "Loaded users",
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message:
        "Unable to query the Minecraft server or update Discord channels.",
      error: error.message,
    });
  }
};
