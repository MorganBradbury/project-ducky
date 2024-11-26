import { registerTrackingCommand } from "./registerTracking";
import { deleteUserCommand } from "./deleteUser";
import { listUsersCommand } from "./listUsers";
import { helpCommand } from "./helpCommand";

export const commands = [
  registerTrackingCommand,
  deleteUserCommand,
  listUsersCommand,
  helpCommand,
];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
