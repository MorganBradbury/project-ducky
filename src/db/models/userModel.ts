import { User } from "../../types/User";
import db from "../database";

// Add a new user to the `users` table
export const addUser = (
  discordUsername: string,
  faceitName: string,
  elo: number
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const checkrecordLockedQuery = `SELECT recordLocked FROM users WHERE discordUsername = ?`;
    const insertQuery = `INSERT INTO users (discordUsername, faceitUsername, previousElo) VALUES (?, ?, ?)`;

    // Cast row to the UserRow type
    db.get(checkrecordLockedQuery, [discordUsername], (err: any, row: User) => {
      if (err) {
        return reject(err.message);
      }

      if (row && row.recordLocked) {
        return reject(
          new Error(`Cannot edit: User "${discordUsername}" is recordLocked.`)
        );
      }

      db.run(
        insertQuery,
        [discordUsername, faceitName, elo],
        function (err: any) {
          if (err) {
            if (err.code === "SQLITE_CONSTRAINT") {
              reject(new Error(`User "${discordUsername}" already exists.`));
            } else {
              reject(err.message);
            }
          } else {
            resolve(this.lastID); // Return the auto-incremented userId of the new user
          }
        }
      );
    });
  });
};

export const updateUserElo = (
  userId: number,
  newElo: number
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET previousElo = ? WHERE userId = ?`;
    db.run(query, [newElo, userId], function (err) {
      if (err) {
        reject(err.message); // Reject the promise if there's an error
      } else if (this.changes === 0) {
        reject("No rows updated. Check if the userId exists.");
      } else {
        resolve(true); // Resolve the promise if the update succeeds
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
