import { GuildMember } from "discord.js";
import { Player } from "../types/Faceit/Player";
import { eloNumbers } from "../constants";

export function removeExistingTag(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, "").trim();
}

function removeUnicodeChars(input: string): string {
  // Regular expression to match Unicode superscript digits (U+2070 to U+209F) and brackets (U+207D, U+207E)
  const pattern = /[\u2070-\u209F\u207D\u207E]/g;

  // Replace any character matching the pattern with an empty string
  return input.replace(pattern, "");
}

function toEloUnicode(input: string): string {
  // Map each character in the string to its eloNumbers equivalent, if it exists
  return input
    .split("")
    .map((char) => eloNumbers[char] || char)
    .join("");
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
  const cleanName = removeUnicodeChars(currentName);

  // Calculate the length of the clean name and the ELO to check if the total exceeds 32 characters
  const eloTag = toEloUnicode(`[${player.faceitElo}]`);
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
