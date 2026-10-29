"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, AlertCircle, KeyRound } from "lucide-react";
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
    return `Model ocenia CV… ${seconds} s`;
  }

  const jobLength = jobDescription.trim().length;
  const parsedShare =
    progress?.phase === "parsing" && progress.total > 0
      ? progress.done / progress.total
      : null;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="sheet animate-slide-up [animation-delay:200ms] print:hidden"
        aria-label="Analiza CV"
      >
        <div className="grid lg:grid-cols-2">
          <section aria-labelledby="step-1" className="p-5 sm:p-7 flex flex-col">
            <StepHeading n={1} id="step-1">
              CV kandydatów
            </StepHeading>
            <Dropzone files={files} onChange={setFiles} disabled={loading} />
          </section>

          <section
            aria-labelledby="step-2"
            className="p-5 sm:p-7 flex flex-col border-t lg:border-t-0 lg:border-l border-line"
          >
            <StepHeading n={2} id="step-2">
              Stanowisko
            </StepHeading>
            <label htmlFor="job-description" className="sr-only">
              Opis stanowiska pracy
            </label>
            <textarea
              id="job-description"
              name="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
              placeholder="Wklej ogłoszenie albo opisz, kogo szukasz: technologie, lata doświadczenia, branża, co mile widziane…"
              rows={9}
              className="input-field flex-1 resize-y min-h-[14rem] text-[15px] leading-relaxed"
              aria-describedby="job-description-counter"
            />
            <div className="flex items-center justify-between gap-4 mt-3">
              <button
                type="button"
                onClick={() => setJobDescription(EXAMPLE_JOB)}
                disabled={loading}
                className="btn-text text-left"
              >
                Wstaw przykładowe ogłoszenie
              </button>
              <span
                id="job-description-counter"
                className={clsx(
                  "font-mono text-xs tabular-nums whitespace-nowrap shrink-0",
                  jobLength >= MIN_JOB_DESCRIPTION ? "text-muted" : "text-warn"
                )}
              >
                {jobLength} / min. {MIN_JOB_DESCRIPTION}
              </span>
            </div>
          </section>
        </div>

        <div className="border-t border-line p-5 sm:p-7 space-y-5 rounded-b-[20px] bg-paper/50">
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:justify-between">
            <section aria-labelledby="step-3">
              <StepHeading n={3} id="step-3">
                Widok wyników
              </StepHeading>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div
                  role="radiogroup"
                  aria-labelledby="step-3"
                  className="inline-flex rounded-xl border border-line-strong bg-surface p-1 text-sm"
                >
                  {[
                    { value: false, label: "Pełen ranking" },
                    { value: true, label: "Top 3" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={topOnly === option.value}
                      onClick={() => setTopOnly(option.value)}
                      disabled={loading}
                      className={clsx(
                        "px-4 py-2 rounded-lg transition duration-200 disabled:cursor-not-allowed",
                        topOnly === option.value
                          ? "bg-ink text-paper"
                          : "text-ink-soft hover:text-ink hover:bg-ink/[0.04]"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted">
                  {topOnly
                    ? "Tylko trzech najlepiej dopasowanych."
                    : "Wszyscy, od najwyższego wyniku."}{" "}
                  Zmienisz to też po analizie.
                </span>
              </div>
            </section>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
              {loading && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="btn-secondary"
                >
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
              <button
                type="submit"
                disabled={!canSubmit}
                aria-busy={loading}
                className={clsx(
                  "btn-primary whitespace-nowrap sm:min-w-[15rem] py-3.5",
                  loading && "disabled:bg-ink disabled:cursor-progress"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    <span aria-live="polite" className="tabular-nums">
                      {loadingLabel()}
                    </span>
                  </>
                ) : (
                  <>
                    Uszereguj kandydatów
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {loading && (
            <div
              aria-hidden="true"
              className="h-1 rounded-full bg-line overflow-hidden"
            >
              {parsedShare !== null ? (
                <div
                  className="h-full bg-ink transition-[width] duration-300"
                  style={{ width: `${Math.max(4, parsedShare * 100)}%` }}
                />
              ) : (
                <div className="h-full w-2/5 bg-accent animate-indeterminate" />
              )}
            </div>
          )}

          {needsPassword && (
            <div className="max-w-sm">
              <label
                htmlFor="access-password"
                className="block text-sm font-medium mb-2"
              >
                Hasło dostępu
              </label>
              <div className="relative">
                <KeyRound
                  aria-hidden="true"
                  className="absolute top-1/2 -translate-y-1/2 left-4 h-4 w-4 text-muted pointer-events-none"
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
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 flex items-start gap-3 animate-fade-in"
            >
              <AlertCircle
                aria-hidden="true"
                className="h-5 w-5 text-danger shrink-0 mt-0.5"
              />
              <div className="text-sm text-ink space-y-2 min-w-0 flex-1">
                <div>{error}</div>
                {errorFailed.length > 0 && (
                  <ul className="text-xs text-ink-soft space-y-1 mt-1">
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

          <div className="text-xs text-muted leading-relaxed space-y-1 max-w-3xl">
            {progress?.phase === "ranking" && (
              <p>
                Zwykle trwa to od kilkunastu sekund do minuty, zależnie od liczby
                CV. Anulowanie przerywa czekanie, ale analiza rozpoczęta na
                serwerze może zostać policzona w koszcie OpenAI.
              </p>
            )}
            <p>
              Tekst CV zostanie przesłany do OpenAI API w celu oceny. Upewnij się,
              że masz podstawę prawną do przetwarzania danych kandydatów (RODO).
            </p>
          </div>
        </div>
      </form>

      {result && (
        <Results result={result} topOnly={topOnly} onTopOnlyChange={setTopOnly} />
      )}
    </>
  );
}

function StepHeading({
  n,
  id,
  children,
}: {
  n: number;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span aria-hidden="true" className="font-mono text-xs text-muted">
        {String(n).padStart(2, "0")}
      </span>
      <h2 id={id} className="text-base font-semibold">
        {children}
      </h2>
    </div>
  );
}
