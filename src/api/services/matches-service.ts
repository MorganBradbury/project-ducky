import {
  checkMatchExists,
  getAllUsers,
  getMatchDataFromDb,
  insertMatch,
  isMatchProcessed,
  markMatchComplete,
  updateMatchProcessed,
} from "../../db/commands";
import { FaceitService } from "./faceit-service";
import {
  aggregateEnemyFactionData,
  formatMapData,
  getScoreStatusText,
} from "../../utils/faceitHelper";
import { updateVoiceChannelStatus } from "./discord/channel-service";
import {
  createLiveScoreCard,
  createMatchAnalysisEmbed,
  deleteMatchCards,
  matchEndNotification,
} from "./discord/embed-service";
import { runEloUpdate } from "./discord/user-service";
import axios from "axios";

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
  }

  await createLiveScoreCard(match);

  await insertMatch(match);

  console.log("worker started for", {
    matchId,
    vcid: match?.voiceChannelId || "Not in VC",
  });

  await axios.post(
    "https://live-game-service-production.up.railway.app/api/start",
    { matchId }
  );
  console.log("sent request to worker service to start", matchId);
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
  await axios.post(
    "https://live-game-service-production.up.railway.app/api/end",
    { matchId }
  );
  console.log("sent request to worker service to end", matchId);

  // deletes record from DB.
  await markMatchComplete(matchId);
  await matchEndNotification(match);
  await runEloUpdate(match.trackedTeam.trackedPlayers);

  if (match?.voiceChannelId) {
    await updateVoiceChannelStatus(match.voiceChannelId, "");
  }

  await deleteMatchCards(matchId);
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
  await axios.post(
    "https://live-game-service-production.up.railway.app/api/end",
    { matchId }
  );
  console.log("sent request to worker service to cancel", matchId);

  if (match?.voiceChannelId) {
    await updateVoiceChannelStatus(match.voiceChannelId, "");
  }

  await deleteMatchCards(matchId, true);
};

export const getMatchAnalysis = async (matchId: string): Promise<any> => {
  if (await checkMatchExists(matchId)) {
    return;
  }

  const matchroomPlayers = await FaceitService.getMatchPlayers(matchId);
  if (!matchroomPlayers?.homeFaction) return;

  const allTrackedUsers = await getAllUsers();
  const trackedFaceitIds = new Set(
    allTrackedUsers.map((user) => user.faceitId)
  );

  // Calculate total tracked users in the game
  const totalTrackedInGame =
    matchroomPlayers?.homeFaction?.filter((player) =>
      trackedFaceitIds.has(player.playerId)
    ).length || 0;

  // Check if there is a captain among the tracked users
  const isCaptainInGame = matchroomPlayers?.homeFaction?.some(
    (player) => trackedFaceitIds.has(player.playerId) && player.captain
  );

  if (totalTrackedInGame < 2 && !isCaptainInGame) {
    console.log(
      `Match only contains ${totalTrackedInGame} tracked users, so not sending analysis`,
      matchId
    );
    return;
  }

  const enemyFactionMapData = await aggregateEnemyFactionData(
    matchroomPlayers.enemyFaction
  );
  if (!enemyFactionMapData) return;

  const formattedMapData = formatMapData(
    enemyFactionMapData.mapStats,
    matchroomPlayers.enemyFaction.length
  );

  createMatchAnalysisEmbed(matchId, matchroomPlayers, formattedMapData);
};
