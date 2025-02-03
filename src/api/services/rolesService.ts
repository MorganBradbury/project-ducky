import { GuildMember, Role } from "discord.js";
import client from "../../bot/client";
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

    const guild = await client.guilds.fetch(config.GUILD_ID); // Cache the guild object
    const skillLevelRoleName = `Level ${player.skillLevel}`;

    // Fetch all roles in the guild
    const roles = await guild.roles.fetch();

    // Find the role that matches the current skill level
    const targetRole = roles.find((role) => role.name === skillLevelRoleName);

    if (!targetRole) {
      console.warn(`Role ${skillLevelRoleName} not found in the guild.`);
      return;
    }

    // Remove all roles containing "Level" from the member
    const levelRoles = member.roles.cache.filter((role: Role) =>
      role.name.includes("Level")
    );

    await Promise.all(
      levelRoles.map((role: Role) =>
        member.roles.remove(role).catch(console.error)
      )
    );

    await member.roles.add(targetRole);
    console.log(
      `Assigned role ${skillLevelRoleName} to member ${member.user.tag}.`
    );
  } catch (error) {
    console.error("Error updating server roles:", error);
  }
};

export const updateLinkedRole = async (
  member: GuildMember,
  removeRoleId: string, // Role to remove
  addRoleId: string // Role to add
) => {
  try {
    if (!member) {
      console.error("Member data is missing.");
      return;
    }

    // Get the guild
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found.");
      return;
    }

    // Fetch the roles by their IDs
    const removeRole = await guild.roles.fetch(removeRoleId);
    const addRole = await guild.roles.fetch(addRoleId);

    if (!removeRole || !addRole) {
      console.error("One or both roles not found.");
      return;
    }

    // Remove the role if the member has it
    if (member.roles.cache.has(removeRole.id)) {
      await member.roles.remove(removeRole);
      console.log(
        `Removed role ${removeRole.name} from member ${member.user.tag}.`
      );
    }

    // Add the new role
    if (!member.roles.cache.has(addRole.id)) {
      await member.roles.add(addRole);
      console.log(
        `Assigned role ${addRole.name} to member ${member.user.tag}.`
      );
    }
  } catch (error) {
    console.error("Error updating roles:", error);
  }
};
