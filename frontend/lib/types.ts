// Kształt danych API backendu (backend/app/ranking.py, backend/app/main.py).
import type { Recommendation } from "./recommendation";

export type CvInput = {
  id: string;
  fileName: string;
  text: string;
};

export type RankedCandidate = {
  id: string;
  fileName: string;
  score: number;
  candidateName: string | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: Recommendation;
  manipulationNote: string | null;
};
