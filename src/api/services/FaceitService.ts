import axios, { AxiosInstance } from "axios";
import { config } from "../../config";
import { getMatchVoiceChannel } from "./DiscordService";
import {
  generateOptimizedCaseVariations,
  getTeamFaction,
  getTrackedPlayers,
} from "../../utils/faceitHelper";
import { Player } from "../../types/Faceit/Player";
import { Match } from "../../types/Faceit/Match";

class FaceitApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://open.FACEIT.com/data/v4",
      headers: { Authorization: `Bearer ${config.FACEIT_API_KEY}` },
    });
  }

  async getPlayer(faceitId: string | number): Promise<Player | null> {
    const isPlayerId = /^\d+$/.test(String(faceitId));

    const urlParams = isPlayerId
      ? `game_player_id=${faceitId}&game=cs2`
      : `nickname=${faceitId}`;
    const queryUrl = `/players?${urlParams}`;

    const response = await this.client.get(queryUrl);

    if (response.status === 200 && response.data) {
      return {
        faceitName: response.data.nickname,
        faceitElo: response.data.games.cs2.faceit_elo,
        gamePlayerId: response.data.games.cs2.game_player_id,
        skillLevel: response.data.games.cs2.skill_level,
        id: response.data.player_id,
      };
    }

    console.log("Could not find player by identifier", faceitId);

    // If no player found, generate optimized case variations for the nickname
    if (typeof faceitId === "string") {
      const variations = generateOptimizedCaseVariations(faceitId);

      // Retry with each variation
      for (const variation of variations) {
        const retryUrlParams = `nickname=${variation}`;
        const retryQueryUrl = `/players?${retryUrlParams}`;

        try {
          const retryResponse = await this.client.get(retryQueryUrl);

          // Check if response is successful
          if (retryResponse.status === 200 && retryResponse.data) {
            return {
              faceitName: retryResponse.data.nickname,
              faceitElo: retryResponse.data.games.cs2.faceit_elo,
              gamePlayerId: retryResponse.data.games.cs2.game_player_id,
              skillLevel: retryResponse.data.games.cs2.skill_level,
              id: retryResponse.data.player_id,
            };
          }
        } catch (error: any) {
          // Log the error and continue with the next variation
          if (error.response?.status === 404) {
            console.log(`Player not found for variation: ${variation}`);
          } else {
            // Handle other types of errors
            console.error(`Error with variation ${variation}:`, error);
          }
        }
      }
    }

    return null;
  }

  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const queryUrl = `/matches/${matchId}`;
      const response = await this.client.get(queryUrl);

      if (
        response.status !== 200 ||
        !response.data ||
        response.data.best_of != 1
      ) {
        console.log("Could not find match by ID", matchId);
        return null;
      }
      const trackedTeamFaction = await getTeamFaction(response.data.teams);
      const trackedTeamPlayers = await getTrackedPlayers(response.data.teams);

      if (trackedTeamPlayers.length === 0) {
        return null;
      }

      const voiceChannel = await getMatchVoiceChannel(trackedTeamPlayers);

      return {
        matchId: matchId,
        mapName: response.data.voting.map.pick,
        trackedTeam: {
          teamId: trackedTeamFaction.teamId,
          faction: trackedTeamFaction.faction,
          trackedPlayers: trackedTeamPlayers,
        },
        ...voiceChannel,
      };
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }

  async getMatchScore(
    matchId: string,
    teamFaction: string,
    finished: boolean
  ): Promise<number[]> {
    const queryUrl = finished
      ? `/matches/${matchId}/stats`
      : `/matches/${matchId}`;
    const response = await this.client.get(queryUrl);

    const scores = finished
      ? response.data.rounds[0]?.round_stats.Score.replace(/\s+/g, "").split(
          "/"
        )
      : [
          response.data.results?.score?.faction1 || 0,
          response.data.results?.score?.faction2 || 0,
        ];

    if (scores.length === 0) {
      return [0, 0];
    }

    return teamFaction === "faction2" ? scores.reverse() : scores;
  }

  async getMatchResult(matchId: string, teamFaction: string): Promise<boolean> {
    const queryUrl = `/matches/${matchId}`;
    const response = await this.client.get(queryUrl);

    return response.data.results.winner === teamFaction ? true : false;
  }
}

export const FaceitService = new FaceitApiClient();
