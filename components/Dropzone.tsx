"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { clsx } from "clsx";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

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

export function Dropzone({ files, onChange, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const map = new Map<string, File>();
      [...files, ...accepted].forEach((f) => {
        map.set(`${f.name}-${f.size}`, f);
      });
      onChange(Array.from(map.values()));
    },
    [files, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    disabled,
    multiple: true,
  });

  const removeFile = (key: string) => {
    onChange(files.filter((f) => `${f.name}-${f.size}` !== key));
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
              PDF, DOCX lub TXT • do 8 MB na plik • do 30 plików
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-sm text-white/60 px-1">
            <span>Wgrane CV: {files.length}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              className="text-white/40 hover:text-white/80 transition-colors disabled:opacity-30"
            >
              Wyczyść wszystkie
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {files.map((f) => {
              const key = `${f.name}-${f.size}`;
              return (
                <li
                  key={key}
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
                    onClick={() => removeFile(key)}
                    disabled={disabled}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 disabled:opacity-30"
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
