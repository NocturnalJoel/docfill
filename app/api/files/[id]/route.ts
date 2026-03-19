import { NextRequest, NextResponse } from 'next/server';
import { getUploadedFilePath, getHtmlContent } from '@/lib/store';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Serve HTML sidecar for Word documents
    if (request.nextUrl.searchParams.get('html') === 'true') {
      const html = getHtmlContent(id);
      if (!html) return NextResponse.json({ error: 'HTML not found' }, { status: 404 });
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const filePath = getUploadedFilePath(id);

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf'
      : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/octet-stream';

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('File serve error:', err);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
