import { Client, Message } from "discord.js";
import { createPoll } from "../commands/stackbuilder";

const triggerKeywords = [
  "cs?",
  "playing?",
  "anyone playing?",
  "cs",
  "any gamers",
  "anyone gaming",
];
const triggerRoles = ["level 10"];

// Regex patterns for time parsing
const timePatterns = [
  /in (\d+)\s?(minutes?|mins?|hours?|hrs?)?/i, // e.g., "in 10 minutes", "in 1 hr", or "in 10"
  /at (\d{1,2})(am|pm)?/i, // e.g., "at 3pm" or "at 8"
  /\brn\b/i, // "rn" for right now
];

export const handleMessage = (client: Client) => {
  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if the message contains any trigger keywords
    const containsKeywords = triggerKeywords.some((keyword) =>
      message.content.toLowerCase().includes(keyword)
    );

    // Check if the message mentions @everyone or any trigger role
    const mentionsEveryone = message.mentions.everyone;
    const mentionsTriggerRoles = message.mentions.roles.some((role) =>
      triggerRoles.includes(role.name.toLowerCase())
    );

    if ((mentionsEveryone || mentionsTriggerRoles) && containsKeywords) {
      // Extract time from the message
      const time = extractTimeFromMessage(message.content) || "Right now";

      // Trigger the poll with the extracted time
      await createPoll(message, time, false);
    }
  });
};

// Function to extract time from message content
function extractTimeFromMessage(content: string): string | null {
  for (const pattern of timePatterns) {
    const match = content.match(pattern);
    if (match) {
      if (pattern === timePatterns[0]) {
        // "in X [optional: minutes/hours]"
        const value = parseInt(match[1], 10);
        const unit = match[2]?.toLowerCase();
        if (unit?.includes("hour") || unit?.includes("hr")) {
          return `in ${value} hour${value > 1 ? "s" : ""}`;
        }
        // Default to minutes if no unit is provided
        return `in ${value} minute${value > 1 ? "s" : ""}`;
      } else if (pattern === timePatterns[1]) {
        // "at X[am|pm]"
        const hour = parseInt(match[1], 10);
        const period = match[2] ? match[2].toLowerCase() : "";
        return `at ${hour}${period}`;
      } else if (pattern === timePatterns[2]) {
        // "rn" (right now)
        return "Right now";
      }
    }
  }
  return null; // No valid time found
}
