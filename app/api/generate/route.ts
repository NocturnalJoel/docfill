import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FieldValue } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  templateId: string;
  fieldValues: FieldValue[];
  outputFormat?: 'docx' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as GenerateRequest;
    const { templateId, fieldValues, outputFormat } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get template record
    const { data: tmpl, error: tmplError } = await admin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (tmplError || !tmpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Download template file from Storage to a temp file
    const { data: fileData, error: downloadError } = await admin.storage
      .from('uploads')
      .download(tmpl.file_url);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }

    const ext = tmpl.file_name.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx';
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docfill-'));
    const tmpFilePath = path.join(tmpDir, `template${ext}`);

    try {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(tmpFilePath, buffer);

      // Build fieldMap with both original and normalized keys for case-insensitive matching
      const fieldMap = new Map<string, string>();
      const underlinedFields = new Set<string>();
      for (const fv of (fieldValues || [])) {
        if (!fv.fieldName?.trim() || !fv.value?.trim()) continue;
        fieldMap.set(fv.fieldName.trim(), fv.value);
        fieldMap.set(fv.fieldName.trim().toLowerCase(), fv.value);
        if (fv.underlined) {
          underlinedFields.add(fv.fieldName.trim());
          underlinedFields.add(fv.fieldName.trim().toLowerCase());
        }
      }

      const template = {
        fileType: tmpl.file_type as 'pdf' | 'word',
        fileName: tmpl.file_name,
        fields: tmpl.fields ?? [],
      };

      if (template.fileType === 'word') {
        return await generateWordDocument(tmpFilePath, template.fileName, fieldMap, outputFormat);
      } else {
        return await generatePdfDocument(tmpFilePath, template.fileName, template.fields, fieldMap, underlinedFields);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Generation failed', details: String(err) }, { status: 500 });
  }
}

async function generateWordDocument(
  templateFilePath: string,
  originalFileName: string,
  fieldMap: Map<string, string>,
  outputFormat?: 'docx' | 'pdf'
) {
  const PizZip = (await import('pizzip')).default;
  const Docxtemplater = (await import('docxtemplater')).default;

  const content = fs.readFileSync(templateFilePath, 'binary');
  const zip = new PizZip(content);

  // Step 1: Direct XML label replacement for "Label :" style fields
  let xmlContent = zip.files['word/document.xml']?.asText() || '';
  fieldMap.forEach((value, fieldName) => {
    const xmlLabel = fieldName
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const reLabel = xmlLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const sameElemRe = new RegExp(
      `(<w:t[^>]*>)(${reLabel}\\s*:)\\s*_{3,}(</w:t>)`,
      'gi'
    );
    const after1 = xmlContent.replace(sameElemRe, `$1$2 ${value}$3`);
    if (after1 !== xmlContent) {
      xmlContent = after1;
      return;
    }

    const crossRunRe = new RegExp(
      `(${reLabel}\\s*:\\s*</w:t>(?:(?!</w:p>)[\\s\\S])*?)` +
      `(<w:r(?:\\s[^>]*)?>)` +
      `((?:<w:rPr>(?:(?!</w:rPr>)[\\s\\S])*?</w:rPr>)?)` +
      `(<w:t[^>]*>)_{3,}(</w:t>)(</w:r>)`,
      'gi'
    );
    const after2 = xmlContent.replace(
      crossRunRe,
      (_m, before, runOpen, rPr, tOpen, tClose, runClose) => {
        let newRPr: string;
        if (!rPr) {
          newRPr = '<w:rPr><w:u w:val="single"/></w:rPr>';
        } else if (!/<w:u\b/.test(rPr)) {
          newRPr = rPr.replace('</w:rPr>', '<w:u w:val="single"/></w:rPr>');
        } else {
          newRPr = rPr;
        }
        return `${before}${runOpen}${newRPr}${tOpen}${value}${tClose}${runClose}`;
      }
    );
    if (after2 !== xmlContent) {
      xmlContent = after2;
      return;
    }

    const fallbackRe = new RegExp(
      `(<w:t(?:\\s[^>]*)?>)(${reLabel}\\s*:)\\s*(</w:t>)`,
      'gi'
    );
    xmlContent = xmlContent.replace(fallbackRe, `$1$2 ${value}$3`);
  });
  // Step 1b: Paragraph-level fallback for labels split across multiple <w:r> runs.
  // Concatenate all <w:t> text in each paragraph; if it matches "FieldName:" (with optional
  // trailing underscores), append the value as a new run. This handles the common Word XML
  // pattern where "First Name:" is stored in separate runs and the per-element regex above missed it.
  {
    // Deduplicate fieldMap keys (it has both "Name" and "name") — use one entry per field
    const seenNorm2 = new Set<string>();
    const uniqueEntries: Array<[string, string]> = [];
    for (const [k, v] of fieldMap.entries()) {
      const norm = k.toLowerCase();
      if (!seenNorm2.has(norm)) { seenNorm2.add(norm); uniqueEntries.push([k, v]); }
    }

    xmlContent = xmlContent.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
      // Concatenate all <w:t> text content within this paragraph
      const paraText: string[] = [];
      const tRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tm: RegExpExecArray | null;
      while ((tm = tRe.exec(para)) !== null) {
        paraText.push(tm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      }
      const fullText = paraText.join('').trim();
      if (!fullText) return para;

      for (const [fieldName, value] of uniqueEntries) {
        const esc = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match "FieldName:" or "FieldName: ___..." — must have colon, trailing underscores OK
        if (new RegExp(`^${esc}\\s*:\\s*_*\\s*$`, 'i').test(fullText)) {
          return para.replace(/<\/w:p>/, `<w:r><w:t xml:space="preserve"> ${value}</w:t></w:r></w:p>`);
        }
      }
      return para;
    });
  }
  zip.file('word/document.xml', xmlContent);

  // Step 2: docxtemplater for {{placeholder}} style fields
  const context: Record<string, string> = {};
  fieldMap.forEach((value, key) => {
    context[key.replace(/[^a-zA-Z0-9_]/g, '_')] = value;
    context[key] = value;
  });

  let docxBuf: Buffer;
  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });
    doc.render(context);
    docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch (err) {
    console.warn('Docxtemplater skipped (no placeholders):', err);
    docxBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  if (outputFormat === 'pdf') {
    const pdfBuf = await convertDocxToPdf(docxBuf);
    const outName = `filled_${path.basename(originalFileName, path.extname(originalFileName))}.pdf`;
    return new NextResponse(pdfBuf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outName}"`,
      },
    });
  }

  const outName = `filled_${originalFileName}`;
  return new NextResponse(docxBuf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${outName}"`,
    },
  });
}

