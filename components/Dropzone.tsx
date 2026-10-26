"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { MAX_FILES, MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "@/lib/limits";
import { plural } from "@/lib/plural";

export type CvFile = {
  id: string;
  file: File;
};

type Props = {
  files: CvFile[];
  onChange: (files: CvFile[]) => void;
  disabled?: boolean;
};

type Rejected = { fileName: string; reason: string };

let nextId = 0;

function newId(): string {
  nextId++;
  return `${Date.now().toString(36)}-${nextId}`;
}

// Ten sam plik wrzucony drugi raz - nie różne pliki o tej samej nazwie.
function sameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function rejectionReason(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-invalid-type") return "nieobsługiwany format (tylko PDF, DOCX, TXT)";
  if (code === "file-too-large") return `plik większy niż ${MAX_FILE_SIZE_LABEL}`;
  return rejection.errors[0]?.message ?? "nie można dodać pliku";
}

export function Dropzone({ files, onChange, disabled }: Props) {
  const [rejected, setRejected] = useState<Rejected[]>([]);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      const next = [...files];
      const skipped: Rejected[] = rejections.map((r) => ({
        fileName: r.file.name,
        reason: rejectionReason(r),
      }));

      for (const file of accepted) {
        if (next.some((entry) => sameFile(entry.file, file))) continue;
        if (next.length >= MAX_FILES) {
          skipped.push({
            fileName: file.name,
            reason: `przekroczono limit ${MAX_FILES} plików`,
          });
          continue;
        }
        next.push({ id: newId(), file });
      }

      setRejected(skipped);
      onChange(next);
    },
    [files, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple: true,
  });

  const removeFile = (id: string) => {
    onChange(files.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={clsx(
          "glass rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all text-center",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-white/10 hover:border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">
              {isDragActive
                ? "Upuść pliki tutaj…"
                : "Przeciągnij CV lub kliknij, aby wybrać"}
            </p>
            <p className="text-sm text-white/50 mt-1">
              PDF, DOCX lub TXT • do {MAX_FILE_SIZE_LABEL} na plik • do {MAX_FILES}{" "}
              plików
            </p>
          </div>
        </div>
      </div>

      {rejected.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3 animate-fade-in"
        >
          <AlertCircle
            aria-hidden="true"
            className="h-5 w-5 text-amber-400 shrink-0 mt-0.5"
          />
          <div className="text-sm text-amber-100/90 min-w-0 flex-1">
            <div className="font-medium">
              Nie dodano {rejected.length}{" "}
              {plural(rejected.length, "pliku", "plików", "plików")}:
            </div>
            <ul className="text-xs text-amber-100/70 space-y-1 mt-1">
              {rejected.map((r, i) => (
                <li key={i} className="break-words">
                  <span className="font-medium">{r.fileName}</span> — {r.reason}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setRejected([])}
            className="p-1 rounded-md hover:bg-white/10 shrink-0"
            aria-label="Zamknij komunikat"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-sm text-white/60 px-1">
            <span>
              Wgrane CV: {files.length} / {MAX_FILES}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setRejected([]);
              }}
              disabled={disabled}
              className="text-white/40 hover:text-white/80 transition-colors disabled:opacity-30"
            >
              Wyczyść wszystkie
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {files.map(({ id, file: f }) => {
              return (
                <li
                  key={id}
                  className="glass rounded-xl px-4 py-3 flex items-center gap-3 group"
                >
                  <div className="rounded-lg bg-white/5 p-2">
                    <FileText className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-white/40">{formatSize(f.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(id)}
                    disabled={disabled}
                    className="reveal-on-hover transition-opacity p-1 rounded-md hover:bg-white/10 disabled:opacity-30"
                    aria-label={`Usuń ${f.name}`}
                  >
                    <X className="h-4 w-4 text-white/60" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
