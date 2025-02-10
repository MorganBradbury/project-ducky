import client from "../client";
import { VoiceState, CategoryChannel, VoiceChannel, ChannelType } from "discord.js";

const CREATE_ROOM_CHANNEL_ID = "1328693484533710878"; // "Create a Room" channel ID

client.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    try {
      const joinedChannel = newState.channel;
      const leftChannel = oldState.channel;
      const guild = newState.guild;

      // Handle user joining the "Create a Room" channel
      if (joinedChannel && joinedChannel.id === CREATE_ROOM_CHANNEL_ID) {
        // Find the highest Room category number
        const roomCategories = guild.channels.cache.filter(
          (channel): channel is CategoryChannel =>
            channel.type === ChannelType.GuildCategory && /^🏠 Room #\d+$/.test(channel.name)
        );

        const highestNumber = [...roomCategories.values()]
          .map((category) =>
            parseInt(category.name.match(/Room #(\d+)/)?.[1] || "0", 10)
          )
          .reduce((max, num) => Math.max(max, num), 0);

        // Create a new category
        const roomCategory = await guild.channels.create({
          name: `🏠 Room #${highestNumber + 1}`,
          type: ChannelType.GuildCategory,
        });

        console.log(`Created category: ${roomCategory.name}`);

        // Create a voice channel inside the new category
        const roomVoiceChannel = await guild.channels.create({
          name: `🔊┃Room #${highestNumber + 1}`,
          type: ChannelType.GuildVoice,
          parent: roomCategory.id,
          permissionOverwrites: joinedChannel.permissionOverwrites.cache.map((overwrite) => overwrite), // Copy permissions
        });

        console.log(`Created new voice channel: ${roomVoiceChannel.name}`);

        // Move the user into the new voice channel
        if (roomVoiceChannel instanceof VoiceChannel) {
          const member = newState.member;
          if (member && member.voice.channel) {
            await member.voice.setChannel(roomVoiceChannel);
            console.log(
              `Moved user ${member.user.tag} to the newly created channel: ${roomVoiceChannel.name}`
            );
          }
        }
      }

      // Handle when a voice room inside a category becomes empty
      if (
        leftChannel &&
        leftChannel.parent &&
        /^🏠 Room #\d+$/.test(leftChannel.parent.name) &&
        leftChannel.id !== CREATE_ROOM_CHANNEL_ID
      ) {
        const category = leftChannel.parent as CategoryChannel;
        const channelsInCategory = category.children.cache;

        // Check if all channels inside the category are empty
        const allEmpty = channelsInCategory.every(
          (channel) => channel.isVoiceBased() && channel.members.size === 0
        );

        if (allEmpty) {
          // Delete all channels in the category
          for (const channel of channelsInCategory.values()) {
            await channel.delete();
          }
          // Delete the category
          await category.delete();
          console.log(`Deleted category and its channels: ${category.name}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error in voiceStateUpdate handler: ${error.message}`);
      } else {
        console.error("An unknown error occurred in voiceStateUpdate handler.");
      }
    }
  }
);
