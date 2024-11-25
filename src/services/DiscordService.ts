import { GuildMember } from "discord.js";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { removeExistingLevel } from "../utils/nicknameUtils";

export async function updateNickname(
  member: GuildMember,
  player: FaceitPlayer | null
) {
  if (!player) {
    return;
  }

  const cleanName = removeExistingLevel(
    member.nickname || member.user.username
  );
  const newNickname = `${cleanName} [${player.elo}]`;

  await member.setNickname(newNickname);
}
