import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FIELD_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export function getFieldColor(index: number): string {
  return FIELD_COLORS[index % FIELD_COLORS.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function fuzzyMatch(a: string, b: string): number {
  const na = normalizeFieldName(a);
  const nb = normalizeFieldName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Compute simple word overlap
  const wordsA = new Set(na.split('_'));
  const wordsB = new Set(nb.split('_'));
  let overlap = 0;
  wordsA.forEach((w) => { if (wordsB.has(w)) overlap++; });
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? overlap / total : 0;
}

export function matchFields(
  templateFieldNames: string[],
  clientFieldNames: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tf of templateFieldNames) {
    let bestMatch = '';
    let bestScore = 0;
    for (const cf of clientFieldNames) {
      const score = fuzzyMatch(tf, cf);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = cf;
      }
    }
    if (bestScore > 0.4) {
      result[tf] = bestMatch;
    }
  }
  return result;
}
