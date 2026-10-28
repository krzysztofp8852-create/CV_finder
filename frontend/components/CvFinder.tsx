"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Briefcase,
  Wand2,
  KeyRound,
  X,
} from "lucide-react";
import { Dropzone, type CvFile } from "@/components/Dropzone";
import { Results, type ParseFailure, type RankingView } from "@/components/Results";
import type { CvInput } from "@/lib/types";
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  MIN_JOB_DESCRIPTION,
} from "@/lib/limits";
import { clsx } from "clsx";

type Progress =
  | { phase: "parsing"; done: number; total: number }
  | { phase: "ranking"; startedAt: number };

const PASSWORD_HEADER = "x-access-password";
const PASSWORD_STORAGE_KEY = "cv-finder:access-password";
// sessionStorage: wynik przeżywa odświeżenie, ale znika po zamknięciu karty
// (zawiera dane osobowe kandydatów).
const RESULT_STORAGE_KEY = "cv-finder:last-result";
const PARSE_CONCURRENCY = 4;

class CancelledError extends Error {}

/** Błąd, który przerywa całą analizę (hasło, limit zapytań). */
class FatalApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

function httpErrorMessage(status: number): string {
  if (status === 413)
    return `Plik jest za duży dla serwera (limit ${MAX_FILE_SIZE_LABEL}).`;
  if (status === 408 || status === 504)
    return "Serwer nie zdążył odpowiedzieć. Spróbuj z mniejszą liczbą CV.";
  if (status === 429) return "Zbyt wiele zapytań. Spróbuj ponownie za chwilę.";
  return `Serwer zwrócił nieoczekiwaną odpowiedź (HTTP ${status}).`;
}

// Hosting potrafi zwrócić stronę HTML zamiast JSON-a (np. 413, 504).
async function readJson(res: Response): Promise<Record<string, any>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: httpErrorMessage(res.status) };
  }
}

