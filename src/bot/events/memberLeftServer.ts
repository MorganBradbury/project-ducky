import { TextChannel } from "discord.js";
import client from "../client";
import { deleteUser } from "../../db/dbCommands";

const GENERAL_CHANNEL_ID = "1309222763994808370";

client.on("guildMemberRemove", async (member) => {
  try {
    // Delay the deletion of the user from the database
    await deleteUser(member.user.username);

    // Fetch the general channel directly by ID
    const generalChannel = member.guild.channels.cache.get(
      GENERAL_CHANNEL_ID
    ) as TextChannel;

    // Send a farewell message to the channel
    await generalChannel.send(
      `👋 Goodbye, <@${member.user.id}>. You will be missed.`
    );
  } catch (error) {
    console.error(
      `Error processing guildMemberRemove event for ${member.user.tag}:`,
      error
    );
  }
});
