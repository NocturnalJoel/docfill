'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
  accept?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function UploadDropzone({
  onUpload,
  accept = '.pdf,.docx',
  label = 'Drop PDF or DOCX here, or click to browse',
  disabled = false,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const name = file.name.toLowerCase();
      if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
        setError('Only PDF and DOCX files are supported');
        return;
      }
      onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className={cn('relative', className)}>
      <label
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 text-gray-500">
          <Upload size={20} />
          <FileText size={18} className="text-red-400" />
          <File size={18} className="text-blue-400" />
        </div>
        <span className="text-sm text-gray-600 text-center">{label}</span>
        <span className="text-xs text-gray-400">PDF or DOCX files</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
