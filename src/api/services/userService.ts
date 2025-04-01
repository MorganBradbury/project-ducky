import client from "../client";
import { config } from "../../config";
import {
  addUser,
  deleteUser,
  getAllUsers,
  updateTotalGamesPlayedThisMonth,
  updateUserElo,
} from "../../db/dbCommands";
import { Player } from "../../types/Faceit/player";
import { SystemUser } from "../../types/systemUser";
import { updateNickname } from "../../utils/nicknameUtils";
import { updateLeaderboardEmbed } from "./embedService";
import { FaceitService } from "./faceitService";
import { updateServerRoles } from "./rolesService";
import { TextChannel } from "discord.js";

export const runEloUpdate = async (users: SystemUser[]) => {
  try {
    if (!users.length) {
      console.log("No users provided for update.");
      return;
    }

    const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID); // Cache the guild object

    await Promise.all(
      users.map(async (user) => {
        const {
          discordUsername,
          previousElo,
          gamePlayerId,
          gamesPlayedThisMonth,
        } = user;

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

          const gamesPlayedThisMonthTotal = gamesPlayedThisMonth
            ? gamesPlayedThisMonth + 1
            : 0;
          await Promise.all([
            updateNickname(member, player),
            updateUserElo(user.userId, player.faceitElo),
            updateTotalGamesPlayedThisMonth(
              user.userId,
              gamesPlayedThisMonthTotal
            ),
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

export const createVerifiedUser = async (
  userTag: string,
  faceitName: string
): Promise<{
  faceitElo: string;
  skillLevel: string;
  faceitId: string;
} | null> => {
  const player = await FaceitService?.getPlayer(faceitName);
  if (!player) return null;

  await deleteUser(userTag).catch(() =>
    console.log(`No existing user: ${userTag}`)
  );

  await addUser(
    userTag,
    player.faceitName,
    player.faceitElo,
    player.gamePlayerId,
    player.id
  );

  updateLeaderboardEmbed();

  return {
    faceitElo: player.faceitElo.toString(),
    skillLevel: player.skillLevel.toString(),
    faceitId: player.id,
  };
};

export const getPlayerStats = async (userTag: string): Promise<any> => {
  const allUsers = await getAllUsers();

  const singleUser = allUsers.find((user) => user.discordUsername === userTag);

  const player = await FaceitService?.getPlayer(singleUser?.gamePlayerId || "");

  if (!player) return null;

  const playerStats = await FaceitService.getPlayerStatsLast20Games(
    singleUser?.faceitId || ""
  );

  const resp = {
    ...player,
    ...playerStats,
  };

  return resp;
};
