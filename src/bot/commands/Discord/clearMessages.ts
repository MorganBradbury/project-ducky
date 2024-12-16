import { ChatInputCommandInteraction, Collection, Message } from "discord.js";

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

      await Promise.all(
        messagesToDelete.map(async (msg: Message) => {
          await msg.delete();
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
