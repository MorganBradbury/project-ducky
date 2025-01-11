import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import client from "../../../bot/client";
import { config } from "../../../config";
import { Embed } from "../../../types/Discord/Embed";
import {
  calculateEloDifference,
  formattedMapName,
} from "../../../utils/faceitHelper";
import { getMapEmoji, getSkillLevelEmoji } from "../../../constants";
import { FaceitService } from "../faceit-service";
import { Match } from "../../../types/Faceit/match";

// Send Embed Service Function
export const sendEmbed = async (props: Embed): Promise<Message | null> => {
  try {
    // Fetch the channel by ID
    const guild = await client.guilds.fetch(config.GUILD_ID);
    if (!guild) {
      console.error("Guild not found", config.GUILD_ID);
      return null;
    }

    const channel = (await guild.channels.fetch(
      props.channelId
    )) as TextChannel;
    if (!channel) {
      console.error("Channel not found", props.channelId);
      return null;
    }

    // Create a new EmbedBuilder instance
    let embed = new EmbedBuilder();

    if (props.embed.title) {
      embed.setTitle(props.embed.title);
    }
    if (props.embed.description) {
      embed.setDescription(props.embed.description);
    }
    if (props.embed.themeColour) {
      embed.setColor(props.embed.themeColour);
    }
    if (props.embed.footer) {
      embed.setFooter({ text: props.embed.footer });
    }
    if (props.embed.fields && props.embed.fields.length > 0) {
      embed.addFields(props.embed.fields);
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...(props?.buttons?.components || [])
    );

    const messageDelivered = await channel.send({
      embeds: [embed],
      components: [buttons],
    });

    console.log("Embed sent successfully to channel:", {
      channelId: props.channelId,
      embedId: messageDelivered.id,
    });
    return messageDelivered;
  } catch (error) {
    console.error("Error sending embed:", error);
    return null;
  }
};

// refactor functions below.
export const sendMatchroomAnalysisEmbed = (
  matchId: string,
  playersData: any,
  gameData: any
) => {
  // Sorting the game data: first by most played times, then by average win percentage if needed
  const sortedMapData = gameData.sort((a: any, b: any) => {
    const aWinPercentage = parseFloat(a.averageWinPercentage);
    const bWinPercentage = parseFloat(b.averageWinPercentage);

    if (b.totalPlayedTimes === a.totalPlayedTimes) {
      return bWinPercentage - aWinPercentage;
    }
    return b.totalPlayedTimes - a.totalPlayedTimes;
  });

  // Extracting teams and their players
  const homeFaction = playersData.homeFaction;
  const enemyFaction = playersData.enemyFaction;

  const homeFactionCaptain = homeFaction.find((player: any) => player.captain);
  const enemyFactionCaptain = enemyFaction.find(
    (player: any) => player.captain
  );

  // Adding skill level icons next to each player name
  const homePlayers = homeFaction
    .map(
      (player: any) =>
        `${getSkillLevelEmoji(player.faceitLevel)} ${player.nickname}${
          player.captain ? "*" : ""
        }`
    )
    .join("\n");
  const enemyPlayers = enemyFaction
    .map(
      (player: any) =>
        `${getSkillLevelEmoji(player.faceitLevel)} ${player.nickname}${
          player.captain ? "*" : ""
        }`
    )
    .join("\n");

  // Getting most likely picks and bans with map emojis
  const mostLikelyPicks = sortedMapData
    .slice(0, 4)
    .map(
      (map: any) =>
        `${getMapEmoji(map.mapName)} ${formattedMapName(map.mapName)}`
    )
    .join("\n");

  // Sort maps in ascending order of played times for most likely bans
  const mostLikelyBans = sortedMapData
    .slice()
    .sort((a: any, b: any) => a.totalPlayedTimes - b.totalPlayedTimes) // Sort by least played first
    .slice(0, 4) // Take the least played 3 maps
    .map(
      (map: any) =>
        `${getMapEmoji(map.mapName)} ${formattedMapName(map.mapName)}`
    )
    .join("\n");

  // Creating the map stats table content (without map icons)
  const mapDataTable = sortedMapData
    .map((map: any) => {
      // Ensure averageWinPercentage is a valid number by parsing the string to a float
      const formattedWinPercentage =
        map.totalPlayedTimes === 0 ||
        isNaN(parseFloat(map.averageWinPercentage))
          ? "N/A"
          : Math.ceil(parseFloat(map.averageWinPercentage)).toString() + "%"; // Round up the win percentage to nearest whole number
      return `\`${formattedMapName(map.mapName).padEnd(
        12
      )} | ${map.totalPlayedTimes
        .toString()
        .padEnd(6)} | ${formattedWinPercentage.padEnd(6)}\``;
    })
    .join("\n");

  // Prepare the data for the `sendEmbed` function
  const embedData: Embed = {
    channelId: config.MATCHROOM_ANALYSIS_CHANNEL_ID,
    embed: {
      title: "Matchroom Analysis",
      description: "",
      themeColour: "#ff5733",
      footer: matchId,
      fields: [
        {
          name: `Team ${homeFactionCaptain.nickname}`,
          value: homePlayers,
          inline: true,
        },
        {
          name: `Team ${enemyFactionCaptain.nickname}`,
          value: enemyPlayers,
          inline: true,
        },
        {
          name: `Map stats for Team ${enemyFactionCaptain.nickname} (Last 30 games)`,
          value:
            "`Map name     | Played | Win % `\n" +
            "`-------------|--------|-------`\n" +
            mapDataTable,
        },
        { name: "They likely pick", value: mostLikelyPicks, inline: true },
        { name: "They likely ban", value: mostLikelyBans, inline: true },
      ],
    },
    buttons: {
      components: [
        new ButtonBuilder()
          .setURL(`https://www.faceit.com/en/cs2/room/${matchId}`)
          .setLabel("View match")
          .setStyle(ButtonStyle.Link),
      ],
    },
  };

  // Call the `sendEmbed` function
  sendEmbed(embedData);
  return;
};

