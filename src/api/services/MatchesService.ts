import path from "path";
import { Worker } from "worker_threads";
import {
  checkMatchExists,
  getMatchDataFromDb,
  insertMatch,
  markMatchComplete,
} from "../../db/commands";
import {
  createNewVoiceChannel,
  deleteVoiceChannel,
  getUsersInVoiceChannel,
  moveUserToChannel,
  resetVoiceChannelStates,
  runEloUpdate,
  sendMatchFinishNotification,
  transferUsersToNewChannel,
  updateVoiceChannelName,
} from "./DiscordService";
import { FaceitService } from "./FaceitService";
import { config } from "../../config";
import { ChannelIcons } from "../../constants";

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

  // Stack is in the discord. Change discord to live state.
  if (match?.voiceChannel) {
    await updateVoiceChannelName(
      match.voiceChannel.id,
      `${ChannelIcons.Active} ${match.voiceChannel.name} [LIVE]`
    );

    const liveScoresChannelId = await createNewVoiceChannel(
      `${ChannelIcons.Active} (${match.voiceChannel.name}) 0:0`,
      config.VC_ACTIVE_SCORES_CATEGORY_ID
    );

    if (liveScoresChannelId) {
      match = {
        ...match,
        voiceChannel: {
          ...match.voiceChannel,
          liveScoresChannelId: liveScoresChannelId,
        },
      };
    }

    // Start the worker after creating the active scores channel
    const worker = new Worker(path.resolve(__dirname, "../worker.js"));
    worker.postMessage({ type: "start", matchId: matchId });
    workers[matchId] = worker; // Store worker by matchId
  }

  await insertMatch(match);
};

export const endMatch = async (matchId: string) => {
  console.log("Processing endMatch()", matchId);

  // Stop the worker associated with this matchId
  if (workers[matchId]) {
    workers[matchId].postMessage({ type: "stop" });
    workers[matchId].terminate(); // Clean up worker resources
    delete workers[matchId]; // Remove worker from storage
    console.log("Worker stopped for matchId:", matchId);
  }

  let match = await getMatchDataFromDb(matchId);

  if (!match) {
    console.log("No match data found from DB", match);
    return;
  }

  if (match.voiceChannel?.id) {
    await updateVoiceChannelName(
      match.voiceChannel.id,
      `${ChannelIcons.Active} ${match.voiceChannel.name}`
    );
  }

  if (match.voiceChannel?.liveScoresChannelId) {
    await deleteVoiceChannel(match.voiceChannel?.liveScoresChannelId);
  }

  await sendMatchFinishNotification(match);
  await runEloUpdate(match.trackedTeam.trackedPlayers);
  await markMatchComplete(matchId);
};

export const cancelMatch = async (matchId: string) => {
  console.log("Processing cancelMatch()", matchId);

  let match = await getMatchDataFromDb(matchId);
  if (!match) {
    console.log("No match data found from DB", match);
    return;
  }

  // Handle moving users from the old voice channel to a new one
  if (match.voiceChannel?.id) {
    try {
      // Delete the scores channel if it exists
      if (match.voiceChannel?.liveScoresChannelId) {
        await deleteVoiceChannel(match.voiceChannel?.liveScoresChannelId);
      }

      // Create a new voice channel and get its ID
      const newChannelId = await createNewVoiceChannel(
        `${ChannelIcons.Active} ${match.voiceChannel.name}`,
        config.VC_GAMES_CATEGORY_ID
      );

      if (!newChannelId) {
        console.error("Failed to create a new voice channel.");
        return;
      }

      await transferUsersToNewChannel(match.voiceChannel.id, newChannelId);
      await deleteVoiceChannel(match.voiceChannel.id);
      await resetVoiceChannelStates();

      console.log(
        `Moved users from voiceChannelId: ${match.voiceChannel.id} to newChannelId: ${newChannelId}`
      );
    } catch (error) {
      console.error("Error when cancelling match", error);
    }
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
};
