import { ChannelType } from "discord.js";
import client from "../../../bot/client";

export async function processEmbedsToThreads() {
  const channelId = "1310572627932479529"; // Fixed channel ID
  const channel = await client.channels.fetch(channelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("Invalid channel provided. Ensure it is a text channel.");
    return;
  }

  // Map to group embed messages by date
  const embedsByDate = new Map();

  // Fetch all messages from the channel
  let messages = await channel.messages.fetch({ limit: 100 });
  while (messages.size > 0) {
    for (const message of messages.values()) {
      if (message.embeds.length > 0) {
        const dateKey = message.createdAt.toISOString().split("T")[0]; // Get the date in YYYY-MM-DD format

        if (!embedsByDate.has(dateKey)) {
          embedsByDate.set(dateKey, []);
        }

        embedsByDate.get(dateKey).push(message);
      }
    }

    // Fetch the next set of messages
    const lastMessage = messages.last();
    messages = await channel.messages.fetch({
      limit: 100,
      before: lastMessage?.id,
    });
  }

  // Process each date group
  for (const [date, embedMessages] of embedsByDate.entries()) {
    const threadName = `${date.replace(/-/g, "/")} (${embedMessages.length})`;

    // Check if a thread with this name already exists
    const existingThreads = await channel.threads.fetchActive();
    const existingThread = existingThreads.threads.find(
      (thread) => thread.name === threadName
    );
    const thread =
      existingThread ||
      (await channel.threads.create({
        name: threadName,
        autoArchiveDuration: 10080, // Set maximum archive duration (7 days)
      }));

    // Add messages to the thread
    for (const embedMessage of embedMessages) {
      await thread.send({
        content: `**Original Message by ${embedMessage.author.tag}:**`,
        embeds: embedMessage.embeds,
      });

      // Delete the original message
      await embedMessage.delete();
    }
  }

  console.log(
    "Process completed: All embed messages moved to threads and deleted from the channel."
  );
}
