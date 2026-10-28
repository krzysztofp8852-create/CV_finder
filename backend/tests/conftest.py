import json
import re
from collections.abc import Callable
from pathlib import Path

import httpx2
import pytest
from fastapi.testclient import TestClient
from openai import AsyncOpenAI

from app import main
from app.guard import reset_rate_limits

DEMO_CVS = Path(__file__).resolve().parents[2] / "docs" / "demo" / "cvs"

CV_HEADER = re.compile(r"=== (CV-\d+) \[([0-9a-f]{12})\] \| PLIK: (.+?) ===")


def completion(content: str | None, finish_reason: str = "stop", refusal: str | None = None) -> dict:
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 0,
        "model": "gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "finish_reason": finish_reason,
                "message": {"role": "assistant", "content": content, "refusal": refusal},
            }
        ],
    }


def candidate(cv_id: str, score: int, **extra) -> dict:
    return {
        "cvId": cv_id,
        "candidateName": extra.get("candidateName"),
        "score": score,
        "summary": extra.get("summary", "Podsumowanie"),
        "strengths": [],
        "weaknesses": [],
        "matchedSkills": [],
        "missingSkills": [],
        "manipulationNote": extra.get("manipulationNote"),
    }


class FakeOpenAI:
    """Atrapa API OpenAI na poziomie HTTP - prawdziwe SDK parsuje odpowiedzi."""

    def __init__(self) -> None:
        self.requests: list[dict] = []
        self.respond: Callable[[dict, list[tuple[str, str, str]]], httpx2.Response] = self.scores_from_text

    @staticmethod
    def cv_headers(body: dict) -> list[tuple[str, str, str]]:
        return CV_HEADER.findall(body["messages"][1]["content"])

    @staticmethod
    def scores_from_text(body: dict, headers: list[tuple[str, str, str]]) -> httpx2.Response:
        """Wynik CV bierze ze znacznika SCORE<n> w jego treści."""
        user = body["messages"][1]["content"]
        items = []
        for cv_id, nonce, _ in headers:
            chunk = user.split(f"=== {cv_id} [{nonce}] |")[1].split(f"=== KONIEC {cv_id}")[0]
            match = re.search(r"SCORE(\d+)", chunk)
            items.append(candidate(cv_id, int(match.group(1)) if match else 50))
        return httpx2.Response(200, json=completion(json.dumps({"ranking": items})))

    def handler(self, request: httpx2.Request) -> httpx2.Response:
        body = json.loads(request.content)
        self.requests.append(body)
        return self.respond(body, self.cv_headers(body))

    def client(self) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key="sk-test",
            max_retries=0,
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(self.handler)),
        )


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("ACCESS_PASSWORD", "RATE_LIMIT_RANK_PER_HOUR", "RATE_LIMIT_PARSE_PER_HOUR", "OPENAI_MODEL"):
        monkeypatch.delenv(name, raising=False)
    reset_rate_limits()
    yield
    reset_rate_limits()


@pytest.fixture
def fake_openai(monkeypatch) -> FakeOpenAI:
    fake = FakeOpenAI()
    client = fake.client()
    monkeypatch.setattr(main, "openai_client", lambda: client)
    return fake


@pytest.fixture
def api() -> TestClient:
    return TestClient(main.app)


def cv_payload(n: int, **overrides) -> dict:
    cvs = [
        {"id": f"id-{i}", "fileName": f"cv{i}.pdf", "text": f"Kandydat {i} SCORE{(i * 37) % 100} " + "x" * 80}
        for i in range(n)
    ]
    return {"jobDescription": "Senior Node.js developer z AWS i PostgreSQL", "cvs": cvs, **overrides}
