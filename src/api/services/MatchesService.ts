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
  createPrematchEmbed,
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

type PlayerStats = {
  mapName: string;
  playedTimes: number;
  wins: number;
  winPercentage: number | "NaN";
};

const activeMatchIds = new Set<string>();

export const getMatchAnalysis = async (matchId: string): Promise<any> => {
  // Does match exist in DB already. If so, return.
  const doesExist = await checkMatchExists(matchId);
  if (doesExist) {
    console.log("getMatchAnalysis, game already exists", matchId);
    return;
  }

  // If match is ready for analysis
  // retrieve all players from the matchroom and their level.
  const matchroomPlayers = await FaceitService.getMatchPlayers(matchId);
  console.log("matchroomPlayers", matchroomPlayers);
  // if no player is in VC, return.

  // Loop through all the players and aggregate the statistics.

  // Send the embed to the text channel.

  // Format:
  // Match room ID
  // Team [teamName] Players : Team [teanmName] players
  // List of players for each team

  // Table of all map data

  // Most likely picks:
  //[list of maps]

  // Most likely bans:
  //[list of maps]

  // Button to link the match room.
};

export const sendPrematchAnalysis = async (matchId: string): Promise<any> => {
  // Check if the matchId is already being processed
  if (activeMatchIds.has(matchId)) {
    console.log(`Match ${matchId} is already being processed. Skipping...`);
    return;
  }

  try {
    // Mark the matchId as being processed
    activeMatchIds.add(matchId);
    console.log("Processing sendPrematchAnalysis()", matchId);

    // Retrieves an array of players from the match by their ID
    const leader = await FaceitService.getMatchFactionLeader(matchId);
    if (leader === null) {
      return;
    }
    console.log("Leader", leader);

    const playerMapStats = await FaceitService.getMapStatsByPlayer(leader);
    if (playerMapStats === null) {
      return;
    }
    console.log("PlayerMapStats", playerMapStats);

    // Create the prematch embed
    createPrematchEmbed(playerMapStats, matchId);
  } catch (error) {
    console.error(`Error processing match ${matchId}:`, error);
  } finally {
    // After processing, remove the matchId from the active set
    activeMatchIds.delete(matchId);
  }
};
