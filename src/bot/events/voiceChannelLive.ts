import { client } from "../bot";
import { VoiceState } from "discord.js";

/**
 * Updates the channel name with rate limit handling.
 */
async function updateChannelName(
  channel: any,
  newName: string,
  retries = 3
): Promise<void> {
  try {
    await channel.setName(newName);
    console.log(`Updated channel name to: ${newName}`);
  } catch (error: any) {
    if (error.code === 50013) {
      console.error("Bot lacks permissions to rename the channel.");
      return;
    }

    if (error.code === 20028) {
      // 20028 is the Discord rate limit error code
      console.warn(
        "Rate limited while renaming channel. Retrying in 10 minutes."
      );
      if (retries > 0) {
        setTimeout(() => {
          updateChannelName(channel, newName, retries - 1);
        }, 10 * 60 * 1000); // 10 minutes in milliseconds
      } else {
        console.error(
          "Failed to update channel name after retries due to rate limits."
        );
      }
    } else {
      console.error(
        `Unexpected error while renaming channel: ${error.message}`
      );
    }
  }
}

// Event listener for voice state updates
client.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    try {
      // Get the voice channel from the new or old state
      const channel = newState.channel || oldState.channel;

      if (!channel) return; // Exit if no channel is involved

      // Check if the channel is a voice channel
      if (channel.type !== 2) return; // 2 is the enum value for GuildVoiceChannel

      // Get the channel's current name
      const currentName = channel.name;

      // Define the emoji replacements
      const activeEmoji = "🟢";
      const inactiveEmoji = "🟠";

      // Determine if the channel is active (has members excluding bots)
      const hasMembers = channel.members.some((member) => !member.user.bot);

      // Determine the new emoji
      const newEmoji = hasMembers ? activeEmoji : inactiveEmoji;

      // Replace the first emoji in the channel name or prepend the new emoji
      const updatedName = currentName
        .replace(/^\p{Emoji_Presentation}/u, "")
        .trimStart();

      const newName = `${newEmoji} ${updatedName}`;

      // Update the channel name only if it differs
      if (channel.name !== newName) {
        await updateChannelName(channel, newName);
      }
    } catch (error) {
      console.error(`Error handling voiceStateUpdate: ${error}`);
    }
  }
);
