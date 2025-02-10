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
        // Find the highest Room number by looking at voice channels
        const existingRooms = guild.channels.cache.filter(
          (channel): channel is VoiceChannel =>
            channel.type === ChannelType.GuildVoice && /^🔊┃Room #\d+$/.test(channel.name)
        );

        const highestNumber = [...existingRooms.values()]
          .map((channel) =>
            parseInt(channel.name.match(/Room #(\d+)/)?.[1] || "0", 10)
          )
          .reduce((max, num) => Math.max(max, num), 0);

        // Create a new category with a hyphen name
        const roomCategory = await guild.channels.create({
          name: "-",
          type: ChannelType.GuildCategory,
        });
        console.log(`Created category: ${roomCategory.id}`);

        // Create a voice channel inside the new category with the room number
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
        leftChannel.parent.name === "-" && // Check for hyphen category name
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
          console.log(`Deleted empty category and its channels: ${category.id}`);
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