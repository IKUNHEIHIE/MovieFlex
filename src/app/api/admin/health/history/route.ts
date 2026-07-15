import { NextResponse } from 'next/server';
import { getHealthHistory } from '@/lib/health';

export async function GET() {
  try {
    const history = getHealthHistory();
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Health history fetch failed:', error);
    return NextResponse.json(
      { success: false, data: [] },
      { status: 500 }
    );
  }
}
