import { Request, Response } from "express";
import { queryFull } from "minecraft-server-util";
import { config } from "../../config";
import { updateMinecraftVoiceChannel } from "../services/discordService";

export const getPlayerCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  const HOST = config.MINECRAFT_SERVER_IP; // Replace with your server's IP
  const PORT = config.MINECRAFT_SERVER_PORT; // Replace if your query port differs
  try {
    // Fetch server information
    const serverInfo: any = await queryFull(HOST, Number(PORT));
    const playerCount = serverInfo?.players.online;

    // Update the Minecraft voice channel
    const result = await updateMinecraftVoiceChannel(playerCount);

    res.status(200).json({
      status: "success",
      playersOnline: playerCount,
      message: result.message,
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
