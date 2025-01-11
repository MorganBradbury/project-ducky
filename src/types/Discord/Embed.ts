import { ButtonBuilder, HexColorString } from "discord.js";

export interface Embed {
  channelId: string;
  embed: {
    title: string;
    description?: string;
    fields: { name: string; value: string; inline?: boolean }[];
    footer: string;
    themeColour: HexColorString; // Hex color or color code (default: #0099ff)
  };
  buttons?: {
    components: ButtonBuilder[];
  };
}
