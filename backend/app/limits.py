"""Limity aplikacji. Wartości muszą się zgadzać z frontend/lib/limits.ts."""

MAX_FILES = 30

# Każdy plik idzie osobnym zapytaniem. Vercel odrzuca body > 4,5 MB,
# więc zostawiamy zapas na narzut multipart.
MAX_FILE_SIZE = 4 * 1024 * 1024
MAX_FILE_SIZE_LABEL = "4 MB"

MAX_CHARS_PER_CV = 15_000

MIN_JOB_DESCRIPTION = 20
MAX_JOB_DESCRIPTION = 10_000
