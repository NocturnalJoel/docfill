'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, FileText, File, Users, Check,
  Loader2, AlertCircle, X, Download, Zap, ArrowRight
} from 'lucide-react';
import { Client, ClientDocument, Template, TemplateField, DetectedField, FieldValue } from '@/lib/types';
import { matchFields } from '@/lib/utils';

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

  // Selections
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const clientDocuments = allDocuments.filter((d) => d.clientId === selectedClientId);
  const selectedDocuments = clientDocuments.filter((d) => selectedDocIds.has(d.id));

  // All available client fields from selected documents
  const availableClientFields = deduplicateClientFields(
    selectedDocuments.flatMap((d) => d.fields.filter((f) => f.confirmed || f.value))
  );
  const clientFieldNames = availableClientFields.map((f) => f.fieldName);

  useEffect(() => {
    loadData();
  }, []);

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

  // Load documents when client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setAllDocuments([]);
      setSelectedDocIds(new Set());
      return;
    }
    fetch(`/api/clients/${selectedClientId}/documents`)
      .then((r) => r.json())
      .then((data) => setAllDocuments(data.documents || []))
      .catch(() => setError('Failed to load documents'));
  }, [selectedClientId]);

  // Auto-match fields when template or selected docs change
  useEffect(() => {
    if (!selectedTemplate || clientFieldNames.length === 0) return;
    const templateFieldNames = selectedTemplate.fields.map((f) => f.fieldName);
    const autoMap = matchFields(templateFieldNames, clientFieldNames);
    setFieldMapping(autoMap);
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
      // Build field values from mapping
      const fieldValues: FieldValue[] = [];
      const templateFields = selectedTemplate?.fields || [];

      for (const tf of templateFields) {
        const clientFieldName = fieldMapping[tf.fieldName];
        const clientField = availableClientFields.find(
          (f) => f.fieldName === clientFieldName
        );
        fieldValues.push({
          fieldName: tf.fieldName,
          value: clientField?.value || '',
          underlined: clientField?.underlined,
        });
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          fieldValues,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setGeneratedUrl(url);

      const contentDisposition = res.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'generated-document';
      setGeneratedFileName(fileName);

      setStep(5);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const [generatedFileName, setGeneratedFileName] = useState('generated-document');

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = generatedFileName;
    a.click();
  };

  const canProceed = {
    1: !!selectedClientId,
    2: selectedDocIds.size > 0,
    3: !!selectedTemplateId,
    4: true,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Generate Document</h1>
        <p className="text-gray-500 text-sm mt-1">Fill a template with client data in a few steps</p>
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
                  ? 'bg-blue-500 text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step > s ? <Check size={14} /> : s}
            </button>
            <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
              {['Client', 'Documents', 'Template', 'Map Fields'][s - 1]}
            </span>
            {s < 4 && <ChevronRight size={14} className="text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <StepCard title="Select Client" subtitle="Who are you generating this document for?">
          {clients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No clients yet. Add clients in the Clients tab first.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <label
                  key={client.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedClientId === client.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="client"
                    value={client.id}
                    checked={selectedClientId === client.id}
                    onChange={() => setSelectedClientId(client.id)}
                    className="text-blue-500"
                  />
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {client.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{client.name}</div>
                    <div className="text-xs text-gray-400">{client.email || client.company || 'No contact'}</div>
                  </div>
                  {selectedClientId === client.id && (
                    <Check size={16} className="text-blue-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>
          )}
          <StepNav
            onNext={() => setStep(2)}
            canNext={canProceed[1]}
          />
        </StepCard>
      )}

      {/* Step 2: Select Documents */}
      {step === 2 && (
        <StepCard title="Select Documents" subtitle={`Choose which documents from ${selectedClient?.name} to use for field extraction`}>
          {clientDocuments.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
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
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.has(doc.id)}
                      onChange={() => handleToggleDoc(doc.id)}
                      className="mt-1 text-blue-500"
                    />
                    <div className="flex-shrink-0 mt-0.5">
                      {doc.fileType === 'pdf' ? (
                        <FileText size={18} className="text-red-400" />
                      ) : (
                        <File size={18} className="text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{doc.fileName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {confirmedFields.length} confirmed fields
                        {confirmedFields.length > 0 && (
                          <span className="ml-2 text-gray-300">
                            ({confirmedFields.slice(0, 3).map((f) => f.fieldName).join(', ')}
                            {confirmedFields.length > 3 ? ', ...' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedDocIds.has(doc.id) && (
                      <Check size={16} className="text-blue-500 mt-0.5" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            canNext={canProceed[2]}
          />
        </StepCard>
      )}

      {/* Step 3: Select Template */}
      {step === 3 && (
        <StepCard title="Select Template" subtitle="Choose the document template to fill">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No templates yet. Upload templates in the Templates tab.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTemplateId === template.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplateId === template.id}
                    onChange={() => setSelectedTemplateId(template.id)}
                    className="text-blue-500"
                  />
                  {template.fileType === 'pdf' ? (
                    <FileText size={18} className="text-red-400 flex-shrink-0" />
                  ) : (
                    <File size={18} className="text-blue-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                    <div className="text-xs text-gray-400">
                      {template.fields.length} fields • {template.fileType.toUpperCase()} • {template.fileName}
                    </div>
                    {template.fields.length > 0 && (
                      <div className="text-xs text-gray-300 mt-0.5">
                        Fields: {template.fields.slice(0, 4).map((f) => f.fieldName).join(', ')}
                        {template.fields.length > 4 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  {selectedTemplateId === template.id && (
                    <Check size={16} className="text-blue-500" />
                  )}
                </label>
              ))}
            </div>
          )}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            canNext={canProceed[3]}
          />
        </StepCard>
      )}

      {/* Step 4: Field Mapping */}
      {step === 4 && selectedTemplate && (
        <StepCard
          title="Map Fields"
          subtitle="Match template fields to client data. Auto-matched where possible."
        >
          {selectedTemplate.fields.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <p>This template has no detected fields.</p>
              <p className="mt-1 text-xs">Go to Templates to add fields to this template.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="grid grid-cols-3 gap-0 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <span>Template Field</span>
                <span>Placeholder</span>
                <span>Client Value</span>
              </div>
              <div className="divide-y divide-gray-100">
                {selectedTemplate.fields.map((tf) => {
                  const mappedFieldName = fieldMapping[tf.fieldName] || '';
                  const matchedField = availableClientFields.find((f) => f.fieldName === mappedFieldName);

                  return (
                    <div key={tf.id} className="grid grid-cols-3 gap-0 px-4 py-3 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tf.color }} />
                        <span className="text-sm font-medium text-gray-800 truncate">{tf.fieldName}</span>
                      </div>
                      <span className="text-xs font-mono text-gray-400 truncate">{tf.placeholder}</span>
                      <div>
                        <select
                          value={mappedFieldName}
                          onChange={(e) => setFieldMapping((prev) => ({ ...prev, [tf.fieldName]: e.target.value }))}
                          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">— Not mapped —</option>
                          {clientFieldNames.map((name) => (
                            <option key={name} value={name}>
                              {name}: {availableClientFields.find((f) => f.fieldName === name)?.value?.slice(0, 30) || ''}
                            </option>
                          ))}
                        </select>
                        {matchedField && (
                          <div className="text-xs text-emerald-600 mt-1 truncate">
                            → &quot;{matchedField.value}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {availableClientFields.length === 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              <strong>No client fields found.</strong> Make sure you&apos;ve confirmed fields in the selected documents
              (go to Clients tab → select document → confirm detected fields → Save Fields).
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
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
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{generatedFileName}</h3>
            <p className="text-sm text-gray-400 mb-6">Ready to download</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors mx-auto"
            >
              <Download size={16} />
              Download Document
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => {
                setStep(1);
                setSelectedClientId('');
                setSelectedDocIds(new Set());
                setSelectedTemplateId('');
                setFieldMapping({});
                setGeneratedUrl(null);
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mx-auto"
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

// ─── Helper components ────────────────────────────────────────────────────────

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  canNext,
  nextLabel = 'Continue',
}: {
  onBack?: () => void;
  onNext?: () => void;
  canNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
      {onBack ? (
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      ) : (
        <div />
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    if (!seen.has(key) || field.confirmed) {
      seen.set(key, field);
    }
  }
  return Array.from(seen.values());
}
