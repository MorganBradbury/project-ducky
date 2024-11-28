// Existing FaceitService.ts
import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { validateAndExtract } from "../utils/generalUtils";

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

  async getActiveMatch(gamePlayerId: string): Promise<{
    matchId: string;
    team1Score: number;
    team2Score: number;
  } | null> {
    try {
      const response = await this.client.get(`/matches`, {
        params: { game_player_id: gamePlayerId },
      });

      const match = response.data;
      if (match && match.teams) {
        const { teams } = match;
        return {
          matchId: match.match_id,
          team1Score: teams[0].score,
          team2Score: teams[1].score,
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Error fetching active match for player ID ${gamePlayerId}:`,
        error
      );
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
