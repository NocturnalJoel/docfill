export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  createdAt: string;
}

export interface Rectangle {
  x: number;       // normalized 0-1 fraction of page width
  y: number;       // normalized 0-1 fraction of page height
  width: number;   // normalized 0-1 fraction of page width
  height: number;  // normalized 0-1 fraction of page height
  pageNumber: number;
}

export interface DetectedField {
  id: string;
  fieldName: string;
  value: string;
  rectangle: Rectangle;
  color: string;
  confirmed: boolean;
  underlined?: boolean;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  fileName: string;
  fileType: 'pdf' | 'word';
  fileUrl: string;
  uploadedAt: string;
  fields: DetectedField[];
  pageCount: number;
}

export interface TemplateField {
  id: string;
  fieldName: string;
  placeholder: string;
  rectangle: Rectangle;
  color: string;
  confirmed?: boolean;
}

export interface Template {
  id: string;
  name: string;
  fileName: string;
  fileType: 'pdf' | 'word';
  fileUrl: string;
  uploadedAt: string;
  fields: TemplateField[];
  pageCount: number;
}

export interface FieldValue {
  fieldName: string;
  value: string;
  underlined?: boolean;
}

export interface AppDatabase {
  clients: Client[];
  documents: ClientDocument[];
  templates: Template[];
}
