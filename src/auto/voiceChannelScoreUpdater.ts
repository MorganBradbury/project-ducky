import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildMember,
} from "discord.js";
import { faceitApiClient } from "../services/FaceitService";
import { getAllUsers } from "../db/commands";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const VOICE_CHANNEL_ORIGINAL_NAMES: Record<string, string> = {};

/**
 * Updates voice channel names to display scorelines of ongoing CS2 games
 */
export const updateVoiceChannelNames = async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID!);
    const voiceChannels = guild.channels.cache.filter(
      (channel) =>
        channel.type === ChannelType.GuildVoice &&
        (channel.members?.size || 0) >= 1 // Only voice channels with 2+ members
    );

    if (!voiceChannels.size) {
      console.log("No active voice channels with 1+ members.");
      return;
    }

    const users = await getAllUsers();
    const faceitIdMap = Object.fromEntries(
      users.map((user) => [user.discordUsername, user.gamePlayerId])
    );

    for (const [channelId, channel] of voiceChannels) {
      if (channel.type !== ChannelType.GuildVoice) continue;

      // Safely get members of the channel
      const members = Array.from(channel.members.values());
      const activePlayers = members
        .map((member) => ({
          discordUsername: member.user.tag,
          faceitId: faceitIdMap[member.user.tag],
        }))
        .filter((player) => player.faceitId);

      if (activePlayers.length < 2) continue;

      const gameData = await Promise.all(
        activePlayers.map(async (player) =>
          faceitApiClient.getActiveMatch(player.faceitId)
        )
      );

      const gamesById = gameData.reduce<Record<string, typeof activePlayers>>(
        (acc, game, index) => {
          if (game) {
            const gameId = game.matchId;
            if (!acc[gameId]) acc[gameId] = [];
            acc[gameId].push(activePlayers[index]);
          }
          return acc;
        },
        {}
      );

      const activeGameIds = Object.keys(gamesById);
      if (activeGameIds.length === 0) {
        if (VOICE_CHANNEL_ORIGINAL_NAMES[channelId]) {
          await channel.setName(VOICE_CHANNEL_ORIGINAL_NAMES[channelId]);
        }
        continue;
      }

      const selectedGameId = activeGameIds.reduce((prev, current) =>
        gamesById[current].length > gamesById[prev].length ? current : prev
      );

      const selectedGame = gameData.find(
        (game) => game && game.matchId === selectedGameId
      );

      if (selectedGame) {
        const scoreline = `${selectedGame.team1Score}:${selectedGame.team2Score}`;

        if (!VOICE_CHANNEL_ORIGINAL_NAMES[channelId]) {
          VOICE_CHANNEL_ORIGINAL_NAMES[channelId] = channel.name;
        }

        await channel.setName(
          `${VOICE_CHANNEL_ORIGINAL_NAMES[channelId]} (${scoreline})`
        );
      }
    }
  } catch (error) {
    console.error("Error updating voice channel names:", error);
  }
};

if (!client.isReady()) {
  client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
}
