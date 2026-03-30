'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Plus, Save, Loader2, AlertCircle, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DetectedField, TemplateField, Rectangle } from '@/lib/types';
import { getFieldColor, hexToRgba } from '@/lib/utils';
import { detectPdfClientFields, detectPdfTemplateFields, PdfTextItem } from '@/lib/document-parser';
import FieldRectangle from './FieldRectangle';

// Use the worker that matches react-pdf's bundled pdfjs-dist version exactly
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  fileUrl: string;
  fileType: 'pdf' | 'word';
  wordHtml?: string;
  fields: DetectedField[] | TemplateField[];
  onFieldsChange: (fields: DetectedField[] | TemplateField[]) => void;
  onSave: (fields: DetectedField[] | TemplateField[], pageCount: number) => Promise<void>;
  mode: 'client' | 'template';
  hideSave?: boolean;
  onContainerSize?: (width: number, height: number) => void;
}

const PAGE_WIDTH = 680;

export default function DocumentViewer({
  fileUrl,
  fileType,
  wordHtml,
  fields,
  onFieldsChange,
  onSave,
  mode,
  hideSave = false,
  onContainerSize,
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<Array<{ width: number; height: number }>>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [drawState, setDrawState] = useState<{
    pageNumber: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Run PDF field detection after all pages load
  const runPdfDetection = useCallback(async () => {
    if (fileType !== 'pdf') return;
    if (fields.length > 0) return; // Already have fields

    setIsDetecting(true);
    setError(null);

    try {
      const pdfjsLib = pdfjs;
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      const pdf = await loadingTask.promise;
      const allItems: PdfTextItem[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
          if (!('str' in item)) continue;
          const textItem = item as { str: string; transform: number[]; width: number; height: number };
          if (!textItem.str.trim()) continue;

          const tx = textItem.transform[4];
          const ty = textItem.transform[5];
          const w = textItem.width;
          const h = Math.abs(textItem.transform[3]) || 12;

          // PDF coords: origin bottom-left, y increases up
          // Normalize to 0-1
          const normX = tx / viewport.width;
          const normY = 1 - (ty + h) / viewport.height;
          const normW = w / viewport.width;
          const normH = h / viewport.height;

          allItems.push({
            str: textItem.str,
            x: Math.max(0, normX),
            y: Math.max(0, normY),
            width: Math.max(0.001, normW),
            height: Math.max(0.01, normH),
            pageNumber: pageNum,
          });
        }
      }

      let detected: DetectedField[] | TemplateField[];
      if (mode === 'template') {
        detected = detectPdfTemplateFields(allItems);
      } else {
        detected = detectPdfClientFields(allItems);
      }

      if (detected.length > 0) {
        onFieldsChange(detected);
      }
    } catch (err) {
      console.error('PDF detection error:', err);
      setError('Could not auto-detect fields. You can add them manually.');
    } finally {
      setIsDetecting(false);
    }
  }, [fileUrl, fileType, fields.length, mode, onFieldsChange]);

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageDimensions(Array(numPages).fill({ width: PAGE_WIDTH, height: PAGE_WIDTH * 1.294 }));
    },
    []
  );

  const handlePageLoadSuccess = useCallback(
    (pageNumber: number, page: { width: number; height: number }) => {
      setPageDimensions((prev) => {
        const next = [...prev];
        next[pageNumber - 1] = { width: PAGE_WIDTH, height: (PAGE_WIDTH / page.width) * page.height };
        return next;
      });
    },
    []
  );

  // Run detection after pages load
  useEffect(() => {
    if (numPages > 0 && fileType === 'pdf') {
      runPdfDetection();
    }
  }, [numPages, fileType, runPdfDetection]);

  // ─── Field manipulation ──────────────────────────────────────────────────

  const handleFieldMove = useCallback(
    (id: string, px: number, py: number, pageNumber: number) => {
      const dims = pageDimensions[pageNumber - 1];
      if (!dims) return;

      onFieldsChange(
        (fields as Array<DetectedField | TemplateField>).map((f) => {
          if (f.id !== id) return f;
          return {
            ...f,
            rectangle: {
              ...f.rectangle,
              x: Math.max(0, Math.min(1, px / dims.width)),
              y: Math.max(0, Math.min(1, py / dims.height)),
            },
          };
        }) as DetectedField[] | TemplateField[]
      );
    },
    [fields, onFieldsChange, pageDimensions]
  );

  const handleFieldResize = useCallback(
    (id: string, px: number, py: number, pw: number, ph: number, pageNumber: number) => {
      const dims = pageDimensions[pageNumber - 1];
      if (!dims) return;

      onFieldsChange(
        (fields as Array<DetectedField | TemplateField>).map((f) => {
          if (f.id !== id) return f;
          return {
            ...f,
            rectangle: {
              ...f.rectangle,
              x: Math.max(0, Math.min(1, px / dims.width)),
              y: Math.max(0, Math.min(1, py / dims.height)),
              width: Math.max(0.01, Math.min(1, pw / dims.width)),
              height: Math.max(0.01, Math.min(1, ph / dims.height)),
            },
          };
        }) as DetectedField[] | TemplateField[]
      );
    },
    [fields, onFieldsChange, pageDimensions]
  );

  const handleFieldDelete = useCallback(
    (id: string) => {
      onFieldsChange(
        (fields as Array<DetectedField | TemplateField>).filter((f) => f.id !== id) as
          | DetectedField[]
          | TemplateField[]
      );
    },
    [fields, onFieldsChange]
  );

  const handleFieldConfirm = useCallback(
    (id: string) => {
      onFieldsChange(
        (fields as DetectedField[]).map((f) =>
          f.id === id ? { ...f, confirmed: true } : f
        )
      );
    },
    [fields, onFieldsChange]
  );

  const handleLabelChange = useCallback(
    (id: string, newName: string) => {
      onFieldsChange(
        (fields as Array<DetectedField | TemplateField>).map((f) =>
          f.id === id ? { ...f, fieldName: newName } : f
        ) as DetectedField[] | TemplateField[]
      );
    },
    [fields, onFieldsChange]
  );

  const handleValueChange = useCallback(
    (id: string, newValue: string) => {
      onFieldsChange(
        (fields as DetectedField[]).map((f) =>
          f.id === id ? { ...f, value: newValue } : f
        )
      );
    },
    [fields, onFieldsChange]
  );

  // ─── Drawing new field ───────────────────────────────────────────────────

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
      if (!isAddingField) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawState({ pageNumber, startX: x, startY: y, currentX: x, currentY: y });
    },
    [isAddingField]
  );

  const handleOverlayMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drawState) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setDrawState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX - rect.left,
              currentY: e.clientY - rect.top,
            }
          : null
      );
    },
    [drawState]
  );

  const handleOverlayMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
      if (!drawState || drawState.pageNumber !== pageNumber) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const x = Math.min(drawState.startX, endX);
      const y = Math.min(drawState.startY, endY);
      const w = Math.abs(endX - drawState.startX);
      const h = Math.abs(endY - drawState.startY);

      if (w > 10 && h > 10) {
        const dims = pageDimensions[pageNumber - 1] ?? { width: rect.width, height: rect.height };
        if (dims.width > 0 && dims.height > 0) {
          const newField = createNewField(
            fields.length,
            x / dims.width,
            y / dims.height,
            w / dims.width,
            h / dims.height,
            pageNumber,
            mode
          );
          onFieldsChange([
            ...(fields as Array<DetectedField | TemplateField>),
            newField,
          ] as DetectedField[] | TemplateField[]);
        }
      }

      setDrawState(null);
      setIsAddingField(false);
    },
    [drawState, fields, mode, onFieldsChange, pageDimensions]
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(fields, numPages || 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError('Failed to save fields');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const confirmAll = () => {
    if (mode === 'client') {
      onFieldsChange(
        (fields as DetectedField[]).map((f) => ({ ...f, confirmed: true }))
      );
    }
  };

  const unconfirmedCount = mode === 'client'
    ? (fields as DetectedField[]).filter((f) => !f.confirmed).length
    : 0;

  if (fileType === 'word') {
    return (
      <WordDocumentViewer
        html={wordHtml || '<p>Loading document...</p>'}
        fields={fields}
        onFieldMove={handleFieldMove}
        onFieldResize={handleFieldResize}
        onFieldDelete={handleFieldDelete}
        onFieldConfirm={handleFieldConfirm}
        onLabelChange={handleLabelChange}
        onValueChange={mode === 'client' ? handleValueChange : undefined}
        onAutoDetect={onFieldsChange}
        onContainerSizeChange={(w, h) => { setPageDimensions([{ width: w, height: h }]); onContainerSize?.(w, h); }}
        mode={mode}
        isAddingField={isAddingField}
        setIsAddingField={setIsAddingField}
        drawState={drawState}
        onMouseDown={(e) => handleOverlayMouseDown(e, 1)}
        onMouseMove={handleOverlayMouseMove}
        onMouseUp={(e) => handleOverlayMouseUp(e, 1)}
        onSave={handleSave}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        unconfirmedCount={unconfirmedCount}
        confirmAll={confirmAll}
        error={error}
        hideSave={hideSave}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {isDetecting && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 size={14} className="animate-spin" />
            Detecting fields...
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {unconfirmedCount > 0 && (
          <button
            onClick={confirmAll}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <Check size={12} />
            Confirm all ({unconfirmedCount})
          </button>
        )}
        <button
          onClick={() => setIsAddingField(!isAddingField)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            isAddingField
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Plus size={12} />
          {isAddingField ? 'Draw rectangle...' : 'Add Field'}
        </button>
        <div className="flex-1" />
        {!hideSave && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : saveSuccess ? <Check size={12} /> : <Save size={12} />}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Fields'}
          </button>
        )}
      </div>

      {/* PDF Document */}
      <div
        ref={containerRef}
        className="border border-gray-200 rounded-lg overflow-auto bg-gray-100"
        style={{ maxHeight: '70vh' }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={(err) => setError(`Failed to load PDF: ${err.message}`)}
          loading={
            <div className="flex items-center justify-center p-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const dims = pageDimensions[pageNum - 1] || { width: PAGE_WIDTH, height: PAGE_WIDTH * 1.294 };
            const pageFields = (fields as Array<DetectedField | TemplateField>).filter(
              (f) => f.rectangle.pageNumber === pageNum
            );

            return (
              <div
                key={pageNum}
                className="relative mb-4 mx-auto shadow-lg"
                style={{ width: dims.width, height: dims.height }}
              >
                <Page
                  pageNumber={pageNum}
                  width={PAGE_WIDTH}
                  onLoadSuccess={(page) => handlePageLoadSuccess(pageNum, page)}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />

                {/* Overlay for rectangles and drawing */}
                <div
                  ref={(el) => { pageRefs.current[pageNum - 1] = el; }}
                  className="absolute inset-0"
                  style={{ cursor: isAddingField ? 'crosshair' : 'default' }}
                  onMouseDown={(e) => handleOverlayMouseDown(e, pageNum)}
                  onMouseMove={handleOverlayMouseMove}
                  onMouseUp={(e) => handleOverlayMouseUp(e, pageNum)}
                >
                  {/* Draw preview */}
                  {drawState && drawState.pageNumber === pageNum && (
                    <div
                      className="absolute pointer-events-none border-2 border-dashed border-blue-400 bg-blue-100/20"
                      style={{
                        left: Math.min(drawState.startX, drawState.currentX),
                        top: Math.min(drawState.startY, drawState.currentY),
                        width: Math.abs(drawState.currentX - drawState.startX),
                        height: Math.abs(drawState.currentY - drawState.startY),
                      }}
                    />
                  )}

                  {/* Field rectangles */}
                  {pageFields.map((field) => {
                    const r = field.rectangle;
                    return (
                      <FieldRectangle
                        key={field.id}
                        id={field.id}
                        fieldName={field.fieldName}
                        value={mode === 'client' ? (field as DetectedField).value : undefined}
                        color={field.color}
                        confirmed={mode === 'client' ? (field as DetectedField).confirmed : true}
                        x={r.x * dims.width}
                        y={r.y * dims.height}
                        width={r.width * dims.width}
                        height={r.height * dims.height}
                        onMove={(id, px, py) => handleFieldMove(id, px, py, pageNum)}
                        onResize={(id, px, py, pw, ph) => handleFieldResize(id, px, py, pw, ph, pageNum)}
                        onDelete={handleFieldDelete}
                        onConfirm={mode === 'client' ? handleFieldConfirm : undefined}
                        onLabelChange={handleLabelChange}
                        onValueChange={mode === 'client' ? handleValueChange : undefined}
                        mode={mode}
                        containerWidth={dims.width}
                        containerHeight={dims.height}
                      />
                    );
                  })}
                </div>

                {/* Page number indicator */}
                {numPages > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                    {pageNum} / {numPages}
                  </div>
                )}
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
}

// ─── Word Document Viewer ────────────────────────────────────────────────────

interface WordViewerProps {
  html: string;
  fields: DetectedField[] | TemplateField[];
  onFieldMove: (id: string, px: number, py: number, page: number) => void;
  onFieldResize: (id: string, px: number, py: number, pw: number, ph: number, page: number) => void;
  onFieldDelete: (id: string) => void;
  onFieldConfirm: (id: string) => void;
  onLabelChange: (id: string, newName: string) => void;
  onValueChange?: (id: string, newValue: string) => void;
  onAutoDetect: (fields: DetectedField[] | TemplateField[]) => void;
  onContainerSizeChange: (width: number, height: number) => void;
  mode: 'client' | 'template';
  isAddingField: boolean;
  setIsAddingField: (v: boolean) => void;
  drawState: { startX: number; startY: number; currentX: number; currentY: number } | null;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  unconfirmedCount: number;
  confirmAll: () => void;
  error: string | null;
  hideSave?: boolean;
}

function WordDocumentViewer({
  html,
  fields,
  onFieldMove,
  onFieldResize,
  onFieldDelete,
  onFieldConfirm,
  onLabelChange,
  onValueChange,
  onAutoDetect,
  onContainerSizeChange,
  mode,
  isAddingField,
  setIsAddingField,
  drawState,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSave,
  isSaving,
  saveSuccess,
  unconfirmedCount,
  confirmAll,
  error,
  hideSave = false,
}: WordViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 680, height: 900 });

  // Refs so the ResizeObserver callback always has fresh values without re-registering
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onAutoDetectRef = useRef(onAutoDetect);
  onAutoDetectRef.current = onAutoDetect;
  const htmlRef = useRef(html);
  htmlRef.current = html;
  const detectedHtmlRef = useRef(''); // tracks which html we've already detected

  // Reset detection tracking when html changes so re-detection can run
  useEffect(() => {
    detectedHtmlRef.current = '';
  }, [html]);

  const runDetection = useCallback((container: HTMLDivElement) => {
    const currentHtml = htmlRef.current;
    if (!currentHtml || currentHtml === '<p>Loading document...</p>') return;
    if (detectedHtmlRef.current === currentHtml) return; // already done for this html

    const containerW = container.offsetWidth;
    const containerH = container.scrollHeight || container.offsetHeight;
    if (!containerW || !containerH) return;

    const currentFields = fieldsRef.current as Array<DetectedField | TemplateField>;
    const needsDetection = currentFields.length === 0 ||
      currentFields.every(f => Math.abs(f.rectangle.x - 0.05) < 0.001);
    if (!needsDetection) {
      detectedHtmlRef.current = currentHtml;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elements = Array.from(container.querySelectorAll('p, li, td, th, h1, h2, h3, h4'));
    const detected: Array<DetectedField | TemplateField> = [];
    let colorIdx = 0;
    const seen = new Set<string>();
    const currentMode = modeRef.current;

    for (const el of elements) {
      const htmlEl = el as HTMLElement;
      const text = htmlEl.innerText?.trim() || el.textContent?.trim() || '';
      if (!text || text.length > 500) continue;

      const elRect = el.getBoundingClientRect();
      if (elRect.height < 1) continue;

      const rawX = (elRect.left - containerRect.left) / containerW;
      const rawY = (elRect.top - containerRect.top) / containerH;
      const x = Math.min(1, Math.max(0, rawX));
      const y = Math.min(1, Math.max(0, rawY));
      const w = Math.min(0.95, Math.max(0.1, elRect.width / containerW));
      const h = Math.min(0.15, Math.max(0.02, elRect.height / containerH));
      const rect: Rectangle = { x, y, width: w, height: h, pageNumber: 1 };

      if (currentMode === 'client') {
        const normalized = text.replace(/\u00A0/g, ' ');
        const m = normalized.match(/^([A-Za-z][A-Za-z\s]{1,30})\s*:\s*(.+)$/);
        if (m) {
          const fieldName = m[1].trim();
          const value = m[2].trim();
          const key = fieldName.toLowerCase();
          if (!seen.has(key) && value.length > 0 && value.length < 200) {
            seen.add(key);
            // Check if value is underlined by looking at the DOM after the colon
            const colonIdx2 = htmlEl.innerHTML.indexOf(':');
            const afterColon = colonIdx2 >= 0 ? htmlEl.innerHTML.slice(colonIdx2) : '';
            const underlined = /<u\b/i.test(afterColon) || undefined;
            detected.push({
              id: uuidv4(), fieldName, value, rectangle: rect,
              color: getFieldColor(colorIdx++), confirmed: false, underlined,
            } as DetectedField);
          }
        }
      } else {
        const normalized = text.replace(/\u00A0/g, ' ');
        for (const match of Array.from(normalized.matchAll(/\{\{([^}]+)\}\}/g))) {
          const fieldName = match[1].trim();
          const key = fieldName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            detected.push({
              id: uuidv4(), fieldName, placeholder: match[0], rectangle: rect,
              color: getFieldColor(colorIdx++),
            } as TemplateField);
          }
        }
        for (const match of Array.from(normalized.matchAll(/\[([A-Za-z][A-Za-z\s_]{1,30})\]/g))) {
          const fieldName = match[1].trim();
          const key = fieldName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            detected.push({
              id: uuidv4(), fieldName, placeholder: match[0], rectangle: rect,
              color: getFieldColor(colorIdx++),
            } as TemplateField);
          }
        }
        if (/_{3,}/.test(normalized)) {
          const lm = normalized.match(/^([A-Za-z][A-Za-z\s/()]{1,30})[:\s]+_{3,}/);
          const fieldName = lm ? lm[1].trim() : `Field ${detected.length + 1}`;
          const key = fieldName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            detected.push({
              id: uuidv4(), fieldName, placeholder: '___', rectangle: rect,
              color: getFieldColor(colorIdx++),
            } as TemplateField);
          }
        }

        // "Label:" or "Label :" alone on a line — same as PDF template detection
        const labelOnly = normalized.match(/^([A-Za-z][A-Za-z\s/()]{1,40})\s*:?\s*$/);
        if (labelOnly && normalized.length < 50) {
          const fieldName = labelOnly[1].trim();
          const key = fieldName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            detected.push({
              id: uuidv4(), fieldName, placeholder: `{{${fieldName}}}`, rectangle: rect,
              color: getFieldColor(colorIdx++),
            } as TemplateField);
          }
        }
      }
    }

    detectedHtmlRef.current = currentHtml;
    if (detected.length > 0) {
      onAutoDetectRef.current(detected as DetectedField[] | TemplateField[]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ResizeObserver: fires when content changes size (guarantees layout is done)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth, h = el.offsetHeight;
      setContainerSize({ width: w, height: h });
      onContainerSizeChange(w, h);
      runDetection(el);
    });
    observer.observe(el);
    const w0 = el.offsetWidth, h0 = el.offsetHeight;
    setContainerSize({ width: w0, height: h0 });
    onContainerSizeChange(w0, h0);
    return () => observer.disconnect();
  }, [runDetection]);

  // Non-passive wheel listener on overlay so scroll works while in draw mode
  useEffect(() => {
    const overlay = overlayRef.current;
    const scroller = scrollContainerRef.current;
    if (!overlay || !scroller) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      scroller.scrollTop += e.deltaY;
    };
    overlay.addEventListener('wheel', handler, { passive: false });
    return () => overlay.removeEventListener('wheel', handler);
  }, []);

  // Also trigger when html changes — ResizeObserver won't fire if height stays the same
  // (e.g. short docs that stay within min-h-[600px])
  useEffect(() => {
    detectedHtmlRef.current = '';
    if (!html || html === '<p>Loading document...</p>') return;
    const el = containerRef.current;
    if (!el) return;
    // 50ms gives the browser enough time to finish layout before we measure
    const timer = setTimeout(() => runDetection(el), 50);
    return () => clearTimeout(timer);
  }, [html, runDetection]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {unconfirmedCount > 0 && (
          <button
            onClick={confirmAll}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <Check size={12} />
            Confirm all ({unconfirmedCount})
          </button>
        )}
        <button
          onClick={() => setIsAddingField(!isAddingField)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            isAddingField
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Plus size={12} />
          {isAddingField ? 'Draw rectangle...' : 'Add Field'}
        </button>
        <div className="flex-1" />
        {!hideSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : saveSuccess ? <Check size={12} /> : <Save size={12} />}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Fields'}
          </button>
        )}
      </div>

      {/* Document + Overlay */}
      <div ref={scrollContainerRef} className="relative border border-gray-200 rounded-lg overflow-auto bg-white" style={{ maxHeight: '70vh' }}>
        {/* Rendered HTML */}
        <div
          ref={containerRef}
          className="p-8 prose max-w-none min-h-[600px]"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.6 }}
        />

        {/* Overlay — explicit height so it covers full content, not just the clipped 70vh */}
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 w-full"
          style={{ height: containerSize.height, cursor: isAddingField ? 'crosshair' : 'default', pointerEvents: isAddingField ? 'auto' : 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {drawState && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-blue-400 bg-blue-100/20"
              style={{
                left: Math.min(drawState.startX, drawState.currentX),
                top: Math.min(drawState.startY, drawState.currentY),
                width: Math.abs(drawState.currentX - drawState.startX),
                height: Math.abs(drawState.currentY - drawState.startY),
              }}
            />
          )}
        </div>

        {/* Field rectangles (always visible, not blocked by overlay) */}
        <div className="absolute top-0 left-0 w-full pointer-events-none" style={{ height: containerSize.height }}>
          <div className="relative w-full h-full" style={{ pointerEvents: isAddingField ? 'none' : 'auto' }}>
            {(fields as Array<DetectedField | TemplateField>).map((field) => {
              const r = field.rectangle;
              return (
                <FieldRectangle
                  key={field.id}
                  id={field.id}
                  fieldName={field.fieldName}
                  value={mode === 'client' ? (field as DetectedField).value : undefined}
                  color={field.color}
                  confirmed={mode === 'client' ? (field as DetectedField).confirmed : true}
                  x={r.x * containerSize.width}
                  y={r.y * containerSize.height}
                  width={r.width * containerSize.width}
                  height={r.height * containerSize.height}
                  onMove={(id, px, py) => onFieldMove(id, px, py, 1)}
                  onResize={(id, px, py, pw, ph) => onFieldResize(id, px, py, pw, ph, 1)}
                  onDelete={onFieldDelete}
                  onConfirm={mode === 'client' ? onFieldConfirm : undefined}
                  onLabelChange={onLabelChange}
                  onValueChange={onValueChange}
                  mode={mode}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createNewField(
  existingCount: number,
  x: number,
  y: number,
  width: number,
  height: number,
  pageNumber: number,
  mode: 'client' | 'template'
): DetectedField | TemplateField {
  const color = getFieldColor(existingCount);
  const rectangle: Rectangle = { x, y, width, height, pageNumber };

  if (mode === 'template') {
    return {
      id: uuidv4(),
      fieldName: `field_${existingCount + 1}`,
      placeholder: `{{field_${existingCount + 1}}}`,
      rectangle,
      color,
    } as TemplateField;
  } else {
    return {
      id: uuidv4(),
      fieldName: `Field ${existingCount + 1}`,
      value: '',
      rectangle,
      color,
      confirmed: true,
    } as DetectedField;
  }
}
