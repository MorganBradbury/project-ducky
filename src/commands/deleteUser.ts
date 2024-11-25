import { ChatInputCommandInteraction } from "discord.js";
import { deleteUser } from "../db/models/userModel";

export const deleteUserCommand = {
  name: "delete_user",
  description: "Delete a user from the tracking list.",
  options: [
    {
      name: "discord_username",
      description:
        "The Discord username of the user to delete (e.g., user#1234).",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const discordUsername = interaction.options.getString(
      "discord_username",
      true
    );

    // Replace this with your Discord user ID
    const OWNER_ID = "460148152796971008";
    console.log("yoyo", interaction.user.id);
    // Check if the command user is the owner
    if (interaction.user.id !== OWNER_ID) {
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
