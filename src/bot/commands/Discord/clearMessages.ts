import {
  ChatInputCommandInteraction,
  Collection,
  Message,
  DiscordAPIError,
  TextChannel,
} from "discord.js";

export const clearMessagesCommand = {
  name: "clearmessages",
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
      const channel = interaction.channel;

      // Ensure the channel is a TextChannel
      if (!channel || !(channel instanceof TextChannel)) {
        await interaction.followUp({
          content: "This command can only be used in text channels.",
          ephemeral: true,
        });
        return;
      }

      let remainingAmount = amount;
      let lastMessageId = undefined;

      while (remainingAmount > 0) {
        // Fetch messages in batches of up to 100
        const messages: any = await channel.messages.fetch({
          limit: Math.min(remainingAmount, 100),
          before: lastMessageId,
        });

        if (messages.size === 0) break;

        // Separate messages into those that can and cannot be bulk deleted
        const bulkDeletable = messages.filter(
          (msg: any) =>
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
        );
        const nonBulkDeletable = messages.filter(
          (msg: any) =>
            Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
        );

        // Bulk delete eligible messages
        if (bulkDeletable.size > 0) {
          await channel.bulkDelete(bulkDeletable, true);
          remainingAmount -= bulkDeletable.size;
        }

        // Delete older messages one by one
        for (const msg of nonBulkDeletable.values()) {
          await msg.delete();
          remainingAmount--;
          if (remainingAmount <= 0) break;
        }

        // Update the lastMessageId for the next batch
        lastMessageId = messages.last()?.id;
      }

      await interaction.followUp({
        content: `${amount - remainingAmount} messages have been deleted.`,
      });
    } catch (error) {
      console.error("Error clearing messages:", error);

      if (error instanceof DiscordAPIError && error.code === 50034) {
        await interaction.followUp({
          content: "Messages older than 14 days cannot be bulk deleted.",
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: "An error occurred while trying to clear messages.",
          ephemeral: true,
        });
      }
    }
  },
};
