// Client-safe PDF field detection — no server-only imports.
// Mirrors detectPdfClientFields from document-parser.ts for use in browser components.

import { DetectedField, TemplateField } from './types';
import { getFieldColor } from './utils';
import { v4 as uuidv4 } from 'uuid';

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export function detectPdfClientFields(items: PdfTextItem[]): DetectedField[] {
  const fields: DetectedField[] = [];

  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.pageNumber)) byPage.set(item.pageNumber, []);
    byPage.get(item.pageNumber)!.push(item);
  }

  byPage.forEach((pageItems, pageNumber) => {
    const handledIds = new Set<number>();

    // Pass 1: items that embed both label and value ("Label: value")
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const text = item.str.trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx <= 1 || colonIdx >= text.length - 1) continue;
      const beforeColon = text.slice(0, colonIdx).trim();
      const afterColon = text.slice(colonIdx + 1).trim();
      if (!isLabelText(beforeColon) || !afterColon || afterColon.length > 200) continue;
      const splitRatio = (colonIdx + 1) / text.length;
      const valueX = item.x + item.width * splitRatio;
      const valueW = item.width * (1 - splitRatio);
      fields.push({
        id: uuidv4(),
        fieldName: beforeColon,
        value: afterColon,
        rectangle: {
          x: Math.max(0, valueX - 0.005),
          y: Math.max(0, item.y - 0.003),
          width: Math.max(0.04, valueW + 0.01),
          height: Math.max(0.022, item.height + 0.008),
          pageNumber,
        },
        color: getFieldColor(fields.length),
        confirmed: false,
      });
      handledIds.add(i);
    }

    // Pass 3: "uppercase label above value" — label on one line, value directly below
    // e.g. FULL LEGAL NAME / Martin Gagnon stacked vertically
    {
      // Identify candidate labels: all-caps, 4+ letters
      const aboveLabelIdxs = new Set<number>();
      for (let i = 0; i < pageItems.length; i++) {
        if (handledIds.has(i)) continue;
        const text = pageItems[i].str.trim();
        if (text.length < 3 || text.length > 80) continue;
        if (text !== text.toUpperCase()) continue;
        const letterCount = (text.match(/[A-Za-z]/g) || []).length;
        if (letterCount >= 4) aboveLabelIdxs.add(i);
      }

      for (const labelIdx of aboveLabelIdxs) {
        if (handledIds.has(labelIdx)) continue;
        const label = pageItems[labelIdx];
        const yGap = Math.max(0.06, label.height * 5);

        // Find value candidates: below label, x overlaps, NOT also an uppercase label
        const candidates: Array<{ item: PdfTextItem; idx: number }> = [];
        for (let i = 0; i < pageItems.length; i++) {
          if (handledIds.has(i) || aboveLabelIdxs.has(i) || i === labelIdx) continue;
          const v = pageItems[i];
          if (!v.str.trim()) continue;
          if (v.y <= label.y || v.y - label.y > yGap) continue;
          // x must overlap with label
          const labelRight = label.x + label.width;
          const vRight = v.x + v.width;
          if (v.x > labelRight + 0.05 || vRight < label.x - 0.05) continue;
          candidates.push({ item: v, idx: i });
        }

        if (candidates.length === 0) continue;

        // Take the row closest below the label
        candidates.sort((a, b) => a.item.y - b.item.y);
        const primaryY = candidates[0].item.y;
        const yLineTol = Math.max(0.01, label.height * 1.5);
        const valueLine = candidates.filter((c) => Math.abs(c.item.y - primaryY) < yLineTol);
        valueLine.sort((a, b) => a.item.x - b.item.x);

        const value = valueLine.map((c) => c.item.str).join(' ').trim();
        if (!value || value.length > 200) continue;

        const minX = valueLine[0].item.x;
        const maxRight = valueLine.reduce((acc, c) => Math.max(acc, c.item.x + c.item.width), 0);
        const primary = valueLine[0].item;

        fields.push({
          id: uuidv4(),
          fieldName: label.str.trim(),
          value,
          rectangle: {
            x: Math.max(0, minX - 0.005),
            y: Math.max(0, primary.y - 0.003),
            width: Math.max(0.04, maxRight - minX + 0.01),
            height: Math.max(0.022, primary.height + 0.008),
            pageNumber,
          },
          color: getFieldColor(fields.length),
          confirmed: false,
        });

        handledIds.add(labelIdx);
        for (const c of valueLine) handledIds.add(c.idx);
      }
    }

    // Pass 2: standalone labels ("Full Name:") matched to nearby value items
    const labelItems: Array<{ item: PdfTextItem; idx: number }> = [];
    const valuePool: PdfTextItem[] = [];
    for (let i = 0; i < pageItems.length; i++) {
      if (handledIds.has(i)) continue;
      const item = pageItems[i];
      const text = item.str.trim();
      if (!text) continue;
      if (text.endsWith(':') && isLabelText(text.slice(0, -1).trim())) {
        labelItems.push({ item, idx: i });
      } else {
        valuePool.push(item);
      }
    }

    for (const { item: label } of labelItems) {
      const labelName = label.str.trim().slice(0, -1).trim();
      const labelRight = label.x + label.width;
      const yTol = Math.max(0.025, label.height * 2.5);
      const nextLabelX = labelItems
        .filter(({ item: l }) => l !== label && l.x > labelRight + 0.01 && Math.abs(l.y - label.y) < yTol)
        .reduce((min, { item: l }) => Math.min(min, l.x), 1.0);
      const valueItems = valuePool
        .filter((v) => v.x >= labelRight - 0.01 && v.x < nextLabelX - 0.005 && Math.abs(v.y - label.y) < yTol)
        .sort((a, b) => a.x - b.x);
      if (valueItems.length === 0) continue;
      const value = valueItems.map((v) => v.str).join(' ').trim();
      if (!value || value.length > 200) continue;
      const minX = valueItems[0].x;
      const maxX = valueItems.reduce((acc, v) => Math.max(acc, v.x + v.width), 0);
      const minY = valueItems.reduce((acc, v) => Math.min(acc, v.y), Infinity);
      const maxH = valueItems.reduce((acc, v) => Math.max(acc, v.height), 0);
      fields.push({
        id: uuidv4(),
        fieldName: labelName,
        value,
        rectangle: {
          x: Math.max(0, minX - 0.005),
          y: Math.max(0, minY - 0.003),
          width: Math.max(0.04, Math.min(0.95, maxX - minX + 0.01)),
          height: Math.max(0.022, maxH + 0.008),
          pageNumber,
        },
        color: getFieldColor(fields.length),
        confirmed: false,
      });
    }
  });

  return fields;
}

