export type Recommendation = "strong_match" | "good_match" | "weak_match" | "no_match";

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  strong_match: "Świetne dopasowanie",
  good_match: "Solidne dopasowanie",
  weak_match: "Słabe dopasowanie",
  no_match: "Brak dopasowania",
};
