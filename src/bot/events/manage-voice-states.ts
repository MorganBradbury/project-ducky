import client from "../client";
import { VoiceState, CategoryChannel, VoiceChannel } from "discord.js";

const CREATE_ROOM_CHANNEL_ID = "1328675387877756939"; // "Create a Room" channel ID
const ROOM_CATEGORY_ID = "YOUR_CATEGORY_ID"; // Replace with the ID of the category to create rooms under

client.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    try {
      const joinedChannel = newState.channel;
      const leftChannel = oldState.channel;
      const guild = newState.guild;

      // Handle user joining the "Create a Room" channel
      if (joinedChannel && joinedChannel.id === CREATE_ROOM_CHANNEL_ID) {
        // Fetch the category where rooms are created
        const category = guild.channels.cache.get(
          ROOM_CATEGORY_ID
        ) as CategoryChannel;

        if (!category || category.type !== 4) {
          console.error(
            "Category not found or is not a valid category channel."
          );
          return;
        }

        // Find the highest ROOM- number in the category
        const roomChannels = Array.from(
          category.children.cache.values()
        ).filter(
          (channel): channel is VoiceChannel =>
            channel.type === 2 && /^🟢 ROOM-\d+$/.test(channel.name)
        );
        const highestNumber = roomChannels
          .map((channel) =>
            parseInt(channel.name.match(/ROOM-(\d+)/)?.[1] || "0", 10)
          )
          .reduce((max, num) => Math.max(max, num), 0);

        // Create the new room
        const roomName = `🟢 ROOM-${highestNumber + 1}`;
        const createdChannel = await guild.channels.create({
          name: roomName,
          type: 2, // Voice channel
          parent: ROOM_CATEGORY_ID,
          permissionOverwrites: joinedChannel.permissionOverwrites.cache.map(
            (overwrite) => overwrite
          ), // Copy permissions
        });

        console.log(`Created new channel: ${roomName}`);

        // Move the user into the new channel
        if (createdChannel instanceof VoiceChannel) {
          const member = newState.member;
          if (member && member.voice.channel) {
            await member.voice.setChannel(createdChannel);
            console.log(
              `Moved user ${member.user.tag} to the newly created channel: ${roomName}`
            );
          }
        } else {
          console.error("Created channel is not a VoiceChannel.");
        }
      }

      // Handle when a room becomes empty
      if (
        leftChannel &&
        leftChannel.parentId === ROOM_CATEGORY_ID &&
        leftChannel.members.size === 0
      ) {
        await leftChannel.delete();
        console.log(`Deleted empty channel: ${leftChannel.name}`);
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
