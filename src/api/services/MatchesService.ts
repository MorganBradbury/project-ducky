import path from "path";
import { Worker } from "worker_threads";
import {
  checkMatchExists,
  getMatchDataFromDb,
  insertMatch,
  isMatchProcessed,
  markMatchComplete,
  updateMatchProcessed,
} from "../../db/commands";
import {
  createMatchAnalysisEmbed,
  runEloUpdate,
  sendMatchFinishNotification,
  updateVoiceChannelStatus,
} from "./DiscordService";
import { FaceitService } from "./FaceitService";
import { getScoreStatusText } from "../../utils/faceitHelper";
import { activeMapPool } from "../../constants";

let workers: Record<string, Worker> = {};

export const startMatch = async (matchId: string) => {
  console.log("Processing startMatch()", matchId);

  const doesMatchExist = await checkMatchExists(matchId);
  if (doesMatchExist) {
    console.log(`Match ${matchId} already exists in DB.`);
    return;
  }

  // Retrieve initial match data from FACEIT API.
  let match = await FaceitService.getMatch(matchId);
  console.log("match loaded in from api", match);
  if (!match) {
    console.log(`No Match or players found for ${matchId}`);
    return;
  }

  // If the players are in a voice channel. Create a JS Worker to update the live score in the status of the channel.
  if (match?.voiceChannelId) {
    const scoreStatus = await getScoreStatusText(match.mapName);
    await updateVoiceChannelStatus(match.voiceChannelId, scoreStatus);
    const worker = new Worker(path.resolve(__dirname, "../worker.js"));
    worker.postMessage({ type: "start", matchId: matchId });
    workers[matchId] = worker;
  }

  await insertMatch(match);
};

export const endMatch = async (matchId: string) => {
  console.log("Processing endMatch()", matchId);

  const isMatchAlreadyProcessed = await isMatchProcessed(matchId);
  if (isMatchAlreadyProcessed) {
    return;
  }

  let match = await getMatchDataFromDb(matchId);

  if (!match) {
    return;
  }

  await updateMatchProcessed(matchId);
  // Stop the worker associated with this matchId
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate(); // Clean up worker resources
    delete workers[matchId]; // Remove worker from storage
    console.log("Worker stopped for matchId:", matchId);
  }

  // deletes record from DB.
  await markMatchComplete(matchId);
  await sendMatchFinishNotification(match);
  await runEloUpdate(match.trackedTeam.trackedPlayers);

  if (match?.voiceChannelId) {
    await updateVoiceChannelStatus(match.voiceChannelId, "");
  }
};

export const cancelMatch = async (matchId: string) => {
  console.log("Processing cancelMatch()", matchId);

  let match = await getMatchDataFromDb(matchId);
  if (!match) {
    console.log("No match data found from DB", match);
    return;
  }

  // Mark match as complete in the database
  await markMatchComplete(matchId);

  // Stop the worker associated with this matchId
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate(); // Clean up worker resources
    delete workers[matchId]; // Remove worker from storage
    console.log("Worker stopped for matchId:", matchId);
  }

  if (match?.voiceChannelId) {
    await updateVoiceChannelStatus(match.voiceChannelId, "");
  }
};

import { performance } from "perf_hooks";

