import axios, { AxiosInstance } from "axios";
import { config } from "../../config";
import { getMatchVoiceChannelId } from "./DiscordService";
import {
  generateOptimizedCaseVariations,
  getTeamFaction,
  getTrackedPlayers,
} from "../../utils/faceitHelper";
import { Player } from "../../types/Faceit/Player";
import { Match } from "../../types/Faceit/Match";
import { activeMapPool } from "../../constants";

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

    if (isPlayerId) {
      // If the input is numeric, search by game_player_id and game=cs2
      const urlParams = `game_player_id=${faceitId}&game=cs2`;
      const queryUrl = `/players?${urlParams}`;

      try {
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
      } catch (error: any) {
        console.log("Error searching by game_player_id", error);
      }
    }

    // If it's not numeric, generate optimized case variations for the nickname
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
          // Log the error and continue with the next variation if 404
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

      return {
        matchId: matchId,
        mapName: response.data.voting.map.pick[0] || null,
        trackedTeam: {
          teamId: trackedTeamFaction.teamId,
          faction: trackedTeamFaction.faction,
          trackedPlayers: trackedTeamPlayers,
        },
        voiceChannelId:
          (await getMatchVoiceChannelId(trackedTeamPlayers)) || undefined,
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

  async getPlayerStats(
    matchId: string,
    playerIds: string[]
  ): Promise<PlayerStats[]> {
    try {
      // Call the Faceit API to get the match stats
      const queryUrl = `/matches/${matchId}/stats`;
      const response = await this.client.get(queryUrl);
      const rounds = response.data.rounds;

      // Flatten all player stats into an array
      const allPlayerStats: PlayerStats[] = rounds.flatMap((round: any) =>
        round.teams.flatMap((team: any) =>
          team.players.map((player: any) => ({
            playerId: player.player_id,
            kills: player.player_stats.Kills,
            deaths: player.player_stats.Deaths,
            assists: player.player_stats.Assists,
            ADR: player.player_stats.ADR,
            hsPercentage: player.player_stats["Headshots %"] + "%",
          }))
        )
      );

      // Loop through trackedPlayers and match them with the corresponding stats
      const playerStatsInOrder: PlayerStats[] = playerIds
        .map((playerId) => {
          // Find the player's stats from allPlayerStats
          const playerStats = allPlayerStats.find(
            (stat) => stat.playerId === playerId
          );
          return playerStats ? playerStats : null;
        })
        .filter((stats) => stats !== null); // Filter out any null results

      return playerStatsInOrder;
    } catch (error) {
      console.error("Error fetching player stats:", error);
      throw new Error("Failed to fetch player stats");
    }
  }

  async getPrematchPlayers(matchId: string): Promise<string[] | null> {
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
      return response.data.teams[
        trackedTeamFaction.faction === "faction1" ? "faction2" : "faction1"
      ].roster.map((player: any) => player.player_id);
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }

  async getMapStatsByPlayer(
    playerId: string
  ): Promise<PlayerMapsData[] | null> {
    try {
      const queryUrl = `/players/${playerId}/games/cs2/stats`;
      const response = await this.client.get(queryUrl);

      if (response.status === 200 && response.data) {
        let playerMapStats: PlayerMapsData[] = [];

        activeMapPool.map((map) => {
          const findMatch = response.data.items.filter(
            (match: any) => match.mapName === map
          );
          const mapWins =
            findMatch.filter((match: any) => match.win).length || 0;
          const totalPlayed = findMatch.length || 0;
          playerMapStats.push({
            mapName: map,
            playedTimes: totalPlayed,
            wins: mapWins,
            winPercentage: (mapWins / totalPlayed) * 100,
          });
        });

        return playerMapStats;
      }

      return null;
    } catch (error) {
      console.error("Error fetching map stats:", error);
      throw new Error("Failed to fetch map stats");
    }
  }
}

export const FaceitService = new FaceitApiClient();
