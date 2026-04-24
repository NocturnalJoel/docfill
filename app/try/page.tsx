'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Upload, ArrowRight, ArrowLeft, Loader2, CheckCircle,
  Plus, Trash2, FileText, Check, ChevronRight, AlertCircle,
} from 'lucide-react';
import { matchFields, getFieldColor } from '@/lib/utils';
import { detectPdfClientFields, detectPdfTemplateFields, PdfTextItem } from '@/lib/pdf-fields';
import { v4 as uuidv4 } from 'uuid';
import type { DetectedField, TemplateField } from '@/lib/types';

const DocumentViewer = dynamic(() => import('@/components/DocumentViewer'), {
  ssr: false,
  loading: () => <div className="h-[520px] bg-black/5 animate-pulse rounded-2xl" />,
});

interface MappingRow {
  id: string;
  templateField: string;
  clientFieldName: string;
  value: string;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Upload document',
  2: 'Review fields',
  3: 'Map fields',
  4: 'Download',
};

export default function TryPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1 & 2 state
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [clientFileUrl, setClientFileUrl] = useState<string | null>(null);
  const [isParsingClient, setIsParsingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDraggingClient, setIsDraggingClient] = useState(false);
  const clientFileRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateFileUrl, setTemplateFileUrl] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [hasPendingDeletion, setHasPendingDeletion] = useState(false);

  // Step 4 state
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // ── Step 1: parse client PDF ───────────────────────────────────────────────
  const handleClientFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setClientError('Please upload a PDF document.');
      return;
    }
    setClientError(null);
    setClientFile(f);
    setIsParsingClient(true);

    try {
      const { pdfjs } = await import('react-pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const textItems: PdfTextItem[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!('str' in item) || !(item as { str: string }).str.trim()) continue;
          const it = item as { str: string; width: number; height: number; transform: number[] };
          const [, , , , tx, ty] = it.transform;
          textItems.push({
            str: it.str,
            x: tx / viewport.width,
            y: 1 - (ty + it.height) / viewport.height,
            width: it.width / viewport.width,
            height: it.height / viewport.height,
            pageNumber: pageNum,
          });
        }
      }

      const fields = detectPdfClientFields(textItems);
      setDetectedFields(fields);
      setClientFileUrl(URL.createObjectURL(f));
      setStep(2);
    } catch (e) {
      console.error('Client parse error:', e);
      setClientError('Something went wrong. Please try again.');
    } finally {
      setIsParsingClient(false);
    }
  }, []);

  // WORD SUPPORT - PRESERVED FOR FUTURE USE
  // The DOCX client document branch was removed. To re-enable:
  //   1. Add isDocx check: const isDocx = name.endsWith('.docx');
  //   2. Accept '.pdf,.docx' in the file input
  //   3. For DOCX files: POST to /api/try/parse-client, set wordHtml from response
  //   4. Add wordHtml state, pass to DocumentViewer in step 2
  //   5. Re-enable /api/try/parse-client/route.ts

  // ── Step 3: parse template PDF ─────────────────────────────────────────────
  const handleTemplateFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setTemplateError('Please upload a PDF template.');
      return;
    }
    setTemplateError(null);
    setTemplateFile(f);
    setIsParsingTemplate(true);

    try {
      const { pdfjs } = await import('react-pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const textItems: PdfTextItem[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if (!('str' in item) || !(item as { str: string }).str.trim()) continue;
          const it = item as { str: string; width: number; height: number; transform: number[] };
          const [, , , , tx, ty] = it.transform;
          textItems.push({
            str: it.str,
            x: tx / viewport.width,
            y: 1 - (ty + it.height) / viewport.height,
            width: it.width / viewport.width,
            height: it.height / viewport.height,
            pageNumber: pageNum,
          });
        }
      }

      const tfFields = detectPdfTemplateFields(textItems);
      setTemplateFields(tfFields);
      setTemplateFileUrl(URL.createObjectURL(f));

      const tfNames = tfFields.map((tf) => tf.fieldName);
      const clientFieldNames = detectedFields.filter((f) => f.fieldName.trim()).map((f) => f.fieldName);
      const autoMatch = tfNames.length > 0 && clientFieldNames.length > 0
        ? matchFields(tfNames, clientFieldNames)
        : {};

      setMappingRows(
        tfFields.map((tf) => {
          const matched = autoMatch[tf.fieldName] || '';
          const clientField = detectedFields.find((f) => f.fieldName === matched);
          return { id: tf.id, templateField: tf.fieldName, clientFieldName: matched, value: clientField?.value || '' };
        })
      );
    } catch {
      setTemplateError('Something went wrong. Please try again.');
      setTemplateFile(null);
    } finally {
      setIsParsingTemplate(false);
    }
  }, [detectedFields]);

  // WORD SUPPORT - PRESERVED FOR FUTURE USE
  // Word template parsing was previously done server-side via /api/try/parse.
  // To re-enable: POST file to /api/try/parse, get back { fields, html },
  // set templateHtml state and pass to DocumentViewer with fileType="word".

  // ── Mapping helpers ────────────────────────────────────────────────────────
  const updateMappingRow = (id: string, key: keyof MappingRow, val: string) => {
    setMappingRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      if (key === 'clientFieldName') {
        const clientField = detectedFields.find((f) => f.fieldName === val);
        return { ...r, clientFieldName: val, value: clientField?.value || r.value };
      }
      return { ...r, [key]: val };
    }));
  };

  const addMappingRow = () =>
    setMappingRows((prev) => [...prev, { id: uuidv4(), templateField: '', clientFieldName: '', value: '' }]);

  const removeMappingRow = (id: string) =>
    setMappingRows((prev) => prev.filter((r) => r.id !== id));

  // ── Step 2: field list helpers ────────────────────────────────────────────
  const updateDetectedField = (id: string, key: 'fieldName' | 'value', val: string) =>
    setDetectedFields((prev) => prev.map((f) => f.id === id ? { ...f, [key]: val, confirmed: false } : f));

  const confirmDetectedField = (id: string) =>
    setDetectedFields((prev) => prev.map((f) => f.id === id ? { ...f, confirmed: true } : f));

  const removeDetectedField = (id: string) =>
    setDetectedFields((prev) => prev.filter((f) => f.id !== id));

  const addDetectedField = () =>
    setDetectedFields((prev) => [...prev, {
      id: uuidv4(),
      fieldName: '',
      value: '',
      rectangle: { x: 0.05, y: 0.05, width: 0.5, height: 0.03, pageNumber: 1 },
      color: getFieldColor(prev.length),
      confirmed: false,
    }]);

  // ── Step 4: generate ───────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile) return;
    setGenerateError(null);
    setIsGenerating(true);

    try {
      const fields = mappingRows
        .filter((r) => r.templateField.trim())
        .map((r) => {
          const tf = templateFields.find((f) => f.id === r.id) ?? templateFields.find((f) => f.fieldName === r.templateField);
          return {
            fieldName: r.templateField,
            value: r.value,
            rectangle: tf?.rectangle ?? null,
          };
        });

      const form = new FormData();
      form.append('file', templateFile);
      form.append('email', email);
      form.append('fields', JSON.stringify(fields));

      const res = await fetch('/api/try/generate', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json();
        setGenerateError(data.error ?? 'Generation failed. Please try again.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filled_document.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setIsDone(true);
    } catch {
      setGenerateError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto text-center py-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2">Your document is ready.</h2>
          <p className="text-black/50 mb-8">
            The download should have started automatically. Want to generate unlimited documents?
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-black/80 transition-colors"
          >
            Get unlimited access <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-black/30 mt-6">
            <Link href="/" className="hover:underline">← Back to homepage</Link>
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-10 max-w-2xl mx-auto">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              step === s ? 'bg-black text-white' : step > s ? 'bg-green-500 text-white' : 'bg-black/8 text-black/30'
            }`}>
              {step > s ? <Check size={12} /> : s}
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </div>
            {s < 4 && <ChevronRight size={14} className="text-black/15 mx-0.5" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload client document ── */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black mb-1">Upload client document</h1>
          <p className="text-black/50 mb-8">
            Drop in the PDF that contains your client&apos;s information. We&apos;ll detect every field automatically.
          </p>

          <DropZone
            label="Drop client document here"
            sublabel=".pdf only"
            isDragging={isDraggingClient}
            isLoading={isParsingClient}
            loadingLabel="Detecting fields..."
            onDrop={handleClientFile}
            onDragStateChange={setIsDraggingClient}
            onClick={() => clientFileRef.current?.click()}
          />
          <input
            ref={clientFileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleClientFile(f); }}
          />

          {clientError && <ErrorBox message={clientError} />}

          <p className="text-xs text-black/30 mt-6 text-center">
            One free document per email. Your file is processed and never stored.{' '}
            <Link href="/subscribe" className="underline hover:text-black/50">Unlimited access with a subscription.</Link>
          </p>
        </div>
      )}

      {/* ── Step 2: Review & edit fields with full DocumentViewer ── */}
      {step === 2 && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BackButton onClick={() => {
              setStep(1);
              setClientFile(null);
              setDetectedFields([]);
              setClientFileUrl(null);
            }} />
            <h1 className="text-2xl font-black">Review detected fields</h1>
          </div>
          {clientFile && <FilePill name={clientFile.name} />}

          <p className="text-sm text-black/50 mt-3 mb-5">
            {detectedFields.filter(f => f.fieldName.trim()).length} fields detected.
            Drag to reposition, click labels or values to edit, or draw new fields manually.
          </p>

          <DocumentViewer
            fileUrl={clientFileUrl ?? ''}
            fileType="pdf"
            fields={detectedFields}
            onFieldsChange={(fields) => setDetectedFields(fields as DetectedField[])}
            onSave={async (fields) => { setDetectedFields(fields as DetectedField[]); }}
            mode="client"
            hideSave
          />

          {/* Editable field list */}
          <div className="mt-8 max-w-2xl mx-auto">
            <h2 className="text-base font-bold mb-1">Extracted fields</h2>
            <p className="text-sm text-black/40 mb-4">
              Verify names and values. Changes here also update the rectangles above.
            </p>

            <div className="rounded-xl border border-black/10 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] text-xs font-semibold text-black/40 px-4 py-2 border-b border-black/5 bg-black/[0.02]">
                <span>Field name</span>
                <span>Value</span>
                <span />
              </div>
              <div className="divide-y divide-black/5">
                {detectedFields.length === 0 && (
                  <p className="px-4 py-4 text-sm text-black/30 italic">No fields detected — add them manually below.</p>
                )}
                {detectedFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-4 py-2 items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: field.color }} />
                      <input
                        className="text-sm text-black/70 font-medium bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5 w-full"
                        value={field.fieldName}
                        placeholder="Field name"
                        onChange={(e) => updateDetectedField(field.id, 'fieldName', e.target.value)}
                      />
                    </div>
                    <input
                      className="text-sm text-black/50 bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5"
                      value={field.value}
                      placeholder="Value"
                      onChange={(e) => updateDetectedField(field.id, 'value', e.target.value)}
                    />
                    {field.confirmed ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Check size={10} /> Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmDetectedField(field.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap transition-colors"
                      >
                        <Check size={10} /> Confirm
                      </button>
                    )}
                    <button
                      onClick={() => removeDetectedField(field.id)}
                      className="text-black/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addDetectedField}
              className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors mt-3"
            >
              <Plus size={14} /> Add field
            </button>
          </div>

          {(() => {
            const unconfirmed = detectedFields.filter(f => !f.confirmed).length;
            return (
              <div className="mt-8 max-w-2xl mx-auto flex items-center justify-end gap-4">
                {unconfirmed > 0 && (
                  <span className="text-sm text-amber-600">
                    {unconfirmed} field{unconfirmed !== 1 ? 's' : ''} still unconfirmed
                  </span>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={unconfirmed > 0}
                  className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Step 3a: Upload template ── */}
      {step === 3 && !isParsingTemplate && !templateFile && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <BackButton onClick={() => setStep(2)} />
            <h1 className="text-2xl font-black">Upload your template</h1>
          </div>
          <p className="text-black/50 text-sm mb-6 mt-2">
            The PDF you want to fill in. We&apos;ll detect its fields and match them to your client data automatically.
          </p>

          <DropZone
            label="Drop PDF template here"
            sublabel=".pdf only"
            isDragging={isDraggingTemplate}
            isLoading={isParsingTemplate}
            loadingLabel="Detecting template fields..."
            onDrop={handleTemplateFile}
            onDragStateChange={setIsDraggingTemplate}
            onClick={() => templateFileRef.current?.click()}
          />
          <input
            ref={templateFileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTemplateFile(f); }}
          />

          {templateError && <ErrorBox message={templateError} />}
        </div>
      )}

      {/* ── Step 3b: Parsing template ── */}
      {step === 3 && isParsingTemplate && (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 size={28} className="animate-spin text-black/30" />
          <p className="text-sm text-black/40">Detecting template fields...</p>
        </div>
      )}

      {/* ── Step 3c: Map fields ── */}
      {step === 3 && templateFile && !isParsingTemplate && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <BackButton onClick={() => { setTemplateFile(null); setTemplateFields([]); setTemplateFileUrl(null); setMappingRows([]); }} />
            <h1 className="text-2xl font-black">Map fields</h1>
          </div>
          {templateFile && <FilePill name={templateFile.name} />}

          <p className="text-sm text-black/50 mb-5 mt-3">
            Reposition the field rectangles on your template if needed, then verify the fields and map them to client values below.
          </p>

          {templateFileUrl && (
            <div className="mb-8">
              <DocumentViewer
                fileUrl={templateFileUrl}
                fileType="pdf"
                fields={templateFields}
                onFieldsChange={(fields) => {
                  const tf = fields as TemplateField[];
                  const wasDeleted = tf.length < templateFields.length;
                  const updated = wasDeleted ? tf.map((f) => ({ ...f, confirmed: false })) : tf;
                  if (wasDeleted) setHasPendingDeletion(true);
                  setTemplateFields(updated);
                  setMappingRows((prev) => {
                    const byName = new Map(prev.map((r) => [r.templateField, r]));
                    return updated.map((f) => {
                      const existing = byName.get(f.fieldName);
                      return existing
                        ? { ...existing, id: f.id, templateField: f.fieldName }
                        : { id: f.id, templateField: f.fieldName, clientFieldName: '', value: '' };
                    });
                  });
                }}
                onSave={async (fields) => {
                  setTemplateFields(fields as TemplateField[]);
                }}
                mode="template"
              />
            </div>
          )}

          {/* ── Template field list (mirrors dashboard template section) ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold">Template fields</h2>
              {(hasPendingDeletion || templateFields.some((f) => !f.confirmed)) && (
                <button
                  onClick={() => {
                    setHasPendingDeletion(false);
                    setTemplateFields((prev) => prev.map((f) => ({ ...f, confirmed: true })));
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors"
                >
                  <Check size={12} />
                  Confirm All ({templateFields.filter((f) => !f.confirmed).length})
                </button>
              )}
            </div>
            <p className="text-sm text-black/40 mb-4">Verify field names. Click Confirm to mark a field as correct.</p>

            <div className="rounded-xl border border-black/10 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold text-black/40 px-4 py-2 border-b border-black/5 bg-black/[0.02]">
                <span>Field name</span>
                <span />
                <span />
              </div>
              <div className="divide-y divide-black/5">
                {templateFields.length === 0 && (
                  <p className="px-4 py-4 text-sm text-black/30 italic">No fields detected — add them manually in the viewer above.</p>
                )}
                {templateFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: field.color }} />
                      <input
                        className="text-sm text-black/70 font-medium bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5 w-full min-w-0"
                        value={field.fieldName}
                        placeholder="Field name"
                        onChange={(e) => {
                          const newName = e.target.value;
                          setTemplateFields((prev) => prev.map((f) => f.id === field.id ? { ...f, fieldName: newName, confirmed: false } : f));
                          setMappingRows((prev) => prev.map((r) => r.id === field.id ? { ...r, templateField: newName } : r));
                        }}
                      />
                    </div>
                    {field.confirmed ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Check size={10} /> Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => setTemplateFields((prev) => prev.map((f) => f.id === field.id ? { ...f, confirmed: true } : f))}
                        className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap transition-colors"
                      >
                        <Check size={10} /> Confirm
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setHasPendingDeletion(true);
                        const remaining = templateFields
                          .filter((f) => f.id !== field.id)
                          .map((f) => ({ ...f, confirmed: false }));
                        setTemplateFields(remaining);
                        setMappingRows((prev) => prev.filter((r) => r.id !== field.id));
                      }}
                      className="text-black/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-base font-bold mb-4">Field mapping</h2>

          <div className="bg-black/[0.02] rounded-xl border border-black/10 overflow-hidden mb-4">
            <div className="grid grid-cols-[1fr_1fr_auto] text-xs font-semibold text-black/40 px-4 py-2 border-b border-black/5">
              <span>Template field</span><span>Client value</span><span />
            </div>
            <div className="divide-y divide-black/5">
              {mappingRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-4 py-2.5 items-center">
                  <input
                    className="text-sm text-black/70 font-medium bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5"
                    value={row.templateField}
                    placeholder="Template field"
                    onChange={(e) => updateMappingRow(row.id, 'templateField', e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <select
                      className="text-xs text-black/50 bg-transparent border-b border-black/10 focus:border-black focus:outline-none py-0.5"
                      value={row.clientFieldName}
                      onChange={(e) => updateMappingRow(row.id, 'clientFieldName', e.target.value)}
                    >
                      <option value="">— select client field —</option>
                      {detectedFields.filter(f => f.fieldName.trim()).map((cf) => (
                        <option key={cf.id} value={cf.fieldName}>{cf.fieldName}</option>
                      ))}
                    </select>
                    <input
                      className="text-sm text-black/70 bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5"
                      value={row.value}
                      placeholder="Value"
                      onChange={(e) => updateMappingRow(row.id, 'value', e.target.value)}
                    />
                  </div>
                  <button onClick={() => removeMappingRow(row.id)} className="text-black/20 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={addMappingRow} className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors mb-8">
            <Plus size={14} /> Add field
          </button>

          {(() => {
            const unconfirmedTemplate = templateFields.filter((f) => !f.confirmed).length;
            return (
              <div className="flex items-center justify-end gap-4">
                {unconfirmedTemplate > 0 && (
                  <span className="text-sm text-amber-600">
                    {unconfirmedTemplate} field{unconfirmedTemplate !== 1 ? 's' : ''} still unconfirmed
                  </span>
                )}
                <button
                  onClick={() => setStep(4)}
                  disabled={unconfirmedTemplate > 0}
                  className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Step 4: Email + generate ── */}
      {step === 4 && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <BackButton onClick={() => setStep(3)} />
            <h1 className="text-2xl font-black">Get your document</h1>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-black mb-1.5">Your email address</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-black/20 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-black/30 mt-1.5">One free document per email. No marketing emails — promise.</p>
            </div>

            {generateError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>
                  {generateError}{' '}
                  {generateError.includes('already been used') && (
                    <Link href="/subscribe" className="font-semibold underline">Subscribe now</Link>
                  )}
                </span>
              </div>
            )}

            <button type="submit" disabled={isGenerating}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-black/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating
                ? <><Loader2 size={16} className="animate-spin" />Generating...</>
                : <>Generate & Download PDF <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      )}
    </PageShell>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-black">PaperworkSlayer</span>
          </Link>
          <Link href="/subscribe" className="text-sm text-black/50 hover:text-black transition-colors">
            Subscribe for unlimited access
          </Link>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-12">{children}</div>
    </div>
  );
}

function DropZone({
  label, sublabel, isDragging, isLoading, loadingLabel, onDrop, onDragStateChange, onClick,
}: {
  label: string; sublabel: string; isDragging: boolean; isLoading: boolean; loadingLabel: string;
  onDrop: (f: File) => void; onDragStateChange: (v: boolean) => void; onClick: () => void;
}) {
  return (
    <div
      onDrop={(e) => { e.preventDefault(); onDragStateChange(false); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }}
      onDragOver={(e) => { e.preventDefault(); onDragStateChange(true); }}
      onDragLeave={() => onDragStateChange(false)}
      onClick={onClick}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/50 hover:bg-black/[0.02]'
      }`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-black/40" />
          <p className="text-sm text-black/50">{loadingLabel}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
            <Upload size={22} className="text-black/50" />
          </div>
          <div>
            <p className="font-semibold text-black">{label}</p>
            <p className="text-sm text-black/40 mt-0.5">or click to browse — {sublabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-black/30 hover:text-black transition-colors flex-shrink-0">
      <ArrowLeft size={18} />
    </button>
  );
}

function FilePill({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-1">
      <FileText size={13} className="text-red-400" />
      <span className="text-sm text-black/40">{name}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3 flex items-start gap-2">
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

