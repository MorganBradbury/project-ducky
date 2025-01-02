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
}
