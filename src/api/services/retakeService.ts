import axios from "axios";

const API_URL = "https://xplay.gg/api/play/getAllServers";

export const fetchRetakeServers = async (currentMap?: string) => {
  console.log("Finding retakes for " + currentMap);
  try {
    const response = await axios.get(API_URL);
    const servers = response.data.serversList; // Correctly accessing serversList

    const filteredServers = servers
      .filter(
        (server: any) =>
          (server.CountryCode === "fr" ||
            server.CountryCode === "gb" ||
            server.CountryCode === "nl" ||
            server.CountryCode === "dk" ||
            server.CountryCode === "de") &&
          (!currentMap || server.CurrentMap === currentMap) &&
          server.TotalSlots <= 9 &&
          server.Online != server.TotalSlots
      )
      .sort((a: any, b: any) => a.Online - b.Online) // Sort by players online (ascending)
      .slice(0, 10); // Limit to max 10 results

    return filteredServers;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
};
