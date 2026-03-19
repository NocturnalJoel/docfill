'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, File, Trash2, Edit3, Plus, Loader2, AlertCircle, X, Check
} from 'lucide-react';
import dynamic from 'next/dynamic';
import UploadDropzone from '@/components/UploadDropzone';
import { Template, TemplateField } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const DocumentViewer = dynamic(() => import('@/components/DocumentViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-400" />
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
  const [wordHtml, setWordHtml] = useState<string | undefined>(undefined);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    fetchTemplates();
  }, []);

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
      setCurrentFields([]);
      setWordHtml(undefined);
      return;
    }
    setCurrentFields(selectedTemplate.fields || []);
    setNewName(selectedTemplate.name);

    // Fetch HTML for Word docs
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
      const updated = data.template as Template;
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    },
    [selectedId]
  );

  const handleFieldsChange = useCallback((fields: TemplateField[] | unknown) => {
    setCurrentFields(fields as TemplateField[]);
  }, []);

  return (
    <div className="flex h-full">
      {/* ─── Left panel ─────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Templates</h2>
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
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
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
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      active ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    {template.fileType === 'pdf' ? (
                      <FileText size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <File size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-400">
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

      {/* ─── Right panel ─────────────────────────────────────── */}
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
                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        autoFocus
                      />
                      <button onClick={handleRename} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setIsRenaming(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">
                    {selectedTemplate.fileName} • {selectedTemplate.fields.length} template fields • {formatDate(selectedTemplate.uploadedAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRenaming(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
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
            {currentFields.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-3">
                  Template Fields ({currentFields.length})
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-3 gap-0 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <span>Field Name</span>
                    <span>Placeholder</span>
                    <span>Page</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {currentFields.map((field) => (
                      <div key={field.id} className="grid grid-cols-3 gap-0 px-4 py-2.5 items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: field.color }} />
                          <span className="text-xs font-medium text-gray-700 truncate">{field.fieldName}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono truncate">{field.placeholder}</span>
                        <span className="text-xs text-gray-400">Page {field.rectangle.pageNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a template</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Upload a template document with placeholders like {`{{name}}`}, [FIELD], or ___
              to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
