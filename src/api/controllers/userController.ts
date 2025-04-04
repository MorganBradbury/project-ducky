import { Request, Response } from "express";
import { createVerifiedUser } from "../services/userService";
import { deleteUser, getAllUsers } from "../../db/dbCommands";
import { getPlayerStats } from "../services/userService";

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
    const { userName } = req?.body;
    const userDeleted = await deleteUser(userName);

    if (!userDeleted) {
      res.status(400).json({
        message: "Something went wrong deleting user: " + userName,
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

export const getPlayerStatsLast30 = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userTag } = req.params; // Get userTag from params, not body

    if (!userTag) {
      res.status(400).json({ message: "UserTag parameter is required." });
      return;
    }

    const playerStats = await getPlayerStats(userTag);

    if (!playerStats) {
      res.status(404).json({ message: "Player stats not found." });
      return;
    }

    res.status(200).json({ playerStats });
  } catch (error: any) {
    console.error("Error fetching player stats: ", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

export const transferUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getAllUsers();
    const BATCH_SIZE = 5;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      const promises = batch.map((user) => {
        const newUserObject = {
          discordUsername: user.discordUsername,
          faceitUsername: user.faceitUsername,
          currentElo: user.previousElo,
          gamePlayerId: user.gamePlayerId,
          faceitId: user.faceitId,
          monthlyPosition: user.startOfMonthPosition,
          monthlyGamesTotal: user.gamesPlayedThisMonth,
          monthlyStartingElo: Number(user.startOfMonthElo),
        };

        return fetch(
          "https://duckyusersservice-production.up.railway.app/users",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newUserObject),
          }
        );
      });

      // Wait for the current batch to complete before continuing
      await Promise.all(promises);
    }

    res.status(201).json({ message: "Users transferred in batches of 5" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong transferring users", error });
  }
};
