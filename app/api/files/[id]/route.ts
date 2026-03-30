import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDevRequest } from '@/lib/dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isDevRequest(request)) {
      const store = await import('@/lib/store');

      if (request.nextUrl.searchParams.get('html') === 'true') {
        const html = store.getHtmlContent(id);
        if (!html) return NextResponse.json({ error: 'HTML not found' }, { status: 404 });
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      const filePath = store.getUploadedFilePath(id);
      if (!filePath) return NextResponse.json({ error: 'File not found' }, { status: 404 });

      const fileExt = filePath.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx';
      const contentType = fileExt === '.pdf' ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const buffer = fs.readFileSync(filePath);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${id}${fileExt}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    if (request.nextUrl.searchParams.get('html') === 'true') {
      const htmlPath = `${user.id}/${id}.html`;
      const { data: htmlData, error } = await admin.storage.from('uploads').download(htmlPath);
      if (error || !htmlData) return NextResponse.json({ error: 'HTML not found' }, { status: 404 });
      const html = await htmlData.text();
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    let storagePath: string | null = null;
    let fileExt = '';

    const { data: tmpl } = await admin
      .from('templates')
      .select('file_url, file_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (tmpl) {
      storagePath = tmpl.file_url;
      fileExt = tmpl.file_name.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx';
    } else {
      const { data: doc } = await admin
        .from('client_documents')
        .select('file_url, file_name')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (doc) {
        storagePath = doc.file_url;
        fileExt = doc.file_name.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx';
      }
    }

    if (!storagePath) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const { data: fileData, error: downloadError } = await admin.storage
      .from('uploads')
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const contentType = fileExt === '.pdf' ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const arrayBuffer = await fileData.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${id}${fileExt}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('File serve error:', err);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
