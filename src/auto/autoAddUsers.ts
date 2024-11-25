import fs from "fs"; // File system module to read the JSON file
import { addUser } from "../db/models/userModel"; // Assuming you have this function in the userModel

// Function to read JSON file and add users to the DB.
const addUsersFromJson = async (filePath: string) => {
  return;
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

// Example of calling the function with the path to your JSON file
const filePath = "./src/auto/users.json"; // Adjust the path to your JSON file
addUsersFromJson(filePath);
