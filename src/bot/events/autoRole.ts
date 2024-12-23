import { GuildMember, TextChannel } from "discord.js";
import { client } from "../bot";

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

    // Public welcome message
    const totalUsers = member.guild.memberCount;
    await generalChannel.send(
      `Welcome, <@${member.user.id}>. You are duck #${totalUsers}.`
    );

    // Private welcome message with tagging the user
    await member.send(
      `Welcome <@${member.user.id}>, I'm Duckybot. \n\n To ensure your elo is tracked in your username, please type **/ducky_track_elo [FACEIT NAME]** into the counter-strike chat in Duckclub. Please ensure you put it correctly. It is **CASE SENSITIVE**.\n\n` +
        `If you need to use any other commands such as /leaderboard, please type /help and you will receive a summary of all commands available.\n\n` +
        `If you need anything, please contact a VIP 🙂`
    );
  } catch (error) {
    console.error(
      `Error processing guildMemberAdd event for ${member.user.tag}:`,
      error
    );
  }
});
