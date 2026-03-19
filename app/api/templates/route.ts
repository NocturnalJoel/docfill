import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = getTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('Get templates error:', err);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}
