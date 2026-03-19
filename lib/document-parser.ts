// Server-side document parsing (Word docs via mammoth)
// PDF parsing is done client-side in DocumentViewer.tsx using pdfjs-dist

import { DetectedField, TemplateField, Rectangle } from './types';
import { getFieldColor } from './utils';
import { v4 as uuidv4 } from 'uuid';

// ─── Word Document Parsing (server-side) ────────────────────────────────────

export interface WordParseResult {
  html: string;
  fields: DetectedField[];
  templateFields: TemplateField[];
  pageCount: number;
}

export async function parseWordDocument(buffer: Buffer): Promise<WordParseResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      'u => u',
    ],
  });
  const html = result.value;

  const clientFields = detectWordClientFields(html);
  const templateFields = detectWordTemplateFields(html);

  return {
    html,
    fields: clientFields,
    templateFields,
    pageCount: 1,
  };
}

function detectWordClientFields(html: string): DetectedField[] {
  const fields: DetectedField[] = [];
  let colorIndex = 0;

  // Extract paragraphs from the raw HTML so we can check underline on each one
  const paraRegex = /<(?:p|li|td|th|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|li|td|th|h[1-6])>/gi;
  let lineIndex = 0;
  const allParas: { inner: string; text: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(html)) !== null) {
    const inner = m[1];
    const text = inner
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    if (text) allParas.push({ inner, text });
  }

  for (const { inner, text } of allParas) {
    const colonMatch = text.match(/^([A-Za-z][A-Za-z\s]{1,30})\s*:\s+(.+)$/);
    if (colonMatch) {
      const fieldName = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      if (value.length > 0 && value.length < 200) {
        // Check if the value text appears inside a <u> tag in this paragraph's HTML
        const colonPos = inner.indexOf(':');
        const afterColon = colonPos >= 0 ? inner.slice(colonPos) : '';
        const underlined = /<u\b/i.test(afterColon);

        fields.push({
          id: uuidv4(),
          fieldName,
          value,
          rectangle: approximateWordPosition(lineIndex, allParas.length),
          color: getFieldColor(colorIndex++),
          confirmed: false,
          underlined: underlined || undefined,
        });
      }
    }
    lineIndex++;
  }

  return fields;
}

function detectWordTemplateFields(html: string): TemplateField[] {
  const fields: TemplateField[] = [];
  let colorIndex = 0;

  const plainText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|th|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ');
  const lines = plainText.split('\n').filter((l) => l.trim().length > 0);

  let lineIndex = 0;
  for (const line of lines) {
    // Detect {{fieldname}}
    const doubleBraces = Array.from(line.matchAll(/\{\{([^}]+)\}\}/g));
    for (const match of doubleBraces) {
      fields.push({
        id: uuidv4(),
        fieldName: match[1].trim(),
        placeholder: match[0],
        rectangle: approximateWordPosition(lineIndex, lines.length),
        color: getFieldColor(colorIndex++),
      });
    }

    // Detect [FIELDNAME] or [field name]
    const brackets = Array.from(line.matchAll(/\[([A-Za-z][A-Za-z\s_]{1,30})\]/g));
    for (const match of brackets) {
      fields.push({
        id: uuidv4(),
        fieldName: match[1].trim(),
        placeholder: match[0],
        rectangle: approximateWordPosition(lineIndex, lines.length),
        color: getFieldColor(colorIndex++),
      });
    }

    // Detect ___ (3+ underscores)
    const underscores = Array.from(line.matchAll(/_{3,}/g));
    if (underscores.length > 0) {
      // Try to find a label before the underscores
      const labelMatch = line.match(/^([A-Za-z][A-Za-z\s]{1,25})[:\s]+_{3,}/);
      const fieldName = labelMatch ? labelMatch[1].trim() : `Field_${lineIndex + 1}`;
      fields.push({
        id: uuidv4(),
        fieldName,
        placeholder: '___',
        rectangle: approximateWordPosition(lineIndex, lines.length),
        color: getFieldColor(colorIndex++),
      });
    }

    // Pattern: "Label:" or "Label :" alone on a line (blank value expected)
    const trimmedLine = line.trim();
    const labelOnly = trimmedLine.match(/^([A-Za-z][A-Za-z\s/()]{1,40})\s*:?\s*$/);
    if (labelOnly && trimmedLine.length < 50) {
      const fieldName = labelOnly[1].trim();
      fields.push({
        id: uuidv4(),
        fieldName,
        placeholder: `{{${fieldName}}}`,
        rectangle: approximateWordPosition(lineIndex, lines.length),
        color: getFieldColor(colorIndex++),
      });
    }

    lineIndex++;
  }

  return fields;
}

