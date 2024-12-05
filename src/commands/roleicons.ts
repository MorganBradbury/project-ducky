import { ChatInputCommandInteraction } from "discord.js"; // Use specific interaction type

export const setRoleIconCommand = {
  name: "set_role_icon",
  description:
    "Set a custom emoji as a role icon for users with a specific role.",
  options: [
    {
      name: "role",
      description: "The role to target.",
      type: 8, // ROLE type
      required: true,
    },
    {
      name: "emoji",
      description: "The custom emoji to prepend to users' nicknames.",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const role = interaction.options.getRole("role", true);
    const emoji = interaction.options.getString("emoji", true);

    // Validate the emoji
    // const emojiRegex = /<a?:\w+:\d+>/;
    // if (!emojiRegex.test(emoji)) {
    //   await interaction.reply({
    //     content: "Please provide a valid custom emoji uploaded to this server.",
    //     ephemeral: true,
    //   });
    //   return;
    // }

    // Ensure the bot can manage nicknames
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const membersWithRole = guild.members.cache.filter((member) =>
      member.roles.cache.has(role.id)
    );

    if (membersWithRole.size === 0) {
      await interaction.reply({
        content: `No members found with the role "${role.name}".`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(
      `Updating nicknames for ${membersWithRole.size} members with the role "${role.name}". This may take some time...`
    );
    try {
      for (const member of membersWithRole.values()) {
        const newNickname = `${emoji} ${member.displayName}`;
        console.log(`new nickname: ${newNickname}`);

        await member.setNickname(newNickname).catch((err) => {
          console.error(
            `Failed to update nickname for ${member.user.tag}:`,
            err
          );
        });
      }

      await interaction.followUp(
        `Nicknames updated successfully for all users with the "${role.name}" role.`
      );
    } catch (error) {
      console.error("Error updating nicknames:", error);
      await interaction.followUp({
        content:
          "An error occurred while updating nicknames. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
