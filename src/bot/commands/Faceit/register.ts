import { ChatInputCommandInteraction, GuildMember } from "discord.js"; // Use specific interaction type
import { addUser } from "../../../db/commands";
import { updateNickname } from "../../../utils/nicknameUtils";
import { FaceitService } from "../../../api/services/faceit-service";
import { updateServerRoles } from "../../../api/services/discord-service";
import { Player } from "../../../types/Faceit/player";

export const registerTrackingCommand = {
  name: "track",
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
          player.faceitName,
          player.faceitElo,
          player.gamePlayerId,
          player.id
        ).then(async () => {
          //@ts-ignore
          await updateNickname(interaction.member, player);
          await updateServerRoles(interaction.member as GuildMember, player);
          await interaction.reply({
            content:
              "👋 Hey, thanks. I've now added you to the tracker. Your elo will be updated automatically.",
            ephemeral: true, // This ensures the message is only visible to the user
          });
          console.log(
            `User added to tracker: ${discordUsername} ${faceitName}`
          );
          return;
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
