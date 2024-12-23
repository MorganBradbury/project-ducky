import { client } from "../bot";
import OpenAI from "openai";
import { Message } from "discord.js";
import { config } from "../../config"; // Adjust the path as needed

// Initialize OpenAI
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

client.on("messageCreate", async (message: Message) => {
  // Check if the message is in the specified channel and the bot is mentioned
  const targetChannelId = "1319737613871218861"; // Replace with your channel ID
  if (
    message.channel.id === targetChannelId && // Ensure the channel matches
    client.user && // Check if the bot is logged in
    message.mentions.has(client.user) && // Check if the bot is mentioned
    !message.author.bot // Ignore bot messages
  ) {
    const userMessage = message.content
      .replace(`<@${client.user.id}>`, "")
      .trim();

    // Send a loading message
    const loadingMessage = await message.reply("Let me think... 🤔");

    try {
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are a witty, slightly sarcastic AI assistant. Keep your tone playful and engaging. Be happy to insult others back. However If someone asks you to do something, be as helpful as possible. Try keep responses short unless you need to, such as lyrics for songs.",
          },
          { role: "user", content: userMessage },
        ],
      });

      const reply =
        response.choices[0]?.message?.content ||
        "I couldn't come up with a response.";

      // Edit the loading message with the AI's reply
      await loadingMessage.edit(reply);
    } catch (error) {
      console.error("Error with OpenAI API:", error);

      // Edit the loading message to indicate an error
      await loadingMessage.edit(
        "Sorry, I had trouble processing that. Please try again later!"
      );
    }
  }
});
