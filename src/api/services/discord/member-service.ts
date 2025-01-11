import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Interaction,
  TextChannel,
} from "discord.js";
import client from "../../../bot/client";
import { config } from "../../../config";
import { updateUserElo } from "../../../db/commands";
import { Player } from "../../../types/Faceit/player";
import { SystemUser } from "../../../types/system-user";
import { updateNickname } from "../../../utils/nicknameUtils";
import { FaceitService } from "../faceit-service";
import { updateServerRoles } from "./role-service";

// Main function to update Elo
export const runEloUpdate = async (users: SystemUser[]) => {
  try {
    if (!users.length) {
      console.log("No users provided for update.");
      return;
    }

    const guild = await client.guilds.fetch(config.GUILD_ID); // Cache the guild object

    await Promise.all(
      users.map(async (user) => {
        const { discordUsername, previousElo, gamePlayerId } = user;

        try {
          const player: Player | null = await FaceitService.getPlayer(
            gamePlayerId
          );

          if (!player || player.faceitElo === previousElo) return; // Skip unchanged users

          const member =
            guild.members.cache.find((m) => m.user.tag === discordUsername) ??
            (await guild.members
              .fetch({ query: discordUsername, limit: 1 })
              .then((m) => m.first()));

          if (!member) return; // Skip if member not found

          await Promise.all([
            updateNickname(member, player),
            updateUserElo(user.userId, player.faceitElo),
            updateServerRoles(member, player),
          ]);
        } catch (error) {
          console.log(`Error processing user ${discordUsername}:`, error);
        }
      })
    );

    console.log("Auto-update completed!");
  } catch (error) {
    console.log("Error running auto-update:", error);
  }
};

export async function sendNewUserNotification(
  userName: string,
  faceitId: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("New user notification")
    .setDescription("Add user to Webhook:")
    .addFields(
      { name: "User", value: userName },
      { name: "FACEIT ID", value: faceitId },
      {
        name: "🔗 Link to Webhook",
        value:
          "[Click here](https://developers.faceit.com/apps/2205acb7-7fb4-4ce4-8a23-871375ee03fa/webhooks/af22807c-f17a-4947-8829-5757ef6a2e34/edit)",
      }
    )
    .setColor("#ff5733");

  const markCompleteButton = new ButtonBuilder()
    .setCustomId("mark_complete")
    .setLabel("Mark as completed")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    markCompleteButton
  );

  const handleButton = async (interaction: Interaction) => {
    if (!interaction.isButton() || interaction.customId !== "mark_complete") {
      return;
    }

    // Only allow the server owner to click the button
    if (interaction.guild?.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Only the server owner can mark this as completed!",
        ephemeral: true,
      });
      return;
    }

    // Update the embed to reflect completion
    const completedEmbed = new EmbedBuilder()
      .setTitle("New user added to Webhook")
      .setDescription(`🚥  **${userName}** (${faceitId})`)
      .setColor("#58b436");

    await interaction.update({
      embeds: [completedEmbed],
      components: [], // Remove the button
    });
  };
  const channel = (await client.channels.fetch(
    "1327588452719530027"
  )) as TextChannel;

  const message = await channel.send({
    embeds: [embed],
    components: [row], // If components (buttons) are passed, they will be included
  });

  const collector = message.createMessageComponentCollector({
    filter: (interaction) => interaction.customId === "mark_complete",
    time: 900000, // 15 minutes
  });

  collector.on("collect", handleButton);

  collector.on("end", async () => {
    try {
      // Re-enable the button if it expires without being clicked
      await message.edit({ embeds: [embed], components: [row] });
      const newCollector = message.createMessageComponentCollector({
        filter: (interaction) => interaction.customId === "mark_complete",
        time: 900000, // 15 minutes
      });
      newCollector.on("collect", handleButton);
      newCollector.on("end", async () => {
        await message.edit({ embeds: [embed], components: [row] });
      });
    } catch (error) {
      console.error("Error updating message after collector ends:", error);
    }
  });
}
