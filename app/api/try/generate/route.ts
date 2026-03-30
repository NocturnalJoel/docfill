import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();
    const format = (formData.get('format') as string) === 'pdf' ? 'pdf' : 'docx';
    const fieldsJson = (formData.get('fields') as string) ?? '[]';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    // Check if email already used for a trial
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('trial_leads')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: 'This email has already been used for a free trial. Subscribe to get unlimited access.',
        alreadyUsed: true,
      }, { status: 403 });
    }

    // Parse field values
    const fields: Array<{
      fieldName: string;
      value: string;
      placeholder?: string;
      rectangle?: { x: number; y: number; width: number; height: number; pageNumber: number } | null;
      containerWidth?: number;
      containerHeight?: number;
    }> = JSON.parse(fieldsJson);
    const fieldMap = new Map<string, string>();
    const placeholderMap = new Map<string, string>(); // placeholder text → value
    const positionalFields: Array<{ fieldName: string; value: string; x: number; y: number; w: number; h: number; containerWidth: number; containerHeight: number }> = [];
    for (const f of fields) {
      if (f.fieldName?.trim()) {
        fieldMap.set(f.fieldName.trim(), f.value ?? '');
      }
      // Auto-generated drawn fields (placeholder={{field_N}}) need absolute-position text box insertion
      if (f.placeholder && /^\{\{field_\d+\}\}$/.test(f.placeholder) && f.value) {
        positionalFields.push({
          fieldName: f.fieldName,
          value: f.value,
          x: f.rectangle?.x ?? 0.1,
          y: f.rectangle?.y ?? 0.5,
          w: f.rectangle?.width ?? 0.3,
          h: f.rectangle?.height ?? 0.04,
          containerWidth: f.containerWidth ?? 680,
          containerHeight: f.containerHeight ?? 900,
        });
      } else if (f.placeholder?.trim() && f.value != null) {
        placeholderMap.set(f.placeholder.trim(), f.value ?? '');
      }
    }

    // Record the lead before generating
    await admin.from('trial_leads').insert({ email, file_name: file.name });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docfill-trial-'));
    const tmpFilePath = path.join(tmpDir, 'template.docx');

    try {
      fs.writeFileSync(tmpFilePath, buffer);
      return await generateWordDocument(tmpFilePath, file.name, fieldMap, placeholderMap, positionalFields, format as 'docx' | 'pdf');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Trial generate error:', err);
    return NextResponse.json({ error: 'Generation failed', details: String(err) }, { status: 500 });
  }
}

