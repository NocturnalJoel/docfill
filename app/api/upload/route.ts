import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseWordDocument } from '@/lib/document-parser';
import { ClientDocument, Template } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = (formData.get('uploadType') as string) || 'document';
    const clientId = formData.get('clientId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf'
      : fileName.toLowerCase().endsWith('.docx') ? '.docx'
      : null;

    if (!ext) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    const fileType = ext === '.pdf' ? 'pdf' : 'word';
    const id = uuidv4();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to Supabase Storage
    const storagePath = `${user.id}/${id}${ext}`;
    const { error: uploadError } = await admin.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'File upload failed', details: uploadError.message }, { status: 500 });
    }

    const fileUrl = `/api/files/${id}`;

    if (uploadType === 'template') {
      let fields: Template['fields'] = [];
      let pageCount = 1;
      let wordHtml: string | undefined;

      if (fileType === 'word') {
        const parsed = await parseWordDocument(buffer);
        fields = parsed.templateFields;
        pageCount = parsed.pageCount;
        wordHtml = parsed.html;

        // Store HTML sidecar in Storage
        await admin.storage
          .from('uploads')
          .upload(`${user.id}/${id}.html`, Buffer.from(parsed.html, 'utf-8'), {
            contentType: 'text/html; charset=utf-8',
            upsert: false,
          });
      }

      const template: Template = {
        id,
        name: fileName.replace(/\.[^/.]+$/, ''),
        fileName,
        fileType,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        fields,
        pageCount,
      };

      const { error: dbError } = await admin.from('templates').insert({
        id: template.id,
        user_id: user.id,
        name: template.name,
        file_name: template.fileName,
        file_type: template.fileType,
        file_url: storagePath,
        uploaded_at: template.uploadedAt,
        fields: template.fields,
        page_count: template.pageCount,
      });

      if (dbError) {
        return NextResponse.json({ error: 'Failed to save template', details: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ template, wordHtml });
    } else {
      if (!clientId) {
        return NextResponse.json({ error: 'clientId is required for document uploads' }, { status: 400 });
      }

      let fields: ClientDocument['fields'] = [];
      let pageCount = 1;
      let wordHtml: string | undefined;

      if (fileType === 'word') {
        const parsed = await parseWordDocument(buffer);
        fields = parsed.fields;
        pageCount = parsed.pageCount;
        wordHtml = parsed.html;

        await admin.storage
          .from('uploads')
          .upload(`${user.id}/${id}.html`, Buffer.from(parsed.html, 'utf-8'), {
            contentType: 'text/html; charset=utf-8',
            upsert: false,
          });
      }

      const doc: ClientDocument = {
        id,
        clientId,
        fileName,
        fileType,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        fields,
        pageCount,
      };

      const { error: dbError } = await admin.from('client_documents').insert({
        id: doc.id,
        client_id: doc.clientId,
        user_id: user.id,
        file_name: doc.fileName,
        file_type: doc.fileType,
        file_url: storagePath,
        uploaded_at: doc.uploadedAt,
        fields: doc.fields,
        page_count: doc.pageCount,
      });

      if (dbError) {
        return NextResponse.json({ error: 'Failed to save document', details: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ document: doc, wordHtml });
    }
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 });
  }
}
