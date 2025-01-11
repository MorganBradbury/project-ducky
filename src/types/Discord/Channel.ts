export type Channel = {
  id: string;
  name: string;
  status?: string;
};

export type CreateChannel = {
  channelName: string;
  categoryId: string;
  locked?: boolean;
};

export type UpdateChannelStatus = {
  id: string;
  status: string;
};
