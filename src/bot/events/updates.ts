import { Client, GatewayIntentBits, TextChannel, Message } from "discord.js";
import client from "../client";

const updatesChannelId = "1329771058290753598"; // Updates channel
const generalChannelId = "1309222763994808370"; // General channel
const patchBotId = "1329771120034975765"; // PatchBot user ID
const linkedRoleId = "1327302146814775369"; // Linked role ID

client.on("messageCreate", async (message: Message) => {
  if (
    message.channel.id === updatesChannelId &&
    message.author.id === patchBotId &&
    message.embeds.length > 0
  ) {
    // Check if any embed contains "Counter-Strike 2 Update"
    const containsCs2Update = message.embeds.some(
      (embed) =>
        embed.title?.includes("Counter-Strike 2 Update") ||
        embed.description?.includes("Counter-Strike 2 Update")
    );

    if (containsCs2Update) {
      try {
        const generalChannel = await client.channels.fetch(generalChannelId);
        if (generalChannel && generalChannel.isTextBased()) {
          // Forward the message content and attachments
          const forwardMessage = `🚨 New CS update has been released. See <#${updatesChannelId}> for more information. [ <@&${linkedRoleId}> ]`;

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
