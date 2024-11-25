import { dbConfig } from "../../config";
import { User } from "../../types/User";
import mysql from "mysql2/promise";
import fs from "fs"; // File system module to read the JSON file

// Create a connection pool
const pool = mysql.createPool({...dbConfig});

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
  // Example of calling the function with the path to your JSON file
const filePath = "./src/auto/users.json"; // Adjust the path to your JSON file
addUsersFromJson(filePath);
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

// Function to read a JSON file and add users to the DB
export const addUsersFromJson = async (filePath: string) => {
  try {
    // Read the JSON file and parse it into a JavaScript array
    const rawData = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(rawData);

    // Loop through each user in the parsed JSON array and add to the database
    for (const user of users) {
      const { discordUsername, faceitUsername, previousElo } = user;

      // Ensure the required fields are present
      if (
        !discordUsername ||
        !faceitUsername ||
        typeof previousElo !== "number"
      ) {
        console.log(`Skipping invalid user data: ${JSON.stringify(user)}`);
        continue;
      }

      try {
        // Call your addUser function to add the user to the database
        await addUser(discordUsername, faceitUsername, previousElo);
        console.log(`Added ${discordUsername} to the database.`);
      } catch (dbError) {
        console.error(
          `Failed to add ${discordUsername} to the database:`,
          dbError
        );
      }
    }
  } catch (error) {
    console.error("Error reading or parsing the JSON file:", error);
  }
};

// Reset (drop and recreate) the `users` table
// export const resetUsersTable = async (): Promise<void> => {
//   const connection = await pool.getConnection();
//   try {
//     // Drop the table if it exists
//     await connection.query(`DROP TABLE IF EXISTS users`);

//     // Recreate the table
//     await connection.query(`
//       CREATE TABLE users (
//         userId INT AUTO_INCREMENT PRIMARY KEY,
//         discordUsername VARCHAR(255) NOT NULL UNIQUE,
//         faceitUsername VARCHAR(255) NOT NULL,
//         recordLocked BOOLEAN NOT NULL DEFAULT 0,
//         previousElo INT NOT NULL
//       )
//     `);
//     console.log("Users table has been reset.");
//   } catch (err: any) {
//     console.error("Error resetting users table:", err.message);
//     throw err;
//   } finally {
//     connection.release();
//   }
// };
