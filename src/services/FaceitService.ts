import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { validateAndExtract } from "../utils/generalUtils";
import { getAllUsers } from "../db/commands";
import { MatchDetails, MatchFinishedDetails } from "../types/MatchDetails";
import { getApplicableVoiceChannel } from "./discordHandler";

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
      return {
        faceit_elo: response.data?.games?.cs2?.faceit_elo,
        game_player_id: response.data?.games?.cs2?.game_player_id,
        player_id: response.data?.player_id,
      };
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
      const matchingPlayers = allUsers.filter((user) =>
        combinedRoster.some(
          (player: any) => player.game_player_id === user.gamePlayerId
        )
      );
      // Determine the faction of the matching players based on their game_player_id
      const faction = teams.faction1.roster.some((player: any) =>
        matchingPlayers.some(
          (user) => user.gamePlayerId == player.game_player_id
        )
      )
        ? "faction1"
        : "faction2"; // If the player is in faction1, we assign Faction1, otherwise Faction2

      const mapName = voting?.map?.pick || "Unknown";

      const voiceChannelId = await getApplicableVoiceChannel(matchingPlayers);

      let matchDetails: MatchDetails = {
        matchId: match_id,
        mapName,
        matchingPlayers,
        faction,
        voiceChannelId,
      };

      if (matchData.status === "FINISHED") {
        const matchStats = await this.getMatchStats(matchId);

        if (matchStats) {
          const finalResultInfo: MatchFinishedDetails = {
            win:
              faction.toLowerCase() ===
              matchData?.detailed_results[0]?.winner.toLowerCase(),
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
