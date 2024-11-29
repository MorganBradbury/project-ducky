import { runAutoUpdateElo } from "../auto/autoUpdateElo";
import {
  getMatchFromDatabase,
  insertMatch,
  markMatchComplete,
} from "../db/commands";
import { MatchDetails } from "../types/MatchDetails";
import {
  sendMatchFinishNotification,
  updateVoiceChannelName,
} from "./discordService";
import { faceitApiClient } from "./FaceitService";

// Helper to process match data
const processMatchData = async (matchData: any, isMatchStart: boolean) => {
  if (!matchData || matchData?.matchingPlayers.length === 0) {
    console.log(
      `No match data found or no players for match ${matchData?.matchId}`
    );
    return;
  }

  console.log(`Processing Match Data for ID ${matchData.matchId}`, matchData);

  // Insert match only for match start
  if (isMatchStart) {
    await insertMatch(matchData);
  }

  await updateVoiceChannelName(matchData.voiceChannelId, isMatchStart);
};

// Main workflow function
export const runMatchFlow = async (matchId: string, event: string) => {
  try {
    let matchData: MatchDetails | null = null;

    if (event === "match_status_finished") {
      // Fetch match data from the database if match is finished
      matchData = await getMatchFromDatabase(matchId);
      if (!matchData) {
        console.log(`No match data found for finished match ID ${matchId}`);
        return;
      }
    } else {
      // Otherwise, use Faceit API to get match data
      matchData = await faceitApiClient.getMatchDetails(matchId);
      if (!matchData) {
        console.log(`No match data found for ID ${matchId}`);
        return;
      }
    }

    if (event === "match_status_ready") {
      // Handle match start: insert match and update voice channel
      await processMatchData(matchData, true);
    } else if (event === "match_status_finished") {
      // Handle match finish: update Elo, mark as complete, and notify
      await processMatchData(matchData, false);
      await runAutoUpdateElo(matchData.matchingPlayers);
      await markMatchComplete(matchData.matchId);
      await sendMatchFinishNotification(matchData);
    } else {
      console.error("Unsupported event type");
    }
  } catch (error) {
    console.error(`Error processing match ${matchId}:`, error);
  }
};
