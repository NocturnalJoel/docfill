import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveUploadedFile, saveHtmlFile, createDocument, createTemplate } from '@/lib/store';
import { parseWordDocument } from '@/lib/document-parser';
import { ClientDocument, Template } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = (formData.get('uploadType') as string) || 'document'; // 'document' | 'template'
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

    // Save file to disk
    saveUploadedFile(id, buffer, ext);

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
        // Persist HTML so it can be retrieved later
        saveHtmlFile(id, parsed.html);
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

      createTemplate(template);
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
        saveHtmlFile(id, parsed.html);
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

      createDocument(doc);
      return NextResponse.json({ document: doc, wordHtml });
    }
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 });
  }
}
