import type { RankedCandidate } from "./types";
import { RECOMMENDATION_LABEL } from "./recommendation";

const HEADERS = [
  "Pozycja",
  "Kandydat",
  "Plik",
  "Wynik",
  "Rekomendacja",
  "Podsumowanie",
  "Mocne strony",
  "Słabe strony",
  "Pasujące umiejętności",
  "Brakujące umiejętności",
  "Możliwa manipulacja",
];

function cell(value: string | number): string {
  let text = String(value);
  // Treść pochodzi z CV - nie może zostać wykonana jako formuła w Excelu.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * CSV dla polskiego Excela: średnik jako separator i BOM, żeby polskie
 * znaki otworzyły się poprawnie.
 */
export function rankingToCsv(ranking: RankedCandidate[]): string {
  const rows = ranking.map((c, i) => [
    i + 1,
    c.candidateName ?? "",
    c.fileName,
    c.score,
    RECOMMENDATION_LABEL[c.recommendation],
    c.summary,
    c.strengths.join("; "),
    c.weaknesses.join("; "),
    c.matchedSkills.join("; "),
    c.missingSkills.join("; "),
    c.manipulationNote ?? "",
  ]);
  const lines = [HEADERS, ...rows].map((row) => row.map(cell).join(";"));
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