async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const { execSync } = await import('child_process');

  const candidates = [
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    'soffice',
    'libreoffice',
  ];

  let soffice = '';
  for (const candidate of candidates) {
    try {
      execSync(`"${candidate}" --version`, { stdio: 'ignore', timeout: 5000 });
      soffice = candidate;
      break;
    } catch {
      // not found, try next
    }
  }

  if (!soffice) {
    throw new Error('LibreOffice is not installed. Install LibreOffice to export Word templates as PDF.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docfill-pdf-'));
  const tmpDocx = path.join(tmpDir, 'document.docx');
  const tmpPdf = path.join(tmpDir, 'document.pdf');

  try {
    fs.writeFileSync(tmpDocx, docxBuffer);
    execSync(`"${soffice}" --headless --convert-to pdf "${tmpDocx}" --outdir "${tmpDir}"`, {
      timeout: 30000,
    });
    return fs.readFileSync(tmpPdf);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function generatePdfDocument(
  templateFilePath: string,
  originalFileName: string,
  fields: Array<{ fieldName: string; rectangle: { x: number; y: number; width: number; height: number; pageNumber: number } }>,
  fieldMap: Map<string, string>,
  underlinedFields: Set<string> = new Set()
) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const existingPdfBytes = fs.readFileSync(templateFilePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    const value = fieldMap.get(field.fieldName.trim()) ?? fieldMap.get(field.fieldName.trim().toLowerCase());
    if (!value) continue;

    const pageIndex = field.rectangle.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const x = field.rectangle.x * pageWidth;
    const y = (1 - field.rectangle.y - field.rectangle.height) * pageHeight;
    const rectWidth = field.rectangle.width * pageWidth;
    const rectHeight = field.rectangle.height * pageHeight;

    const fontSize = Math.min(12, rectHeight * 0.7);

    page.drawRectangle({ x, y, width: rectWidth, height: rectHeight, color: rgb(1, 1, 1) });

    const textY = y + (rectHeight - fontSize) / 2 + 2;
    page.drawText(value, {
      x: x + 2,
      y: textY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: rectWidth - 4,
    });

    if (underlinedFields.has(field.fieldName)) {
      const textWidth = Math.min(font.widthOfTextAtSize(value, fontSize), rectWidth - 4);
      page.drawLine({
        start: { x: x + 2, y: textY - 1 },
        end: { x: x + 2 + textWidth, y: textY - 1 },
        thickness: 0.75,
        color: rgb(0, 0, 0),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outName = `filled_${path.basename(originalFileName, '.pdf')}.pdf`;

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${outName}"`,
    },
  });
}