export const sendMatchEndSummary = async (match: Match) => {
  try {
    const getPlayerStatsData = await FaceitService.getPlayerStats(
      match.matchId,
      match.trackedTeam.trackedPlayers.map((player) => player.faceitId)
    );

    // Sort players by kills in descending order
    getPlayerStatsData.sort((a: any, b: any) => b.kills - a.kills);

    const playerStatsTable = await Promise.all(
      getPlayerStatsData.map(async (stat) => {
        const player = match.trackedTeam.trackedPlayers.find(
          (player) => player.faceitId === stat.playerId
        );
        const eloChange = await calculateEloDifference(
          player?.previousElo || 0,
          player?.gamePlayerId || ""
        );

        const playerName = player?.faceitUsername || "Unknown";
        const name =
          playerName.length > 11
            ? `${playerName.substring(0, 9)}..`
            : playerName.padEnd(11, " ");

        const kda = `${stat.kills}/${stat.deaths}/${stat.assists}`;
        const paddedKDA = kda.padEnd(8, " ");

        const elo =
          `${eloChange?.operator}${eloChange?.difference} (${eloChange?.newElo})`.padEnd(
            3,
            " "
          );

        return `\`${name} ${paddedKDA}  ${elo}\``;
      })
    );

    const finalScore = await FaceitService.getMatchScore(
      match.matchId,
      match.trackedTeam.faction,
      true
    );
    const didTeamWin = await FaceitService.getMatchResult(
      match.matchId,
      match.trackedTeam.faction
    );

    // Strip 'de_' and capitalize the first letter of the map name
    const formattedMapName = match.mapName
      .replace(/^de_/, "")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const mapEmoji = getMapEmoji(match.mapName);

    // Prepare the data for the `sendEmbed` function
    const embedData: Embed = {
      channelId: config.BOT_UPDATES_CHANNEL_ID,
      embed: {
        title: "New match finished",
        description: "",
        themeColour: didTeamWin ? "#00FF00" : "#FF0000",
        footer: `${match.matchId}`,
        fields: [
          {
            name: "Map",
            value: `${mapEmoji}  ${formattedMapName}`,
            inline: true,
          },
          {
            name: "Match Result",
            value: `${finalScore.join(" / ")}`,
            inline: true,
          },
          {
            name: "Link to match",
            value: `[Click here](https://www.faceit.com/en/cs2/room/${match.matchId})`,
          },
          {
            name: "Players and Stats (K/D/A)",
            value: `${playerStatsTable.join("\n")}`,
          },
        ],
      },
    };

    // Call the `sendEmbed` function
    await sendEmbed(embedData);
  } catch (error) {
    console.error("Error sending match finish notification:", error);
  }
};
