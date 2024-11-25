import { addUser, getAllUsers } from "../db/models/userModel";

// Add a new user
export const addDiscordUser = async (
  discordUsername: string,
  faceitName: string
): Promise<number> => {
  try {
    const userId = await addUser(discordUsername, faceitName);
    console.log(`User added with ID: ${userId}`);
    return userId;
  } catch (err) {
    console.error("Error adding user:", err);
    throw err;
  }
};

// Get all users
export const fetchAllUsers = async (): Promise<void> => {
  try {
    const users = await getAllUsers();
    console.log("All users:", users);
  } catch (err) {
    console.error("Error fetching users:", err);
    throw err;
  }
};
