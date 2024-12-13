import { registerTrackingCommand } from "./register";
import { deleteUserCommand } from "./delete";
import { listUsersCommand } from "./users";
import { helpCommand } from "./help";
import { leaderboardCommand } from "./leaderboard";
import { getMinecraftActivePlayers } from "./getMinecraftActivePlayers";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
  leaderboardCommand,
  getMinecraftActivePlayers,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
