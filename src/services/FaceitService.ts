// Existing FaceitService.ts
import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { validateAndExtract } from "../utils/generalUtils";
import { getAllUsers } from "../db/commands";
import { MatchDetails } from "../types/MatchDetails";

class FaceitApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://open.FACEIT.com/data/v4",
      headers: { Authorization: `Bearer ${config.FACEIT_API_KEY}` },
    });
  }

  async getPlayerData(faceitNickname: string): Promise<FaceitPlayer | null> {
    try {
      const response = await this.client.get(
        `/players?nickname=${faceitNickname}`
      );
      return validateAndExtract<FaceitPlayer>(response.data?.games?.cs2, [
        "faceit_elo",
        "game_player_id",
      ]);
    } catch (error) {
      console.error(`Error fetching FACEIT data for ${faceitNickname}:`, error);
      return null;
    }
  }

  async getPlayerDataById(gamePlayerId: string): Promise<FaceitPlayer | null> {
    try {
      const response = await this.client.get(`/players`, {
        params: { game: "cs2", game_player_id: gamePlayerId },
      });
      return validateAndExtract<FaceitPlayer>(response.data?.games?.cs2, [
        "faceit_elo",
      ]);
    } catch (error) {
      console.error(
        `Error fetching FACEIT data for ID ${gamePlayerId}:`,
        error
      );
      return null;
    }
  }

  // New method to fetch match details
  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    try {
      // Fetch match details from the API
      const response = await this.client.get(`/matches/${matchId}`);
      const matchData = response.data;

      if (
        !matchData ||
        !matchData.match_id ||
        !matchData.voting ||
        !matchData.teams
      ) {
        console.log(`Invalid match data for match ID ${matchId}`);
        return null;
      }

      const { match_id, voting, teams } = matchData;

      // Combine player IDs from both factions
      const faction1Players = teams.faction1?.players || [];
      const faction2Players = teams.faction2?.players || [];
      const gamePlayerIds = [
        ...faction1Players.map((p: any) => p.player_id),
        ...faction2Players.map((p: any) => p.player_id),
      ];

      // Fetch user data and filter matching players
      const allUsers = await getAllUsers();
      const matchingPlayers = gamePlayerIds.filter((playerId) =>
        allUsers.some((user) => user.gamePlayerId === playerId)
      );

      // Determine the faction (either faction1 or faction2)
      const faction = faction1Players.length > 0 ? "Faction1" : "Faction2"; // Assuming players are always part of the same faction

      const mapName = voting?.map?.pick || "Unknown";
      const matchLink = `https://www.faceit.com/en/cs2/room/${matchId}`;

      return {
        matchId: match_id,
        mapName,
        matchLink,
        matchingPlayers,
        faction,
      };
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
