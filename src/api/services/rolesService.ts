import { GuildMember, Role } from "discord.js";
import client from "../client";
import { config } from "../../config";
import { Player } from "../../types/Faceit/player";

export const updateServerRoles = async (
  member: GuildMember,
  player: Player
) => {
  try {
    if (!member || !player) {
      console.error("Member or player data is missing.");
      return;
    }

    const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID); // Cache the guild object
    const skillLevelRoleName = `Level ${player.skillLevel}`;

    // Fetch all roles in the guild
    const roles = await guild.roles.fetch();

    // Find the role that matches the current skill level
    const targetRole = roles.find((role) => role.name === skillLevelRoleName);

    if (!targetRole) {
      console.warn(`Role ${skillLevelRoleName} not found in the guild.`);
      return;
    }

    // Remove all "Level" roles except the correct one
    const levelRoles = member.roles.cache.filter(
      (role: Role) => role.name.includes("Level") && role.id !== targetRole.id
    );

    await Promise.all(
      levelRoles.map((role: Role) =>
        member.roles.remove(role).catch(console.error)
      )
    );

    // Add the correct role
    await member.roles.add(targetRole);
    console.log(
      `Updated role to ${skillLevelRoleName} for member ${member.user.tag}.`
    );
  } catch (error) {
    console.error("Error updating server roles:", error);
  }
};
