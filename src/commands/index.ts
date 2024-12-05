import { registerTrackingCommand } from "./register";
import { deleteUserCommand } from "./delete";
import { listUsersCommand } from "./users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./leaderboard";
import { setRoleIconCommand } from "./roleicons";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  setRoleIconCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
