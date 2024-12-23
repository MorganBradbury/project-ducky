import {
  ChatInputCommandInteraction,
  Collection,
  Message,
  DiscordAPIError,
} from "discord.js";

export const clearMessagesCommand = {
  name: "clear",
  description: "Clears the last X messages in the channel.",
  options: [
    {
      name: "amount",
      description: "The number of messages to delete (max 100).",
      type: 4, // INTEGER type
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

    const amount = interaction.options.getInteger("amount");

    if (!amount || amount < 1 || amount > 100) {
      await interaction.reply({
        content: "Please provide a valid number of messages to delete (1-100).",
        ephemeral: true,
      });
      return;
    }

    // Defer the reply to avoid 'InteractionAlreadyReplied' error
    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch the specified number of messages
      const messages: Collection<string, Message> =
        (await interaction.channel?.messages.fetch({
          limit: amount,
        })) || new Collection();

      if (messages.size === 0) {
        await interaction.followUp({
          content: "No messages found to delete.",
          ephemeral: true,
        });
        return;
      }

      // Delete messages and handle potential errors
      await Promise.all(
        messages.map(async (msg: Message) => {
          try {
            await msg.delete();
          } catch (error) {
            if (error instanceof DiscordAPIError) {
              if (error.code === 10008) {
                console.log(`Message with ID ${msg.id} no longer exists.`);
              } else {
                console.error(
                  `Error deleting message with ID ${msg.id}:`,
                  error
                );
              }
            } else {
              console.error("Error deleting message:", error);
            }
          }
        })
      );

      await interaction.followUp({
        content: `${messages.size} messages have been deleted.`,
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
