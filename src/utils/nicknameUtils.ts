
import { GuildMember } from "discord.js";
import { FaceitPlayer } from "../types/FaceitPlayer";

/**
 * Removes existing Faceit level or ELO tag from the nickname.
 * @param nickname The user's current nickname.
 * @returns Cleaned nickname without the level or ELO tag.
 */
export function removeExistingLevel(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, ""); // Matches and removes any "[...]"
}


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
