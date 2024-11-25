import { updateLevelCommand } from "./updateLevel";

export const commands = [updateLevelCommand];

export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
