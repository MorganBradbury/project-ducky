import { registerTrackingCommand } from "./Faceit/register";
import { deleteUserCommand } from "./Faceit/delete";
import { listUsersCommand } from "./Faceit/users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./Faceit/leaderboard";
import { getActivePlayers } from "./Minecraft/getActivePlayers";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  getActivePlayers,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
