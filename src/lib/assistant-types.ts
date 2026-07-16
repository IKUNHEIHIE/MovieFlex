export type AssistantRole = 'user' | 'assistant' | 'system';

export type AssistantImageInput = {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type AssistantChatMessage = {
  role: AssistantRole;
  content: string;
  image?: AssistantImageInput;
};

export type AssistantStoredMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  hasImage: boolean;
  imageFileName: string | null;
  imageMimeType: string | null;
  imageSize: number | null;
  createdAt: Date;
};

export type AssistantConversationSummary = {
  id: number;
  title: string;
  updatedAt: Date;
  lastMessage: string;
};
