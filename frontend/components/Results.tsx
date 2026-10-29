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
      className="mt-16 sm:mt-20 animate-fade-in scroll-mt-8 print:mt-0"
    >
      <div className="flex items-end justify-between gap-x-6 gap-y-4 flex-wrap pb-6 border-b border-line-strong">
        <div>
          <p className="font-mono text-xs text-muted">
            {result.meta.cvCount} CV · {result.meta.model}
          </p>
          <h2 className="mt-2 font-serif text-4xl sm:text-5xl tracking-[-0.01em]">
            {topOnly ? "Top 3" : "Ranking"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 print:hidden">
          <div
            role="radiogroup"
            aria-label="Widok wyników"
            className="inline-flex rounded-xl border border-line-strong bg-surface p-1 text-sm"
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
                  "px-3.5 py-1.5 rounded-lg transition duration-200",
                  topOnly === option.value
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:text-ink hover:bg-ink/[0.04]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={exportCsv} className="btn-text">
            <Download aria-hidden="true" className="h-4 w-4" />
            Eksport CSV
          </button>
          <button type="button" onClick={() => window.print()} className="btn-text">
            <Printer aria-hidden="true" className="h-4 w-4" />
            Drukuj / PDF
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted max-w-2xl">
        Ocena modelu jest pomocnicza i może zawierać błędy. Decyzję o kandydacie
        podejmuje człowiek.
      </p>

      {failedCount > 0 && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 flex items-start gap-3"
        >
          <AlertCircle
            aria-hidden="true"
            className="h-5 w-5 text-warn shrink-0 mt-0.5"
          />
          <div className="text-sm text-ink space-y-1 min-w-0 flex-1">
            <div className="font-medium">
              Pominięto {failedCount} {plural(failedCount, "plik", "pliki", "plików")}{" "}
              (nie udało się odczytać tekstu):
            </div>
            <ul className="text-xs text-ink-soft space-y-1 mt-1">
              {result.meta.failed.map((f) => (
                <li key={f.id} className="break-words">
                  <span className="font-medium">{f.fileName}</span> — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-3 list-none p-0">
        {visible.map((c, i) => (
          <li
            key={c.id}
            className="print:break-inside-avoid animate-slide-up"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <CandidateCard candidate={c} rank={i + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}
