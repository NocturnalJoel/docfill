import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
// WORD SUPPORT - PRESERVED FOR FUTURE USE
// import { parseWordDocument } from '@/lib/document-parser';
import { ClientDocument, Template } from '@/lib/types';
import { isDevRequest } from '@/lib/dev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = (formData.get('uploadType') as string) || 'document';
    const clientId = formData.get('clientId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : null;

    // WORD SUPPORT - PRESERVED FOR FUTURE USE
    // Uncomment the following line and remove the null assignment above to re-enable .docx:
    // const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf'
    //   : fileName.toLowerCase().endsWith('.docx') ? '.docx'
    //   : null;

    if (!ext) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const fileType = 'pdf';
    // WORD SUPPORT - PRESERVED FOR FUTURE USE
    // const fileType = ext === '.pdf' ? 'pdf' : 'word';

    const id = uuidv4();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileUrl = `/api/files/${id}`;

    if (isDevRequest(request)) {
      const store = await import('@/lib/store');

      if (uploadType === 'template') {
        const fields: Template['fields'] = [];
        const pageCount = 1;

        // WORD SUPPORT - PRESERVED FOR FUTURE USE
        // if (fileType === 'word') {
        //   const parsed = await parseWordDocument(buffer);
        //   fields = parsed.templateFields;
        //   pageCount = parsed.pageCount;
        //   wordHtml = parsed.html;
        //   store.saveHtmlFile(id, parsed.html);
        // }

        store.saveUploadedFile(id, buffer, ext);
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
        store.createTemplate(template);
        return NextResponse.json({ template });
      } else {
        if (!clientId) {
          return NextResponse.json({ error: 'clientId is required for document uploads' }, { status: 400 });
        }

        const fields: ClientDocument['fields'] = [];
        const pageCount = 1;

        // WORD SUPPORT - PRESERVED FOR FUTURE USE
        // if (fileType === 'word') {
        //   const parsed = await parseWordDocument(buffer);
        //   fields = parsed.fields;
        //   pageCount = parsed.pageCount;
        //   wordHtml = parsed.html;
        //   store.saveHtmlFile(id, parsed.html);
        // }

        store.saveUploadedFile(id, buffer, ext);
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
        store.createDocument(doc);
        return NextResponse.json({ document: doc });
      }
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Upload file to Supabase Storage
    const storagePath = `${user.id}/${id}${ext}`;
    const { error: uploadError } = await admin.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        // WORD SUPPORT - PRESERVED FOR FUTURE USE
        // contentType: ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'File upload failed', details: uploadError.message }, { status: 500 });
    }

    if (uploadType === 'template') {
      const fields: Template['fields'] = [];
      const pageCount = 1;

      // WORD SUPPORT - PRESERVED FOR FUTURE USE
      // if (fileType === 'word') {
      //   const parsed = await parseWordDocument(buffer);
      //   fields = parsed.templateFields;
      //   pageCount = parsed.pageCount;
      //   const wordHtml = parsed.html;
      //   await admin.storage
      //     .from('uploads')
      //     .upload(`${user.id}/${id}.html`, Buffer.from(parsed.html, 'utf-8'), {
      //       contentType: 'text/html; charset=utf-8',
      //       upsert: false,
      //     });
      // }

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

      return NextResponse.json({ template });
    } else {
      if (!clientId) {
        return NextResponse.json({ error: 'clientId is required for document uploads' }, { status: 400 });
      }

      const fields: ClientDocument['fields'] = [];
      const pageCount = 1;

      // WORD SUPPORT - PRESERVED FOR FUTURE USE
      // if (fileType === 'word') {
      //   const parsed = await parseWordDocument(buffer);
      //   fields = parsed.fields;
      //   pageCount = parsed.pageCount;
      //   const wordHtml = parsed.html;
      //   await admin.storage
      //     .from('uploads')
      //     .upload(`${user.id}/${id}.html`, Buffer.from(parsed.html, 'utf-8'), {
      //       contentType: 'text/html; charset=utf-8',
      //       upsert: false,
      //     });
      // }

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

      return NextResponse.json({ document: doc });
    }
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 });
  }
}
