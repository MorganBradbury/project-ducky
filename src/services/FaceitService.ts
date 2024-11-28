import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { validateAndExtract } from "../utils/generalUtils";
import { getAllUsers } from "../db/commands";
import { MatchDetails, MatchFinishedDetails } from "../types/MatchDetails";

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
      const response = await this.client.get(`/matches/${matchId}`);
      const matchData = response.data;

      if (
        !matchData ||
        !matchData.match_id ||
        !matchData.voting ||
        !matchData.teams
      ) {
        console.error(`Invalid match data for match ID ${matchId}`);
        return null;
      }

      const { match_id, voting, teams } = matchData;
      const allUsers = await getAllUsers();

      // Combine the rosters of both factions
      const combinedRoster = [
        ...teams.faction1.roster,
        ...teams.faction2.roster,
      ];

      // Filter users whose game_player_id matches any in the combinedRoster
      const filteredUsers = allUsers.filter((user) =>
        combinedRoster.some(
          (player: any) => player.game_player_id === user.gamePlayerId
        )
      );

      // Collect the Faceit usernames of the filtered users
      const filteredGamePlayerIds = filteredUsers.map(
        (user) => `${user.faceitUsername} (${user.discordUsername})`
      );

      // Determine the faction of the matching players based on their game_player_id
      const faction = combinedRoster.some((player: any) =>
        filteredUsers.some((user) => user.gamePlayerId == player.game_player_id)
      )
        ? "faction1"
        : "faction2"; // If the player is in faction1, we assign Faction1, otherwise Faction2

      const mapName = voting?.map?.pick || "Unknown";
      const matchLink = `https://www.faceit.com/en/cs2/room/${matchId}`;

      let matchDetails: MatchDetails = {
        matchId: match_id,
        mapName,
        matchLink,
        matchingPlayers: filteredGamePlayerIds,
        faction, // Set the determined faction
      };

      if (matchData.status === "FINISHED") {
        const matchStats = await this.getMatchStats(matchId);

        if (matchStats) {
          console.log({ faction, matchData });
          const finalResultInfo: MatchFinishedDetails = {
            win:
              faction.toLowerCase() ===
              matchData?.detailed_results?.winner.toLowerCase(),
            finalScore: matchStats.score || "N/A",
          };

          matchDetails = {
            ...matchDetails,
            results: finalResultInfo,
          };
        }
      }

      return matchDetails;
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }

  async getMatchStats(matchId: string): Promise<{ score: string } | null> {
    try {
      const response = await this.client.get(`/matches/${matchId}/stats`);
      const statsData = response.data;

      if (!statsData || !statsData.rounds) {
        console.error(`No stats found for match ID ${matchId}`);
        return null;
      }

      // Assuming the first round has the relevant score information
      const roundStats = statsData.rounds[0]?.round_stats;

      if (!roundStats) {
        console.error(`No round stats found for match ID ${matchId}`);
        return null;
      }

      return {
        score: roundStats.Score,
      };
    } catch (error) {
      console.error(`Error fetching match stats for ${matchId}:`, error);
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
