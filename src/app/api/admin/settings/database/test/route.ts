import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import { testDatabaseConnection } from '@/lib/db-switcher';

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

  const result = await testDatabaseConnection(type, url.trim());
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: '数据库连接测试通过！' });
}
