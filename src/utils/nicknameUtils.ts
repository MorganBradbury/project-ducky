/**
 * Removes existing Faceit level or ELO tag from the nickname.
 * @param nickname The user's current nickname.
 * @returns Cleaned nickname without the level or ELO tag.
 */
export function removeExistingLevel(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, ""); // Matches and removes any "[...]"
}

/**
 * Gets the emoji corresponding to a Faceit level.
 * @param level The Faceit level.
 * @returns The emoji representation of the level.
 */
export function getFaceitLevelEmoji(level: number): string {
  if (level >= 10) return "🔴"; // Red for high levels
  if (level >= 7) return "🟠"; // Orange for mid-high levels
  if (level >= 4) return "🟡"; // Yellow for mid levels
  return "🟢"; // Green for low levels
}
