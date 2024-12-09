import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
} from "discord.js";

const activePolls: Map<
  string,
  { timestamp: number; participants: string[]; authorId: string }
> = new Map();

const timePatterns = [
  /^in (\d+)\s?(minutes?|mins?|hours?|hrs?)$/i,
  /^at (\d{1,2})(am|pm)?$/i,
];

export const stackBuilderCommand = {
  name: "stack-builder",
  description: "Ask who wants to play a game at a specific time.",
  options: [
    {
      name: "time",
      description: "The time of the game (e.g., in 10 mins, at 8pm).",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const time = interaction.options.getString("time", true);
    const channelId = interaction.channelId;
    const now = Date.now();

    // Validate the time format
    if (!isValidTimeFormat(time)) {
      await interaction.reply({
        content: `Invalid time format. Please use one of the following formats:\n- **in 10 mins**\n- **in 1 hour**\n- **at 8pm**`,
        ephemeral: true,
      });
      return;
    }

    // Check if a poll already exists in this channel
    if (
      activePolls.has(channelId) &&
      now - activePolls.get(channelId)!.timestamp < 15 * 60 * 1000
    ) {
      await interaction.reply({
        content:
          "A game poll is already active in this channel. Please wait until it expires (15 minutes cooldown).",
        ephemeral: true,
      });
      return;
    }

    // Create the poll
    await createPoll(interaction, time, true);
    activePolls.set(channelId, {
      timestamp: now,
      participants: [interaction.user.id], // Add creator immediately to participants
      authorId: interaction.user.id,
    });
  },
};

function isValidTimeFormat(time: string): boolean {
  return timePatterns.some((pattern) => pattern.test(time));
}

export const createPoll = async (
  source: ChatInputCommandInteraction | any,
  time: string,
  isCommand: boolean
) => {
  // Check if 'source' has the 'user' or 'author' property
  const userId = source.user?.id || source.author?.id;
  if (!userId) {
    console.error("Error: Unable to find user ID in the source.");
    return;
  }

  // Format time string to avoid repeated "at"
  const formattedTime = time.replace(/\bat\b/, "").trim();

  // Add the author's ID as the first participant in the list
  const initialParticipants = [userId];

  // Create the initial embed with the author included
  const embed = new EmbedBuilder()
    .setTitle("Who wants to play?")
    .setDescription(
      `Game **${formattedTime}**. Click "Join" if you want to play! We need 5 players. \n\n**Participants:**\n<@${userId}>` // Include the author in the participants list
    )
    .setColor("#00FF00");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("leave_game")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_poll")
      .setLabel("Cancel Poll")
      .setStyle(ButtonStyle.Secondary)
  );

  const message = await (isCommand
    ? source.reply({
        content: "",
        embeds: [embed],
        components: [row],
        fetchReply: true,
      })
    : source.channel.send({
        content: "",
        embeds: [embed],
        components: [row],
      }));

  const channelId = message.channelId;
  source.client.gameData = source.client.gameData || {};

  source.client.gameData[channelId] = {
    messageId: message.id,
    participants: initialParticipants, // Initialize with the author
    maxPlayers: 5,
    host: userId, // Ensure that host is set correctly
  };

  const filter = (i: any) =>
    ["join_game", "leave_game", "cancel_poll"].includes(i.customId);
  const collector = message.createMessageComponentCollector({
    filter,
    time: 15 * 60 * 1000,
  });

  collector.on("collect", async (interaction: any) => {
    const gameData = source.client.gameData[channelId];
    if (!gameData) return;

    const userId = interaction.user.id;
    const username = interaction.user.username;

    if (interaction.customId === "join_game") {
      // Handle joining
      if (gameData.participants.includes(userId)) {
        await interaction.reply({
          content: "You are already in the stack!",
          ephemeral: true,
        });
        return;
      }

      gameData.participants.push(userId);
      await interaction.reply({
        content: `<@${username}> has joined the stack!`, // Correct tag format
      });
    } else if (interaction.customId === "leave_game") {
      // Handle leaving
      if (!gameData.participants.includes(userId)) {
        await interaction.reply({
          content: "You are not in the stack!",
          ephemeral: true,
        });
        return;
      }

      gameData.participants = gameData.participants.filter(
        (id: string) => id !== userId
      );
      await interaction.reply({
        content: `<@${username}> has left the stack!`, // Correct tag format
      });
    } else if (interaction.customId === "cancel_poll") {
      // Handle poll cancellation
      if (userId !== gameData.host) {
        await interaction.reply({
          content: "Only the poll creator can cancel this poll.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply("The poll has been canceled.");
      await message.delete();
      activePolls.delete(channelId);
      collector.stop();
      return;
    }

    // Update the embed with the participants
    const participantTags = gameData.participants
      .map((id: string) => `<@${id}>`) // Properly tag the users
      .join("\n");

    const updatedEmbed = EmbedBuilder.from(embed).setDescription(
      `Game **${formattedTime}**. Click "Join" if you want to play! We need 5 players. \n\n**Participants:**\n${
        participantTags || "No one yet"
      }`
    );
    await message.edit({ embeds: [updatedEmbed] });

    // Check if the stack is complete
    if (gameData.participants.length >= gameData.maxPlayers) {
      await message.channel.send(
        `The stack is complete! Here are the 5 players:\n${gameData.participants
          .map((id: string) => `<@${id}>`)
          .join("\n")}`
      );
      collector.stop();
      activePolls.delete(channelId);
    }
  });

  collector.on("end", () => {
    activePolls.delete(channelId);
  });
};
