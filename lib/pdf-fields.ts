// Client-safe PDF field detection — no server-only imports.
// Mirrors detectPdfClientFields from document-parser.ts for use in browser components.

import { DetectedField } from './types';
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
