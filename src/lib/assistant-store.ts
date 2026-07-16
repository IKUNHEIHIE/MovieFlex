import prisma from './prisma';
import type { AssistantConversationSummary, AssistantStoredMessage } from './assistant-types';

export type AppendAssistantMessageInput = {
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  imageFileName?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
};

export function createConversationTitle(message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) return '新的 AI 对话';
  return normalized.length > 32 ? `${normalized.slice(0, 32)}...` : normalized;
}

export function toStoredImageMetadata(input: Pick<AppendAssistantMessageInput, 'imageFileName' | 'imageMimeType' | 'imageSize'>) {
  const hasImage = Boolean(input.imageFileName && input.imageMimeType);
  return {
    hasImage,
    imageFileName: hasImage ? input.imageFileName ?? null : null,
    imageMimeType: hasImage ? input.imageMimeType ?? null : null,
    imageSize: hasImage ? input.imageSize ?? null : null,
  };
}

export async function createConversation(userId: number, title = '新的 AI 对话'): Promise<number> {
  const conversation = await prisma.aiConversation.create({
    data: { userId, title },
    select: { id: true },
  });
  return conversation.id;
}

export async function assertConversationOwner(conversationId: number, userId: number) {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  return Boolean(conversation);
}

export async function appendMessage(input: AppendAssistantMessageInput): Promise<void> {
  const image = toStoredImageMetadata(input);
  await prisma.aiMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      ...image,
    },
  });
  await prisma.aiConversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });
}

export async function listConversations(userId: number): Promise<AssistantConversationSummary[]> {
  const conversations = await prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    lastMessage: conversation.messages[0]?.content ?? '',
  }));
}

export async function getConversationMessages(conversationId: number, userId: number): Promise<AssistantStoredMessage[] | null> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) return null;

  return conversation.messages.map((message) => ({
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    hasImage: message.hasImage,
    imageFileName: message.imageFileName,
    imageMimeType: message.imageMimeType,
    imageSize: message.imageSize,
    createdAt: message.createdAt,
  }));
}

export async function deleteConversation(conversationId: number, userId: number): Promise<boolean> {
  const owned = await assertConversationOwner(conversationId, userId);
  if (!owned) return false;
  await prisma.aiConversation.delete({ where: { id: conversationId } });
  return true;
}
