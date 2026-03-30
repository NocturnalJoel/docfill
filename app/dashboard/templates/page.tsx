'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, File, Trash2, Edit3, Loader2, AlertCircle, X, Check, Plus,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import UploadDropzone from '@/components/UploadDropzone';
import { Template, TemplateField } from '@/lib/types';
import { formatDate, getFieldColor } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const DocumentViewer = dynamic(() => import('@/components/DocumentViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-black/20" />
    </div>
  ),
});

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentFields, setCurrentFields] = useState<TemplateField[]>([]);
  const [localFields, setLocalFields] = useState<TemplateField[]>([]);
  const [dirtyFieldIds, setDirtyFieldIds] = useState<Set<string>>(new Set());
  const [wordHtml, setWordHtml] = useState<string | undefined>(undefined);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTemplate) {
      setCurrentFields([]); setLocalFields([]); setDirtyFieldIds(new Set()); setWordHtml(undefined); return;
    }
    const fields = selectedTemplate.fields || [];
    setCurrentFields(fields);
    setLocalFields(fields);
    setDirtyFieldIds(new Set());
    setNewName(selectedTemplate.name);
    if (selectedTemplate.fileType === 'word') {
      setWordHtml(undefined);
      fetch(`/api/files/${selectedTemplate.id}?html=true`)
        .then((r) => (r.ok ? r.text() : null))
        .then((html) => { if (html) setWordHtml(html); })
        .catch(() => {});
    } else {
      setWordHtml(undefined);
    }
  }, [selectedTemplate]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'template');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newTemplate = data.template as Template;
      setTemplates((prev) => [...prev, newTemplate]);
      setSelectedId(newTemplate.id);
      if (data.wordHtml) setWordHtml(data.wordHtml);
    } catch (err) {
      setError('Upload failed: ' + String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      setError('Failed to delete template');
    }
  };

  const handleRename = async () => {
    if (!selectedTemplate || !newName.trim()) return;
    try {
      const res = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemplates((prev) => prev.map((t) => (t.id === data.template.id ? data.template : t)));
      setIsRenaming(false);
    } catch {
      setError('Failed to rename template');
    }
  };

  const saveFields = async (fields: TemplateField[]) => {
    if (!selectedId || !selectedTemplate) return;
    const res = await fetch(`/api/templates/${selectedId}/fields`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, pageCount: selectedTemplate.pageCount ?? 1 }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates((prev) => prev.map((t) => t.id === data.template.id ? data.template : t));
    }
  };

  const handleSaveFields = useCallback(
    async (fields: TemplateField[] | unknown, pageCount: number) => {
      if (!selectedId) return;
      const res = await fetch(`/api/templates/${selectedId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, pageCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemplates((prev) => prev.map((t) => (t.id === data.template.id ? data.template : t)));
    },
    [selectedId]
  );

  const handleFieldsChange = useCallback((fields: TemplateField[] | unknown) => {
    const f = fields as TemplateField[];
    setCurrentFields(f);
    setLocalFields(f);
  }, []);

  const handleFieldEdit = (id: string, val: string) => {
    const update = (f: TemplateField) => f.id === id ? { ...f, fieldName: val, confirmed: false } : f;
    setLocalFields((prev) => prev.map(update));
    setCurrentFields((prev) => prev.map(update));
    setDirtyFieldIds((prev) => new Set(prev).add(id));
  };

  const handleConfirmField = async (id: string) => {
    const updated = localFields.map((f) => f.id === id ? { ...f, confirmed: true } : f);
    setLocalFields(updated);
    setCurrentFields(updated);
    setDirtyFieldIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    await saveFields(updated);
  };

  const handleDeleteField = async (id: string) => {
    const updated = localFields.filter((f) => f.id !== id);
    setLocalFields(updated);
    setCurrentFields(updated);
    setDirtyFieldIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    await saveFields(updated);
  };

  const handleAddField = () => {
    const newField: TemplateField = {
      id: uuidv4(),
      fieldName: '',
      placeholder: '',
      color: getFieldColor(localFields.length),
      rectangle: { x: 0, y: 0, width: 0, height: 0, pageNumber: 1 },
      confirmed: false,
    };
    setLocalFields((prev) => [...prev, newField]);
    setCurrentFields((prev) => [...prev, newField]);
    setDirtyFieldIds((prev) => new Set(prev).add(newField.id));
  };

  return (
    <div className="flex h-full">
      {/* ─── Left panel ─── */}
      <div className="w-72 flex-shrink-0 border-r border-black/10 bg-white flex flex-col">
        <div className="p-4 border-b border-black/10">
          <h2 className="font-semibold text-black text-sm mb-3">Templates</h2>
          <UploadDropzone
            onUpload={handleUpload}
            disabled={isUploading}
            label={isUploading ? 'Uploading...' : 'Upload template'}
            className="text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-black/20" />
            </div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center text-sm text-black/30">
              <FileText size={32} className="mx-auto mb-2 opacity-20" />
              <p>No templates yet</p>
              <p className="mt-1 text-xs">Upload a PDF or DOCX template above</p>
            </div>
          ) : (
            <div className="py-2">
              {templates.map((template) => {
                const active = selectedId === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedId(template.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                      active ? 'bg-black/[0.05] border-r-2 border-black' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    {template.fileType === 'pdf' ? (
                      <FileText size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <File size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${active ? 'text-black' : 'text-black/80'}`}>
                        {template.name}
                      </div>
                      <div className="text-xs text-black/30">
                        {template.fields.length} fields • {template.fileType.toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right panel ─── */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {selectedTemplate ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTemplate.fileType === 'pdf' ? (
                  <FileText size={24} className="text-red-400" />
                ) : (
                  <File size={24} className="text-blue-400" />
                )}
                <div>
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="px-2 py-1 border border-black/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        autoFocus
                      />
                      <button onClick={handleRename} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setIsRenaming(false)} className="p-1 text-black/30 hover:bg-black/5 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-black">{selectedTemplate.name}</h2>
                  )}
                  <div className="text-xs text-black/30 mt-0.5">
                    {selectedTemplate.fileName} • {localFields.length} fields • {formatDate(selectedTemplate.uploadedAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRenaming(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-black/10 rounded-lg text-black/60 hover:bg-black/5 transition-colors"
                >
                  <Edit3 size={12} /> Rename
                </button>
                <button
                  onClick={() => handleDelete(selectedTemplate.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-100 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {/* Document Viewer */}
            <DocumentViewer
              fileUrl={selectedTemplate.fileUrl}
              fileType={selectedTemplate.fileType}
              wordHtml={wordHtml}
              fields={currentFields}
              onFieldsChange={handleFieldsChange as (f: TemplateField[] | unknown) => void}
              onSave={handleSaveFields as (f: TemplateField[] | unknown, p: number) => Promise<void>}
              mode="template"
            />

            {/* Template fields list */}
            <div>
              <h3 className="font-bold text-black mb-1">Template fields</h3>
              <p className="text-sm text-black/40 mb-4">Verify field names. Click Confirm to save a field.</p>

              <div className="rounded-xl border border-black/10 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold text-black/40 px-4 py-2 border-b border-black/5 bg-black/[0.02]">
                  <span>Field name</span>
                  <span />
                  <span />
                </div>
                <div className="divide-y divide-black/5">
                  {localFields.length === 0 && (
                    <p className="px-4 py-4 text-sm text-black/30 italic">No fields detected — add them manually below.</p>
                  )}
                  {localFields.map((field) => {
                    const isDirty = dirtyFieldIds.has(field.id);
                    return (
                      <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: field.color }} />
                          <input
                            className="text-sm text-black/70 font-medium bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5 w-full min-w-0"
                            value={field.fieldName}
                            placeholder="Field name"
                            onChange={(e) => handleFieldEdit(field.id, e.target.value)}
                          />
                        </div>
                        {field.confirmed && !isDirty ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <Check size={10} /> Confirmed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConfirmField(field.id)}
                            className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap transition-colors"
                          >
                            <Check size={10} /> Confirm
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="text-black/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAddField}
                className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors mt-3"
              >
                <Plus size={14} /> Add field
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={28} className="text-black/20" />
            </div>
            <h3 className="text-lg font-bold text-black mb-2">Select a template</h3>
            <p className="text-black/40 text-sm max-w-sm">
              Upload a template document with placeholders like {`{{name}}`}, [FIELD], or ___
              to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
