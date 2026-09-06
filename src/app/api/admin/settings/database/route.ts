import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import { getCurrentDatabaseConfig, switchDatabase } from '@/lib/db-switcher';

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthorizationFailure(auth)) return auth;

  const config = getCurrentDatabaseConfig();
  return NextResponse.json({ success: true, data: config });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthorizationFailure(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const { type, url } = body;

  if (!type || (type !== 'sqlite' && type !== 'mysql')) {
    return NextResponse.json({ success: false, error: '数据库类型必须为 sqlite 或 mysql' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ success: false, error: '数据库连接串不能为空' }, { status: 400 });
  }

  const result = await switchDatabase(type, url.trim());
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: result.message });
}
