import { GuildMember } from "discord.js";
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
  } catch (error) {
    console.error(`Error assigning role to ${member.user.tag}:`, error);
  }
});
