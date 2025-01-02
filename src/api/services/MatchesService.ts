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

export const sendPrematchAnalysis = async (matchId: string): Promise<any> => {
  console.log("Processing sendPrematchAnalysis()", matchId);

  // // Retrieves an array of players from the match by their ID
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
  createPrematchEmbed(playerMapStats);
  // if(players === null) {
  //   console.log("No players in pre-match", matchId);
  //   return;
  // }

  // let analysisObject: [];

  // // Now loop through players and get their stats for all their maps
  // players.map((playerId: string) => {
  //   const playerMapStats = FaceitService.getMapStatsByPlayer(playerId);
  //   // Now I have the stats of the player.

  //   // Now i need to put this into a variable.
  // });

  // // Once all players have been looped through, the object will have all the data. Loop through it and aggregate the winrate for each map, and the aggregate of the amount played.
};
