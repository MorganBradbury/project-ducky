import {
  ChatInputCommandInteraction,
  Collection,
  Message,
  DiscordAPIError,
} from "discord.js";

export const clearMessagesCommand = {
  name: "clearmessages",
  description:
    "Clears all messages containing a specified word in the channel.",
  options: [
    {
      name: "word",
      description: "The word to search for in messages.",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    // Check if the user is the server owner
    const isServerOwner = interaction.guild?.ownerId === interaction.user.id;

    if (!isServerOwner) {
      await interaction.reply({
        content: "You must be the server owner to run this command.",
        ephemeral: true,
      });
      return;
    }

    const wordToSearch = interaction.options.getString("word");

    if (!wordToSearch) {
      await interaction.reply({
        content: "Please provide a word to search for.",
        ephemeral: true,
      });
      return;
    }

    // Defer the reply to avoid 'InteractionAlreadyReplied' error
    await interaction.deferReply({ ephemeral: true });

    try {
      let messagesToDelete: Message[] = [];
      let lastMessageId: string | undefined = undefined;
      let fetchMore = true;

      while (fetchMore) {
        const messages: Collection<string, Message> =
          (await interaction.channel?.messages.fetch({
            limit: 100,
            before: lastMessageId,
          })) || new Collection(); // Default to empty collection if null

        if (messages.size === 0) {
          fetchMore = false;
          break;
        }

        // Filter messages containing the specified word (case-insensitive)
        const matchingMessages = Array.from(
          messages
            .filter((msg: Message) =>
              msg.content.toLowerCase().includes(wordToSearch.toLowerCase())
            )
            .values()
        );

        messagesToDelete.push(...matchingMessages);

        lastMessageId = messages.last()?.id;
      }

      if (messagesToDelete.length === 0) {
        await interaction.followUp({
          content: `No messages found containing the word "${wordToSearch}".`,
          ephemeral: true,
        });
        return;
      }

      // Delete messages and handle errors for messages that may no longer exist
      await Promise.all(
        messagesToDelete.map(async (msg: Message) => {
          try {
            await msg.delete();
          } catch (error) {
            // Check if the error is a DiscordAPIError
            if (error instanceof DiscordAPIError) {
              // If the message is unknown or already deleted, log the error but continue
              if (error.code === 10008) {
                console.log(`Message with ID ${msg.id} no longer exists.`);
              } else if (error.code === 429) {
                // Handle rate limiting by extracting retryAfter from the headers directly
                //@ts-ignore
                const retryAfter = error.headers?.get("retry-after"); // Time in milliseconds
                if (retryAfter) {
                  console.log(
                    `Rate limited. Please retry after ${retryAfter}ms`
                  );
                  await interaction.followUp({
                    content: `Rate limit exceeded. Please try again in ${Math.ceil(
                      Number(retryAfter) / 1000
                    )} seconds.`,
                    ephemeral: true,
                  });
                }
                return;
              } else {
                console.error(
                  `Error deleting message with ID ${msg.id}:`,
                  error
                );
              }
            } else {
              // For other errors, log them
              console.error("Error deleting message:", error);
            }
          }
        })
      );

      await interaction.followUp({
        content: `${messagesToDelete.length} messages containing the word "${wordToSearch}" have been deleted.`,
      });
    } catch (error) {
      console.error("Error clearing messages:", error);
      await interaction.followUp({
        content: "An error occurred while trying to clear messages.",
        ephemeral: true,
      });
    }
  },
};
