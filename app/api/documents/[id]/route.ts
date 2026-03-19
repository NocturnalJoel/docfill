import { NextRequest, NextResponse } from 'next/server';
import { getDocument, deleteDocument, deleteUploadedFile } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = getDocument(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error('Get document error:', err);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = getDocument(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    deleteUploadedFile(params.id);
    const deleted = deleteDocument(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete document error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
