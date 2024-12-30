import { GuildMember } from "discord.js";
import { Player } from "../types/Faceit/Player";

function removeExistingTag(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, "").trim();
}

export function isNickname(identifier: string | number): identifier is string {
  return typeof identifier === "string";
}

export async function updateNickname(
  member: GuildMember,
  player: Player | null
): Promise<void> {
  if (!player) return;

  const currentName = member.nickname || member.user.username;
  const cleanName = removeExistingTag(currentName);

  // Calculate the length of the clean name and the ELO to check if the total exceeds 32 characters
  const eloTag = `[${player.faceitElo}]`;
  const potentialNickname = `${cleanName} ${eloTag}`;

  // If the nickname exceeds 32 characters, use the Discord username instead of the nickname
  let updatedNickname = potentialNickname;
  if (potentialNickname.length > 32) {
    updatedNickname = `${member.user.username} ${eloTag}`;
  }

  try {
    await member.setNickname(updatedNickname);
    console.log(`Updated nickname for ${currentName} to "${updatedNickname}"`);
  } catch (error) {
    console.error(`Failed to update nickname for ${currentName}:`, error);
  }
}
