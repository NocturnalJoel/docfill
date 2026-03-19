import { NextRequest, NextResponse } from 'next/server';
import { getDocument, updateDocument } from '@/lib/store';
import { DetectedField } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { fields, pageCount } = body as { fields: DetectedField[]; pageCount?: number };

    const doc = getDocument(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const updates: { fields: DetectedField[]; pageCount?: number } = { fields };
    if (pageCount !== undefined) updates.pageCount = pageCount;

    const updated = updateDocument(params.id, updates);
    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error('Update document fields error:', err);
    return NextResponse.json({ error: 'Failed to update fields' }, { status: 500 });
  }
}
