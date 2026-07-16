import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationFailure, requireUser } from '@/lib/auth/authorization';
import { deleteConversation, getConversationMessages } from '@/lib/assistant-store';

function parseConversationId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isAuthorizationFailure(auth)) return auth;

  const { id } = await context.params;
  const conversationId = parseConversationId(id);
  if (!conversationId) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  const messages = await getConversationMessages(conversationId, auth.userId);
  if (!messages) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  return NextResponse.json({ success: true, data: messages });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isAuthorizationFailure(auth)) return auth;

  const { id } = await context.params;
  const conversationId = parseConversationId(id);
  if (!conversationId) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  const deleted = await deleteConversation(conversationId, auth.userId);
  if (!deleted) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  return NextResponse.json({ success: true });
}
