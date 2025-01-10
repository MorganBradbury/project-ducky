import { GuildMember, TextChannel } from "discord.js";
import client from "../client";

// Role ID to assign upon join
const roleId = "1327306844581924977";
// Channel ID to send the message
const channelId = "1327303978223931462";

client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    // Fetch the role by ID
    const role = await member.guild.roles.fetch(roleId);
    if (!role) {
      console.error("Role not found.");
      return;
    }

    // Assign the role to the new member
    await member.roles.add(role);
    console.log(`Assigned role ${role.name} to new member ${member.user.tag}.`);

    // Fetch the channel to send the message
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.error("Channel not found or not a text-based channel.");
      return;
    }

    // Send a custom message mentioning the user
    const customMessage = `👋 Hi <@${member.user.id}>, welcome to Duckclub. If you wish to gain access to the server, please send a message with your FACEIT name in this channel. It is case sensitive.`;
    await (channel as TextChannel).send(customMessage);
    console.log(`Sent welcome message to channel ${channelId}`);
  } catch (error) {
    console.error(
      `Error processing guildMemberAdd event for ${member.user.tag}:`,
      error
    );
  }
});