function isLabelText(text: string): boolean {
  return (
    text.length >= 2 &&
    text.length <= 40 &&
    /^[A-Za-z][A-Za-z\s/().#&-]*$/.test(text)
  );
}

// Detect blank/placeholder fields in a PDF template.
// Looks for "Label: ___" patterns, standalone "Label:" items, and {{placeholder}} text.
export function detectPdfTemplateFields(items: PdfTextItem[]): TemplateField[] {
  const fields: TemplateField[] = [];

  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.pageNumber)) byPage.set(item.pageNumber, []);
    byPage.get(item.pageNumber)!.push(item);
  }

  byPage.forEach((pageItems, pageNumber) => {
    const handled = new Set<PdfTextItem>();

    for (const item of pageItems) {
      if (handled.has(item)) continue;
      const text = item.str.trim();

      // {{placeholder}} style
      const mustacheRe = /\{\{([^}]+)\}\}/g;
      let m: RegExpExecArray | null;
      while ((m = mustacheRe.exec(text)) !== null) {
        const fieldName = m[1].trim();
        fields.push({
          id: uuidv4(),
          fieldName,
          placeholder: `{{${fieldName}}}`,
          rectangle: {
            x: Math.max(0, item.x - 0.005),
            y: Math.max(0, item.y - 0.003),
            width: Math.max(0.1, item.width + 0.01),
            height: Math.max(0.022, item.height + 0.008),
            pageNumber,
          },
          color: getFieldColor(fields.length),
        });
        handled.add(item);
      }
      if (handled.has(item)) continue;

      const colonIdx = text.indexOf(':');
      if (colonIdx <= 1) continue;
      const beforeColon = text.slice(0, colonIdx).trim();
      const afterColon = text.slice(colonIdx + 1).trim();
      if (!isLabelText(beforeColon)) continue;

      // "Label: ___" in the same text item
      if (/^_+$/.test(afterColon)) {
        const splitRatio = (colonIdx + 1) / text.length;
        const valueX = item.x + item.width * splitRatio;
        const valueW = item.width * (1 - splitRatio);
        fields.push({
          id: uuidv4(),
          fieldName: beforeColon,
          placeholder: beforeColon,
          rectangle: {
            x: Math.max(0, valueX - 0.005),
            y: Math.max(0, item.y - 0.003),
            width: Math.max(0.1, valueW + 0.01),
            height: Math.max(0.022, item.height + 0.008),
            pageNumber,
          },
          color: getFieldColor(fields.length),
        });
        handled.add(item);
        continue;
      }

      // Standalone "Label:" or "Label: " — look for nearby underscores
      if (!afterColon || afterColon === '') {
        const labelRight = item.x + item.width;
        const yTol = Math.max(0.025, item.height * 2.5);
        const underscoreItem = pageItems.find((v) =>
          !handled.has(v) &&
          v !== item &&
          v.x >= labelRight - 0.01 &&
          Math.abs(v.y - item.y) < yTol &&
          /^_+$/.test(v.str.trim())
        );
        const rect = underscoreItem
          ? {
              x: Math.max(0, underscoreItem.x - 0.005),
              y: Math.max(0, underscoreItem.y - 0.003),
              width: Math.max(0.1, underscoreItem.width + 0.01),
              height: Math.max(0.022, underscoreItem.height + 0.008),
              pageNumber,
            }
          : {
              x: Math.max(0, labelRight + 0.01),
              y: Math.max(0, item.y - 0.003),
              width: 0.25,
              height: Math.max(0.022, item.height + 0.008),
              pageNumber,
            };
        fields.push({
          id: uuidv4(),
          fieldName: beforeColon,
          placeholder: beforeColon,
          rectangle: rect,
          color: getFieldColor(fields.length),
        });
        if (underscoreItem) handled.add(underscoreItem);
        handled.add(item);
      }
    }
  });

  return fields;
}
