import { registerTrackingCommand } from "./Faceit/register";
import { deleteUserCommand } from "./Faceit/delete";
import { listUsersCommand } from "./Faceit/users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./Faceit/leaderboard";
import { getActivePlayers } from "./Minecraft/getActivePlayers";
import { clearMessagesCommand } from "./Discord/clearMessages";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  getActivePlayers,
  clearMessagesCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
