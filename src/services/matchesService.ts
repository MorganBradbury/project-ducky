import { runAutoUpdateElo } from "../auto/autoUpdateElo";
import {
  checkMatchExists,
  getMatchDataFromDb,
  insertMatch,
  markMatchComplete,
} from "../db/commands";
import {
  sendMatchFinishNotification,
  updateVoiceChannelName,
} from "./discordService";
import { faceitApiClient } from "./FaceitService";

export const startMatch = async (matchId: string) => {
  console.log("Processing startMatch()", matchId);

  const matchAlreadyExists = await checkMatchExists(matchId);
  if (matchAlreadyExists) {
    console.log(`Match ${matchId} already exists in DB.`);
    return;
  }
  // Retrieve initial match data from FACEIT API.
  const matchData = await faceitApiClient.getMatchDetails(matchId);
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

  await insertMatch(matchData);
  await updateVoiceChannelName(voiceChannelId, true);
};

export const endMatch = async (matchId: string) => {
  console.log("Processing endMatch()", matchId);

  const matchAlreadyExists = await checkMatchExists(matchId);
  if (!matchAlreadyExists) {
    console.log(`No match found for ${matchId} from the DB`);
    return;
  }

  // Retrieve initial match data from FACEIT API.
  //   const matchData = await faceitApiClient.getMatchDetails(matchId);
  //   if (!matchData) {
  //     console.log(`No match data found for ${matchId} from FACEIT API.`);
  //     return;
  //   }

  let matchData = await getMatchDataFromDb(matchId);

  console.log(`Test querying DB Data: ${matchId}`, matchData);

  if (!matchData) {
    console.log("No match data found from DB", matchData);
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

  const { matchingPlayers, voiceChannelId } = matchData;

  await markMatchComplete(matchId);
  await sendMatchFinishNotification(matchData);
  await runAutoUpdateElo(matchingPlayers);
  await updateVoiceChannelName(voiceChannelId, false);
};
