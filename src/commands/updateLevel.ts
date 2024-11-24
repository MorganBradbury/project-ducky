import { ChatInputCommandInteraction } from "discord.js"; // Use specific interaction type
import { getFaceitLevel } from "../services/FaceitService";
import { updateNickname } from "../services/DiscordService";

export const updateLevelCommand = {
  name: "ducky_update_level",
  description: "Update your Faceit level in your nickname.",
  options: [
    {
      name: "faceit_name",
      description: "Your Faceit nickname",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const faceitName = interaction.options.getString("faceit_name", true); // Now correctly typed

    try {
      const faceitPlayer = await getFaceitLevel(faceitName);
      if (faceitPlayer) {
        //@ts-ignore
        await updateNickname(interaction.member, faceitPlayer);
        await interaction.reply("Your nickname has been updated!");
      } else {
        await interaction.reply("Invalid Faceit nickname.");
      }
    } catch (error) {
      console.error("Error updating Faceit level:", error);
      await interaction.reply("Failed to update your Faceit level.");
    }
  },
};
