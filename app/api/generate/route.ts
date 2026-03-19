import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, getDocument, getUploadedFilePath } from '@/lib/store';
import { FieldValue } from '@/lib/types';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  templateId: string;
  fieldValues: FieldValue[]; // { fieldName, value } pairs
  outputFormat?: 'docx' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateRequest;
    const { templateId, fieldValues, outputFormat } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const templateFilePath = getUploadedFilePath(templateId);
    if (!templateFilePath || !fs.existsSync(templateFilePath)) {
      return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }

    const fieldMap = new Map<string, string>();
    const underlinedFields = new Set<string>();
    for (const fv of (fieldValues || [])) {
      fieldMap.set(fv.fieldName, fv.value);
      if (fv.underlined) underlinedFields.add(fv.fieldName);
    }

    if (template.fileType === 'word') {
      return await generateWordDocument(templateFilePath, template.fileName, fieldMap, outputFormat);
    } else {
      return await generatePdfDocument(templateFilePath, template.fileName, template.fields, fieldMap, underlinedFields);
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
  // (handles docs where fields were detected as label-only, not {{placeholder}} style)
  let xmlContent = zip.files['word/document.xml']?.asText() || '';
  fieldMap.forEach((value, fieldName) => {
    // Escape special XML chars in the field name
    const xmlLabel = fieldName
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Escape special regex chars
    const reLabel = xmlLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Case 1: label + underscores in the same <w:t> element
    // e.g. <w:t>Name :___________</w:t> → <w:t>Name : Janet</w:t>
    const sameElemRe = new RegExp(
      `(<w:t[^>]*>)(${reLabel}\\s*:)\\s*_{3,}(</w:t>)`,
      'gi'
    );
    const after1 = xmlContent.replace(sameElemRe, `$1$2 ${value}$3`);
    if (after1 !== xmlContent) {
      xmlContent = after1;
      return;
    }

    // Case 2: label in one <w:t>, underscores in a separate <w:r> run in the same paragraph.
    // Replaces the underscore text with the value and ensures the run has underline formatting,
    // so the value appears on top of (and styled like) the original blank line.
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

    // Fallback: no underscores found — just append value after the colon
    const fallbackRe = new RegExp(
      `(<w:t(?:\\s[^>]*)?>)(${reLabel}\\s*:)\\s*(</w:t>)`,
      'gi'
    );
    xmlContent = xmlContent.replace(fallbackRe, `$1$2 ${value}$3`);
  });
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
    // No {{}} placeholders — return the label-replaced XML result
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
  const os = await import('os');

  // Try common LibreOffice install locations
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
    throw new Error(
      'LibreOffice is not installed. Install LibreOffice to export Word templates as PDF.'
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docfill-'));
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
    const value = fieldMap.get(field.fieldName);
    if (!value) continue;

    const pageIndex = field.rectangle.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert normalized coords to PDF coords (PDF y is from bottom)
    const x = field.rectangle.x * pageWidth;
    const y = (1 - field.rectangle.y - field.rectangle.height) * pageHeight;
    const rectWidth = field.rectangle.width * pageWidth;
    const rectHeight = field.rectangle.height * pageHeight;

    const fontSize = Math.min(12, rectHeight * 0.7);

    // Draw a white background rectangle to cover any placeholder
    page.drawRectangle({
      x,
      y,
      width: rectWidth,
      height: rectHeight,
      color: rgb(1, 1, 1),
    });

    // Draw the text value
    const textY = y + (rectHeight - fontSize) / 2 + 2;
    page.drawText(value, {
      x: x + 2,
      y: textY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: rectWidth - 4,
    });

    // Draw underline only if the source value was underlined
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