async function postToApi(
  url: string,
  init: RequestInit
): Promise<{ res: Response; data: Record<string, any> }> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", ...init });
  } catch {
    if (init.signal?.aborted) throw new CancelledError();
    throw new FatalApiError("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
  }
  const data = await readJson(res);
  if (res.status === 401 || res.status === 429) {
    throw new FatalApiError(data.error || httpErrorMessage(res.status), data.code);
  }
  return { res, data };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  let failed = false;
  async function lane() {
    while (!failed && next < items.length) {
      const item = items[next++];
      try {
        await worker(item);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  }
  // Czekamy na wszystkie tory, żeby żaden nie aktualizował stanu po błędzie.
  const lanes = Array.from({ length: Math.min(limit, items.length) }, lane);
  const settled = await Promise.allSettled(lanes);
  const rejected = settled.find((r) => r.status === "rejected");
  if (rejected) throw (rejected as PromiseRejectedResult).reason;
}

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
  const [files, setFiles] = useState<CvFile[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [topOnly, setTopOnly] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorFailed, setErrorFailed] = useState<ParseFailure[]>([]);
  const [result, setResult] = useState<RankingView | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PASSWORD_STORAGE_KEY);
      if (saved) {
        setPassword(saved);
        setNeedsPassword(true);
      }
    } catch {
      // Brak dostępu do localStorage - hasło trzeba będzie wpisać ręcznie.
    }
    try {
      const saved = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (saved) setResult(JSON.parse(saved));
    } catch {
      // Brak zapisanego wyniku albo niedostępny sessionStorage.
    }
  }, []);

  const rankingStartedAt = progress?.phase === "ranking" ? progress.startedAt : null;
  useEffect(() => {
    if (rankingStartedAt === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [rankingStartedAt]);

  const loading = progress !== null;
  const canSubmit =
    !loading &&
    files.length > 0 &&
    jobDescription.trim().length >= MIN_JOB_DESCRIPTION &&
    (!needsPassword || password.length > 0);

  function saveResult(value: RankingView | null) {
    setResult(value);
    try {
      if (value) sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(RESULT_STORAGE_KEY);
    } catch {
      // Zapis wyniku jest tylko wygodą.
    }
  }

  function authHeaders(): Record<string, string> {
    return password ? { [PASSWORD_HEADER]: encodeURIComponent(password) } : {};
  }

  async function parseFiles(
    signal: AbortSignal
  ): Promise<{ parsed: CvInput[]; failed: ParseFailure[] }> {
    const parsed = new Map<string, CvInput>();
    const failed: ParseFailure[] = [];
    let done = 0;
    setProgress({ phase: "parsing", done, total: files.length });

    await runWithConcurrency(files, PARSE_CONCURRENCY, async ({ id, file }) => {
      if (file.size > MAX_FILE_SIZE) {
        failed.push({
          id,
          fileName: file.name,
          reason: `Plik jest większy niż ${MAX_FILE_SIZE_LABEL}.`,
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const { res, data } = await postToApi("/api/parse", {
          body: formData,
          headers: authHeaders(),
          signal,
        });
        if (res.ok) {
          parsed.set(id, { id, fileName: file.name, text: data.text });
        } else {
          failed.push({
            id,
            fileName: file.name,
            reason: data.error || httpErrorMessage(res.status),
          });
        }
      }
      done++;
      setProgress({ phase: "parsing", done, total: files.length });
    });

    // Zachowujemy kolejność wgrania, niezależnie od kolejności odpowiedzi.
    const ordered = files.flatMap(({ id }) => {
      const cv = parsed.get(id);
      return cv ? [cv] : [];
    });
    const order = new Map(files.map(({ id }, idx) => [id, idx]));
    failed.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return { parsed: ordered, failed };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setErrorFailed([]);
    const previousResult = result;
    saveResult(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { parsed, failed } = await parseFiles(controller.signal);

      if (parsed.length === 0) {
        setErrorFailed(failed);
        throw new Error(
          "Nie udało się odczytać żadnego z wgranych plików. Sprawdź, czy CV nie są zeskanowanymi obrazami lub uszkodzonymi PDF-ami."
        );
      }

      setProgress({ phase: "ranking", startedAt: Date.now() });
      const { res, data } = await postToApi("/api/rank", {
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ jobDescription, cvs: parsed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setErrorFailed(failed);
        throw new Error(data.error || httpErrorMessage(res.status));
      }

      try {
        if (password) localStorage.setItem(PASSWORD_STORAGE_KEY, password);
      } catch {
        // Zapamiętanie hasła jest tylko wygodą.
      }

      saveResult({
        ranking: data.ranking,
        meta: { model: data.meta.model, cvCount: data.meta.cvCount, failed },
      });
      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      if (err instanceof CancelledError) {
        // Anulowanie przywraca poprzedni wynik.
        saveResult(previousResult);
        return;
      }
      if (err instanceof FatalApiError && err.code === "auth_required") {
        setNeedsPassword(true);
        try {
          localStorage.removeItem(PASSWORD_STORAGE_KEY);
        } catch {
          // jw.
        }
      }
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }

  function loadingLabel(): string {
    if (progress?.phase === "parsing") {
      return `Odczytywanie plików ${progress.done}/${progress.total}…`;
    }
    const seconds = rankingStartedAt
      ? Math.max(0, Math.floor((now - rankingStartedAt) / 1000))
      : 0;
    return `AI analizuje CV… ${seconds} s`;
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-8 animate-slide-up print:hidden"
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
                jobDescription.trim().length >= MIN_JOB_DESCRIPTION
                  ? "text-white/40"
                  : "text-amber-400/70"
              )}
            >
              {jobDescription.trim().length} / min. {MIN_JOB_DESCRIPTION} znaków
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
              description="Wszyscy kandydaci od najlepszego do najgorszego. Widok zmienisz też po analizie."
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

        {needsPassword && (
          <section aria-labelledby="access-password-label">
            <label
              id="access-password-label"
              htmlFor="access-password"
              className="block text-sm font-medium mb-2"
            >
              Hasło dostępu
            </label>
            <div className="relative">
              <KeyRound
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 left-4 h-4 w-4 text-white/30 pointer-events-none"
              />
              <input
                id="access-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="input-field pl-11"
              />
            </div>
          </section>
        )}

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
                    <li key={f.id} className="break-words">
                      <span className="font-medium">{f.fileName}</span> —{" "}
                      {f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                  <span aria-live="polite">{loadingLabel()}</span>
                </>
              ) : (
                <>
                  <Sparkles aria-hidden="true" className="h-5 w-5" />
                  Uszereguj kandydatów
                </>
              )}
            </button>
            {loading && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="btn-secondary"
              >
                <X aria-hidden="true" className="h-4 w-4" />
                Anuluj
              </button>
            )}
            {(files.length > 0 || jobDescription) && !loading && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setJobDescription("");
                  saveResult(null);
                  setError(null);
                  setErrorFailed([]);
                }}
                className="btn-secondary"
              >
                Wyczyść
              </button>
            )}
          </div>
          {progress?.phase === "ranking" && (
            <p className="text-xs text-white/40 px-1">
              Zwykle trwa to od kilkunastu sekund do minuty, zależnie od liczby
              CV. Anulowanie przerywa czekanie, ale analiza rozpoczęta na
              serwerze może zostać policzona w koszcie OpenAI.
            </p>
          )}
          <p className="text-xs text-white/40 leading-relaxed px-1">
            Tekst CV zostanie przesłany do OpenAI API w celu oceny. Upewnij się,
            że masz podstawę prawną do przetwarzania danych kandydatów (RODO).
          </p>
        </div>
      </form>

      {result && (
        <Results result={result} topOnly={topOnly} onTopOnlyChange={setTopOnly} />
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
