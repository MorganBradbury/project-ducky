import { GuildMember } from "discord.js";
import { Player } from "../types/Faceit/Player";
import { eloNumbers } from "../constants";

export function removeExistingTag(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, "").trim();
}

// Function to remove specific Unicode characters from a string
export const removeUnicodeChars = (value: string): string => {
  // Define the characters to remove
  const charactersToRemove = [
    "⁰",
    "¹",
    "²",
    "³",
    "⁴",
    "⁵",
    "⁶",
    "⁷",
    "⁸",
    "⁹",
    "⁽",
    "⁾",
  ];

  // Loop through the characters and remove each from the string
  let result = value;
  charactersToRemove.forEach((char) => {
    result = result.split(char).join("");
  });

  return result;
};

export function toEloUnicode(input: string): string {
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
