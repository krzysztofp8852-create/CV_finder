"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileUp, X, AlertCircle } from "lucide-react";
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
    <div className="flex-1 flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={clsx(
          "flex-1 min-h-[11rem] flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-9 cursor-pointer transition duration-200 text-center",
          isDragActive
            ? "border-accent bg-accent-soft/70"
            : "border-line-strong bg-paper/60 hover:border-ink/40 hover:bg-paper",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <FileUp aria-hidden="true" className="h-6 w-6 text-ink-soft" strokeWidth={1.5} />
        <p className="mt-3 font-medium">
          {isDragActive ? "Upuść pliki tutaj" : "Przeciągnij CV albo kliknij, żeby wybrać"}
        </p>
        <p className="mt-1.5 font-mono text-xs text-muted text-balance">
          PDF · DOCX · TXT, do {MAX_FILE_SIZE_LABEL}, maks. {MAX_FILES} plików
        </p>
      </div>

      {rejected.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 flex items-start gap-3 animate-fade-in"
        >
          <AlertCircle
            aria-hidden="true"
            className="h-5 w-5 text-warn shrink-0 mt-0.5"
          />
          <div className="text-sm text-ink min-w-0 flex-1">
            <div className="font-medium">
              Nie dodano {rejected.length}{" "}
              {plural(rejected.length, "pliku", "plików", "plików")}:
            </div>
            <ul className="text-xs text-ink-soft space-y-1 mt-1">
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
            className="p-1 rounded-md hover:bg-ink/5 shrink-0"
            aria-label="Zamknij komunikat"
          >
            <X className="h-4 w-4 text-ink-soft" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between text-sm px-1 mb-1">
            <span className="text-ink-soft">
              Wgrane: <span className="font-mono tabular-nums">{files.length}/{MAX_FILES}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setRejected([]);
              }}
              disabled={disabled}
              className="btn-text"
            >
              Usuń wszystkie
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-line border-y border-line">
            {files.map(({ id, file: f }) => (
              <li key={id} className="flex items-center gap-3 px-1 py-2.5 group">
                <span className="font-mono text-[10px] uppercase text-muted w-9 shrink-0">
                  {f.name.split(".").pop()?.slice(0, 4)}
                </span>
                <p className="flex-1 min-w-0 truncate text-sm">{f.name}</p>
                <span className="font-mono text-xs text-muted tabular-nums shrink-0">
                  {formatSize(f.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  disabled={disabled}
                  className="reveal-on-hover transition-opacity p-1 rounded-md hover:bg-ink/5 disabled:opacity-30"
                  aria-label={`Usuń ${f.name}`}
                >
                  <X className="h-4 w-4 text-ink-soft" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
