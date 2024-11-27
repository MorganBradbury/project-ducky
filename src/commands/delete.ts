import { ChatInputCommandInteraction } from "discord.js";
import { deleteUser } from "../db/commands";
import { config } from "../config";

export const deleteUserCommand = {
  name: "delete_user",
  description: "[ADMIN ONLY] Delete a user from the tracking list.",
  options: [
    {
      name: "discord_username",
      description:
        "This is only available to the Server owner. The Discord username of the user to delete",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const discordUsername = interaction.options.getString(
      "discord_username",
      true
    );

    // Check if the command user is the owner
    if (interaction.user.id !== config.SERVER_OWNER_ID) {
      await interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true, // This ensures the message is only visible to the user
      });
      return;
    }

    try {
      await deleteUser(discordUsername);
      await interaction.reply(
        `✅ User \`${discordUsername}\` has been deleted.`
      );
    } catch (error) {
      console.error("Error deleting user:", error);
      await interaction.reply(`❌ Failed to delete user: ${error}`);
    }
  },
};
