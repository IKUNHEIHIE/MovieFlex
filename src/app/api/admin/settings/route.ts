import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import { getAdminSystemSettings, saveAdminSystemSettings } from '@/lib/system-settings';

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthorizationFailure(auth)) return auth;

  const settings = await getAdminSystemSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthorizationFailure(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  await saveAdminSystemSettings({
    siteName: body.siteName,
    siteSlogan: body.siteSlogan,
    siteDescription: body.siteDescription,
    siteLogoUrl: body.siteLogoUrl,
    siteFaviconUrl: body.siteFaviconUrl,
    aiBaseUrl: body.aiBaseUrl,
    aiModelId: body.aiModelId,
    aiApiKey: body.aiApiKey,
  });

  return NextResponse.json({ success: true });
}
