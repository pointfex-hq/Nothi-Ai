'use client';

import { useState, useRef } from 'react';
import type { UploadedFile, DocType } from '@/types';
import { useLang } from '@/lib/lang';

interface IntakeSectionProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onLoadBenchmark: (packet: 'A' | 'B') => void;
  onRunAudit: () => void;
  isAuditing: boolean;
  selectedPacket: 'A' | 'B' | null;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function IntakeSection({
  files,
  onFilesChange,
  onLoadBenchmark,
  onRunAudit,
  isAuditing,
  selectedPacket,
}: IntakeSectionProps) {
  const { lang, t } = useLang();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateAndAddFiles(fileList: FileList | File[]) {
    setErrorMsg(null);
    const newFiles: UploadedFile[] = [...files];

    if (newFiles.length + fileList.length > 3) {
      setErrorMsg(
        lang === 'bn'
          ? 'সর্বোচ্চ ৩টি দলিল অনুমোদিত (সাফ কবলা, আরএস/বিএস খতিয়ান, জাতীয় পরিচয়পত্র)।'
          : 'A maximum of 3 documents can be vetted together (Saf Kabala Deed, RS/BS Khatian, NID).'
      );
      return;
    }

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setErrorMsg(
          lang === 'bn'
            ? `ফাইল "${f.name}" গ্রহণযোগ্য নয়। কেবল PDF, JPG অথবা PNG ফাইল অনুমোদিত।`
            : `File "${f.name}" format not accepted. Only PDF, JPG, and PNG files are allowed.`
        );
        return;
      }

      if (f.size > MAX_FILE_SIZE) {
        setErrorMsg(
          lang === 'bn'
            ? `ফাইল "${f.name}" ১৫ মেগাবাইট আকারের সীমা অতিক্রম করেছে।`
            : `File "${f.name}" exceeds the maximum allowed size of 15 MB.`
        );
        return;
      }

      // Auto classify based on index or name hint
      let guessedType: DocType = 'deed';
      const lower = f.name.toLowerCase();
      if (lower.includes('khatian') || lower.includes('rs') || lower.includes('bs') || lower.includes('porcha')) {
        guessedType = 'khatian';
      } else if (lower.includes('nid') || lower.includes('national') || lower.includes('id')) {
        guessedType = 'nid';
      } else if (newFiles.length === 1) {
        guessedType = 'khatian';
      } else if (newFiles.length === 2) {
        guessedType = 'nid';
      }

      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        name: f.name,
        type: guessedType,
        size: f.size,
        mimeType: f.type,
      });
    }

    onFilesChange(newFiles);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  }

  function handleRemoveFile(id: string) {
    onFilesChange(files.filter((f) => f.id !== id));
  }

  function handleTypeChange(id: string, newType: DocType) {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, type: newType } : f))
    );
  }

  return (
    <section className="rounded-sm border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-green-deep">
            {t('audit.intake')}
          </h2>
          <p className="text-xs text-ink-muted">
            {lang === 'bn'
              ? 'সাফ কবলা দলিল, খতিয়ান এবং জাতীয় পরিচয়পত্র আপলোড করুন।'
              : 'Saf Kabala Deed, RS/BS Khatian, and National ID packet (max 3 files, 15MB each).'}
          </p>
        </div>

        {/* Benchmark Fast Loaders */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadBenchmark('A')}
            disabled={isAuditing}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all ${
              selectedPacket === 'A'
                ? 'bg-flag-green text-paper border-flag-green font-semibold shadow-xs'
                : 'border-border text-ink bg-paper hover:border-flag-green hover:text-flag-green'
            }`}
          >
            ✓ {t('audit.packetA')}
          </button>
          <button
            type="button"
            onClick={() => onLoadBenchmark('B')}
            disabled={isAuditing}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-all ${
              selectedPacket === 'B'
                ? 'bg-vermillion text-paper border-vermillion font-semibold shadow-xs'
                : 'border-border text-ink bg-paper hover:border-vermillion hover:text-vermillion'
            }`}
          >
            ⚠ {t('audit.packetB')}
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-green-mid bg-green-light/10'
            : 'border-border-light bg-paper hover:border-border hover:bg-paper-light'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="mx-auto max-w-sm space-y-1">
          <p className="text-xs font-mono font-medium text-green-deep">
            {lang === 'bn' ? 'ফাইল নির্বাচন করতে ক্লিক করুন বা টেনে আনুন' : 'Click to browse or drag & drop files'}
          </p>
          <p className="text-[11px] text-ink-muted">
            PDF, JPG, PNG • Max 15 MB / file • Up to 3 documents
          </p>
        </div>
      </div>

      {/* Validation Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-3 p-2.5 rounded-sm bg-vermillion/10 border border-vermillion/30 text-vermillion text-xs flex items-center justify-between"
        >
          <span>⚠ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-mono px-1 hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploaded Files Classified List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
            {lang === 'bn' ? 'নথিপত্র প্যাকেট বিন্যাস:' : 'Document Packet Roster:'}
          </div>
          <div className="divide-y divide-border border border-border rounded-sm bg-paper">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="mono-id text-[10px] bg-paper-dark px-1.5 py-0.5 rounded-sm border border-border">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <span className="font-medium text-ink truncate max-w-[180px] sm:max-w-[240px]">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={file.type}
                    onChange={(e) => handleTypeChange(file.id, e.target.value as DocType)}
                    className="text-xs font-sans border border-border rounded-sm bg-surface px-2 py-1 text-ink focus:border-green-mid"
                  >
                    <option value="deed">Property Deed (সাফ কবলা)</option>
                    <option value="khatian">RS/BS Khatian (খতিয়ান)</option>
                    <option value="nid">National ID (NID)</option>
                  </select>

                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-ink-muted hover:text-vermillion px-1.5 py-0.5 rounded-sm border border-transparent hover:border-vermillion/30 text-xs"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Strip */}
      <div className="mt-4 flex items-center justify-between pt-2">
        <span className="text-xs text-ink-muted">
          {files.length === 0
            ? lang === 'bn' ? 'কোনো দলিল নির্বাচিত নয়।' : 'No files selected.'
            : `${files.length}/3 ${lang === 'bn' ? 'দলিল প্রস্তুত' : 'documents ready'}`}
        </span>

        <button
          onClick={onRunAudit}
          disabled={files.length === 0 || isAuditing}
          className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
            files.length === 0 || isAuditing
              ? 'bg-border text-ink-muted cursor-not-allowed'
              : 'bg-green-deep text-paper hover:bg-green-mid shadow-xs'
          }`}
        >
          {isAuditing
            ? (lang === 'bn' ? 'নিরীক্ষা চলছে...' : 'Auditing...')
            : t('audit.run')}
        </button>
      </div>
    </section>
  );
}
