import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationFailure, requireUser } from '@/lib/auth/authorization';
import { createConversation, listConversations } from '@/lib/assistant-store';
import { createConversationTitle } from '@/lib/assistant-store';

export async function GET() {
  const auth = await requireUser();
  if (isAuthorizationFailure(auth)) return auth;

  const conversations = await listConversations(auth.userId);
  return NextResponse.json({ success: true, data: conversations });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (isAuthorizationFailure(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const conversationId = await createConversation(auth.userId, title || createConversationTitle('新的 AI 对话'));

  return NextResponse.json({ success: true, data: { conversationId } });
}
