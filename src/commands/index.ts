import { registerTrackingCommand } from "./registerTracking";
import { deleteUserCommand } from "./delete";
import { listUsersCommand } from "./users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./leaderboard";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
