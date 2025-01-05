import { client } from "../bot";
import { VoiceState, CategoryChannel, VoiceChannel } from "discord.js";
import { ChannelIcons } from "../../constants";
import {
  createNewVoiceChannel,
  deleteVoiceChannel,
} from "../../api/services/DiscordService";

// Event listener for voice state updates
client.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    try {
      const joinedChannel = newState.channel;
      const leftChannel = oldState.channel;

      // Handle a user joining a channel
      if (joinedChannel && joinedChannel.type === 2) {
        const newName = `${ChannelIcons.Active} ${joinedChannel.name
          .replace(/^\p{Emoji_Presentation}/u, "")
          .trimStart()}`;
        if (joinedChannel.name !== newName) {
          await joinedChannel.setName(newName);
        }
      }

      // Handle a channel becoming empty
      if (
        leftChannel &&
        leftChannel.type === 2 &&
        leftChannel.members.size === 0
      ) {
        const guild = leftChannel.guild;
        const parent = leftChannel.parentId
          ? guild.channels.cache.get(leftChannel.parentId)
          : null;

        if (!parent || !(parent instanceof CategoryChannel)) {
          console.error(
            "Parent category not found or is not a category channel."
          );
          return;
        }

        // Get the current position of the channel in the category
        const channelIndex = Array.from(parent.children.cache.values())
          .filter((child) => child.type === 2) // Filter for voice channels
          .sort((a, b) => a.rawPosition - b.rawPosition) // Sort by position
          .findIndex((child) => child.id === leftChannel.id);

        // Delete the empty channel
        const deleted = await deleteVoiceChannel(leftChannel.id);
        if (!deleted) {
          console.error(`Failed to delete channel: ${leftChannel.name}`);
          return;
        }

        // Create a new channel with the inactive icon
        const newName = `${ChannelIcons.Inactive} ${leftChannel.name
          .replace(/^\p{Emoji_Presentation}/u, "")
          .trimStart()}`;
        const newChannelId = await createNewVoiceChannel(newName, parent.id);

        if (!newChannelId) {
          console.error("Failed to create a new voice channel.");
          return;
        }

        // Immediately set the position of the newly created channel
        await guild.channels.fetch(newChannelId).then(async (newChannel) => {
          if (newChannel && newChannel.type === 2 && channelIndex !== -1) {
            await newChannel.setPosition(channelIndex);
            console.log(
              `Recreated channel "${newName}" at the correct position.`
            );
          } else {
            console.error("Failed to fetch or reposition the new channel.");
          }
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error in voiceStateUpdate handler: ${error.message}`);
      } else {
        console.error("Unknown error occurred in voiceStateUpdate handler.");
      }
    }
  }
);
