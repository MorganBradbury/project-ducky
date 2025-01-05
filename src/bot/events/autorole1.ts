import { GuildMember, TextChannel } from "discord.js";
import client from "../client";

client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    // Replace with your role ID
    const roleId = "1309629025177698305";

    // Fetch the role by ID
    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
      console.error(
        `Role with ID "${roleId}" not found in guild "${member.guild.name}".`
      );
      return;
    }

    // Assign the role
    await member.roles.add(role);
    console.log(`Assigned role "${role.name}" to ${member.user.tag}.`);

    // Fetch the general channel to send the public message (adjust channel name or ID as needed)
    const generalChannel = member.guild.channels.cache.find(
      (channel) => channel.name === "counter-strike" && channel.isTextBased()
    ) as TextChannel;

    if (!generalChannel) {
      console.error("General channel not found in the guild.");
      return;
    }

    console.log(`User ID: ${member.user.id}`);
    // Public welcome message
    const totalUsers = member.guild.memberCount;

    await generalChannel.send(
      `Welcome, <@${member.user.id}> 👋 You are duck #${totalUsers}.`
    );

    // Private welcome message with tagging the user
    await member.send(
      `Hello <@${member.user.id}>! I'm Duckybot 👋\n\n` +
        `To track your elo in your username, type **/track [FACEIT NAME]** in the Counter-Strike chat in Duckclub. Remember, it's **CASE SENSITIVE**, so please enter it exactly.\n\n` +
        `For other commands like /leaderboard, type **/help** to get a list of available commands.\n\n` +
        `If you need any assistance, feel free to reach out to a VIP! 🙂`
    );
  } catch (error) {
    console.error(
      `Error processing guildMemberAdd event for ${member.user.tag}:`,
      error
    );
  }
});
