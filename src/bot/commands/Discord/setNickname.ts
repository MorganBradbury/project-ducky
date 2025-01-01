import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { removeUnicodeChars } from "../../../utils/nicknameUtils";

export const updateNicknameCommand = {
  name: "update-nickname",
  description: "Updates your nickname while preserving your Faceit Elo",
  options: [
    {
      name: "nickname",
      description: "The new nickname you want to set",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      // Ensure the interaction is in a guild
      if (!interaction.guild) {
        await interaction.reply({
          content: "This command can only be used in a server.",
          ephemeral: true,
        });
        return;
      }

      // Get the user who invoked the command
      const member = interaction.member as GuildMember;
      const currentNickname = member.nickname || member.user.username;

      // Extract the Elo from the last 4 characters of the nickname
      const eloMatch = currentNickname.match(/\d{4}$/);
      const currentElo = eloMatch ? eloMatch[0] : "⁰⁰⁰⁰";

      // Get the new nickname from the command options
      const newNickname = removeUnicodeChars(
        interaction.options.getString("nickname", true)
      );

      // Combine the new nickname with the Unicode Elo
      const updatedNickname = `${newNickname} ${currentElo}`;

      // Set the new nickname
      await member.setNickname(updatedNickname);

      await interaction.reply({
        content: `<@${member.user.id}> has updated their nickname from **${currentNickname}** to **${updatedNickname}**.`,
      });
    } catch (error) {
      console.error("Error updating nickname:", error);

      await interaction.reply({
        content:
          "An error occurred while updating your nickname. Please try again.",
        ephemeral: true,
      });
    }
  },
};
