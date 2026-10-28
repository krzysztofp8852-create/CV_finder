"""Hasło dostępu (ACCESS_PASSWORD) i limit zapytań na IP."""

import hashlib
import hmac
import math
import os
import time
from dataclasses import dataclass
from typing import Literal
from urllib.parse import unquote

from fastapi import Request
from fastapi.responses import JSONResponse

PASSWORD_HEADER = "x-access-password"
HOUR_SECONDS = 60 * 60

Scope = Literal["parse", "rank"]

DEFAULT_LIMITS: dict[Scope, int] = {"parse": 300, "rank": 10}
LIMIT_ENV: dict[Scope, str] = {
    "parse": "RATE_LIMIT_PARSE_PER_HOUR",
    "rank": "RATE_LIMIT_RANK_PER_HOUR",
}


@dataclass
class _Bucket:
    count: int
    reset_at: float


# Pamięć procesu: wystarcza na jednym serwerze. Na serverless (Vercel) każda
# instancja ma własny licznik, więc limit jest tylko orientacyjny.
_buckets: dict[str, _Bucket] = {}


def reset_rate_limits() -> None:
    _buckets.clear()


def _limit_for(scope: Scope) -> int:
    try:
        value = int(os.environ.get(LIMIT_ENV[scope], ""))
    except ValueError:
        return DEFAULT_LIMITS[scope]
    return value if value > 0 else DEFAULT_LIMITS[scope]


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


def _hit(key: str, limit: int) -> int | None:
    """Zlicza zapytanie. Zwraca liczbę sekund do odblokowania albo None, gdy limit nie przekroczony."""
    now = time.monotonic()
    if len(_buckets) > 10_000:
        for k in [k for k, b in _buckets.items() if b.reset_at <= now]:
            del _buckets[k]

    bucket = _buckets.get(key)
    if bucket is None or bucket.reset_at <= now:
        _buckets[key] = _Bucket(count=1, reset_at=now + HOUR_SECONDS)
        return None
    if bucket.count >= limit:
        return math.ceil(bucket.reset_at - now)
    bucket.count += 1
    return None


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode()).digest()


def _password_matches(request: Request, expected: str) -> bool:
    raw = request.headers.get(PASSWORD_HEADER)
    if not raw:
        return False
    # Klient koduje hasło przez encodeURIComponent (nagłówki HTTP są ASCII).
    return hmac.compare_digest(_digest(unquote(raw)), _digest(expected))


def guard_request(request: Request, scope: Scope) -> JSONResponse | None:
    """Zwraca gotową odpowiedź błędu albo None, gdy zapytanie może przejść dalej."""
    # Limit liczony przed hasłem, żeby ograniczał też zgadywanie hasła.
    retry_after = _hit(f"{scope}:{_client_ip(request)}", _limit_for(scope))
    if retry_after is not None:
        minutes = math.ceil(retry_after / 60)
        return JSONResponse(
            {
                "error": f"Przekroczono limit zapytań. Spróbuj ponownie za ok. {minutes} min.",
                "code": "rate_limited",
            },
            status_code=429,
            headers={"Retry-After": str(retry_after)},
        )

    password = os.environ.get("ACCESS_PASSWORD")
    if password and not _password_matches(request, password):
        provided = PASSWORD_HEADER in request.headers
        return JSONResponse(
            {
                "error": "Nieprawidłowe hasło dostępu." if provided else "Podaj hasło dostępu.",
                "code": "auth_required",
            },
            status_code=401,
        )
    return None
