// Limity aplikacji. Wartości muszą się zgadzać z backend/app/limits.py.

export const MAX_FILES = 30;

// Każdy plik idzie osobnym zapytaniem. Vercel odrzuca body > 4,5 MB,
// więc zostawiamy zapas na narzut multipart.
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
export const MAX_FILE_SIZE_LABEL = "4 MB";

export const MAX_CHARS_PER_CV = 15000;

export const MIN_JOB_DESCRIPTION = 20;
export const MAX_JOB_DESCRIPTION = 10000;
