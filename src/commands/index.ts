import { registerTrackingCommand } from "./registerTracking";
import { deleteUserCommand } from "./deleteUser";
import { listUsersCommand } from "./listUsers";
import { generateUsersJsonCommand } from "./getUserDump";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  generateUsersJsonCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
