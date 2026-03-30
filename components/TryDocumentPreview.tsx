'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';
import type { DetectedField } from '@/lib/types';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PREVIEW_WIDTH = 580;

interface Props {
  fileType: 'pdf' | 'docx';
  fileUrl?: string;    // object URL for PDF
  wordHtml?: string;   // converted HTML for DOCX
  fields: DetectedField[];
}

export default function TryDocumentPreview({ fileType, fileUrl, wordHtml, fields }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageDims, setPageDims] = useState<{ w: number; h: number }[]>([]);

  if (fileType === 'pdf' && fileUrl) {
    return (
      <div
        className="border border-black/10 rounded-xl overflow-auto bg-gray-50"
        style={{ maxHeight: '420px' }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center justify-center p-12">
              <Loader2 size={24} className="animate-spin text-black/30" />
            </div>
          }
          error={
            <div className="p-8 text-sm text-black/40 text-center">
              Could not render preview.
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pn) => {
            const dims = pageDims[pn - 1] ?? { w: PREVIEW_WIDTH, h: PREVIEW_WIDTH * 1.294 };
            const pageFields = fields.filter((f) => f.rectangle.pageNumber === pn);
            return (
              <div
                key={pn}
                className="relative mb-3 mx-auto shadow"
                style={{ width: dims.w, height: dims.h }}
              >
                <Page
                  pageNumber={pn}
                  width={PREVIEW_WIDTH}
                  onLoadSuccess={(page) =>
                    setPageDims((prev) => {
                      const next = [...prev];
                      next[pn - 1] = {
                        w: PREVIEW_WIDTH,
                        h: (PREVIEW_WIDTH / page.width) * page.height,
                      };
                      return next;
                    })
                  }
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
                {pageFields.map((f) => (
                  <div
                    key={f.id}
                    className="absolute border-2 pointer-events-none"
                    style={{
                      left: `${f.rectangle.x * 100}%`,
                      top: `${f.rectangle.y * 100}%`,
                      width: `${f.rectangle.width * 100}%`,
                      height: `${f.rectangle.height * 100}%`,
                      borderColor: f.color,
                      backgroundColor: `${f.color}22`,
                    }}
                  >
                    <span
                      className="absolute -top-4 left-0 text-[9px] px-1 py-0.5 text-white rounded whitespace-nowrap overflow-hidden text-ellipsis block"
                      style={{ backgroundColor: f.color, maxWidth: '160px' }}
                    >
                      {f.fieldName}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </Document>
      </div>
    );
  }

  if (fileType === 'docx' && wordHtml) {
    return (
      <div
        className="border border-black/10 rounded-xl overflow-auto bg-white px-8 py-6 prose max-w-none"
        style={{
          maxHeight: '420px',
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: wordHtml }}
      />
    );
  }

  return null;
}
