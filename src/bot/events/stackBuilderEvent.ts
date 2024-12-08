import { Client, Message } from "discord.js";
import { createPoll } from "../commands/stackbuilder";

const triggerPhrases = [
  "cs?",
  "anyone want to play",
  "who wants to play?",
  "game time?",
];

export const handleMessage = (client: Client) => {
  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if the message matches any trigger phrase
    if (
      triggerPhrases.some((phrase) =>
        message.content.toLowerCase().includes(phrase)
      )
    ) {
      const time = "unspecified"; // Default time for auto-triggered polls
      await createPoll(message, time, false);
    }
  });
};
