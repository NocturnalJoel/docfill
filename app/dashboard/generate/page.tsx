'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, FileText, File, Check,
  Loader2, AlertCircle, X, Download, Zap, ArrowRight, Trash2, Plus
} from 'lucide-react';
import { Client, ClientDocument, Template, DetectedField, FieldValue } from '@/lib/types';
import { matchFields } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface MappingRow {
  id: string;
  name: string;
  clientFieldName: string;
  value: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

export default function GeneratePage() {
  const [step, setStep] = useState<Step>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allDocuments, setAllDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('generated-document');

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const clientDocuments = allDocuments.filter((d) => d.clientId === selectedClientId);
  const selectedDocuments = clientDocuments.filter((d) => selectedDocIds.has(d.id));

  const availableClientFields = deduplicateClientFields(
    selectedDocuments.flatMap((d) => d.fields.filter((f) => f.confirmed || f.value))
  );
  const clientFieldNames = availableClientFields.map((f) => f.fieldName);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsRes, templatesRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/templates'),
      ]);
      const [clientsData, templatesData] = await Promise.all([
        clientsRes.json(),
        templatesRes.json(),
      ]);
      setClients(clientsData.clients || []);
      setTemplates(templatesData.templates || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClientId) { setAllDocuments([]); setSelectedDocIds(new Set()); return; }
    fetch(`/api/clients/${selectedClientId}/documents`)
      .then((r) => r.json())
      .then((data) => setAllDocuments(data.documents || []))
      .catch(() => setError('Failed to load documents'));
  }, [selectedClientId]);

  // Refresh template data when a template is selected so edits made in the
  // Templates tab (field deletions, renames) are reflected here without a page reload.
  useEffect(() => {
    if (!selectedTemplateId) return;
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => { if (data.templates) setTemplates(data.templates); })
      .catch(() => {});
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const templateFieldNames = selectedTemplate.fields.map((f) => f.fieldName);
    const autoMatch = clientFieldNames.length > 0
      ? matchFields(templateFieldNames, clientFieldNames)
      : {} as Record<string, string>;
    setMappingRows(
      selectedTemplate.fields.map((tf) => {
        const clientFieldName = autoMatch[tf.fieldName] || '';
        const clientField = availableClientFields.find((f) => f.fieldName === clientFieldName);
        return { id: tf.id, name: tf.fieldName, clientFieldName, value: clientField?.value || '' };
      })
    );
  }, [selectedTemplateId, selectedDocIds.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const fieldValues: FieldValue[] = [];
      for (const row of mappingRows) {
        if (!row.name.trim()) continue;
        const clientField = availableClientFields.find((f) => f.fieldName === row.clientFieldName);
        fieldValues.push({ fieldName: row.name, value: row.value, underlined: clientField?.underlined });
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, fieldValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const blob = await res.blob();
      setGeneratedUrl(URL.createObjectURL(blob));
      const contentDisposition = res.headers.get('Content-Disposition');
      setGeneratedFileName(contentDisposition?.match(/filename="(.+)"/)?.[1] || 'generated-document');
      setStep(5);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = generatedFileName;
    a.click();
  };

  const canProceed = { 1: !!selectedClientId, 2: selectedDocIds.size > 0, 3: !!selectedTemplateId, 4: true };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-black/20" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Generate Document</h1>
        <p className="text-black/40 text-sm mt-1">Fill a template with client data in a few steps</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s as Step)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === s
                  ? 'bg-black text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-black/8 text-black/30'
              }`}
            >
              {step > s ? <Check size={14} /> : s}
            </button>
            <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-black' : 'text-black/30'}`}>
              {['Client', 'Documents', 'Template', 'Map Fields'][s - 1]}
            </span>
            {s < 4 && <ChevronRight size={14} className="text-black/15 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <StepCard title="Select Client" subtitle="Who are you generating this document for?">
          {clients.length === 0 ? (
            <div className="text-center py-8 text-sm text-black/30">
              No clients yet. Add clients in the Clients tab first.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <label
                  key={client.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedClientId === client.id
                      ? 'border-black/30 bg-black/[0.05]'
                      : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="client"
                    value={client.id}
                    checked={selectedClientId === client.id}
                    onChange={() => setSelectedClientId(client.id)}
                    className="accent-black"
                  />
                  <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-black/60 font-bold text-sm flex-shrink-0">
                    {client.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-black text-sm">{client.name}</div>
                    <div className="text-xs text-black/30">{client.email || client.company || 'No contact'}</div>
                  </div>
                  {selectedClientId === client.id && (
                    <Check size={16} className="text-black ml-auto" />
                  )}
                </label>
              ))}
            </div>
          )}
          <StepNav onNext={() => setStep(2)} canNext={canProceed[1]} />
        </StepCard>
      )}

      {/* Step 2: Select Documents */}
      {step === 2 && (
        <StepCard title="Select Documents" subtitle={`Choose which documents from ${selectedClient?.name} to use for field extraction`}>
          {clientDocuments.length === 0 ? (
            <div className="text-center py-8 text-sm text-black/30">
              No documents for this client. Upload documents in the Clients tab.
            </div>
          ) : (
            <div className="space-y-2">
              {clientDocuments.map((doc) => {
                const confirmedFields = doc.fields.filter((f) => f.confirmed || f.value);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedDocIds.has(doc.id)
                        ? 'border-black/30 bg-black/[0.05]'
                        : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.has(doc.id)}
                      onChange={() => handleToggleDoc(doc.id)}
                      className="mt-1 accent-black"
                    />
                    <div className="flex-shrink-0 mt-0.5">
                      {doc.fileType === 'pdf' ? (
                        <FileText size={18} className="text-red-400" />
                      ) : (
                        <File size={18} className="text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-black text-sm">{doc.fileName}</div>
                      <div className="text-xs text-black/30 mt-0.5">
                        {confirmedFields.length} confirmed fields
                        {confirmedFields.length > 0 && (
                          <span className="ml-2 text-black/20">
                            ({confirmedFields.slice(0, 3).map((f) => f.fieldName).join(', ')}
                            {confirmedFields.length > 3 ? ', ...' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedDocIds.has(doc.id) && (
                      <Check size={16} className="text-black mt-0.5" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} canNext={canProceed[2]} />
        </StepCard>
      )}

      {/* Step 3: Select Template */}
      {step === 3 && (
        <StepCard title="Select Template" subtitle="Choose the document template to fill">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-black/30">
              No templates yet. Upload templates in the Templates tab.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTemplateId === template.id
                      ? 'border-black/30 bg-black/[0.05]'
                      : 'border-black/10 hover:border-black/20 hover:bg-black/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplateId === template.id}
                    onChange={() => setSelectedTemplateId(template.id)}
                    className="accent-black"
                  />
                  {template.fileType === 'pdf' ? (
                    <FileText size={18} className="text-red-400 flex-shrink-0" />
                  ) : (
                    <File size={18} className="text-blue-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-black text-sm">{template.name}</div>
                    <div className="text-xs text-black/30">
                      {template.fields.length} fields • {template.fileType.toUpperCase()} • {template.fileName}
                    </div>
                    {template.fields.length > 0 && (
                      <div className="text-xs text-black/20 mt-0.5">
                        {template.fields.slice(0, 4).map((f) => f.fieldName).join(', ')}
                        {template.fields.length > 4 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  {selectedTemplateId === template.id && (
                    <Check size={16} className="text-black" />
                  )}
                </label>
              ))}
            </div>
          )}
          <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} canNext={canProceed[3]} />
        </StepCard>
      )}

      {/* Step 4: Field Mapping */}
      {step === 4 && selectedTemplate && (
        <StepCard title="Map Fields" subtitle="Match template fields to client data. Edit, add, or remove rows as needed.">
          {availableClientFields.length === 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              <strong>No client fields found.</strong> Make sure you&apos;ve confirmed fields in the selected documents
              (go to Clients tab → select document → confirm detected fields → Save Fields).
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-black/10">
            <div className="grid grid-cols-[1fr_1fr_auto] bg-black/[0.04] px-4 py-2.5 text-xs font-semibold text-black/40 uppercase tracking-wide border-b border-black/10 gap-3">
              <span>Template Field</span>
              <span>Client Value</span>
              <span />
            </div>
            <div className="divide-y divide-black/5">
              {mappingRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2.5 items-center">
                    <input
                      value={row.name}
                      onChange={(e) => setMappingRows((prev) => prev.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))}
                      className="text-sm px-2.5 py-1.5 border border-black/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-black/80 w-full"
                      placeholder="Field name"
                    />
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={row.clientFieldName}
                        onChange={(e) => {
                          const clientFieldName = e.target.value;
                          const clientField = availableClientFields.find((f) => f.fieldName === clientFieldName);
                          setMappingRows((prev) => prev.map((r) =>
                            r.id === row.id ? { ...r, clientFieldName, value: clientField?.value ?? r.value } : r
                          ));
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-black/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-black/70"
                      >
                        <option value="">— Not mapped —</option>
                        {clientFieldNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <input
                        value={row.value}
                        onChange={(e) => setMappingRows((prev) => prev.map((r) => r.id === row.id ? { ...r, value: e.target.value } : r))}
                        className="w-full text-xs px-2 py-1.5 border border-black/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white text-black/80"
                        placeholder="Value to insert"
                      />
                    </div>
                    <button
                      onClick={() => setMappingRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="p-1.5 text-black/20 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-black/5">
              <button
                onClick={() => setMappingRows((prev) => [...prev, { id: uuidv4(), name: '', clientFieldName: '', value: '' }])}
                className="flex items-center gap-1.5 text-xs text-black/40 hover:text-black/70 transition-colors"
              >
                <Plus size={13} />
                Add field
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-sm text-black/60 border border-black/10 rounded-lg hover:bg-black/5 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/80 transition-colors disabled:opacity-40"
            >
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Zap size={16} /> Generate Document</>
              )}
            </button>
          </div>
        </StepCard>
      )}

      {/* Step 5: Download */}
      {step === 5 && generatedUrl && (
        <StepCard title="Document Generated!" subtitle="Your filled document is ready to download.">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-black mb-1">{generatedFileName}</h3>
            <p className="text-sm text-black/30 mb-6">Ready to download</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors mx-auto"
            >
              <Download size={16} />
              Download Document
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-black/5">
            <button
              onClick={() => {
                setStep(1);
                setSelectedClientId('');
                setSelectedDocIds(new Set());
                setSelectedTemplateId('');
                setMappingRows([]);
                setGeneratedUrl(null);
              }}
              className="flex items-center gap-2 text-sm text-black/40 hover:text-black/70 transition-colors mx-auto"
            >
              <ArrowRight size={14} />
              Generate another document
            </button>
          </div>
        </StepCard>
      )}
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-black/5">
        <h2 className="text-base font-bold text-black">{title}</h2>
        <p className="text-sm text-black/40 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StepNav({ onBack, onNext, canNext, nextLabel = 'Continue' }: {
  onBack?: () => void;
  onNext?: () => void;
  canNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-black/5">
      {onBack ? (
        <button onClick={onBack} className="px-4 py-2 text-sm text-black/60 border border-black/10 rounded-lg hover:bg-black/5 transition-colors">
          Back
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {nextLabel}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function deduplicateClientFields(fields: DetectedField[]): DetectedField[] {
  const seen = new Map<string, DetectedField>();
  for (const field of fields) {
    const key = field.fieldName.toLowerCase().trim();
    if (!seen.has(key) || field.confirmed) seen.set(key, field);
  }
  return Array.from(seen.values());
}
