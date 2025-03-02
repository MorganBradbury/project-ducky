import { ChannelType, ThreadChannel, Message } from "discord.js";
import client from "../client";
import { config } from "../../config";

export async function processEmbedsToThreads() {
  const channel = await client.channels.fetch(config.CHANNEL_MATCH_RESULTS);

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("Invalid channel provided. Ensure it is a text channel.");
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = yesterday.toISOString().split("T")[0]; // Format YYYY-MM-DD
  const [year, month, day] = dateKey.split("-");
  const formattedDate = `${day}/${month}/${year.slice(-2)}`; // DD/MM/YY format

  let messages = await channel.messages.fetch({ limit: 100 });
  const messagesWithEmbeds: { message: Message; embeds: any[] }[] = [];

  // Fetch all messages and collect their embeds
  while (messages.size > 0) {
    for (const message of messages.values()) {
      if (message.embeds.length > 0) {
        messagesWithEmbeds.push({ message, embeds: message.embeds });
      }
    }

    // Fetch next batch of messages
    const lastMessage = messages.last();
    messages = await channel.messages.fetch({
      limit: 100,
      before: lastMessage?.id,
    });
  }

  // Sort messages based on their created timestamp (oldest first)
  messagesWithEmbeds.sort(
    (a, b) => a.message.createdTimestamp - b.message.createdTimestamp
  );

  // Extract ordered embeds
  const sortedEmbeds = messagesWithEmbeds.flatMap((entry) => entry.embeds);

  // Only create a thread if there are embeds to store
  if (sortedEmbeds.length > 0) {
    const thread = await channel.threads.create({
      name: `${formattedDate} (${sortedEmbeds.length})`,
      autoArchiveDuration: 10080, // 7 days
    });

    // Send all embeds to the thread in batches
    const chunkSize = 10; // Discord allows 10 embeds per message
    for (let i = 0; i < sortedEmbeds.length; i += chunkSize) {
      await thread.send({ embeds: sortedEmbeds.slice(i, i + chunkSize) });
    }
  }

  // Delete all messages & threads
  let remainingMessages = await channel.messages.fetch({ limit: 100 });
  while (remainingMessages.size > 0) {
    await Promise.all(remainingMessages.map((message) => message.delete()));
    remainingMessages = await channel.messages.fetch({ limit: 100 });
  }

  console.log(
    "Process completed: All embeds moved, and channel fully cleared."
  );
}
