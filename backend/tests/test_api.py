from urllib.parse import quote

import httpx2
import pytest

from app.limits import MAX_FILE_SIZE, MAX_FILES

from .conftest import DEMO_CVS, cv_payload

TXT_CV = ("Jan Kowalski, Senior Python Developer, 7 lat FastAPI i AWS. " * 3).encode()


# --- /api/parse ---------------------------------------------------------------


def test_parse_returns_text(api):
    res = api.post("/api/parse", files={"file": ("jan.txt", TXT_CV, "text/plain")})
    assert res.status_code == 200
    assert res.json()["text"].startswith("Jan Kowalski")
    assert res.json()["charCount"] > 0


def test_parse_reads_demo_pdf(api):
    pdf = (DEMO_CVS / "pawel_dabrowski_cv.pdf").read_bytes()
    res = api.post("/api/parse", files={"file": ("pawel.pdf", pdf, "application/pdf")})
    assert res.status_code == 200
    assert "Paweł Dąbrowski" in res.json()["text"]


def test_parse_without_file_is_a_client_error(api):
    assert api.post("/api/parse").status_code == 400
    assert api.post("/api/parse", data={"other": "x"}).status_code == 400


def test_parse_rejects_files_over_limit(api):
    res = api.post("/api/parse", files={"file": ("big.txt", b"a" * (MAX_FILE_SIZE + 1), "text/plain")})
    assert res.status_code == 413
    assert res.json() == {"error": "Plik jest większy niż 4 MB."}


def test_parse_accepts_file_just_under_limit(api):
    res = api.post("/api/parse", files={"file": ("big.txt", b"a" * (MAX_FILE_SIZE - 1024), "text/plain")})
    assert res.status_code == 200


def test_parse_reports_unreadable_file(api):
    res = api.post("/api/parse", files={"file": ("scan.txt", b"za malo", "text/plain")})
    assert res.status_code == 422
    assert "za mało tekstu" in res.json()["error"]


# --- ochrona API --------------------------------------------------------------


def test_password_is_required_when_configured(api, monkeypatch):
    monkeypatch.setenv("ACCESS_PASSWORD", "hasło zażółć")
    files = {"file": ("jan.txt", TXT_CV, "text/plain")}

    missing = api.post("/api/parse", files=files)
    assert missing.status_code == 401
    assert missing.json() == {"error": "Podaj hasło dostępu.", "code": "auth_required"}

    wrong = api.post("/api/parse", files=files, headers={"x-access-password": "zle"})
    assert wrong.json()["error"] == "Nieprawidłowe hasło dostępu."

    ok = api.post("/api/parse", files=files, headers={"x-access-password": quote("hasło zażółć")})
    assert ok.status_code == 200


def test_rate_limit_blocks_after_limit(api, monkeypatch, fake_openai):
    monkeypatch.setenv("RATE_LIMIT_RANK_PER_HOUR", "2")
    for _ in range(2):
        assert api.post("/api/rank", json=cv_payload(1)).status_code == 200

    blocked = api.post("/api/rank", json=cv_payload(1))
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "rate_limited"
    assert int(blocked.headers["retry-after"]) > 0


def test_rate_limit_is_per_ip(api, monkeypatch, fake_openai):
    monkeypatch.setenv("RATE_LIMIT_RANK_PER_HOUR", "1")
    first = {"x-forwarded-for": "10.0.0.1"}
    assert api.post("/api/rank", json=cv_payload(1), headers=first).status_code == 200
    assert api.post("/api/rank", json=cv_payload(1), headers=first).status_code == 429
    assert api.post("/api/rank", json=cv_payload(1), headers={"x-forwarded-for": "10.0.0.2"}).status_code == 200


# --- /api/rank ----------------------------------------------------------------


def test_rank_returns_camel_case_ranking(api, fake_openai):
    res = api.post("/api/rank", json=cv_payload(3))
    assert res.status_code == 200
    body = res.json()

    assert body["meta"] == {"model": "gpt-4o-mini", "cvCount": 3, "batchCount": 1}
    first = body["ranking"][0]
    assert set(first) == {
        "id", "fileName", "score", "candidateName", "summary", "strengths", "weaknesses",
        "matchedSkills", "missingSkills", "recommendation", "manipulationNote",
    }
    assert [c["score"] for c in body["ranking"]] == sorted((c["score"] for c in body["ranking"]), reverse=True)


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (cv_payload(1, jobDescription="za krótki"), "co najmniej 20 znaków"),
        (cv_payload(1, jobDescription="x" * 10_001), "najwyżej 10000 znaków"),
        (cv_payload(0), "Wgraj przynajmniej jedno CV."),
        (cv_payload(MAX_FILES + 1), f"Maksymalnie {MAX_FILES} plików"),
        ({**cv_payload(1), "cvs": [{"id": "a", "fileName": "cv.pdf"}]}, "Nieprawidłowe dane CV."),
        ({**cv_payload(1), "cvs": [{"id": "a", "fileName": "a", "text": "t"}] * 2}, "Zduplikowany identyfikator"),
        ([1, 2, 3], "Nieprawidłowe dane zapytania."),
    ],
)
def test_rank_validates_input(api, fake_openai, payload, message):
    res = api.post("/api/rank", json=payload)
    assert res.status_code == 400
    assert message in res.json()["error"]
    assert fake_openai.requests == []


def test_rank_rejects_malformed_json(api):
    res = api.post("/api/rank", content=b"{nie json", headers={"content-type": "application/json"})
    assert res.status_code == 400


def error_from_openai(status: int, code: str, message: str = "upstream error"):
    def respond(body, heads):
        return httpx2.Response(status, json={"error": {"message": message, "type": code, "code": code}})

    return respond


@pytest.mark.parametrize(
    ("status", "code", "expected_status", "expected"),
    [
        (401, "invalid_api_key", 500, "błędnie skonfigurowany dostęp"),
        (429, "insufficient_quota", 503, "Wyczerpano środki"),
        (429, "rate_limit_exceeded", 503, "przeciążona"),
        (400, "context_length_exceeded", 400, "zbyt długa"),
        (503, "server_error", 502, "chwilowo niedostępna"),
    ],
)
def test_openai_errors_become_safe_messages(api, fake_openai, status, code, expected_status, expected):
    fake_openai.respond = error_from_openai(status, code, "Incorrect API key provided: sk-sec*****")
    res = api.post("/api/rank", json=cv_payload(1))

    assert res.status_code == expected_status
    assert expected in res.json()["error"]
    assert "sk-" not in res.text


def test_connection_failure_is_reported(api, fake_openai):
    def fail(body, heads):
        raise httpx2.ConnectError("connection refused")

    fake_openai.respond = fail
    res = api.post("/api/rank", json=cv_payload(1))
    assert res.status_code == 502
    assert "Nie udało się połączyć z usługą AI" in res.json()["error"]


def test_missing_api_key_gives_generic_error(api, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    from app import main

    main.openai_client.cache_clear()
    res = api.post("/api/rank", json=cv_payload(1))
    assert res.status_code == 500
    assert res.json() == {"error": "Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie."}


def test_health(api):
    assert api.get("/api/health").json() == {"status": "ok"}
