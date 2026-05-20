import OpenAI from "openai";
import type { ParsedCv } from "./parseCv";

export type RankedCandidate = {
  fileName: string;
  score: number;
  candidateName: string | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: "strong_match" | "good_match" | "weak_match" | "no_match";
};

export type RankingResult = {
  ranking: RankedCandidate[];
  meta: {
    model: string;
    cvCount: number;
  };
};

const SYSTEM_PROMPT = `Jesteś ekspertem ds. rekrutacji IT i HR. Twoim zadaniem jest analiza dostarczonych CV pod kątem konkretnego stanowiska i ocena każdego kandydata.

Zasady oceny:
- Oceniaj na podstawie umiejętności, doświadczenia, technologii, branży i dopasowania do opisu stanowiska.
- Wynik (score) musi być liczbą całkowitą 0-100, gdzie 100 = idealne dopasowanie.
- Bądź konkretny, używaj informacji z CV (nazwy firm, technologie, lata doświadczenia).
- Jeśli w CV brakuje kluczowych umiejętności wymaganych w opisie - wyraźnie to zaznacz.
- Imię/nazwisko wyciągnij z treści CV, jeśli możesz je zidentyfikować; w przeciwnym razie zwróć null.
- Odpowiadaj WYŁĄCZNIE w formacie JSON zgodnym ze schematem.
- Cała treść opisów (summary, strengths, weaknesses, matchedSkills, missingSkills) ma być w języku polskim.

Kategorie rekomendacji:
- strong_match: 80-100 - świetny kandydat, gotowy do rozmowy
- good_match: 60-79 - solidny kandydat z brakami do uzupełnienia
- weak_match: 30-59 - kandydat z brakami w kluczowych obszarach
- no_match: 0-29 - niezgodny profil`;

function buildUserPrompt(jobDescription: string, cvs: ParsedCv[]): string {
  const cvBlocks = cvs
    .map(
      (cv, idx) =>
        `=== CV #${idx + 1} | FILE: ${cv.fileName} ===\n${cv.text}\n=== END CV #${idx + 1} ===`
    )
    .join("\n\n");

  return `OPIS STANOWISKA:
${jobDescription.trim()}

LICZBA CV DO OCENY: ${cvs.length}

CV KANDYDATÓW:
${cvBlocks}

Oceń wszystkich ${cvs.length} kandydatów. Zwróć JSON z polem "ranking" - tablicą obiektów (po jednym na każde CV), posortowaną MALEJĄCO po polu "score". Każdy obiekt musi mieć dokładnie pole "fileName" odpowiadające nazwie pliku z nagłówka FILE: powyżej.`;
}

const JSON_SCHEMA = {
  name: "cv_ranking",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      ranking: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            fileName: { type: "string" },
            candidateName: { type: ["string", "null"] },
            score: { type: "integer", minimum: 0, maximum: 100 },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            matchedSkills: { type: "array", items: { type: "string" } },
            missingSkills: { type: "array", items: { type: "string" } },
            recommendation: {
              type: "string",
              enum: ["strong_match", "good_match", "weak_match", "no_match"],
            },
          },
          required: [
            "fileName",
            "candidateName",
            "score",
            "summary",
            "strengths",
            "weaknesses",
            "matchedSkills",
            "missingSkills",
            "recommendation",
          ],
        },
      },
    },
    required: ["ranking"],
  },
};

export async function rankCvsWithAi(
  jobDescription: string,
  cvs: ParsedCv[]
): Promise<RankingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Brak klucza OPENAI_API_KEY. Skopiuj .env.example do .env.local i ustaw swój klucz."
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(jobDescription, cvs) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: JSON_SCHEMA,
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI nie zwróciło odpowiedzi.");
  }

  let parsed: { ranking: RankedCandidate[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Nie udało się sparsować odpowiedzi AI jako JSON.");
  }

  const knownFiles = new Set(cvs.map((c) => c.fileName));
  const ranking = parsed.ranking
    .filter((r) => knownFiles.has(r.fileName))
    .sort((a, b) => b.score - a.score);

  for (const cv of cvs) {
    if (!ranking.find((r) => r.fileName === cv.fileName)) {
      ranking.push({
        fileName: cv.fileName,
        candidateName: null,
        score: 0,
        summary: "AI nie zwróciło oceny dla tego CV.",
        strengths: [],
        weaknesses: ["Brak oceny AI"],
        matchedSkills: [],
        missingSkills: [],
        recommendation: "no_match",
      });
    }
  }

  return {
    ranking,
    meta: { model, cvCount: cvs.length },
  };
}
