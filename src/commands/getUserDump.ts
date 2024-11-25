import { ChatInputCommandInteraction } from "discord.js";
import { getAllUsers } from "../db/models/userModel";
import fs from "fs";
import path from "path";

export const generateUsersJsonCommand = {
  name: "generate_users_dump",
  description: "Generate a JSON file of all tracked users and send it.",
  options: [],
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      // Fetch all users from the database
      const users = await getAllUsers();

      // If no users are found, inform the user and exit
      if (users.length === 0) {
        await interaction.reply("No users are currently being tracked.");
        return;
      }

      const OWNER_ID = "460148152796971008";
      // Check if the command user is the owner
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({
          content: "❌ You do not have permission to use this command.",
          ephemeral: true, // This ensures the message is only visible to the user
        });
        return;
      }

      // Generate the JSON data in the specified format
      const userJson = users.map((user) => ({
        discordUsername: user.discordUsername,
        faceitUsername: user.faceitUsername,
        previousElo: user.previousElo as Number
      }));

      // Define the file path for the generated JSON file
      const filePath = path.join(__dirname, "users.json");

      // Write the JSON data to the file
      fs.writeFileSync(filePath, JSON.stringify(userJson, null, 2));

      // Send the JSON file as an attachment
      await interaction.reply({
        content: "Here is the JSON file of all tracked users:",
        files: [filePath],
        ephemeral: true, // This ensures the message is only visible to the user
      });

      // Optionally, delete the file after sending it to clean up
      fs.unlinkSync(filePath);

      console.log("JSON file sent and deleted.");
    } catch (error) {
      console.error("Error generating or sending the JSON file:", error);
      await interaction.reply(
        "There was an error while generating or sending the JSON file."
      );
    }
  },
};
