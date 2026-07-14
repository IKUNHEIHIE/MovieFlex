import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import { validateCollectionUrl } from '@/lib/collector/collection-url';
import { normalizePlayerConfigs } from '@/lib/collector/player-config';
import { suggestSourceKey } from '@/lib/collector/source-key';

const sourceKeyPattern = /^[a-zA-Z0-9_-]{1,50}$/;

function parsePlayerConfigs(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;
    return normalizePlayerConfigs(parsed) as unknown as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const actor = await requireAdmin();
    if (isAuthorizationFailure(actor)) return actor;

    const sources = await prisma.collectSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: sources });
  } catch {
    return NextResponse.json({ success: false, error: '读取采集源失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    if (isAuthorizationFailure(actor)) return actor;

    const { name, apiUrl, sourceKey, format, playerConfigs } = await request.json();
    const normalizedUrl = validateCollectionUrl(apiUrl);

    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !normalizedUrl || (sourceKey !== undefined && (typeof sourceKey !== 'string' || !sourceKeyPattern.test(sourceKey)))) {
      return NextResponse.json({ success: false, error: '请填写所有必填字段' }, { status: 400 });
    }

    if (format !== 'JSON' && format !== 'XML') {
      return NextResponse.json({ success: false, error: '不支持的文件格式，只允许 JSON 或 XML' }, { status: 400 });
    }

    const parsedPlayerConfigs = parsePlayerConfigs(playerConfigs);
    if (playerConfigs !== undefined && playerConfigs !== null && playerConfigs !== '' && !parsedPlayerConfigs) {
      return NextResponse.json({ success: false, error: '播放器配置格式无效' }, { status: 400 });
    }

    const baseSourceKey = sourceKey ?? suggestSourceKey(normalizedUrl);
    let source;
    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? baseSourceKey : `${baseSourceKey.slice(0, 50 - String(suffix).length - 1)}-${suffix}`;
      try {
        source = await prisma.collectSource.create({
          data: {
            name: name.trim(),
            apiUrl: normalizedUrl,
            sourceKey: candidate,
            format,
            playerConfigs: parsedPlayerConfigs ?? Prisma.JsonNull,
          },
        });
        break;
      } catch (error: unknown) {
        if (sourceKey !== undefined || typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') throw error;
      }
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: '资源标识 (sourceKey) 已存在' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: '新增采集源失败' }, { status: 500 });
  }
}
