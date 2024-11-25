import { registerTrackingCommand } from "./registerTracking";
import { deleteUserCommand } from "./deleteUser";
import { listUsersCommand } from "./listUsers";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
