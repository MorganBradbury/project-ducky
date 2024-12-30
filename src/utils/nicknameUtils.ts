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

// Function to replace numbers and square brackets with their Unicode equivalents
export const toUnicodeStr = (value: string): string => {
  // Define a mapping of characters to replace
  const unicodeMap: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "[": "⁽",
    "]": "⁾",
  };

  // Loop through each character in the value and replace it if a match exists
  let result = value;
  for (const [char, unicode] of Object.entries(unicodeMap)) {
    result = result.split(char).join(unicode);
  }

  return result;
};

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
  const eloTag = toUnicodeStr(`[${player.faceitElo}]`);
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
