import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const stackBuilderCommand = {
  name: "stack-builder",
  description: "Ask who wants to play a game at a specific time.",
  options: [
    {
      name: "time",
      description: "The time of the game (e.g., 3 PM).",
      type: 3, // STRING type
      required: true,
    },
  ],
  execute: async (interaction: ChatInputCommandInteraction) => {
    const time = interaction.options.getString("time", true);
    await createPoll(interaction, time, true);
  },
};

// Helper function for creating the poll embed
export const createPoll = async (
  source: ChatInputCommandInteraction | any,
  time: string,
  isCommand: boolean
) => {
  const embed = new EmbedBuilder()
    .setTitle("Who wants to play?")
    .setDescription(
      `Game at **${time}**. Click "Join" if you want to play! We need 5 players (including the host).`
    )
    .setColor("#00FF00");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success)
  );

  // Send the poll message
  const message = await (isCommand
    ? source.reply({
        content: "Who wants to play CS?",
        embeds: [embed],
        components: [row],
        fetchReply: true,
      })
    : source.channel.send({
        content: "Who wants to play CS?",
        embeds: [embed],
        components: [row],
      }));

  // Store the game data
  source.client.gameData = {
    messageId: message.id,
    participants: [],
    maxPlayers: 5,
    host: isCommand ? source.user.id : source.author.id,
  };
};
