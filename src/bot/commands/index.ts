import { helpCommand } from "./help";
import { leaderboardCommand } from "./Faceit/leaderboard";
import { clearMessagesCommand } from "./Discord/clear-messages";
import { updateNicknameCommand } from "./Discord/set-nickname";
import { listUserIdsCommand } from "./Faceit/list-tracked-ids";

export const commands = [
  helpCommand,
  leaderboardCommand,
  clearMessagesCommand,
  updateNicknameCommand,
  listUserIdsCommand,
];

// export
export const commandsMap = new Map(commands.map((cmd) => [cmd.name, cmd]));
