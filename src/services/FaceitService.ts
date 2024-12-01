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

      const mapName = voting?.map?.pick || "Unknown";
      const voiceChannelId = await getApplicableVoiceChannel(matchingPlayers);
      // Determine the teamId based on matching players
      let teamId: string = "";
      if (matchingPlayers.length > 0) {
        const matchingTeam = [teams.faction1, teams.faction2].find((faction) =>
          faction.roster.some((player: any) =>
            matchingPlayers.some(
              (matchingPlayer) =>
                matchingPlayer.gamePlayerId === player.game_player_id
            )
          )
        );
        teamId = matchingTeam?.faction_id || "";
      }

      return {
        matchId: match_id,
        mapName,
        matchingPlayers,
        teamId,
        voiceChannelId,
        isComplete: false,
      };
    } catch (error) {
      console.error(`Error fetching match details for ${matchId}:`, error);
      return null;
    }
  }

  async getActiveMatchScore(
    matchId: string,
    teamId: string
  ): Promise<string | null> {
    try {
      const response = await this.client.get(
        `${FaceitApiEndpoints.MATCHES}/${matchId}`
      );
      const matchData = response.data;

      if (
        !matchData ||
        !matchData.results ||
        !matchData.results.score ||
        typeof matchData.results.score.faction1 === "undefined" ||
        typeof matchData.results.score.faction2 === "undefined"
      ) {
        console.error(`Invalid match score data for match ID ${matchId}`);
        return null;
      }

      // Find which faction the teamId belongs to
      const { faction1, faction2 } = matchData?.teams;
      let teamFaction: "faction1" | "faction2" | null = null;

      if (faction1 && faction1.faction_id === teamId) {
        teamFaction = "faction1";
      } else if (faction2 && faction2.faction_id === teamId) {
        teamFaction = "faction2";
      }

      if (teamFaction === null) {
        console.error(`Team ID ${teamId} not found in match ${matchId}`);
        return null;
      }

      // Extract the scores for the two factions
      const faction1Score = matchData.results.score.faction1;
      const faction2Score = matchData.results.score.faction2;

      // Put the team's score first
      let score: string;
      if (teamFaction === "faction1") {
        score = `${faction1Score}:${faction2Score}`;
      } else {
        score = `${faction2Score}:${faction1Score}`;
      }

      return score;
    } catch (error) {
      console.error(`Error fetching match score for ${matchId}:`, error);
      return null;
    }
  }

  async getMatchScore(
    matchId: string,
    teamId: string
  ): Promise<MatchFinishedDetails | null> {
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

      const details: MatchFinishedDetails = {
        finalScore: roundStats.Score,
        win: roundStats.Winner == teamId ? true : false,
      };

      return details;
    } catch (error) {
      console.error(`Error fetching match stats for ${matchId}:`, error);
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
