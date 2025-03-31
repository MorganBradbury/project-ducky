import redisClient from "../../redisClient";

export async function sendMessage(queueName: string, message: string) {
  try {
    await redisClient.rPush(queueName, message);
    console.log(`Message added: ${message}`);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}
