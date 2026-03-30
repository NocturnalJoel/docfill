'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, FileText, File, ChevronRight,
  User, Mail, Building2, Loader2, X, Check, AlertCircle, Eye
} from 'lucide-react';
import dynamic from 'next/dynamic';
import UploadDropzone from '@/components/UploadDropzone';
import { Client, ClientDocument, DetectedField } from '@/lib/types';
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const [currentFields, setCurrentFields] = useState<DetectedField[]>([]);
  const [wordHtml, setWordHtml] = useState<string | undefined>(undefined);
  const [localFields, setLocalFields] = useState<DetectedField[]>([]);
  const [dirtyFieldIds, setDirtyFieldIds] = useState<Set<string>>(new Set());

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      setError('Failed to load clients');
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (!selectedClientId) { setDocuments([]); setSelectedDocId(null); return; }
    fetchDocuments(selectedClientId);
  }, [selectedClientId]);

  const fetchDocuments = async (clientId: string) => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setError('Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!selectedDoc) { setCurrentFields([]); setWordHtml(undefined); setLocalFields([]); setDirtyFieldIds(new Set()); return; }
    const fields = selectedDoc.fields || [];
    setCurrentFields(fields);
    setLocalFields(deduplicateFields(fields));
    setDirtyFieldIds(new Set());
    if (selectedDoc.fileType === 'word') {
      setWordHtml(undefined);
      fetch(`/api/files/${selectedDoc.id}?html=true`)
        .then((r) => (r.ok ? r.text() : null))
        .then((html) => { if (html) setWordHtml(html); })
        .catch(() => {});
    } else {
      setWordHtml(undefined);
    }
  }, [selectedDoc]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), company: newCompany.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients((prev) => [...prev, data.client]);
      setSelectedClientId(data.client.id);
      setShowNewClientForm(false);
      setNewName(''); setNewEmail(''); setNewCompany('');
    } catch {
      setError('Failed to create client');
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients((prev) => prev.map((c) => (c.id === data.client.id ? data.client : c)));
      setEditingClient(null);
    } catch {
      setError('Failed to update client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client and all their documents?')) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (selectedClientId === id) { setSelectedClientId(null); setDocuments([]); }
    } catch {
      setError('Failed to delete client');
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedClientId) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'document');
      formData.append('clientId', selectedClientId);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newDoc = data.document as ClientDocument;
      setDocuments((prev) => [...prev, newDoc]);
      setSelectedDocId(newDoc.id);
      if (data.wordHtml) setWordHtml(data.wordHtml);
    } catch (err) {
      setError('Upload failed: ' + String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocId === id) setSelectedDocId(null);
    } catch {
      setError('Failed to delete document');
    }
  };

  const handleSaveFields = useCallback(
    async (fields: DetectedField[] | unknown, pageCount: number) => {
      if (!selectedDocId) return;
      const res = await fetch(`/api/documents/${selectedDocId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, pageCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updatedDoc = data.document as ClientDocument;
      setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
    },
    [selectedDocId]
  );

  const handleFieldsChange = useCallback((fields: DetectedField[] | unknown) => {
    const f = fields as DetectedField[];
    setCurrentFields(f);
    setLocalFields(deduplicateFields(f));
  }, []);

  const handleFieldEdit = (id: string, key: 'fieldName' | 'value', val: string) => {
    const update = (f: DetectedField) => f.id === id ? { ...f, [key]: val, confirmed: false } : f;
    setLocalFields((prev) => prev.map(update));
    setCurrentFields((prev) => prev.map(update));
    setDirtyFieldIds((prev) => new Set(prev).add(id));
  };

  const handleConfirmField = async (id: string) => {
    const updatedLocal = localFields.map((f) => f.id === id ? { ...f, confirmed: true } : f);
    setLocalFields(updatedLocal);
    setDirtyFieldIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    for (const doc of documents) {
      const updatedFields = doc.fields.map((f) => {
        if (f.id !== id) return f;
        const edited = updatedLocal.find((lf) => lf.id === id);
        return edited ? { ...edited, confirmed: true } : { ...f, confirmed: true };
      });
      if (updatedFields.some((f, i) => f !== doc.fields[i])) {
        const res = await fetch(`/api/documents/${doc.id}/fields`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updatedFields, pageCount: doc.pageCount }),
        });
        if (res.ok) setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, fields: updatedFields } : d));
      }
    }
  };

  const handleDeleteLocalField = async (id: string) => {
    setLocalFields((prev) => prev.filter((f) => f.id !== id));
    setCurrentFields((prev) => prev.filter((f) => f.id !== id));
    setDirtyFieldIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    for (const doc of documents) {
      const updatedFields = doc.fields.filter((f) => f.id !== id);
      if (updatedFields.length !== doc.fields.length) {
        const res = await fetch(`/api/documents/${doc.id}/fields`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updatedFields, pageCount: doc.pageCount }),
        });
        if (res.ok) setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, fields: updatedFields } : d));
      }
    }
  };

  const handleAddLocalField = () => {
    const newField: DetectedField = {
      id: uuidv4(),
      fieldName: '',
      value: '',
      color: getFieldColor(localFields.length),
      confirmed: false,
      rectangle: { x: 0, y: 0, width: 0, height: 0, pageNumber: 1 },
    };
    setLocalFields((prev) => [...prev, newField]);
    setCurrentFields((prev) => [...prev, newField]);
    setDirtyFieldIds((prev) => new Set(prev).add(newField.id));
    if (selectedDocId) {
      setDocuments((prev) => prev.map((d) => d.id === selectedDocId ? { ...d, fields: [...d.fields, newField] } : d));
    }
  };


  return (
    <div className="flex h-full">
      {/* ─── Left panel: client list ─── */}
      <div className="w-72 flex-shrink-0 border-r border-black/10 bg-white flex flex-col">
        <div className="p-4 border-b border-black/10 flex items-center justify-between">
          <h2 className="font-semibold text-black text-sm">Clients</h2>
          <button
            onClick={() => { setShowNewClientForm(true); setSelectedClientId(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-black/80 transition-colors"
          >
            <Plus size={12} />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingClients ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-black/20" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-sm text-black/30">
              <User size={32} className="mx-auto mb-2 opacity-20" />
              <p>No clients yet</p>
              <p className="mt-1 text-xs">Click &quot;New&quot; to add your first client</p>
            </div>
          ) : (
            <div className="py-2">
              {clients.map((client) => {
                const active = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => { setSelectedClientId(client.id); setShowNewClientForm(false); }}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between group ${
                      active
                        ? 'bg-black/[0.05] border-r-2 border-black'
                        : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${active ? 'text-black' : 'text-black/80'}`}>
                        {client.name}
                      </div>
                      <div className="text-xs text-black/30 truncate">{client.email || client.company || 'No contact info'}</div>
                    </div>
                    {active && <ChevronRight size={14} className="text-black/40 ml-2" />}
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

        {/* New client form */}
        {showNewClientForm && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-bold text-black mb-4">New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Name *</label>
                <input
                  className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Company</label>
                <input
                  className="w-full px-3 py-2 border border-black/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors">
                  Create Client
                </button>
                <button type="button" onClick={() => setShowNewClientForm(false)} className="px-4 py-2 bg-black/5 text-black/60 rounded-lg text-sm font-medium hover:bg-black/10 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Selected client view */}
        {selectedClient && !showNewClientForm && (
          <div className="p-6 space-y-6">
            {/* Client header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black/60 font-bold text-lg">
                  {selectedClient.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">{selectedClient.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-black/40 mt-0.5">
                    {selectedClient.email && (
                      <span className="flex items-center gap-1"><Mail size={12} />{selectedClient.email}</span>
                    )}
                    {selectedClient.company && (
                      <span className="flex items-center gap-1"><Building2 size={12} />{selectedClient.company}</span>
                    )}
                    <span className="text-xs">Added {formatDate(selectedClient.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingClient(selectedClient)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-black/10 rounded-lg text-black/60 hover:bg-black/5 transition-colors"
                >
                  <Edit3 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-100 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {/* Edit form */}
            {editingClient && (
              <div className="bg-black/[0.02] rounded-xl p-4 border border-black/10">
                <h4 className="text-sm font-semibold text-black/70 mb-3">Edit Client</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black/50 mb-1">Name</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      value={editingClient.name}
                      onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black/50 mb-1">Email</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      value={editingClient.email || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black/50 mb-1">Company</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      value={editingClient.company || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleUpdateClient} className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1">
                    <Check size={12} /> Save
                  </button>
                  <button onClick={() => setEditingClient(null)} className="px-3 py-1.5 bg-white border border-black/10 text-black/60 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-black text-sm">Documents ({documents.length})</h3>
              </div>

              <UploadDropzone
                onUpload={handleUpload}
                disabled={isUploading}
                label={isUploading ? 'Uploading...' : 'Upload client document (PDF or DOCX)'}
                className="mb-4"
              />

              {isLoadingDocs ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 size={20} className="animate-spin text-black/20" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center p-6 text-sm text-black/30 bg-black/[0.02] rounded-xl border border-dashed border-black/10">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedDocId === doc.id
                          ? 'border-black/30 bg-black/[0.05]'
                          : 'border-black/10 bg-white hover:border-black/20 hover:bg-black/[0.02]'
                      }`}
                      onClick={() => setSelectedDocId(selectedDocId === doc.id ? null : doc.id)}
                    >
                      {doc.fileType === 'pdf' ? (
                        <FileText size={20} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <File size={20} className="text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black truncate">{doc.fileName}</div>
                        <div className="text-xs text-black/30">
                          {doc.fields.length} fields • {formatDate(doc.uploadedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-black/50 font-medium">
                          {selectedDocId === doc.id ? 'Viewing' : 'View'}
                        </span>
                        <Eye size={12} className="text-black/30" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                          className="ml-1 p-1 text-black/20 hover:text-red-500 transition-colors rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Viewer */}
            {selectedDoc && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-black text-sm">
                    Viewing: {selectedDoc.fileName}
                  </h3>
                  <span className="text-xs text-black/40 bg-black/5 rounded px-2 py-0.5">
                    {currentFields.length} fields detected
                  </span>
                </div>
                <DocumentViewer
                  fileUrl={selectedDoc.fileUrl}
                  fileType={selectedDoc.fileType}
                  wordHtml={wordHtml}
                  fields={currentFields}
                  onFieldsChange={handleFieldsChange as (f: DetectedField[] | unknown) => void}
                  onSave={handleSaveFields as (f: DetectedField[] | unknown, p: number) => Promise<void>}
                  mode="client"
                />
              </div>
            )}

            {/* Extracted fields — same style as try page */}
            <div>
              <h3 className="font-bold text-black mb-1">Extracted fields</h3>
              <p className="text-sm text-black/40 mb-4">Verify names and values. Click Confirm to save a field.</p>

              <div className="rounded-xl border border-black/10 overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_auto] text-xs font-semibold text-black/40 px-4 py-2 border-b border-black/5 bg-black/[0.02]">
                  <span>Field name</span>
                  <span>Value</span>
                  <span />
                </div>
                <div className="divide-y divide-black/5">
                  {localFields.length === 0 && (
                    <p className="px-4 py-4 text-sm text-black/30 italic">No fields detected — add them manually below.</p>
                  )}
                  {localFields.map((field) => {
                    const isDirty = dirtyFieldIds.has(field.id);
                    return (
                      <div key={field.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-4 py-2 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: field.color }} />
                          <input
                            className="text-sm text-black/70 font-medium bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5 w-full min-w-0"
                            value={field.fieldName}
                            placeholder="Field name"
                            onChange={(e) => handleFieldEdit(field.id, 'fieldName', e.target.value)}
                          />
                        </div>
                        <input
                          className="text-sm text-black/50 bg-transparent border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none py-0.5"
                          value={field.value}
                          placeholder="Value"
                          onChange={(e) => handleFieldEdit(field.id, 'value', e.target.value)}
                        />
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
                          onClick={() => handleDeleteLocalField(field.id)}
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
                onClick={handleAddLocalField}
                className="flex items-center gap-1.5 text-sm text-black/40 hover:text-black transition-colors mt-3"
              >
                <Plus size={14} /> Add field
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedClient && !showNewClientForm && (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mb-4">
              <UsersIcon size={28} className="text-black/20" />
            </div>
            <h3 className="text-lg font-bold text-black mb-2">Select a client</h3>
            <p className="text-black/40 text-sm max-w-sm">
              Choose a client from the list to view their documents and extracted fields,
              or create a new client.
            </p>
            <button
              onClick={() => setShowNewClientForm(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
            >
              <Plus size={14} />
              Add First Client
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function deduplicateFields(fields: DetectedField[]): DetectedField[] {
  const seen = new Map<string, DetectedField>();
  for (const field of fields) {
    const key = field.fieldName.toLowerCase().trim();
    if (!seen.has(key) || field.confirmed) seen.set(key, field);
  }
  return Array.from(seen.values());
}

function UsersIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
