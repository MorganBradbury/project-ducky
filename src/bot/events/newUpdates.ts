import { TextChannel, Message } from "discord.js";
import client from "../client";
import { config } from "../../config";

client.on("messageCreate", async (message: Message) => {
  if (
    message.channel.id === config.CHANNEL_UPDATES &&
    message.author.id === config.BOT_ID_PATCHBOT &&
    message.embeds.length > 0
  ) {
    // Check if any embed contains "This update is brought to you by"
    const isSponsored = message.embeds.some(
      (embed) =>
        embed.title?.includes("This update is brought to you by") ||
        embed.description?.includes("This update is brought to you by")
    );

    if (isSponsored) {
      try {
        await message.delete();
        console.log("Deleted a sponsored update message.");
      } catch (error) {
        console.error("Error deleting sponsored message:", error);
      }
      return; // Stop further processing for sponsored messages
    }

    // Check if any embed contains "Counter-Strike 2 Update"
    const containsCs2Update = message.embeds.some(
      (embed) =>
        embed.title?.includes("Counter-Strike 2 Update") ||
        embed.description?.includes("Counter-Strike 2 Update")
    );

    if (containsCs2Update) {
      try {
        const generalChannel = await client.channels.fetch(
          config.CHANNEL_GENERAL
        );
        if (generalChannel && generalChannel.isTextBased()) {
          // Forward the message content and attachments
          const forwardMessage = `🚨 New Counter Strike update has been released. See <#${config.CHANNEL_UPDATES}> for more information.`;

          await (generalChannel as TextChannel).send(forwardMessage);
        } else {
          console.error(
            "General channel not found or not a text-based channel."
          );
        }
      } catch (error) {
        console.error("Error forwarding message:", error);
      }
    }
  }
});
