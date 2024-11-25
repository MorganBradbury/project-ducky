import { ChatInputCommandInteraction } from "discord.js"; // Use specific interaction type
import { getFaceitLevel } from "../services/FaceitService";
import { updateNickname } from "../services/DiscordService";
import { addUser } from "../db/models/userModel";

export const registerTrackingCommand = {
  name: "ducky_track_elo",
  description:
    "Update your Faceit level in your nickname. IT IS CASE SENSITIVE",
  options: [
    {
      name: "faceit_username",
      description: "Your Faceit nickname",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const faceitName = interaction.options.getString("faceit_username", true); // Now correctly typed
    const discordUsername = interaction.user.tag;
    try {
      const faceitPlayer = await getFaceitLevel(faceitName);
      if (faceitPlayer) {
        await addUser(discordUsername, faceitName, faceitPlayer.elo).then(
          async () => {
            //@ts-ignore
            await updateNickname(interaction.member, faceitPlayer);
            await interaction.reply({
              content:
                "✅ Your elo will now be tracked and updated automatically.",
              ephemeral: true, // This ensures the message is only visible to the user
            });
            console.log(
              `Your elo will now be tracked and updated automatically! ${discordUsername} ${faceitName}`
            );
          }
        );
      } else {
        await interaction.reply(
          "Invalid Faceit nickname. Please make sure you are entering your name correctly. It is CASE SENSITIVE"
        );
      }
    } catch (error) {
      console.error("Error updating Faceit level:", error);
      await interaction.reply(`Failed. ${error}`);
    }
  },
};
