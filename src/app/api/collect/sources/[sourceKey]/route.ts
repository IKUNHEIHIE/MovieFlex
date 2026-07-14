import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateCollectionUrl } from '@/lib/collection-url';

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sourceKey: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  const { sourceKey } = await params;
  const body = await request.json();
  const data: { name?: string; apiUrl?: string; format?: 'JSON' | 'XML'; isActive?: boolean } = {};
  if ('name' in body) { if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) return NextResponse.json({ success: false, error: '来源名称无效' }, { status: 400 }); data.name = body.name.trim(); }
  if ('apiUrl' in body) { const apiUrl = validateCollectionUrl(body.apiUrl); if (!apiUrl) return NextResponse.json({ success: false, error: '采集地址必须是可信的 HTTPS 公网地址' }, { status: 400 }); data.apiUrl = apiUrl; }
  if ('format' in body) { if (body.format !== 'JSON' && body.format !== 'XML') return NextResponse.json({ success: false, error: '采集格式无效' }, { status: 400 }); data.format = body.format; }
  if ('isActive' in body) { if (typeof body.isActive !== 'boolean') return NextResponse.json({ success: false, error: '启用状态无效' }, { status: 400 }); data.isActive = body.isActive; }
  if (!Object.keys(data).length) return NextResponse.json({ success: false, error: '没有可更新字段' }, { status: 400 });
  try { return NextResponse.json({ success: true, data: await prisma.collectSource.update({ where: { sourceKey }, data }) }); }
  catch { return NextResponse.json({ success: false, error: '采集源不存在' }, { status: 404 }); }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ sourceKey: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  try { await prisma.collectSource.delete({ where: { sourceKey: (await params).sourceKey } }); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ success: false, error: '采集源不存在' }, { status: 404 }); }
}
