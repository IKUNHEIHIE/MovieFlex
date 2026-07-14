import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (isAuthorizationFailure(actor)) return actor;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ success: false, error: '记录无效' }, { status: 400 });
  await prisma.watchHistory.deleteMany({ where: { id, userId: actor.userId } }); return NextResponse.json({ success: true });
}
