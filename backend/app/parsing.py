"""Odczyt tekstu z CV: PDF, DOCX i TXT."""

import logging
import re
from dataclasses import dataclass
from io import BytesIO

import mammoth
from pdfminer.high_level import extract_text as pdfminer_extract_text
from pypdf import PdfReader

from .limits import MAX_CHARS_PER_CV

# pdfminer loguje ostrzeżenia dla każdego nietypowego PDF-a.
logging.getLogger("pdfminer").setLevel(logging.ERROR)

MIN_TEXT_LENGTH = 50
TRUNCATION_MARKER = "\n[...skrócono...]"

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class ParseError(Exception):
    """Błąd odczytu pliku; treść można pokazać użytkownikowi."""


@dataclass(frozen=True)
class ParsedCv:
    text: str
    char_count: int


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\x00", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _pdf_with_pypdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data), strict=False)
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def _pdf_with_pdfminer(data: bytes) -> str:
    return pdfminer_extract_text(BytesIO(data))


def extract_pdf(data: bytes) -> str:
    primary_error: Exception | None = None
    try:
        text = _pdf_with_pypdf(data)
    except Exception as err:  # pypdf zgłasza wiele różnych wyjątków dla uszkodzonych plików
        primary_error = err
        text = ""

    if len(text.strip()) >= MIN_TEXT_LENGTH:
        return text

    # Za mało tekstu albo błąd - pdfminer radzi sobie z częścią nietypowych PDF-ów.
    try:
        return _pdf_with_pdfminer(data)
    except Exception as fallback_error:
        if primary_error is None:
            return text
        raise ParseError(
            f"PDF jest uszkodzony lub niestandardowy ({primary_error} / {fallback_error}). "
            "Spróbuj zapisać go ponownie jako PDF lub wyeksportować do DOCX."
        ) from fallback_error


def extract_docx(data: bytes) -> str:
    try:
        return mammoth.extract_raw_text(BytesIO(data)).value
    except Exception as err:
        raise ParseError("Plik DOCX jest uszkodzony lub nieprawidłowy.") from err


def extract_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def parse_cv(file_name: str, data: bytes, mime_type: str = "") -> ParsedCv:
    lower = file_name.lower()
    if lower.endswith(".pdf") or mime_type == "application/pdf":
        raw = extract_pdf(data)
    elif lower.endswith(".docx") or mime_type == DOCX_MIME:
        raw = extract_docx(data)
    elif lower.endswith(".txt") or mime_type.startswith("text/"):
        raw = extract_txt(data)
    else:
        raise ParseError("Nieobsługiwany format pliku. Obsługujemy PDF, DOCX i TXT.")

    cleaned = clean_text(raw)
    if len(cleaned) < MIN_TEXT_LENGTH:
        raise ParseError(
            "Plik zawiera za mało tekstu (możliwe, że to skan / obrazek bez warstwy tekstowej)."
        )

    text = (
        cleaned[:MAX_CHARS_PER_CV] + TRUNCATION_MARKER
        if len(cleaned) > MAX_CHARS_PER_CV
        else cleaned
    )
    return ParsedCv(text=text, char_count=len(cleaned))
