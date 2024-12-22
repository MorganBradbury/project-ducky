import { ChatInputCommandInteraction, GuildMember } from "discord.js"; // Use specific interaction type
import { addUser } from "../../../db/commands";
import { updateNickname } from "../../../utils/nicknameUtils";
import { FaceitService } from "../../../api/services/FaceitService";
import { updateServerRoles } from "../../../api/services/DiscordService";
import { Player } from "../../../types/Faceit/Player";

export const registerTrackingCommand = {
  name: "ducky_track_elo",
  description:
    "Add yourself to the tracker. You only need to do this once. It is case sensitive",
  options: [
    {
      name: "faceit_username",
      description: "Your FACEIT nickname",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const faceitName = interaction.options.getString("faceit_username", true); // Now correctly typed
    const discordUsername = interaction.user.tag;
    try {
      const player: Player | null = await FaceitService?.getPlayer(faceitName);

      if (player) {
        await addUser(
          discordUsername,
          faceitName,
          player.faceitElo,
          player.gamePlayerId,
          player.gamePlayerId
        ).then(async () => {
          //@ts-ignore
          await updateNickname(interaction.member, player);
          await updateServerRoles(interaction.member as GuildMember, player);
          await interaction.reply({
            content:
              "☑️ Your elo will now be tracked and updated automatically.",
            ephemeral: true, // This ensures the message is only visible to the user
          });
          console.log(
            `☑️ Your elo will now be tracked and updated automatically! ${discordUsername} ${faceitName}`
          );
        });
      } else {
        await interaction.reply({
          content: `"Invalid FACEIT nickname. Please make sure you are entering your name correctly. It is CASE SENSITIVE"`,
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error updating FACEIT level:", error);
      await interaction.reply({ content: `Failed. ${error}`, ephemeral: true });
    }
  },
};
