/**
 * Removes existing Faceit level or ELO tag from the nickname.
 * @param nickname The user's current nickname.
 * @returns Cleaned nickname without the level or ELO tag.
 */
export function removeExistingLevel(nickname: string): string {
  return nickname.replace(/\s?\[.*?\]/, ""); // Matches and removes any "[...]"
}
