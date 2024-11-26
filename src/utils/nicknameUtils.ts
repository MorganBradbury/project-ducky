import { GuildMember } from "discord.js";
import { FaceitPlayer } from "../types/FaceitPlayer";

/**
 * Removes any existing FACEIT level or ELO tag (e.g., "[...]" patterns) from a nickname.
 * @param nickname - The current nickname of the user.
 * @returns The cleaned nickname without any FACEIT level or ELO tags.
 */
function removeExistingTag(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, "").trim();
}

/**
 * Updates the nickname of a guild member with their FACEIT ELO.
 * @param member - The guild member whose nickname will be updated.
 * @param player - The FACEIT player data containing the ELO.
 */
export async function updateNickname(
  member: GuildMember,
  player: FaceitPlayer | null
): Promise<void> {
  if (!player) return;

  const currentName = member.nickname || member.user.username;
  const cleanName = removeExistingTag(currentName);
  const updatedNickname = `${cleanName} [${player.faceit_elo}]`;

  try {
    await member.setNickname(updatedNickname);
    console.log(`Updated nickname for ${currentName} to "${updatedNickname}"`);
  } catch (error) {
    console.error(`Failed to update nickname for ${currentName}:`, error);
  }
}
