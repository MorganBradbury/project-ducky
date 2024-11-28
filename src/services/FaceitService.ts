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
    console.log(`received matchId, ${matchId}`);
    try {
      // Fetch match details from the API
      const response = await this.client.get(`/matches/${matchId}`);
      const matchData = response.data;

      console.log(`received response`, matchData);

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

      console.log("teams1", teams.faction1.roster);
      console.log("teams2", teams.faction2.roster);

      const allUsers = await getAllUsers();
      const combinedRoster = [
        ...teams?.faction1?.roster,
        ...teams?.faction2?.roster,
      ];

      console.log("combinedRoster", combinedRoster);

      // Get all game_player_ids from the combinedRoster
      const gamePlayerIds = combinedRoster.map(
        (player: any) => player.game_player_id
      );
      console.log("gamePlayerIds", gamePlayerIds);
      // Filter allUsers based on whether their game_player_id matches any in the combinedRoster
      const filteredUsers = allUsers.filter((user) =>
        gamePlayerIds.includes(user?.gamePlayerId)
      );

      console.log("filtereduSERS", filteredUsers);
      const filteredGamePlayerIds = filteredUsers.map(
        (user) => user.gamePlayerId
      );
      console.log("filteredUsers", filteredUsers);
      console.log("filteredGamePlayerIds", filteredGamePlayerIds);

      // Determine the faction (either faction1 or faction2)
      const faction = "Faction2"; // Assuming players are always part of the same faction

      const mapName = voting?.map?.pick || "Unknown";
      const matchLink = `https://www.faceit.com/en/cs2/room/${matchId}`;

      return {
        matchId: match_id,
        mapName,
        matchLink,
        matchingPlayers: filteredGamePlayerIds,
        faction,
      };
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
