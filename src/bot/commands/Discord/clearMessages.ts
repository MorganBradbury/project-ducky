import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

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
    const wordToSearch = interaction.options.getString("word");

    if (!wordToSearch) {
      await interaction.reply({
        content: "Please provide a word to search for.",
      });
      return;
    }

    // Send a loading message as an ephemeral message
    const loadingMessage = await interaction.reply({
      content: "Processing your request... Please wait.",
    });

    try {
      let messagesToDelete = [];
      let lastMessageId: string | undefined = undefined;
      let fetchMore = true;

      // Loop through the history in chunks of 100 messages
      while (fetchMore) {
        const messages: any = await interaction.channel?.messages.fetch({
          limit: 100,
          before: lastMessageId,
        });

        if (messages?.size === 0) {
          fetchMore = false;
          break;
        }

        // Filter messages containing the specified word (case-insensitive)
        const matchingMessages = messages.filter((msg: any) =>
          msg.content.toLowerCase().includes(wordToSearch.toLowerCase())
        );

        messagesToDelete.push(...matchingMessages.array());

        // Update the ID of the last message to fetch the next set
        lastMessageId = messages.last()?.id;
      }

      // If no messages are found
      if (messagesToDelete.length === 0) {
        await interaction.reply({
          content: `No messages found containing the word "${wordToSearch}".`,
        });
        return;
      }

      // Delete each matching message
      await Promise.all(
        messagesToDelete.map(async (msg) => {
          await msg.delete();
        })
      );

      // Reply with the number of deleted messages
      await interaction.followUp({
        content: `${messagesToDelete.length} messages containing the word "${wordToSearch}" have been deleted.`,
      });

      // Optionally delete the loading message after completion
      setTimeout(() => {
        loadingMessage.delete();
      }, 5000); // Delete after 5 seconds or adjust as necessary
    } catch (error) {
      console.error("Error clearing messages:", error);
      await interaction.reply({
        content: "An error occurred while trying to clear messages.",
        ephemeral: true,
      });

      // Optionally delete the loading message in case of error
      setTimeout(() => {
        loadingMessage.delete();
      }, 5000); // Delete after 5 seconds
    }
  },
};
