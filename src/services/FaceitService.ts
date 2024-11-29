import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { getAllUsers } from "../db/commands";
import { MatchDetails, MatchFinishedDetails } from "../types/MatchDetails";
import { getApplicableVoiceChannel } from "./discordService";
import { isNickname } from "../utils/nicknameUtils";
import { fetchData } from "../utils/apiRequestUtil";

// Enum to store API endpoints
enum FaceitApiEndpoints {
  PLAYERS = "/players",
  MATCHES = "/matches",
}

class FaceitApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://open.FACEIT.com/data/v4",
      headers: { Authorization: `Bearer ${config.FACEIT_API_KEY}` },
    });
  }

  /**
   * Fetches player data by either nickname or player ID.
   * @param faceitIdentifier - Can be either a Faceit nickname (string) or a game player ID (string or number).
   * @returns Player data or null if not found.
   */
  async getPlayerData(
    faceitIdentifier: string | number
  ): Promise<FaceitPlayer | null> {
    // Base URL
    const baseUrl = FaceitApiEndpoints.PLAYERS;
    let url: string;
    let params: any = {};

    // Convert game_player_id to string if it's a number
    const identifier =
      typeof faceitIdentifier === "number"
        ? faceitIdentifier.toString()
        : faceitIdentifier;

    // Check if the identifier is a nickname (non-numeric) or game_player_id (numeric)
    if (/^\d+$/.test(identifier)) {
      // If it's numeric, it's a game_player_id
      params = { game: "cs2", game_player_id: identifier };
      url = baseUrl; // No need to modify the URL
    } else {
      // If it's not numeric, treat it as a nickname
      url = `${baseUrl}?nickname=${identifier}`;
    }

    const data = await fetchData(this.client, url, params);
    if (!data) return null;

    return {
      faceit_elo: data?.games?.cs2?.faceit_elo,
      game_player_id: data?.games?.cs2?.game_player_id,
      player_id: data?.player_id,
    };
  }

  // New method to fetch match details
  async getMatchDetails(matchId: string): Promise<MatchDetails | null> {
    try {
      const response = await this.client.get(
        `${FaceitApiEndpoints.MATCHES}/${matchId}`
      );
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
      const response = await this.client.get(
        `${FaceitApiEndpoints.MATCHES}/${matchId}/stats`
      );
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
