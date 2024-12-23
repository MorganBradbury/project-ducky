import { GuildMember, TextChannel } from "discord.js";
import { client } from "../bot";

client.on("guildMemberRemove", async (member) => {
  try {
    // Check if the member is a full GuildMember, as it might be a PartialGuildMember
    if (!(member instanceof GuildMember)) {
      console.error("The member is not a full GuildMember.");
      return;
    }

    // Fetch the general channel to send the public message (adjust channel name or ID as needed)
    const generalChannel = member.guild.channels.cache.find(
      (channel) => channel.name === "counter-strike" && channel.isTextBased()
    ) as TextChannel;

    if (!generalChannel) {
      console.error("General channel not found in the guild.");
      return;
    }

    // Message when a user leaves
    await generalChannel.send(`@${member.user.tag} has left the server.`);
  } catch (error) {
    console.error(
      `Error processing guildMemberRemove event for ${member.user.tag}:`,
      error
    );
  }
});