export const getMatchAnalysis = async (matchId: string): Promise<any> => {
  const startTotal = performance.now();

  // Check if match exists in DB
  const startCheckMatch = performance.now();
  const doesExist = await checkMatchExists(matchId);
  console.log(`checkMatchExists took ${performance.now() - startCheckMatch}ms`);

  if (doesExist) {
    console.log("getMatchAnalysis, game already exists", matchId);
    console.log(`Total execution took ${performance.now() - startTotal}ms`);
    return;
  }

  // Retrieve matchroom players
  const startGetPlayers = performance.now();
  const matchroomPlayers = await FaceitService.getMatchPlayers(matchId);
  console.log(
    `FaceitService.getMatchPlayers took ${
      performance.now() - startGetPlayers
    }ms`
  );
  console.log("matchroomPlayers", matchroomPlayers);
  if (!matchroomPlayers) {
    console.log(`Total execution took ${performance.now() - startTotal}ms`);
    return;
  }

  // Initialize variables to store aggregated data
  const enemyFactionMapData: {
    totalPlayedTimes: number;
    totalWins: number;
    totalWinPercentage: number;
    mapStats: Map<
      string,
      {
        totalPlayedTimes: number;
        totalWins: number;
        totalWinPercentage: number;
      }
    >;
  } = {
    totalPlayedTimes: 0,
    totalWins: 0,
    totalWinPercentage: 0,
    mapStats: new Map(),
  };

  // Process enemyFaction players
  const startProcessPlayers = performance.now();
  for (const player of matchroomPlayers.enemyFaction) {
    const startPlayerStats = performance.now();
    try {
      const playerMapStats = await FaceitService.getMapStatsByPlayer(
        player.playerId
      );
      console.log(
        `FaceitService.getMapStatsByPlayer for player ${player.nickname} took ${
          performance.now() - startPlayerStats
        }ms`
      );

      if (!playerMapStats) {
        console.log(`Total execution took ${performance.now() - startTotal}ms`);
        return;
      }

      const startAggregation = performance.now();
      playerMapStats.forEach((mapStat) => {
        if (!enemyFactionMapData.mapStats.has(mapStat.mapName)) {
          enemyFactionMapData.mapStats.set(mapStat.mapName, {
            totalPlayedTimes: 0,
            totalWins: 0,
            totalWinPercentage: 0,
          });
        }

        const mapData = enemyFactionMapData.mapStats.get(mapStat.mapName)!;
        mapData.totalPlayedTimes += mapStat.playedTimes;
        mapData.totalWins += mapStat.wins;
        mapData.totalWinPercentage += mapStat.winPercentage;
        enemyFactionMapData.mapStats.set(mapStat.mapName, mapData);
      });

      enemyFactionMapData.totalPlayedTimes += playerMapStats.reduce(
        (acc, stat) => acc + stat.playedTimes,
        0
      );
      enemyFactionMapData.totalWins += playerMapStats.reduce(
        (acc, stat) => acc + stat.wins,
        0
      );
      enemyFactionMapData.totalWinPercentage += playerMapStats.reduce(
        (acc, stat) => acc + stat.winPercentage,
        0
      );
      console.log(
        `Aggregation for player ${player.nickname} took ${
          performance.now() - startAggregation
        }ms`
      );
    } catch (error) {
      console.error(
        `Error fetching map stats for player ${player.nickname}:`,
        error
      );
    }
  }
  console.log(
    `Processing all players took ${performance.now() - startProcessPlayers}ms`
  );

  // Calculate average win percentage
  const startCalcAverage = performance.now();
  const playerCount = matchroomPlayers.enemyFaction.length;
  enemyFactionMapData.totalWinPercentage /= playerCount;
  console.log(
    `Calculating average win percentage took ${
      performance.now() - startCalcAverage
    }ms`
  );

  // Format data for output
  const startFormatting = performance.now();
  const formattedMapData = Array.from(
    enemyFactionMapData.mapStats.entries()
  ).map(([mapName, stats]) => ({
    mapName,
    totalPlayedTimes: stats.totalPlayedTimes,
    totalWins: stats.totalWins,
    averageWinPercentage: (stats.totalWinPercentage / playerCount).toFixed(2),
  }));
  console.log(
    `Formatting map data took ${performance.now() - startFormatting}ms`
  );

  console.log("formattedMapData", formattedMapData);

  const startEmbed = performance.now();
  createMatchAnalysisEmbed(matchId, matchroomPlayers, formattedMapData);
  console.log(
    `createMatchAnalysisEmbed took ${performance.now() - startEmbed}ms`
  );

  console.log(`Total execution took ${performance.now() - startTotal}ms`);
};
