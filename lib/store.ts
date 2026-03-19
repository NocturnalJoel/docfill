// TODO: Replace with Supabase storage when ready
import fs from 'fs';
import path from 'path';
import { AppDatabase, Client, ClientDocument, Template } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// In-memory cache — avoids re-reading the JSON file on every API call.
// The Node.js process keeps this alive between requests in dev and production.
let dbCache: AppDatabase | null = null;

function readDb(): AppDatabase {
  if (dbCache) return dbCache;
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const empty: AppDatabase = { clients: [], documents: [], templates: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    dbCache = empty;
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    dbCache = JSON.parse(raw) as AppDatabase;
    return dbCache;
  } catch {
    const empty: AppDatabase = { clients: [], documents: [], templates: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    dbCache = empty;
    return empty;
  }
}

function writeDb(db: AppDatabase): void {
  ensureDataDir();
  dbCache = db;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Clients
export function getClients(): Client[] {
  return readDb().clients;
}

export function getClient(id: string): Client | undefined {
  return readDb().clients.find((c) => c.id === id);
}

export function createClient(client: Client): Client {
  const db = readDb();
  db.clients.push(client);
  writeDb(db);
  return client;
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const db = readDb();
  const idx = db.clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  db.clients[idx] = { ...db.clients[idx], ...updates, id };
  writeDb(db);
  return db.clients[idx];
}

export function deleteClient(id: string): boolean {
  const db = readDb();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== id);
  // also delete associated documents
  db.documents = db.documents.filter((d) => d.clientId !== id);
  writeDb(db);
  return db.clients.length < before;
}

// Documents
export function getDocuments(): ClientDocument[] {
  return readDb().documents;
}

export function getClientDocuments(clientId: string): ClientDocument[] {
  return readDb().documents.filter((d) => d.clientId === clientId);
}

export function getDocument(id: string): ClientDocument | undefined {
  return readDb().documents.find((d) => d.id === id);
}

export function createDocument(doc: ClientDocument): ClientDocument {
  const db = readDb();
  db.documents.push(doc);
  writeDb(db);
  return doc;
}

export function updateDocument(id: string, updates: Partial<ClientDocument>): ClientDocument | null {
  const db = readDb();
  const idx = db.documents.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  db.documents[idx] = { ...db.documents[idx], ...updates, id };
  writeDb(db);
  return db.documents[idx];
}

export function deleteDocument(id: string): boolean {
  const db = readDb();
  const before = db.documents.length;
  db.documents = db.documents.filter((d) => d.id !== id);
  writeDb(db);
  return db.documents.length < before;
}

// Templates
export function getTemplates(): Template[] {
  return readDb().templates;
}

export function getTemplate(id: string): Template | undefined {
  return readDb().templates.find((t) => t.id === id);
}

export function createTemplate(template: Template): Template {
  const db = readDb();
  db.templates.push(template);
  writeDb(db);
  return template;
}

export function updateTemplate(id: string, updates: Partial<Template>): Template | null {
  const db = readDb();
  const idx = db.templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.templates[idx] = { ...db.templates[idx], ...updates, id };
  writeDb(db);
  return db.templates[idx];
}

export function deleteTemplate(id: string): boolean {
  const db = readDb();
  const before = db.templates.length;
  db.templates = db.templates.filter((t) => t.id !== id);
  writeDb(db);
  return db.templates.length < before;
}

// File operations
export function saveUploadedFile(id: string, buffer: Buffer, ext: string): string {
  ensureDataDir();
  const filename = `${id}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filename;
}

export function saveHtmlFile(id: string, html: string): void {
  ensureDataDir();
  const filepath = path.join(UPLOADS_DIR, `${id}.html`);
  fs.writeFileSync(filepath, html, 'utf-8');
}

export function getHtmlContent(id: string): string | null {
  const filepath = path.join(UPLOADS_DIR, `${id}.html`);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, 'utf-8');
}

export function getUploadedFilePath(id: string): string | null {
  ensureDataDir();
  const files = fs.readdirSync(UPLOADS_DIR);
  // Exclude .html sidecar files when looking for the real document
  const match = files.find((f) => f.startsWith(id) && !f.endsWith('.html'));
  if (!match) return null;
  return path.join(UPLOADS_DIR, match);
}

export function deleteUploadedFile(id: string): boolean {
  const filepath = getUploadedFilePath(id);
  if (!filepath || !fs.existsSync(filepath)) return false;
  fs.unlinkSync(filepath);
  // Also delete HTML sidecar if present
  const htmlPath = path.join(UPLOADS_DIR, `${id}.html`);
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  return true;
}
