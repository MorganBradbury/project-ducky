import { User } from "../../types/User";
import mysql from "mysql2/promise";

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Add a new user to the `users` table
export const addUser = async (
  discordUsername: string,
  faceitName: string,
  elo: number
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
      throw new Error(`Cannot edit: User "${discordUsername}" is recordLocked.`);
    }

    // Insert the new user
    const [result] = await connection.query(
      `INSERT INTO users (discordUsername, faceitUsername, previousElo) VALUES (?, ?, ?)`,
      [discordUsername, faceitName, elo]
    );

    // Return the auto-incremented userId
    return (result as any).insertId;
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error(`User "${discordUsername}" already exists.`);
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
