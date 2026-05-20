"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Briefcase,
  Wand2,
} from "lucide-react";
import { Dropzone } from "@/components/Dropzone";
import { CandidateCard } from "@/components/CandidateCard";
import type { RankedCandidate } from "@/lib/rankCvs";
import { clsx } from "clsx";

type ParseFailure = { fileName: string; reason: string };

type ApiResult = {
  ranking: RankedCandidate[];
  meta: {
    model: string;
    cvCount: number;
    topOnly: boolean;
    failed: ParseFailure[];
  };
};

const EXAMPLE_JOB = `Szukamy Senior Backend Developera (Node.js) do zespołu fintech.

Wymagania:
- 5+ lat doświadczenia komercyjnego z Node.js i TypeScript
- Praktyczna znajomość PostgreSQL i Redis
- Doświadczenie w projektowaniu REST i GraphQL API
- Znajomość AWS (Lambda, RDS, S3) lub GCP
- Doświadczenie z CI/CD, Docker, Kubernetes
- Mile widziane: znajomość branży finansowej, Kafka, mikroserwisy

Oferujemy pracę zdalną, B2B 25-35k PLN, projekt płatniczy używany w 12 krajach.`;

export function CvFinder() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [topOnly, setTopOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFailed, setErrorFailed] = useState<ParseFailure[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);

  const canSubmit =
    !loading && files.length > 0 && jobDescription.trim().length >= 20;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setErrorFailed([]);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);
      formData.append("topOnly", topOnly ? "true" : "false");
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/rank", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.failed)) setErrorFailed(data.failed);
        throw new Error(data.error || "Nieznany błąd serwera.");
      }

      setResult(data);
      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-8 animate-slide-up"
        aria-label="Analiza CV"
      >
        <section aria-labelledby="step-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold"
            >
              1
            </span>
            <h2 id="step-1" className="text-lg font-semibold">
              Wgraj CV kandydatów
            </h2>
          </div>
          <Dropzone files={files} onChange={setFiles} disabled={loading} />
        </section>

        <section aria-labelledby="step-2">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold"
            >
              2
            </span>
            <h2 id="step-2" className="text-lg font-semibold">
              Opisz stanowisko
            </h2>
          </div>
          <div className="relative">
            <Briefcase
              aria-hidden="true"
              className="absolute top-4 left-4 h-4 w-4 text-white/30 pointer-events-none"
            />
            <label htmlFor="job-description" className="sr-only">
              Opis stanowiska pracy
            </label>
            <textarea
              id="job-description"
              name="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
              placeholder="Wklej ogłoszenie o pracę lub opisz, kogo szukasz: wymagane technologie, lata doświadczenia, branża, miło widziane umiejętności…"
              rows={8}
              className="input-field pl-11 resize-y min-h-[12rem] font-mono text-sm leading-relaxed"
              aria-describedby="job-description-counter"
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-white/40">
            <button
              type="button"
              onClick={() => setJobDescription(EXAMPLE_JOB)}
              disabled={loading}
              className="hover:text-white/80 transition-colors inline-flex items-center gap-1 disabled:opacity-30"
            >
              <Wand2 aria-hidden="true" className="h-3 w-3" />
              Wstaw przykładowy opis
            </button>
            <span
              id="job-description-counter"
              className={clsx(
                jobDescription.trim().length >= 20
                  ? "text-white/40"
                  : "text-amber-400/70"
              )}
            >
              {jobDescription.trim().length} / min. 20 znaków
            </span>
          </div>
        </section>

        <section aria-labelledby="step-3">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold"
            >
              3
            </span>
            <h2 id="step-3" className="text-lg font-semibold">
              Wybierz tryb
            </h2>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="step-3"
            className="grid sm:grid-cols-2 gap-3"
          >
            <ModeOption
              active={!topOnly}
              onClick={() => setTopOnly(false)}
              title="Pełen ranking"
              description="Wszyscy kandydaci od najlepszego do najgorszego"
              disabled={loading}
            />
            <ModeOption
              active={topOnly}
              onClick={() => setTopOnly(true)}
              title="Top 3"
              description="Tylko trzech najlepiej dopasowanych kandydatów"
              disabled={loading}
            />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 flex items-start gap-3 animate-fade-in"
          >
            <AlertCircle
              aria-hidden="true"
              className="h-5 w-5 text-rose-400 shrink-0 mt-0.5"
            />
            <div className="text-sm text-rose-200 space-y-2 min-w-0 flex-1">
              <div>{error}</div>
              {errorFailed.length > 0 && (
                <ul className="text-xs text-rose-200/80 space-y-1 mt-1">
                  {errorFailed.map((f) => (
                    <li key={f.fileName} className="break-words">
                      <span className="font-medium">{f.fileName}</span> —{" "}
                      {f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary flex-1 py-4 text-base"
          >
            {loading ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin"
                />
                AI analizuje CV…
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" className="h-5 w-5" />
                Uszereguj kandydatów
              </>
            )}
          </button>
          {(files.length > 0 || jobDescription) && !loading && (
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setJobDescription("");
                setResult(null);
                setError(null);
              }}
              className="btn-secondary"
            >
              Wyczyść
            </button>
          )}
        </div>
      </form>

      {result && (
        <section
          id="results"
          aria-label="Wyniki rankingu"
          className="mt-16 sm:mt-20 space-y-6 animate-fade-in scroll-mt-8"
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {result.meta.topOnly
                  ? "Top 3 kandydatów"
                  : "Ranking kandydatów"}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                Oceniono {result.meta.cvCount} CV • model{" "}
                <code className="text-accent">{result.meta.model}</code>
              </p>
            </div>
          </div>

          {result.meta.failed.length > 0 && (
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
                  Pominięto {result.meta.failed.length}{" "}
                  {result.meta.failed.length === 1 ? "plik" : "plików"} (nie
                  udało się odczytać tekstu):
                </div>
                <ul className="text-xs text-amber-100/70 space-y-1 mt-1">
                  {result.meta.failed.map((f) => (
                    <li key={f.fileName} className="break-words">
                      <span className="font-medium">{f.fileName}</span> —{" "}
                      {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <ol className="space-y-4 list-none p-0">
            {result.ranking.map((c, i) => (
              <li key={c.fileName}>
                <CandidateCard candidate={c} rank={i + 1} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "text-left p-4 rounded-xl border transition-all",
        active
          ? "border-primary/60 bg-primary/10 ring-2 ring-primary/30"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-white/50 mt-1">{description}</div>
    </button>
  );
}
