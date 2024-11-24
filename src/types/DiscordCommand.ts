import { CommandInteraction } from "discord.js";

export interface DiscordCommand {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    type: number; // Discord API type (e.g., STRING = 3)
    required?: boolean;
  }>;
  execute: (interaction: CommandInteraction) => Promise<void>;
}
