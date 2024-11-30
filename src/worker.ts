import { parentPort } from "worker_threads";
import axios from "axios";

// API endpoint to send the POST request (replace with your actual URL)
const API_URL =
  "https://faceitbot-production.up.railway.app/api/updatelivescores"; // Replace with the actual API URL

// Function to send a POST request to the API
const sendPostRequest = async (matchId: string): Promise<void> => {
  try {
    const response = await axios.post(API_URL, { matchId });
    console.log(
      `POST request successful for matchId: ${matchId}`,
      response.data
    );
  } catch (error: any) {
    console.error(
      `Error sending POST request for matchId: ${matchId}`,
      error.message
    );
  }
};

// Function to start the periodic task
let interval: NodeJS.Timeout | undefined;
const startTask = (matchId: string): void => {
  interval = setInterval(() => {
    sendPostRequest(matchId);
  }, 60000); // Calls every 60 seconds (1 minute)
};

// Listen for messages from the main thread (the parent)
parentPort?.on("message", (message: { type: string; matchId: string }) => {
  if (message.type === "start") {
    startTask(message.matchId); // Start task with the provided matchId
  } else if (message.type === "stop") {
    if (interval) {
      clearInterval(interval); // Stop the task
      interval = undefined;
    }
    console.log("Worker stopped.");
    parentPort?.postMessage("Worker stopped");
  }
});