function approximateWordPosition(lineIndex: number, totalLines: number): Rectangle {
  const yFraction = totalLines > 1 ? lineIndex / totalLines : 0.1;
  return {
    x: 0.05,
    y: Math.max(0.02, Math.min(0.95, yFraction)),
    width: 0.6,
    height: 0.03,
    pageNumber: 1,
  };
}

// ─── Client-side PDF field detection helpers (exported for use in browser) ──
// These run in the browser via DocumentViewer.tsx

export interface PdfTextItem {
  str: string;
  x: number;       // normalized 0-1
  y: number;       // normalized 0-1
  width: number;   // normalized 0-1
  height: number;  // normalized 0-1
  pageNumber: number;
}

export function detectPdfClientFields(items: PdfTextItem[]): DetectedField[] {
  const fields: DetectedField[] = [];
  let colorIndex = 0;

  // Group items by page
  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.pageNumber)) byPage.set(item.pageNumber, []);
    byPage.get(item.pageNumber)!.push(item);
  }

  byPage.forEach((pageItems) => {
    // Sort by y then x (top-to-bottom, left-to-right)
    const sorted = [...pageItems].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

    // Group into rows (items with similar y values)
    const rows: PdfTextItem[][] = [];
    let currentRow: PdfTextItem[] = [];
    let lastY = -1;
    const rowTolerance = 0.015;

    for (const item of sorted) {
      if (lastY === -1 || Math.abs(item.y - lastY) < rowTolerance) {
        currentRow.push(item);
        lastY = item.y;
      } else {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [item];
        lastY = item.y;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);

    // Detect label: value patterns within rows
    for (const row of rows) {
      if (row.length === 0) continue;

      const rowText = row.map((r) => r.str).join(' ');

      // Pattern: "Label: Value" or "Label : Value"
      const colonMatch = rowText.match(/^([A-Za-z][A-Za-z\s/()]{1,30})\s*:\s+(.+)$/);
      if (colonMatch) {
        const fieldName = colonMatch[1].trim();
        const value = colonMatch[2].trim();
        if (value.length > 0 && value.length < 200 && fieldName.length > 1) {
          const firstItem = row[0];
          fields.push({
            id: uuidv4(),
            fieldName,
            value,
            rectangle: {
              x: firstItem.x,
              y: firstItem.y,
              width: Math.min(0.7, row.reduce((acc, r) => Math.max(acc, r.x + r.width), 0) - firstItem.x + 0.05),
              height: Math.max(0.025, firstItem.height + 0.01),
              pageNumber: firstItem.pageNumber,
            },
            color: getFieldColor(colorIndex++),
            confirmed: false,
          });
          continue;
        }
      }

      // Pattern: two adjacent items where first looks like a label (ends with colon or is title-case)
      if (row.length >= 2) {
        const labelItem = row[0];
        const valueItems = row.slice(1);
        const labelText = labelItem.str.trim();
        const valueText = valueItems.map((v) => v.str).join(' ').trim();

        if (
          (labelText.endsWith(':') || /^[A-Z][a-z]/.test(labelText)) &&
          labelText.length < 35 &&
          valueText.length > 0 &&
          valueText.length < 200
        ) {
          const fieldName = labelText.replace(/:$/, '').trim();
          if (fieldName.length > 1) {
            fields.push({
              id: uuidv4(),
              fieldName,
              value: valueText,
              rectangle: {
                x: labelItem.x,
                y: labelItem.y,
                width: Math.min(0.7, valueItems.reduce((acc, r) => Math.max(acc, r.x + r.width), 0) - labelItem.x + 0.02),
                height: Math.max(0.025, labelItem.height + 0.01),
                pageNumber: labelItem.pageNumber,
              },
              color: getFieldColor(colorIndex++),
              confirmed: false,
            });
          }
        }
      }
    }
  });

  return fields;
}

