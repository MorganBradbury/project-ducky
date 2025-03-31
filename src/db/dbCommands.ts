import { SystemUser } from "../types/systemUser";
import { Match } from "../types/Faceit/match";
import prisma from "../prismaClient";
import Redis from "ioredis";
import { config } from "../config";

const redis = new Redis(config.REDIS_MATCH_MESSAGING_QUEUE);
// Add a new user
export const addUser = async (
  discordUsername: string,
  faceitName: string,
  elo: number,
  gamePlayerId: string,
  playerId: string
): Promise<number> => {
  try {
    const user = await prisma.users.create({
      data: {
        discordUsername,
        faceitUsername: faceitName,
        previousElo: elo,
        gamePlayerId,
        faceitId: playerId,
        startOfMonthElo: elo.toString(),
        startOfMonthPosition: 0,
      },
    });
    return user.userId;
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new Error(`You are already on the tracker 😅`);
    }
    throw err;
  }
};

// Update user's Elo
export const updateUserElo = async (
  userId: number,
  newElo: number
): Promise<boolean> => {
  const result = await prisma.users.update({
    where: { userId },
    data: { previousElo: newElo },
  });
  return result !== null;
};

// Retrieve all users
export const getAllUsers = async (): Promise<SystemUser[]> => {
  return await prisma.users.findMany();
};

// Delete a user
export const deleteUser = async (discordUsername: string): Promise<boolean> => {
  const result = await prisma.users.delete({
    where: { discordUsername },
  });
  return result !== null;
};

// Insert a match
export const insertMatch = async (match: Match): Promise<void> => {
  try {
    await prisma.matches.create({
      data: {
        matchId: match.matchId,
        trackedPlayers: JSON.stringify(match.trackedTeam.trackedPlayers),
        mapName: match.mapName,
        teamId: match.trackedTeam.teamId,
        faction: match.trackedTeam.faction,
        voiceChannelId: match.voiceChannelId,
        matchQueue: match.matchQueue.toUpperCase(),
      },
    });
    console.log(`Match ${match.matchId} inserted successfully.`);
    await redis.publish("MATCHES:NEW", JSON.stringify(match.matchId));
  } catch (error) {
    console.error(`Error inserting match ${match.matchId}:`, error);
  }
};

// Mark match as complete
export const markMatchComplete = async (matchId: string): Promise<void> => {
  await prisma.matches.delete({
    where: { matchId },
  });
};

// Check if match exists
export const checkMatchExists = async (matchId: string): Promise<boolean> => {
  const match = await prisma.matches.findUnique({
    where: { matchId },
  });
  return match !== null;
};

// Get match data from database
export const getMatchDataFromDb = async (
  matchId: string
): Promise<Match | null> => {
  const match = await prisma.matches.findUnique({
    where: { matchId },
  });

  if (match) {
    const trackedPlayers: SystemUser[] = match.trackedPlayers
      ? JSON.parse(match.trackedPlayers as string)
      : [];
    return {
      matchId: match.matchId,
      mapName: match.mapName,
      trackedTeam: {
        teamId: match.teamId,
        faction: match.faction,
        // Parse trackedPlayers correctly here
        trackedPlayers, // Ensure it's treated as a string for parsing
      },
      voiceChannelId: match.voiceChannelId || "",
      matchQueue: match.matchQueue || "",
    };
  }
  return null;
};

// Update live scores channel for a match
export const updateLiveScoresChannelIdForMatch = async (
  matchId: string,
  newChannelId: string
): Promise<void> => {
  const result = await prisma.matches.update({
    where: { matchId },
    data: { liveScoresChannelId: newChannelId },
  });

  if (result) {
    console.log(
      `Successfully updated liveScoresChannelId for match ${matchId}`
    );
  } else {
    console.log(`No match found with matchId ${matchId}`);
  }
};

// Update the 'processed' column for a match
export const updateMatchProcessed = async (
  matchId: string
): Promise<boolean> => {
  const result = await prisma.matches.update({
    where: { matchId },
    data: { processed: true },
  });
  return result !== null;
};

// Check if a match has already been processed
export const isMatchProcessed = async (matchId: string): Promise<boolean> => {
  const match = await prisma.matches.findUnique({
    where: { matchId },
    select: { processed: true },
  });
  return match?.processed === true;
};

// Update player's Elo and start position
export const updatePlayerEloAndPosition = async (
  userId: number,
  startOfMonthElo: string,
  startOfMonthPosition: number
): Promise<boolean> => {
  const result = await prisma.users.update({
    where: { userId },
    data: {
      startOfMonthElo,
      startOfMonthPosition,
    },
  });
  return result !== null;
};

export const getMatchCount = async (): Promise<number> => {
  return await prisma.matches.count();
};
