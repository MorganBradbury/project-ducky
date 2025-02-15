import { Request, Response } from "express";
import { processEmbedsToThreads } from "../services/threadService";
import { fetchRetakeServers } from "../services/retakeService";

export const getRetakes = async (
  req: Request,
  res: Response
): Promise<void> => {
  const servers = await fetchRetakeServers("de_mirage");

  res.status(200).json({ message: servers });
};
