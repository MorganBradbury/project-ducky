import { client } from "../bot";
import OpenAI from "openai";
import { Message } from "discord.js";
import { config } from "../../config"; // Adjust the path as needed

// Initialize OpenAI
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

client.on("messageCreate", async (message: Message) => {
  if (client.user && message.mentions.has(client.user) && !message.author.bot) {
    const userMessage = message.content
      .replace(`<@${client.user.id}>`, "")
      .trim();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: userMessage }],
      });

      const reply =
        response.choices[0]?.message?.content ||
        "I couldn't come up with a response.";
      await message.reply(reply);
    } catch (error) {
      console.error("Error with OpenAI API:", error);
      await message.reply(
        "Sorry, I had trouble processing that. Please try again later!"
      );
    }
  }
});
