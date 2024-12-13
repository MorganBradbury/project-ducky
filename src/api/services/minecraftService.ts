import { queryFull } from "minecraft-server-util";
import { config } from "../../config";

/**
 * Fetch the current player count from the Minecraft server.
 */
export const minecraftActivePlayers = async (): Promise<[] | null> => {
  const HOST = config.MINECRAFT_SERVER_IP; // Replace with your server's IP
  const PORT = config.MINECRAFT_SERVER_PORT; // Replace if your query port differs

  try {
    // Fetch server information
    const serverInfo: any = await queryFull(HOST, Number(PORT));
    console.log(serverInfo);
    return serverInfo?.players.list || null; // Return the player count or null if it's unavailable
  } catch (error) {
    console.error("Error fetching player count:", error);
    return null; // Return null if there's an error
  }
};