async function generateWordDocument(
  templateFilePath: string,
  originalFileName: string,
  fieldMap: Map<string, string>,
  placeholderMap: Map<string, string>,
  positionalFields: Array<{ fieldName: string; value: string; y: number }>,
  outputFormat: 'docx' | 'pdf'
) {
  const PizZip = (await import('pizzip')).default;
  const Docxtemplater = (await import('docxtemplater')).default;

  const content = fs.readFileSync(templateFilePath, 'binary');
  const zip = new PizZip(content);

  // Direct XML label replacement for "Label: ___" style fields
  let xmlContent = zip.files['word/document.xml']?.asText() ?? '';

  // Pass 0: replace [Name] bracket-style placeholders (not handled by label regex or docxtemplater)
  placeholderMap.forEach((value, placeholder) => {
    if (!/^\[.+\]$/.test(placeholder)) return; // only bracket-style
    const xmlPlaceholder = placeholder
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rePlaceholder = xmlPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(<w:t[^>]*>(?:[^<]*)?)(${rePlaceholder})((?:[^<]*)?</w:t>)`, 'gi');
    xmlContent = xmlContent.replace(re, (_m, before, _ph, after) => `${before}${value}${after}`);
  });

  // Pass 0b: drawn fields — insert as absolutely-positioned floating text boxes at the drawn coordinates
  if (positionalFields.length > 0) {
    // Read page size and margins from the XML (twips → EMU: multiply by 914400/1440 = 635)
    const pgSzMatch = xmlContent.match(/<w:pgSz[^/]*w:w="(\d+)"[^/]*w:h="(\d+)"/);
    const pgMarMatch = xmlContent.match(/<w:pgMar[^/]*w:top="(\d+)"[^/]*w:right="(\d+)"[^/]*w:bottom="(\d+)"[^/]*w:left="(\d+)"/);
    const pageWTwips = pgSzMatch ? parseInt(pgSzMatch[1]) : 12240;
    const pageHTwips = pgSzMatch ? parseInt(pgSzMatch[2]) : 15840;
    const marginTopTwips = pgMarMatch ? parseInt(pgMarMatch[1]) : 1440;
    const marginRightTwips = pgMarMatch ? parseInt(pgMarMatch[2]) : 1440;
    const marginBottomTwips = pgMarMatch ? parseInt(pgMarMatch[3]) : 1440;
    const marginLeftTwips = pgMarMatch ? parseInt(pgMarMatch[4]) : 1440;
    const contentWEmu = (pageWTwips - marginLeftTwips - marginRightTwips) * 635;
    const contentHEmu = (pageHTwips - marginTopTwips - marginBottomTwips) * 635;

    let shapeId = 9000;
    const textBoxParagraphs: string[] = [];
    for (const pf of positionalFields) {
      // Rectangle coords are fractions of the HTML container (which has p-8 = 32px padding).
      // Subtract padding to get content-relative pixels, then scale each axis independently:
      //   x: content pixels → contentWEmu  (x-axis scale)
      //   y: content pixels → contentHEmu  (y-axis scale)
      const PADDING_PX = 32; // Tailwind p-8
      const contentPxW = pf.containerWidth - PADDING_PX * 2;
      const contentPxH = pf.containerHeight - PADDING_PX * 2;
      const xPx = pf.x * pf.containerWidth - PADDING_PX;
      const yPx = pf.y * pf.containerHeight - PADDING_PX;
      const posXEmu = Math.round(Math.max(0, xPx / contentPxW) * contentWEmu);
      const posYEmu = Math.round(Math.max(0, yPx / contentPxH) * contentHEmu);
      const cxEmu = Math.max(Math.round((pf.w * pf.containerWidth / contentPxW) * contentWEmu), 914400);
      const cyEmu = Math.max(Math.round((pf.h * pf.containerHeight / contentPxH) * contentHEmu), 228600);
      const xmlValue = pf.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      shapeId++;
      textBoxParagraphs.push(
        `<w:p><w:r><w:drawing>` +
        `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
        `<wp:simplePos x="0" y="0"/>` +
        `<wp:positionH relativeFrom="margin"><wp:posOffset>${posXEmu}</wp:posOffset></wp:positionH>` +
        `<wp:positionV relativeFrom="margin"><wp:posOffset>${posYEmu}</wp:posOffset></wp:positionV>` +
        `<wp:extent cx="${cxEmu}" cy="${cyEmu}"/>` +
        `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
        `<wp:wrapNone/>` +
        `<wp:docPr id="${shapeId}" name="Field ${shapeId}"/>` +
        `<wp:cNvGraphicFramePr/>` +
        `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
        `<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">` +
        `<wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">` +
        `<wps:cNvSpPr><a:spLocks noChangeArrowheads="1"/></wps:cNvSpPr>` +
        `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxEmu}" cy="${cyEmu}"/></a:xfrm>` +
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>` +
        `<wps:txbx><w:txbxContent><w:p><w:r><w:t>${xmlValue}</w:t></w:r></w:p></w:txbxContent></wps:txbx>` +
        `<wps:bodyPr anchor="t" anchorCtr="0"><a:spAutoFit/></wps:bodyPr>` +
        `</wps:wsp></a:graphicData></a:graphic>` +
        `</wp:anchor></w:drawing></w:r></w:p>`
      );
    }
    // Insert all text box paragraphs just before </w:body>
    xmlContent = xmlContent.replace('</w:body>', textBoxParagraphs.join('') + '</w:body>');
  }

  fieldMap.forEach((value, fieldName) => {
    const xmlLabel = fieldName
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const reLabel = xmlLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const sameElemRe = new RegExp(
      `(<w:t[^>]*>)(${reLabel}\\s*:)\\s*_{3,}(</w:t>)`,
      'gi'
    );
    const after1 = xmlContent.replace(sameElemRe, `$1$2 ${value}$3`);
    if (after1 !== xmlContent) { xmlContent = after1; return; }

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
        const newRPr = rPr
          ? (/<w:u\b/.test(rPr) ? rPr : rPr.replace('</w:rPr>', '<w:u w:val="single"/></w:rPr>'))
          : '<w:rPr><w:u w:val="single"/></w:rPr>';
        return `${before}${runOpen}${newRPr}${tOpen}${value}${tClose}${runClose}`;
      }
    );
    if (after2 !== xmlContent) { xmlContent = after2; return; }

    const fallbackRe = new RegExp(
      `(<w:t(?:\\s[^>]*)?>)(${reLabel}\\s*:)\\s*(</w:t>)`,
      'gi'
    );
    xmlContent = xmlContent.replace(fallbackRe, `$1$2 ${value}$3`);
  });
  zip.file('word/document.xml', xmlContent);

  // docxtemplater for {{placeholder}} style fields
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
  } catch {
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
    } catch { /* not found */ }
  }

  if (!soffice) {
    throw new Error('LibreOffice is required to export as PDF. Subscribe to access PDF generation.');
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
