import { User } from "../../types/User";
import db from "../database";

// Add a new user to the `users` table
export const addUser = (
  discordUsername: string,
  faceitName: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO users (discord_username, faceit_name) VALUES (?, ?)`;
    db.run(query, [discordUsername, faceitName], function (err) {
      if (err) {
        reject(err.message);
      } else {
        resolve(this.lastID); // Return the auto-incremented ID of the new user
      }
    });
  });
};

// Retrieve all users from the `users` table
export const getAllUsers = (): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users`;
    db.all(query, [], (err, rows: User[]) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(rows);
      }
    });
  });
};
