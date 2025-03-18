import { Request, Response } from "express";
import { createVerifiedUser } from "../services/userService";
import { deleteUser } from "../../db/dbCommands";
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
