import { getServerBoostLevel } from "./api/services/channelService";

export enum ChannelIcons {
  Active = "🟢",
  Inactive = "🟠",
  Disabled = "🔴",
}

export const eloNumbers: any = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export const activeMapPool = [
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_ancient",
  "de_nuke",
  "de_train",
  "de_anubis",
];

export enum AcceptedEventTypes {
  match_ready = "match_status_ready",
  match_finished = "match_status_finished",
  match_cancelled = "match_status_cancelled",
  match_created = "match_object_created",
}

export const getMapEmoji = async (mapName: string): Promise<string> => {
  const serverBoostLevel = await getServerBoostLevel();
  const canShowEmojis = serverBoostLevel >= 2;

  const mapEmojis: { [key: string]: string } = {
    de_ancient: "<:de_ancient:1324386141981507656>",
    de_anubis: "<:de_anubis:1324386143462227990>",
    de_dust2: "<:de_dust2:1324386144686702592>",
    de_inferno: "<:de_inferno:1324386146322616392>",
    de_mirage: "<:de_mirage:1324386148369563719>",
    de_nuke: "<:de_nuke:1324386149623529553>",
    de_vertigo: "<:de_vertigo:1324421533262811297>",
    de_train: "<:de_train:1324434992494940231>",
  };

  return canShowEmojis ? mapEmojis[mapName.toLowerCase()] || "" : "";
};

export const getSkillLevelEmoji = async (
  faceitLevel: number
): Promise<string> => {
  const serverBoostLevel = await getServerBoostLevel();
  const canShowEmojis = serverBoostLevel >= 2;

  const skillLevelEmojis: { [key: number]: string } = {
    1: "<:level_1:1313100283273936896>",
    2: "<:level_2:1313100284301545522>",
    3: "<:level_3:1313100285215903785>",
    4: "<:level_4:1313100286989959180>",
    5: "<:level_5:1313100288512622682>",
    6: "<:level_6:1313100291045851186>",
    7: "<:level_7:1313100292870377523>",
    8: "<:level_8:1313100294321868866>",
    9: "<:level_9:1313100296557432832>",
    10: "<:level_10:1314528913380081717>",
  };

  return canShowEmojis ? skillLevelEmojis[faceitLevel] || "" : "";
};

export const API_VERSION = "v10";
export const BASE_URL = `https://discord.com/api/${API_VERSION}`;
export const ENDPOINTS = {
  voiceStatus: (channelId: string) =>
    `${BASE_URL}/channels/${channelId}/voice-status`,
} as const;

export const LINKS = {
  WEBHOOK:
    "https://developers.faceit.com/apps/2205acb7-7fb4-4ce4-8a23-871375ee03fa/webhooks/af22807c-f17a-4947-8829-5757ef6a2e34/edit",
  MATCHROOM: "https://www.faceit.com/en/cs2/room",
};

export const EMBED_COLOURS = {
  MAP_WIN: "00FF00",
  MAP_LOSS: "FF0000",
  LIVE_SCORE: "E5794C",
  ANALYSIS: "FF5733",
};

export const EMPTY_FIELD = {
  name: "\u200B", // Empty field to force a new line
  value: "\u200B",
  inline: true,
};
