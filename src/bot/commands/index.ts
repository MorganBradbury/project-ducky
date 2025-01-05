import { registerTrackingCommand } from "./Faceit/register";
import { deleteUserCommand } from "./Faceit/delete-tracking";
import { listUsersCommand } from "./Faceit/list-tracked-uers";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./Faceit/leaderboard";
import { getActivePlayers } from "./Minecraft/get-active-players";
import { clearMessagesCommand } from "./Discord/clear-messages";
import { updateNicknameCommand } from "./Discord/set-nickname";
import { listUserIdsCommand } from "./Faceit/list-tracked-ids";
import { matchAnalysisCommand } from "./Faceit/matchroom-analysis";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  getActivePlayers,
  clearMessagesCommand,
  updateNicknameCommand,
  listUserIdsCommand,
  matchAnalysisCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
