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
  "[": "⁽",
  "]": "⁾",
};

export const activeMapPool = [
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_ancient",
  "de_vertigo",
  "de_nuke",
  "de_train",
  "de_anubis",
];

export enum AcceptedEventTypes {
  match_ready = "match_status_ready",
  match_finished = "match_status_finished",
  match_cancelled = "match_status_cancelled",
  match_created = "match_object_created",
  match_configuring = "match_status_configuring",
}

export const getMapEmoji = (mapName: string): string => {
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

  return mapEmojis[mapName.toLowerCase()] || `:${mapName.toLowerCase()}:`; // Default to text-based emoji if not found
};

export const getSkillLevelEmoji = (faceitLevel: number): string => {
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
    10: "<:level_10:1314528913380081717>", // Added level 10 as well
  };

  return skillLevelEmojis[faceitLevel] || `:${faceitLevel}:`; // Default to text-based emoji if not found
};