// Common form field labels that strongly indicate a template field
const COMMON_FORM_LABELS = new Set([
  'name', 'full name', 'first name', 'last name', 'given name', 'surname', 'family name',
  'date', 'date of birth', 'dob', 'birth date', 'birthdate',
  'address', 'street address', 'city', 'state', 'zip', 'postal code', 'country',
  'phone', 'telephone', 'mobile', 'cell', 'fax',
  'email', 'e-mail', 'email address',
  'signature', 'sign', 'initials',
  'company', 'organization', 'employer', 'business',
  'title', 'position', 'job title', 'occupation',
  'id', 'id number', 'ssn', 'social security', 'passport', 'license',
  'amount', 'total', 'sum', 'price', 'fee', 'payment',
  'reference', 'ref', 'number', 'no',
  'description', 'notes', 'comments', 'remarks',
  'gender', 'sex', 'marital status',
  'nationality', 'citizenship',
  'witness', 'notary',
]);

export function detectPdfTemplateFields(items: PdfTextItem[]): TemplateField[] {
  const fields: TemplateField[] = [];
  let colorIndex = 0;
  const seenFieldNames = new Set<string>();

  const addField = (fieldName: string, placeholder: string, item: PdfTextItem, widthOverride?: number) => {
    const key = fieldName.toLowerCase();
    if (seenFieldNames.has(key)) return;
    seenFieldNames.add(key);
    fields.push({
      id: uuidv4(),
      fieldName,
      placeholder,
      rectangle: {
        x: item.x,
        y: item.y,
        width: Math.max(0.12, widthOverride ?? item.width),
        height: Math.max(0.025, item.height + 0.005),
        pageNumber: item.pageNumber,
      },
      color: getFieldColor(colorIndex++),
    });
  };

  // Group items by page then into rows (same as client detection)
  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.pageNumber)) byPage.set(item.pageNumber, []);
    byPage.get(item.pageNumber)!.push(item);
  }

  byPage.forEach((pageItems) => {
    const sorted = [...pageItems].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

    // --- Pass 1: scan individual items for explicit placeholders ---
    for (const item of sorted) {
      const text = item.str.trim();
      if (!text) continue;

      // {{fieldname}} or {fieldname}
      for (const match of Array.from(text.matchAll(/\{+([^}]{1,40})\}+/g))) {
        addField(match[1].trim(), match[0], item);
      }

      // [FIELDNAME] or [field name]
      for (const match of Array.from(text.matchAll(/\[([A-Za-z][A-Za-z\s_-]{1,35})\]/g))) {
        addField(match[1].trim(), match[0], item);
      }

      // <fieldname>
      for (const match of Array.from(text.matchAll(/<([A-Za-z][A-Za-z\s_-]{1,35})>/g))) {
        addField(match[1].trim(), match[0], item);
      }

      // Underscores: _____ (3+) — may also appear with a label prefix on the same item
      if (/_{3,}/.test(text)) {
        const labelMatch = text.match(/^([A-Za-z][A-Za-z\s/()]{1,30})[:\s]+_{3,}/);
        const fieldName = labelMatch ? labelMatch[1].trim() : `Field ${fields.length + 1}`;
        addField(fieldName, '___', item, Math.max(0.15, item.width));
      }

      // Dots used as fill-in indicator: .......... (5+)
      if (/\.{5,}/.test(text)) {
        const labelMatch = text.match(/^([A-Za-z][A-Za-z\s/()]{1,30})[:\s]+\.{5,}/);
        const fieldName = labelMatch ? labelMatch[1].trim() : `Field ${fields.length + 1}`;
        addField(fieldName, '......', item, Math.max(0.15, item.width));
      }
    }

    // --- Pass 2: row-level analysis — look for label-only rows (blank value expected) ---
    const rows: PdfTextItem[][] = [];
    let currentRow: PdfTextItem[] = [];
    let lastY = -1;
    const rowTolerance = 0.015;

    for (const item of sorted) {
      if (lastY === -1 || Math.abs(item.y - lastY) < rowTolerance) {
        currentRow.push(item);
        lastY = item.y;
      } else {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [item];
        lastY = item.y;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowText = row.map((r) => r.str).join(' ').trim();

      // Row ends with a colon (label with no value on same line)
      // e.g. "Client Name:" or "Date Of Birth:"
      const colonOnlyLabel = rowText.match(/^([A-Za-z][A-Za-z\s/()]{1,40}):?\s*$/);
      if (colonOnlyLabel && rowText.length < 50) {
        const fieldName = colonOnlyLabel[1].replace(/:$/, '').trim();
        // Check next row exists and is also short/empty or another label (blank expected between)
        const nextRow = rows[i + 1];
        const nextText = nextRow ? nextRow.map((r) => r.str).join(' ').trim() : '';
        const nextIsAnotherLabel = nextText.match(/^[A-Za-z][A-Za-z\s]{1,35}:\s*$/);
        const nextIsBlank = !nextText || nextText.length < 3;
        if (nextIsBlank || nextIsAnotherLabel) {
          // Position the field rectangle to the right of the label on the same line
          const labelEndX = row.reduce((acc, r) => Math.max(acc, r.x + r.width), 0);
          addField(fieldName, '(blank)', {
            ...row[0],
            x: labelEndX + 0.01,
            width: Math.max(0.2, 0.9 - labelEndX),
          });
          continue;
        }
      }

      // Row has a short label + LOTS of whitespace (gap) + nothing or just underscores
      // Detect: "Name: _______________" already handled in pass 1, but also handle "Name    " with trailing space gap
      if (row.length === 1) {
        const item = row[0];
        const text = item.str.trim();
        // Single short word that is a known form label — the blank is implied
        const lc = text.toLowerCase().replace(/:$/, '').trim();
        if (
          COMMON_FORM_LABELS.has(lc) &&
          text.length < 30 &&
          !seenFieldNames.has(lc)
        ) {
          addField(lc.charAt(0).toUpperCase() + lc.slice(1), '(blank)', {
            ...item,
            x: item.x + item.width + 0.01,
            width: Math.max(0.2, 0.85 - (item.x + item.width)),
          });
        }
      }

      // Row has label in first col, next col is blank/underscore (two-column form layout)
      if (row.length >= 2) {
        const first = row[0];
        const second = row[1];
        const gap = second.x - (first.x + first.width);
        // Significant gap (> 5% of page width) between label and what follows
        if (gap > 0.05) {
          const labelText = first.str.trim().replace(/:$/, '');
          const valueText = row.slice(1).map((r) => r.str).join(' ').trim();
          // Value is all underscores/dots or empty placeholder text
          if (/^[_.\s]*$/.test(valueText) || /^(n\/a|tbd|enter|type|fill|blank|here)$/i.test(valueText)) {
            addField(labelText, valueText || '___', {
              ...second,
              width: row.slice(1).reduce((acc, r) => Math.max(acc, r.x + r.width), 0) - second.x,
            });
          }
        }
      }
    }
  });

  return fields;
}
