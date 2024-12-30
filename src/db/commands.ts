import { config } from "../config";
import { SystemUser } from "../types/SystemUser";
import mysql, { RowDataPacket } from "mysql2/promise";
import { SQL_QUERIES } from "./queries";
import { Match } from "../types/Faceit/Match";

// Create a connection pool
const pool = mysql.createPool({ ...config.MYSQL });

// Helper function for connection handling
const useConnection = async <T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
};

// Add a new user
export const addUser = async (
  discordUsername: string,
  faceitName: string,
  elo: number,
  gamePlayerId: string,
  playerId: string
): Promise<number> => {
  return useConnection(async (connection) => {
    try {
      const [result] = await connection.query(SQL_QUERIES.INSERT_USER, [
        discordUsername,
        faceitName,
        elo,
        gamePlayerId,
        playerId,
      ]);
      return (result as any).insertId;
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new Error(`You are already on the tracker 😅`);
      }
      throw err;
    }
  });
};

// Update user's Elo
export const updateUserElo = async (
  userId: number,
  newElo: number
): Promise<boolean> => {
  return useConnection(async (connection) => {
    const [result] = await connection.query(SQL_QUERIES.UPDATE_USER_ELO, [
      newElo,
      userId,
    ]);
    if ((result as any).affectedRows === 0) {
      throw new Error("No rows updated. Check if the userId exists.");
    }
    return true;
  });
};

// Retrieve all users
export const getAllUsers = async (): Promise<SystemUser[]> => {
  return useConnection(async (connection) => {
    const [rows] = await connection.query(SQL_QUERIES.SELECT_ALL_USERS);
    return rows as SystemUser[];
  });
};

// Delete a user
export const deleteUser = async (discordUsername: string): Promise<boolean> => {
  return useConnection(async (connection) => {
    const [result] = await connection.query(SQL_QUERIES.DELETE_USER, [
      discordUsername,
    ]);
    if ((result as any).affectedRows === 0) {
      throw new Error("User not found.");
    }
    return true;
  });
};

export const insertMatch = async (match: Match): Promise<void> => {
  try {
    // Perform the database insert
    await pool.query(SQL_QUERIES.INSERT_MATCH, [
      match.matchId,
      JSON.stringify(match.trackedTeam.trackedPlayers), // Store gamePlayerIds as JSON string
      match.mapName, // Map selected for the match
      match.trackedTeam.teamId, // Store teamId
      match.trackedTeam.faction,
      match.voiceChannelId,
    ]);
    console.log(`Match ${match.matchId} inserted successfully.`);
  } catch (error) {
    console.error(`Error inserting match ${match.matchId}:`, error);
  }
};

export const markMatchComplete = async (matchId: string): Promise<void> => {
  await pool.query(SQL_QUERIES.DELETE_MATCH, [matchId]);
};

export const checkMatchExists = async (matchId: string): Promise<boolean> => {
  return useConnection(async (connection) => {
    const [rows] = await connection.query<any[]>(
      SQL_QUERIES.CHECK_MATCH_EXISTS, // Use the query from SQL_QUERIES
      [matchId]
    );
    return rows.length > 0; // Returns true if a record is found
  });
};

export const getMatchDataFromDb = async (
  matchId: string
): Promise<Match | null> => {
  return useConnection(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      SQL_QUERIES.SELECT_MATCH_DETAILS, // Use the query from SQL_QUERIES
      [matchId]
    );

    if (rows.length > 0) {
      const match = rows[0];
      //matchId, trackedPlayers, mapName, teamId, faction, voiceChannelId, voiceChannelName, liveScoresChannelId

      const returnedMatch: Match = {
        matchId: match?.matchId,
        mapName: match?.mapName,
        trackedTeam: {
          teamId: match?.teamId,
          faction: match?.faction,
          trackedPlayers: match?.trackedPlayers,
        },
        voiceChannel: {
          id: match?.voiceChannelId,
          name: match?.voiceChannelName,
          liveScoresChannelId: match?.liveScoresChannelId,
        },
      };
      return returnedMatch;
    }

    return null; // Return null if no match is found
  });
};

export const updateLiveScoresChannelIdForMatch = async (
  matchId: string,
  newChannelId: string
): Promise<void> => {
  return useConnection(async (connection) => {
    const [result] = await connection.query<RowDataPacket[]>(
      SQL_QUERIES.UPDATE_ACTIVE_SCORES_CHANNEL_ID,
      [newChannelId, matchId]
    );

    if ((result as any).affectedRows > 0) {
      console.log(
        `Successfully updated activeScoresChannelId for match ${matchId}`
      );
    } else {
      console.log(`No match found with matchId ${matchId}`);
    }
  });
};

// Update the 'processed' column for a match
export const updateMatchProcessed = async (
  matchId: string
): Promise<boolean> => {
  return useConnection(async (connection) => {
    const [result] = await connection.query(
      SQL_QUERIES.UPDATE_MATCH_PROCESSED,
      [true, matchId]
    );
    if ((result as any).affectedRows === 0) {
      throw new Error(`Match ${matchId} not found or already processed.`);
    }
    return true;
  });
};

// Check if a match has already been processed
export const isMatchProcessed = async (matchId: string): Promise<boolean> => {
  return useConnection(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      SQL_QUERIES.CHECK_MATCH_PROCESSED,
      [matchId]
    );
    return rows.length > 0 && rows[0]?.processed === 1; // Returns true if processed
  });
};
