"""API CV Findera: odczyt plików CV i ranking kandydatów."""

import logging
import os
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI
from starlette.datastructures import UploadFile

from .guard import guard_request
from .limits import (
    MAX_CHARS_PER_CV,
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_LABEL,
    MAX_FILES,
    MAX_JOB_DESCRIPTION,
    MIN_JOB_DESCRIPTION,
)
from .parsing import ParseError, parse_cv
from .ranking import CvInput, rank_cvs, to_public_error

logger = logging.getLogger("cv_finder")

# Zapas na nagłówki multipart ponad sam plik.
MAX_PARSE_BODY = MAX_FILE_SIZE + 64 * 1024
# Same teksty CV (pliki są parsowane wcześniej przez /api/parse).
MAX_RANK_BODY = 1024 * 1024
MAX_ID_LENGTH = 64
MAX_FILE_NAME_LENGTH = 255

app = FastAPI(
    title="CV Finder API",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


@lru_cache
def openai_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Brak klucza OPENAI_API_KEY. Ustaw go w .env.local.")
    return AsyncOpenAI(api_key=api_key)


def error(message: str, status: int) -> JSONResponse:
    return JSONResponse({"error": message}, status_code=status)


def body_too_large(request: Request, limit: int) -> bool:
    try:
        return int(request.headers.get("content-length", "0")) > limit
    except ValueError:
        return False


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/parse")
async def parse_file(request: Request) -> Any:
    """Odczytuje tekst z jednego CV. Każdy plik idzie osobnym zapytaniem."""
    denied = guard_request(request, "parse")
    if denied:
        return denied

    too_large = f"Plik jest większy niż {MAX_FILE_SIZE_LABEL}."
    if body_too_large(request, MAX_PARSE_BODY):
        return error(too_large, 413)

    try:
        form = await request.form()
    except Exception:
        return error("Brak pliku w zapytaniu.", 400)

    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        return error("Brak pliku w zapytaniu.", 400)

    data = await upload.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE:
        return error(too_large, 413)

    try:
        cv = await run_in_threadpool(
            parse_cv, upload.filename or "plik", data, upload.content_type or ""
        )
    except ParseError as err:
        return error(str(err), 422)
    except Exception:
        logger.exception("/api/parse failed")
        return error("Nie udało się przetworzyć pliku.", 500)

    return {"text": cv.text, "charCount": cv.char_count}


def read_cvs(raw: Any) -> list[CvInput] | str:
    if not isinstance(raw, list) or not raw:
        return "Wgraj przynajmniej jedno CV."
    if len(raw) > MAX_FILES:
        return f"Maksymalnie {MAX_FILES} plików na raz."

    ids: set[str] = set()
    cvs: list[CvInput] = []
    for item in raw:
        item = item if isinstance(item, dict) else {}
        cv_id, file_name, text = item.get("id"), item.get("fileName"), item.get("text")
        if (
            not isinstance(cv_id, str)
            or not 0 < len(cv_id) <= MAX_ID_LENGTH
            or not isinstance(file_name, str)
            or not isinstance(text, str)
        ):
            return "Nieprawidłowe dane CV."
        if cv_id in ids:
            return "Zduplikowany identyfikator CV."
        ids.add(cv_id)
        cvs.append(
            CvInput(
                id=cv_id,
                file_name=file_name[:MAX_FILE_NAME_LENGTH],
                text=text[: MAX_CHARS_PER_CV + 100],
            )
        )
    return cvs


@app.post("/api/rank")
async def rank(request: Request) -> Any:
    denied = guard_request(request, "rank")
    if denied:
        return denied

    if body_too_large(request, MAX_RANK_BODY):
        return error("Zapytanie jest za duże.", 413)

    try:
        body = await request.json()
    except Exception:
        return error("Nieprawidłowe dane zapytania.", 400)
    if not isinstance(body, dict):
        return error("Nieprawidłowe dane zapytania.", 400)

    job_description = str(body.get("jobDescription") or "").strip()
    if len(job_description) < MIN_JOB_DESCRIPTION:
        return error(f"Opis stanowiska musi mieć co najmniej {MIN_JOB_DESCRIPTION} znaków.", 400)
    if len(job_description) > MAX_JOB_DESCRIPTION:
        return error(f"Opis stanowiska może mieć najwyżej {MAX_JOB_DESCRIPTION} znaków.", 400)

    cvs = read_cvs(body.get("cvs"))
    if isinstance(cvs, str):
        return error(cvs, 400)

    try:
        # Zawsze pełny ranking - widok Top 3 przycina go po stronie klienta.
        result = await rank_cvs(job_description, cvs, openai_client())
    except Exception as err:
        logger.exception("/api/rank failed")
        message, status = to_public_error(err)
        return error(message, status)

    return result.model_dump(by_alias=True)
