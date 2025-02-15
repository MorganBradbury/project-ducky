import { helpCommand } from "./help";
import { clearMessagesCommand } from "./Discord/clearMessages";
import { updateNicknameCommand } from "./Discord/setNickname";
import { listUserIdsCommand } from "./Faceit/listTrackedIds";
import { retakesCommand } from "./Retakes/findRetakes";

export const commands = [
  helpCommand,
  clearMessagesCommand,
  updateNicknameCommand,
  listUserIdsCommand,
  retakesCommand,
];

// export
export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
