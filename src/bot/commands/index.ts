import { helpCommand } from "./help";
import { clearMessagesCommand } from "./Discord/clearMessages";
import { updateNicknameCommand } from "./Discord/setNickname";
import { listUserIdsCommand } from "./Faceit/listTrackedIds";

export const commands = [
  helpCommand,
  clearMessagesCommand,
  updateNicknameCommand,
  listUserIdsCommand,
];

// export
export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
