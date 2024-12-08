import { registerTrackingCommand } from "./register";
import { deleteUserCommand } from "./delete";
import { listUsersCommand } from "./users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./leaderboard";
import { stackBuilderCommand } from "./stackbuilder";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  stackBuilderCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
