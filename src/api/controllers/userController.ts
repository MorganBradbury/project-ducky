import { Request, Response } from "express";
import { createVerifiedUser } from "../services/userService";
import { deleteUser, getAllUsers } from "../../db/dbCommands";
import { FaceitService } from "../services/faceitService";
import client from "../../bot/client";
import { config } from "../../config";
import { toUnicodeStr } from "../../utils/nicknameUtils";

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userTag, faceitName } = req?.body;
    const createdUser = await createVerifiedUser(userTag, faceitName);

    if (!createdUser) {
      res.status(400).json({
        message:
          "Something went wrong. Player not found or user creation failed. Please make sure you spell your name correctly (IT IS CASE SENSITIVE)",
      });
    }

    res.status(201).json({ createdUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong creating user", body: req?.body });
  }
};

export const deleteSingleUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req?.body;
    const userDeleted = await deleteUser(username);

    if (!userDeleted) {
      res.status(400).json({
        message: "Something went wrong deleting user: " + username,
      });
    }

    res.status(204).json();
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong deleting user...",
      body: req?.body,
    });
  }
};

export const updateNicknameForAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getAllUsers();
    const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID);

    if (!guild) {
      res.status(404).json({ message: "Guild not found." });
      return;
    }

    for (const user of users) {
      try {
        // Fetch updated Faceit username
        const playerData = await FaceitService.getPlayer(user.gamePlayerId);
        if (!playerData) {
          console.log(`No Faceit data found for ${user.discordUsername}`);
          continue;
        }

        // Fetch the Discord member
        const member = await guild.members.fetch({
          query: user.discordUsername,
          limit: 1,
        });
        const discordUser = member.first();
        if (!discordUser) {
          console.log(`Discord user not found: ${user.discordUsername}`);
          continue;
        }

        const eloTag = toUnicodeStr(`${playerData.faceitElo}`);

        console.log(
          `Update nickname from ${discordUser.nickname} to ${playerData.faceitName} ${eloTag}`
        );
        // Update nickname if different
        //await discordUser.setNickname(playerData.faceitName);
        //   console.log(`Updated nickname: ${user.discordUsername} -> ${playerData.faceitName}`);
      } catch (error) {
        console.error(`Error updating ${user.discordUsername}:`, error);
      }
    }

    res.status(200).json({ message: "Nicknames updated successfully." });
  } catch (error) {
    console.error("Error updating nicknames:", error);
    res.status(500).json({
      message: "Something went wrong updating nicknames.",
      body: req?.body,
    });
  }
};
