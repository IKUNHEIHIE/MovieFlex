import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { validateCollectionUrl } from '@/lib/collection-url';

// GET: 获取所有配置的采集源
export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const sources = await prisma.collectSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: sources });
  } catch {
    return NextResponse.json({ success: false, error: '读取采集源失败' }, { status: 500 });
  }
}

// POST: 添加新采集源
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const { name, apiUrl, sourceKey, format } = await request.json();
    const normalizedUrl = validateCollectionUrl(apiUrl);

    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof sourceKey !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(sourceKey) || !normalizedUrl) {
      return NextResponse.json({ success: false, error: '请填写所有必填字段' }, { status: 400 });
    }

    // 校验 format 是否有效
    if (format !== 'JSON' && format !== 'XML') {
      return NextResponse.json({ success: false, error: '不支持的文件格式，只允许 JSON 或 XML' }, { status: 400 });
    }

    const source = await prisma.collectSource.create({
      data: {
        name,
        apiUrl: normalizedUrl,
        sourceKey,
        format,
      },
    });

    return NextResponse.json({ success: true, data: source });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: '资源标识 (sourceKey) 已存在' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: '新增采集源失败' }, { status: 500 });
  }
}
