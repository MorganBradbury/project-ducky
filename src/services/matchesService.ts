import path from "path";
import { Worker } from "worker_threads";
import { runAutoUpdateElo } from "../auto/autoUpdateElo";
import {
  checkMatchExists,
  getMatchDataFromDb,
  insertMatch,
  markMatchComplete,
} from "../db/commands";
import {
  createActiveScoresChannel,
  deleteVoiceChannel,
  sendMatchFinishNotification,
  updateVoiceChannelName,
} from "./discordService";
import { faceitApiClient } from "./FaceitService";

let workers: Record<string, Worker> = {};

const checkVoiceId = (voiceChannelId: string) =>
  voiceChannelId != undefined &&
  voiceChannelId != "No channel found" &&
  voiceChannelId != "Error finding channel" &&
  voiceChannelId != null;

export const startMatch = async (matchId: string) => {
  console.log("Processing startMatch()", matchId);

  const matchAlreadyExists = await checkMatchExists(matchId);
  if (matchAlreadyExists) {
    console.log(`Match ${matchId} already exists in DB.`);
    return;
  }
  // Retrieve initial match data from FACEIT API.
  let matchData = await faceitApiClient.getMatchDetails(matchId);
  if (!matchData) {
    console.log(`No match data found for ${matchId} from FACEIT API.`);
    return;
  }

  const { matchingPlayers, voiceChannelId } = matchData;
  if (matchingPlayers.length == 0) {
    console.log(
      `No matching players found for match: ${matchId} from FACEIT API.`
    );
    return;
  }

  if (voiceChannelId && checkVoiceId(voiceChannelId)) {
    await updateVoiceChannelName(voiceChannelId, true);
    const activeScoresChannelId = await createActiveScoresChannel(
      "🚨 LIVE: (CS) 0:0 🔒"
    );
    matchData = {
      ...matchData,
      activeScoresChannelId: activeScoresChannelId || "",
      currentResult: "0:0",
    };

    // Determine the absolute path to the worker file
    const workerPath = path.resolve(__dirname, "../worker.js");
    console.log(`Starting worker at path: ${workerPath}`);

    // Start the worker after creating the active scores channel
    const worker = new Worker(workerPath);
    worker.postMessage({ type: "start", matchId: matchId });
    workers[matchId] = worker; // Store worker by matchId
  }

  await insertMatch(matchData);
};

export const endMatch = async (matchId: string) => {
  console.log("Processing endMatch()", matchId);

  const matchAlreadyExists = await checkMatchExists(matchId);
  if (!matchAlreadyExists) {
    console.log(`No match found for ${matchId} from the DB`);
    return;
  }

  let matchData = await getMatchDataFromDb(matchId);

  console.log(`Test querying DB Data: ${matchId}`, matchData);

  if (!matchData) {
    console.log("No match data found from DB", matchData);
    return;
  }

  if (matchData?.isComplete == true) {
    console.log("Match is already finished: ", matchData);
    return;
  }

  const finalMatchDetails = await faceitApiClient.getMatchScore(
    matchId,
    matchData?.teamId
  );

  if (finalMatchDetails) {
    matchData = {
      ...matchData,
      results: finalMatchDetails,
    };
  }

  const { matchingPlayers, voiceChannelId, activeScoresChannelId } = matchData;

  await markMatchComplete(matchId);
  await sendMatchFinishNotification(matchData);
  await runAutoUpdateElo(matchingPlayers);

  if (activeScoresChannelId) {
    await deleteVoiceChannel(activeScoresChannelId);
  }

  if (voiceChannelId && checkVoiceId(voiceChannelId)) {
    await updateVoiceChannelName(voiceChannelId, false);
  }

  // Stop the worker associated with this matchId
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate(); // Clean up worker resources
    delete workers[matchId]; // Remove worker from storage
    console.log("Worker stopped for matchId:", matchId);
  }
};

export const cancelMatch = async (matchId: string) => {
  console.log("Processing cancelMatch()", matchId);

  const matchAlreadyExists = await checkMatchExists(matchId);
  if (!matchAlreadyExists) {
    console.log(`No match found for ${matchId} from the DB`);
    return;
  }

  let matchData = await getMatchDataFromDb(matchId);

  console.log(`Test querying DB Data: ${matchId}`, matchData);

  if (!matchData) {
    console.log("No match data found from DB", matchData);
    return;
  }

  if (matchData?.isComplete == true) {
    console.log("Match is already finished: ", matchData);
    return;
  }

  const { voiceChannelId, activeScoresChannelId } = matchData;

  await markMatchComplete(matchId);

  if (activeScoresChannelId) {
    await deleteVoiceChannel(activeScoresChannelId);
  }

  if (voiceChannelId && checkVoiceId(voiceChannelId)) {
    await updateVoiceChannelName(voiceChannelId, false);
  }

  // Stop the worker associated with this matchId
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate(); // Clean up worker resources
    delete workers[matchId]; // Remove worker from storage
    console.log("Worker stopped for matchId:", matchId);
  }
};
