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
  runEloUpdate,
  sendMatchFinishNotification,
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
  setTimeout(async () => {
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

    await sendMatchFinishNotification(match);
    await runEloUpdate(match.trackedTeam.trackedPlayers);

    if (match.voiceChannel?.liveScoresChannelId) {
      await deleteVoiceChannel(match.voiceChannel?.liveScoresChannelId);
    }

    if (match.voiceChannel?.id) {
      await updateVoiceChannelName(
        match.voiceChannel.id,
        `${ChannelIcons.Active} ${match.voiceChannel.name}`
      );
    }

    await markMatchComplete(matchId);
  }, 2500);
};

export const cancelMatch = async (matchId: string) => {
  console.log("Processing cancelMatch()", matchId);

  let match = await getMatchDataFromDb(matchId);

  console.log(`Test querying DB Data: ${matchId}`, match);

  if (!match) {
    console.log("No match data found from DB", match);
    return;
  }

  // Delete the scores channel if it exists
  if (match.voiceChannel?.liveScoresChannelId) {
    await deleteVoiceChannel(match.voiceChannel?.liveScoresChannelId);
  }

  // Handle moving users from the old voice channel to a new one
  if (match.voiceChannel?.id) {
    try {
      // Create a new voice channel and get its ID
      const newChannelId = await createNewVoiceChannel(
        `${ChannelIcons.Active} ${match.voiceChannel.name}`,
        config.VC_GAMES_CATEGORY_ID
      );

      if (!newChannelId) {
        console.error("Failed to create a new voice channel.");
        return;
      }

      // Get the list of users in the old voice channel
      const membersInChannel = await getUsersInVoiceChannel(
        match.voiceChannel.id
      );

      if (membersInChannel.length === 0) {
        console.log(
          `No members in the voiceChannelId: ${match.voiceChannel.id}`
        );
      }

      // Move each user to the new voice channel
      for (const member of membersInChannel) {
        await moveUserToChannel(member.id, newChannelId);
      }

      // Delete the old voice channel
      await deleteVoiceChannel(match.voiceChannel.id);

      console.log(
        `Moved users from voiceChannelId: ${match.voiceChannel.id} to newChannelId: ${newChannelId}`
      );
    } catch (error) {
      console.error("Error while moving users to a new channel:", error);
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
