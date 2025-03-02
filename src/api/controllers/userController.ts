import { Request, Response } from "express";
import { createVerifiedUser } from "../services/userService";
import { deleteUser } from "../../db/dbCommands";

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
    res
      .status(500)
      .json({
        message: "Something went wrong deleting user...",
        body: req?.body,
      });
  }
};
