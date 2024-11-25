import { addUser, getAllUsers } from "../db/models/userModel";
import { handleDatabaseError } from "../utils/errorHandler";

export const addDiscordUser = async (
  discordUsername: string,
  faceitName: string,
  elo: number
): Promise<number> => {
  try {
    const userId = await addUser(discordUsername, faceitName, elo);
    console.log(`User added with userId: ${userId}`);
    return userId;
  } catch (error) {
    const friendlyMessage = handleDatabaseError(error);
    console.error("Error adding user:", friendlyMessage);
    throw new Error(friendlyMessage);
  }
};

// Get all users
export const fetchAllUsers = async (): Promise<void> => {
  try {
    const users = await getAllUsers();
    console.log("All users:", users);
  } catch (err) {
    const friendlyMessage = handleDatabaseError(err);
    console.error("Error fetching users:", friendlyMessage);
    throw new Error(friendlyMessage);
  }
};
