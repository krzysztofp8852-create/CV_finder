"use client";

import { AlertCircle, Download, Printer } from "lucide-react";
import { clsx } from "clsx";
import { CandidateCard } from "@/components/CandidateCard";
import type { RankedCandidate } from "@/lib/types";
import { downloadCsv, rankingToCsv } from "@/lib/exportCsv";
import { plural } from "@/lib/plural";

export type ParseFailure = { id: string; fileName: string; reason: string };

export type RankingView = {
  ranking: RankedCandidate[];
  meta: {
    model: string;
    cvCount: number;
    failed: ParseFailure[];
  };
};

type Props = {
  result: RankingView;
  topOnly: boolean;
  onTopOnlyChange: (topOnly: boolean) => void;
};

export function Results({ result, topOnly, onTopOnlyChange }: Props) {
  const visible = topOnly ? result.ranking.slice(0, 3) : result.ranking;
  const failedCount = result.meta.failed.length;

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(rankingToCsv(visible), `ranking-kandydatow-${date}.csv`);
  }

  return (
    <section
      id="results"
      aria-label="Wyniki rankingu"
      className="mt-16 sm:mt-20 space-y-6 animate-fade-in scroll-mt-8 print:mt-0"
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            {topOnly ? "Top 3 kandydatów" : "Ranking kandydatów"}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Oceniono {result.meta.cvCount} CV • model{" "}
            <code className="text-accent">{result.meta.model}</code>
          </p>
          <p className="text-white/40 text-xs mt-2">
            Ocena AI ma charakter pomocniczy i może zawierać błędy. Ostateczną
            decyzję o kandydacie podejmuje człowiek.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div
            role="radiogroup"
            aria-label="Widok wyników"
            className="inline-flex rounded-xl border border-white/10 p-1 text-sm"
          >
            {[
              { value: false, label: "Wszyscy" },
              { value: true, label: "Top 3" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={topOnly === option.value}
                onClick={() => onTopOnlyChange(option.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  topOnly === option.value
                    ? "bg-primary/20 text-white"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="btn-secondary text-sm px-4 py-2"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary text-sm px-4 py-2"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            Drukuj / PDF
          </button>
        </div>
      </div>

      {failedCount > 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3"
        >
          <AlertCircle
            aria-hidden="true"
            className="h-5 w-5 text-amber-400 shrink-0 mt-0.5"
          />
          <div className="text-sm text-amber-100/90 space-y-1 min-w-0 flex-1">
            <div className="font-medium">
              Pominięto {failedCount} {plural(failedCount, "plik", "pliki", "plików")}{" "}
              (nie udało się odczytać tekstu):
            </div>
            <ul className="text-xs text-amber-100/70 space-y-1 mt-1">
              {result.meta.failed.map((f) => (
                <li key={f.id} className="break-words">
                  <span className="font-medium">{f.fileName}</span> — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ol className="space-y-4 list-none p-0">
        {visible.map((c, i) => (
          <li key={c.id} className="print:break-inside-avoid">
            <CandidateCard candidate={c} rank={i + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}
