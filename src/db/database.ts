import sqlite3 from "sqlite3";

// Open the database
const db = new sqlite3.Database("app.db", (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Initialize the database schema
export const initDatabase = (): void => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      discordUsername TEXT NOT NULL UNIQUE,
      faceitUsername TEXT NOT NULL,
      recordLocked BOOLEAN NOT NULL DEFAULT 0,
      previousElo INTEGER NOT NULL
    )
  `;
  // const createTableQuery = "DROP TABLE USERS";
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error("Error creating users table:", err.message);
    } else {
      console.log("Users table is ready");
    }
  });
};

export default db;
