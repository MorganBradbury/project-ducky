import { autorunCommand } from "./autorun";
import { updateLevelCommand } from "./updateLevel";

export const commands = [autorunCommand, updateLevelCommand];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
