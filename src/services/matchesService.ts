import path from "path";
import { Worker } from "worker_threads";
import {
  checkMatchExists,
  getMatchDataFromDb,
  insertMatch,
  markMatchComplete,
} from "../db/commands";
import {
  createNewVoiceChannel,
  deleteVoiceChannel,
  getUsersInVoiceChannel,
  moveUserToChannel,
  sendMatchFinishNotification,
  updateDiscordProfiles,
  updateVoiceChannelName,
} from "./discordService";
import { faceitApiClient } from "./FaceitService";
import { config } from "../config";

let workers: Record<string, Worker> = {};

// Utility to validate voice channel IDs
const isValidVoiceId = (id: string | undefined | null): boolean =>
  !!id && !["No channel found", "Error finding channel"].includes(id);

// Worker management utilities
const startWorker = (matchId: string, workerPath: string): Worker => {
  const worker = new Worker(workerPath);
  worker.postMessage({ type: "start", matchId });
  workers[matchId] = worker;
  console.log(`Worker started for matchId: ${matchId}`);
  return worker;
};

const stopWorker = (matchId: string) => {
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate();
    delete workers[matchId];
    console.log(`Worker stopped for matchId: ${matchId}`);
  }
};

// Utility to handle voice channel cleanup
const handleVoiceChannelCleanup = async (
  voiceChannelId: string | undefined | null,
  activeScoresChannelId: string | undefined | null,
  gamersVcName: string | undefined | null,
  resetName: boolean = false
) => {
  if (activeScoresChannelId) {
    await deleteVoiceChannel(activeScoresChannelId);
  }

  if (voiceChannelId && isValidVoiceId(voiceChannelId)) {
    await updateVoiceChannelName(
      voiceChannelId,
      gamersVcName || "CS",
      resetName
    );
  }
};

// Start a match
export const startMatch = async (matchId: string) => {
  console.log("Processing startMatch()", matchId);

  if (await checkMatchExists(matchId)) {
    console.log(`Match ${matchId} already exists in DB.`);
    return;
  }

  const matchData = await faceitApiClient.getMatchDetails(matchId);
  if (!matchData || matchData.matchingPlayers.length === 0) {
    console.log(`Invalid match data for matchId: ${matchId}`);
    return;
  }

  const { voiceChannelId, gamersVcName } = matchData;

  if (voiceChannelId && isValidVoiceId(voiceChannelId)) {
    await updateVoiceChannelName(voiceChannelId, gamersVcName || "CS", true);
    const activeScoresChannelId = await createNewVoiceChannel(
      `🚨 LIVE: (${gamersVcName}) 0:0`,
      config.VC_ACTIVE_SCORES_CATEGORY_ID
    );

    const workerPath = path.resolve(__dirname, "../worker.js");
    startWorker(matchId, workerPath);

    await insertMatch({
      ...matchData,
      activeScoresChannelId: activeScoresChannelId || "",
      currentResult: "0:0",
    });
  }
};

// End a match
export const endMatch = async (matchId: string) => {
  setTimeout(async () => {
    console.log("Processing endMatch()", matchId);

    if (!(await checkMatchExists(matchId))) {
      console.log(`No match found for ${matchId} in the DB`);
      return;
    }

    const matchData = await getMatchDataFromDb(matchId);
    if (!matchData || matchData.isComplete) {
      console.log("Match is either not found or already complete:", matchData);
      return;
    }

    const finalMatchDetails = await faceitApiClient.getMatchScore(
      matchId,
      matchData?.teamId
    );

    if (finalMatchDetails) {
      matchData.results = finalMatchDetails;
    }

    const {
      matchingPlayers,
      voiceChannelId,
      activeScoresChannelId,
      gamersVcName,
    } = matchData;

    await sendMatchFinishNotification(matchData);
    await updateDiscordProfiles(matchingPlayers);
    await handleVoiceChannelCleanup(
      voiceChannelId,
      activeScoresChannelId,
      gamersVcName,
      false
    );
    await markMatchComplete(matchId);
    stopWorker(matchId);
  }, 2500);
};

export const cancelMatch = async (matchId: string) => {
  console.log("Processing cancelMatch()", matchId);

  if (!(await checkMatchExists(matchId))) {
    console.log(`No match found for ${matchId} in the DB`);
    return;
  }

  const matchData = await getMatchDataFromDb(matchId);
  if (!matchData || matchData.isComplete) {
    console.log("Match is either not found or already complete:", matchData);
    return;
  }

  const { voiceChannelId, activeScoresChannelId } = matchData;

  try {
    await handleVoiceChannelCleanup(
      voiceChannelId,
      activeScoresChannelId,
      matchData.gamersVcName
    );

    if (voiceChannelId && isValidVoiceId(voiceChannelId)) {
      const newChannelId = await createNewVoiceChannel(
        matchData.gamersVcName || "CS",
        config.VC_GAMES_CATEGORY_ID
      );

      if (newChannelId) {
        const members = await getUsersInVoiceChannel(voiceChannelId);
        await Promise.all(
          members.map((member) => moveUserToChannel(member.id, newChannelId))
        );
        console.log(`Users moved to new channel: ${newChannelId}`);
      }
    }

    await markMatchComplete(matchId);
    stopWorker(matchId);
  } catch (error) {
    console.error("Error in cancelMatch:", error);
  }
};
