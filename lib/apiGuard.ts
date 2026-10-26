import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const PASSWORD_HEADER = "x-access-password";

type Scope = "parse" | "rank";

const HOUR_MS = 60 * 60 * 1000;

const DEFAULT_LIMITS: Record<Scope, number> = {
  parse: 300,
  rank: 10,
};

const LIMIT_ENV: Record<Scope, string> = {
  parse: "RATE_LIMIT_PARSE_PER_HOUR",
  rank: "RATE_LIMIT_RANK_PER_HOUR",
};

type Bucket = { count: number; resetAt: number };

// Pamięć procesu: wystarcza na jednym serwerze Node. Na serverless (Vercel)
// każda instancja ma własny licznik, więc limit jest tylko orientacyjny.
const buckets = new Map<string, Bucket>();

function limitFor(scope: Scope): number {
  const raw = Number(process.env[LIMIT_ENV[scope]]);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LIMITS[scope];
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function hit(key: string, limit: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + HOUR_MS });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function passwordMatches(request: Request, expected: string): boolean {
  const raw = request.headers.get(PASSWORD_HEADER);
  if (!raw) return false;
  let provided: string;
  try {
    provided = decodeURIComponent(raw);
  } catch {
    return false;
  }
  return timingSafeEqual(digest(provided), digest(expected));
}

/**
 * Sprawdza hasło dostępu (jeśli ustawione ACCESS_PASSWORD) i limit zapytań na IP.
 * Zwraca gotową odpowiedź błędu albo null, gdy zapytanie może przejść dalej.
 */
export function guardRequest(request: Request, scope: Scope): NextResponse | null {
  // Limit liczony przed hasłem, żeby ograniczał też zgadywanie hasła.
  const result = hit(`${scope}:${clientIp(request)}`, limitFor(scope));
  if (!result.ok) {
    const minutes = Math.ceil(result.retryAfterSec / 60);
    return NextResponse.json(
      {
        error: `Przekroczono limit zapytań. Spróbuj ponownie za ok. ${minutes} min.`,
        code: "rate_limited",
      },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
    );
  }

  const password = process.env.ACCESS_PASSWORD;
  if (password && !passwordMatches(request, password)) {
    const provided = request.headers.has(PASSWORD_HEADER);
    return NextResponse.json(
      {
        error: provided ? "Nieprawidłowe hasło dostępu." : "Podaj hasło dostępu.",
        code: "auth_required",
      },
      { status: 401 }
    );
  }

  return null;
}
