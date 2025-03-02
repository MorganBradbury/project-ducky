import axios, { AxiosInstance } from "axios";
import { config } from "../../config";
import {
  generateOptimizedCaseVariations,
  getTeamFaction,
  getTrackedPlayers,
} from "../../utils/faceitHelper";
import { Player } from "../../types/Faceit/player";
import { Match } from "../../types/Faceit/match";
import { activeMapPool } from "../../constants";
import { getMatchVoiceChannelId } from "./channelService";

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

      const voiceChannelId =
        (await getMatchVoiceChannelId(trackedTeamPlayers)) || undefined;

      return {
        matchId: matchId,
        mapName: response.data.voting.map.pick[0] || null,
        trackedTeam: {
          teamId: trackedTeamFaction.teamId,
          faction: trackedTeamFaction.faction,
          trackedPlayers: trackedTeamPlayers,
        },
        voiceChannelId,
        matchQueue: response.data.competition_name,
      };
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }

  async getMatchScore(
    matchId: string,
    teamFaction: string,
    finished: boolean = false
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
    const maxAttempts = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(
          `Fetching player stats (attempt ${attempt}/${maxAttempts})`
        );

        // Call the Faceit API to get the match stats
        const queryUrl = `/matches/${matchId}/stats`;
        const response = await this.client.get(queryUrl);

        // Check if response.data or rounds is undefined
        if (!response?.data || !response.data.rounds) {
          console.warn(
            `Attempt ${attempt} failed: Data or rounds undefined in response`
          );

          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          } else {
            console.error("Max retry attempts reached. Data still undefined.");
            throw new Error("Failed to fetch player stats: Data undefined");
          }
        }

        const rounds = response.data.rounds;

        // Flatten all player stats into an array
        const allPlayerStats: PlayerStats[] = rounds.flatMap((round: any) =>
          round.teams.flatMap((team: any) =>
            team.players.map((player: any) => ({
              playerId: player.player_id,
              kills: player.player_stats.Kills,
              deaths: player.player_stats.Deaths,
              assists: player.player_stats.Assists,
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

        if (playerStatsInOrder.length > 0) {
          return playerStatsInOrder;
        }

        console.warn(
          `Attempt ${attempt} failed: No valid player stats found in response`
        );

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error: any) {
        console.warn(
          `Attempt ${attempt} failed with status:`,
          error?.response?.status || "Unknown status"
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.error(
            "Max retry attempts reached. Failed to fetch player stats."
          );
          throw new Error("Failed to fetch player stats after max attempts");
        }
      }
    }

    throw new Error("Unexpected failure in getPlayerStats");
  }

  async getMatchPlayers(matchId: string): Promise<{
    homeFaction: Array<{
      playerId: string;
      faceitLevel: string;
      captain: boolean;
      nickname: string;
    }>;
    enemyFaction: Array<{
      playerId: string;
      faceitLevel: string;
      captain: boolean;
      nickname: string;
    }>;
  } | null> {
    const maxRetries = 15; // Retry up to 15 times
    const retryDelay = 1000; // Wait 1 second between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const queryUrl = `/matches/${matchId}`;
        const response = await this.client.get(queryUrl);

        if (
          response.status !== 200 ||
          !response.data ||
          response.data.best_of !== 1
        ) {
          console.log("Invalid match data", matchId);
          return null;
        }

        const { teams } = response.data;

        if (!teams.faction1) {
          console.log(
            `Attempt ${attempt}: faction1 data is undefined or null.`
          );
          if (attempt === maxRetries) {
            console.error("Max retries reached without valid faction1 data.");
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        const trackedTeamFaction = await getTeamFaction(teams);
        const enemyFactionName =
          trackedTeamFaction.faction === "faction1" ? "faction2" : "faction1";

        const mapTeamData = (teamFaction: string) =>
          teams[teamFaction]?.roster.map((player: any) => ({
            playerId: player.player_id,
            faceitLevel: player.game_skill_level,
            captain: teams[teamFaction].leader === player.player_id,
            nickname: player.nickname,
          }));

        return {
          homeFaction: mapTeamData(trackedTeamFaction.faction),
          enemyFaction: mapTeamData(enemyFactionName),
        };
      } catch (error) {
        console.error(`Attempt ${attempt}: Error fetching match details:`);

        if (attempt === maxRetries) {
          console.error("Max retries reached");
          return null;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return null; // Fallback if retries are exhausted
  }

  async getMatchFactionLeader(matchId: string): Promise<string | null> {
    const maxRetries = 30; // Retry for up to 1 minute (20 attempts, 3 seconds apart)
    const retryDelay = 2000; // 3 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const queryUrl = `/matches/${matchId}`;
        const response = await this.client.get(queryUrl);

        if (
          response.status !== 200 ||
          !response.data ||
          response.data.best_of !== 1
        ) {
          console.log("Could not find match by ID", matchId);
          return null;
        }

        const trackedTeamFaction = await getTeamFaction(response.data.teams);
        const correctFaction =
          trackedTeamFaction.faction === "faction1" ? "faction2" : "faction1";
        const factionLeader = response.data.teams[correctFaction].leader;
        return factionLeader || null;
      } catch (error) {
        console.error(
          `Attempt ${attempt}: Error fetching match details for ${matchId}:`,
          error
        );

        // Stop retrying if max retries reached
        if (attempt === maxRetries) {
          console.error(`Max retries reached for matchId: ${matchId}`);
          return null;
        }

        // Wait before the next retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    // If the loop somehow exits without returning, return null
    return null;
  }

  async getMapStatsByPlayer(
    playerId: string
  ): Promise<PlayerMapsData[] | null> {
    try {
      const queryUrl = `/players/${playerId}/games/cs2/stats?limit=50`;
      const response = await this.client.get(queryUrl);

      if (response.status === 200 && response.data) {
        const playerMapStats = activeMapPool.map((map) => {
          const matches: any[] = response.data.items.filter(
            (match: any) => match.stats.Map === map
          );

          const totalPlayed = matches.length;
          const mapWins = matches.reduce(
            (count: number, match: { stats: { Result: string } }) =>
              count + (match.stats.Result === "1" ? 1 : 0),
            0
          );

          return {
            mapName: map,
            playedTimes: totalPlayed,
            wins: mapWins,
            winPercentage: totalPlayed > 0 ? (mapWins / totalPlayed) * 100 : 0,
          };
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
