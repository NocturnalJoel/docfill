import { NextRequest, NextResponse } from 'next/server';
import { parseWordDocument } from '@/lib/document-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are supported here' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseWordDocument(buffer);
    return NextResponse.json({ fields: result.fields, html: result.html, fileType: 'word' });
  } catch (err) {
    console.error('Try parse-client error:', err);
    return NextResponse.json({ error: 'Failed to parse document', details: String(err) }, { status: 500 });
  }
}
