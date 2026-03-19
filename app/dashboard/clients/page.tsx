'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Upload, FileText, File, ChevronRight,
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
      <Loader2 size={24} className="animate-spin text-gray-400" />
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

  // New client form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');

  // Current document fields state (for viewer)
  const [currentFields, setCurrentFields] = useState<DetectedField[]>([]);
  const [wordHtml, setWordHtml] = useState<string | undefined>(undefined);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  // Merged fields from all documents
  const allFields = documents.flatMap((d) => d.fields);
  const uniqueFields = deduplicateFields(allFields);

  // Fetch clients
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch documents when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setDocuments([]);
      setSelectedDocId(null);
      return;
    }
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

  // When selected document changes, load its fields and HTML (for word docs)
  useEffect(() => {
    if (!selectedDoc) {
      setCurrentFields([]);
      setWordHtml(undefined);
      return;
    }
    setCurrentFields(selectedDoc.fields || []);

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

  // Create client
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
    } catch (err) {
      setError('Failed to create client');
    }
  };

  // Update client
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

  // Delete client
  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client and all their documents?')) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (selectedClientId === id) {
        setSelectedClientId(null);
        setDocuments([]);
      }
    } catch {
      setError('Failed to delete client');
    }
  };

  // Upload document
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

  // Delete document
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

  // Save fields
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

  // Handle fields change in viewer
  const handleFieldsChange = useCallback(
    (fields: DetectedField[] | unknown) => {
      setCurrentFields(fields as DetectedField[]);
    },
    []
  );

  return (
    <div className="flex h-full">
      {/* ─── Left panel: client list ─────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Clients</h2>
          <button
            onClick={() => { setShowNewClientForm(true); setSelectedClientId(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus size={12} />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingClients ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              <User size={32} className="mx-auto mb-2 opacity-30" />
              <p>No clients yet</p>
              <p className="mt-1 text-xs">Click &quot;New&quot; to add your first client</p>
            </div>
          ) : (
            <div className="py-2">
              {clients.map((client) => {
                const docCount = documents.filter((d) => d.clientId === client.id).length;
                const active = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => { setSelectedClientId(client.id); setShowNewClientForm(false); }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                      active ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                        {client.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{client.email || client.company || 'No contact info'}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {docCount > 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{docCount}</span>
                      )}
                      {active && <ChevronRight size={14} className="text-blue-400" />}
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

        {/* New client form */}
        {showNewClientForm && (
          <div className="p-6 max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                  Create Client
                </button>
                <button type="button" onClick={() => setShowNewClientForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
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
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {selectedClient.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                    {selectedClient.email && (
                      <span className="flex items-center gap-1"><Mail size={12} />{selectedClient.email}</span>
                    )}
                    {selectedClient.company && (
                      <span className="flex items-center gap-1"><Building2 size={12} />{selectedClient.company}</span>
                    )}
                    <span className="text-xs text-gray-400">Added {formatDate(selectedClient.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingClient(selectedClient)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
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
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Edit Client</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingClient.name}
                      onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingClient.email || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                    <input
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingClient.company || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleUpdateClient} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1">
                    <Check size={12} /> Save
                  </button>
                  <button onClick={() => setEditingClient(null)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Documents section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Documents ({documents.length})</h3>
              </div>

              <UploadDropzone
                onUpload={handleUpload}
                disabled={isUploading}
                label={isUploading ? 'Uploading...' : 'Upload client document (PDF or DOCX)'}
                className="mb-4"
              />

              {isLoadingDocs ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center p-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedDocId === doc.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedDocId(selectedDocId === doc.id ? null : doc.id)}
                    >
                      {doc.fileType === 'pdf' ? (
                        <FileText size={20} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <File size={20} className="text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</div>
                        <div className="text-xs text-gray-400">
                          {doc.fields.length} fields • {formatDate(doc.uploadedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-blue-500 font-medium">
                          {selectedDocId === doc.id ? 'Viewing' : 'View'}
                        </span>
                        <Eye size={12} className="text-blue-400" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                          className="ml-1 p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
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
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Viewing: {selectedDoc.fileName}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
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

            {/* All extracted fields sidebar */}
            {uniqueFields.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-3">
                  All Client Fields ({uniqueFields.length})
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {uniqueFields.map((field, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: field.color }}
                        />
                        <span className="text-xs font-medium text-gray-600 w-32 truncate">{field.fieldName}</span>
                        <span className="text-xs text-gray-500 flex-1 truncate">{field.value}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${field.confirmed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {field.confirmed ? 'Confirmed' : 'Unconfirmed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!selectedClient && !showNewClientForm && (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Users size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a client</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Choose a client from the list to view their documents and extracted fields,
              or create a new client.
            </p>
            <button
              onClick={() => setShowNewClientForm(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
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
    if (!seen.has(key) || field.confirmed) {
      seen.set(key, field);
    }
  }
  return Array.from(seen.values());
}

function Users({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
