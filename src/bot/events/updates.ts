import { Client, GatewayIntentBits, TextChannel, Message } from "discord.js";
import client from "../client";

const updatesChannelId = "1329771058290753598"; // Updates channel
const generalChannelId = "1309222763994808370"; // General channel
const patchBotId = "1329771120034975765"; // PatchBot user ID
const linkedRoleId = "1327302146814775369"; // Linked role ID

client.on("messageCreate", async (message: Message) => {
  if (
    message.channel.id === updatesChannelId &&
    message.author.id === patchBotId
  ) {
    try {
      const generalChannel = await client.channels.fetch(generalChannelId);
      if (generalChannel && generalChannel.isTextBased()) {
        const content = message.content;
        const attachments = message.attachments.map((att) => att.url);

        // Forward the message content and attachments
        let forwardMessage = `🚨 New CS update has been released. See <#${updatesChannelId}> for more information. <@&${linkedRoleId}>`;
        if (content) forwardMessage += `\n\n${content}`;
        if (attachments.length)
          forwardMessage += `\n\nAttachments:\n${attachments.join("\n")}`;

        await (generalChannel as TextChannel).send(forwardMessage);
        console.log("Message forwarded successfully.");
      } else {
        console.error("General channel not found or not a text-based channel.");
      }
    } catch (error) {
      console.error("Error forwarding message:", error);
    }
  }
});
