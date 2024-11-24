import { CommandInteraction } from "discord.js";
import { getFaceitLevel } from "../services/FaceitService";
import { updateNickname } from "../services/DiscordService";
import { FaceitPlayer } from "../types/FaceitPlayer";

export const autorunCommand = {
  name: "ducky_autorun",
  description: 'Start the Faceit nickname setup for "Tester" role members.',
  execute: async (interaction: CommandInteraction) => {
    return;
    await interaction.reply("Starting the Faceit nickname setup process...");

    const members = await interaction.guild?.members.fetch();
    for (const member of members?.values() || []) {
      if (member.user.bot) continue;

      try {
        await member.send("Please provide your Faceit nickname.");
        // Mocked DM response logic for brevity
        const faceitNickname = "mocked_faceit_name";
        const faceitPlayer: FaceitPlayer | null = await getFaceitLevel(
          faceitNickname
        );

        if (faceitPlayer) {
          await updateNickname(member, faceitPlayer);
        } else {
          await member.send("Invalid Faceit nickname.");
        }
      } catch (error) {
        console.error(`Error processing member ${member.user.tag}:`, error);
      }
    }
  },
};
