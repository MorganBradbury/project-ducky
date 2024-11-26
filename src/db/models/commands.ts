import { dbConfig } from "../../config";
import { User } from "../../types/User";
import mysql from "mysql2/promise";
import fs from "fs"; // File system module to read the JSON file

// Create a connection pool
const pool = mysql.createPool({ ...dbConfig });

// Add a new user to the `users` table
export const addUser = async (
  discordUsername: string,
  faceitName: string,
  elo: number,
  gamePlayerId: string
): Promise<number> => {
  const connection = await pool.getConnection();
  try {
    // Check if the user is recordLocked
    const [rows] = await connection.query(
      `SELECT recordLocked FROM users WHERE discordUsername = ?`,
      [discordUsername]
    );

    const users = rows as { recordLocked: boolean }[]; // Explicitly cast `rows` to the expected array of objects

    if (users.length > 0 && users[0].recordLocked) {
      throw new Error(
        `Cannot edit: User "${discordUsername}" is recordLocked.`
      );
    }

    // Insert the new user
    const [result] = await connection.query(
      `INSERT INTO users (discordUsername, faceitUsername, previousElo, gamePlayerId) VALUES (?, ?, ?, ?)`,
      [discordUsername, faceitName, elo, gamePlayerId]
    );

    // Return the auto-incremented userId
    return (result as any).insertId;
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error(`You are already on the tracker 😅`);
    }
    throw err;
  } finally {
    connection.release();
  }
};

// Update the Elo of a user
export const updateUserElo = async (
  userId: number,
  newElo: number
): Promise<boolean> => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `UPDATE users SET previousElo = ? WHERE userId = ?`,
      [newElo, userId]
    );

    if ((result as any).affectedRows === 0) {
      throw new Error("No rows updated. Check if the userId exists.");
    }

    return true;
  } finally {
    connection.release();
  }
};

// Retrieve all users from the `users` table
export const getAllUsers = async (): Promise<User[]> => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`SELECT * FROM users`);
    return rows as User[];
  } finally {
    connection.release();
  }
};

// Delete a user from the `users` table
export const deleteUser = async (discordUsername: string): Promise<boolean> => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `DELETE FROM users WHERE discordUsername = ?`,
      [discordUsername]
    );

    if ((result as any).affectedRows === 0) {
      throw new Error("User not found.");
    }

    return true;
  } finally {
    connection.release();
  }
};

// Update the Faceit game player ID for a user
export const updateUserFaceitId = async (
  userId: number,
  gamePlayerId: string
): Promise<boolean> => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `UPDATE users SET gamePlayerId = ? WHERE userId = ?`,
      [gamePlayerId, userId]
    );

    if ((result as any).affectedRows === 0) {
      throw new Error("No rows updated. Check if the userId exists.");
    }

    return true;
  } finally {
    connection.release();
  }
};
