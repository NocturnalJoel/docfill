import { NextRequest, NextResponse } from 'next/server';
import { getClientDocuments } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documents = getClientDocuments(params.id);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('Get client documents error:', err);
    return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });
  }
}
