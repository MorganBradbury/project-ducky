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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_username TEXT NOT NULL UNIQUE, -- Ensures unique Discord usernames
      faceit_name TEXT NOT NULL
    )
  `;
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error("Error creating users table:", err.message);
    } else {
      console.log("Users table is ready");
    }
  });
};

export default db;
