import { client } from "../bot";
import { VoiceState, GuildChannel } from "discord.js";

/**
 * Updates the channel name with rate limit handling.
 */
async function updateChannelName(
  channel: any,
  newName: string,
  retries = 3
): Promise<void> {
  try {
    console.log(`Received request to update channel name.`, {
      channel: channel.name,
      newName,
      retries,
    });
    await channel.setName(newName);
    console.log(`Updated channel name to: ${newName}`);
  } catch (error: any) {
    if (error.code === 50013) {
      console.error("Bot lacks permissions to rename the channel.");
      return;
    }

    if (error.code === 20028 || error.code === 429) {
      // 20028 or 429 indicate rate limiting
      const retryAfter =
        error?.retry_after || error?.response?.headers?.["retry-after"];
      const retryDelay = retryAfter
        ? parseFloat(retryAfter) * 1000
        : 10 * 60 * 1000; // Fallback to 10 minutes if unavailable

      console.warn(
        `Rate limited while renaming channel. Retrying in ${
          retryDelay / 1000
        } seconds.`
      );

      if (retries > 0) {
        setTimeout(async () => {
          const freshChannel = await channel.guild.channels.fetch(channel.id); // Fetch the latest channel state
          if (!freshChannel || freshChannel.type !== 2) {
            console.warn("Channel no longer exists or is not a voice channel.");
            return;
          }

          const hasMembers = freshChannel.members.some(
            (member) => !member.user.bot
          );

          const fallbackEmoji = "🟠"; // Set to inactive emoji if empty
          const updatedName = freshChannel.name
            .replace(/^\p{Emoji_Presentation}/u, "")
            .trimStart();
          const finalName = hasMembers
            ? newName
            : `${fallbackEmoji} ${updatedName}`;

          if (freshChannel.name !== finalName) {
            await updateChannelName(freshChannel, finalName, retries - 1);
          }
        }, retryDelay);
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
    console.log("Voice state update received.");
    try {
      // Get the voice channel from the new or old state
      const channel = newState.channel || oldState.channel;

      if (!channel) return; // Exit if no channel is involved

      // Check if the channel is a voice channel
      if (channel.type !== 2) return; // 2 is the enum value for GuildVoiceChannel

      // Get the channel's current name
      const currentName = channel.name;

      // Skip if the channel name contains "AFK"
      if (currentName.toLowerCase().includes("afk")) {
        console.log(`Skipping update for AFK channel: ${currentName}`);
        return;
      }

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
