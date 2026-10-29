"use client";

import { useState } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import type { RankedCandidate } from "@/lib/types";
import { RECOMMENDATION_LABEL } from "@/lib/recommendation";

type Props = {
  candidate: RankedCandidate;
  rank: number;
};

type Tone = { text: string; bar: string; tag: string };

const RECOMMENDATION_TONE: Record<RankedCandidate["recommendation"], Tone> = {
  strong_match: { text: "text-accent", bar: "bg-accent", tag: "bg-accent-soft text-accent" },
  good_match: { text: "text-good", bar: "bg-good", tag: "bg-good/10 text-good" },
  weak_match: { text: "text-warn", bar: "bg-warn", tag: "bg-warn-soft text-warn" },
  no_match: { text: "text-danger", bar: "bg-danger", tag: "bg-danger-soft text-danger" },
};

export function CandidateCard({ candidate, rank }: Props) {
  const [open, setOpen] = useState(rank <= 3);
  const tone = RECOMMENDATION_TONE[candidate.recommendation];
  const detailsId = `candidate-${candidate.id}-details`;

  return (
    <article
      className={clsx(
        "sheet overflow-hidden",
        rank === 1 && "border-accent/40 ring-1 ring-accent/20"
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-6">
          <span
            className={clsx(
              "font-serif text-3xl sm:text-5xl leading-none w-6 sm:w-12 shrink-0 tabular-nums",
              rank === 1 ? "text-accent" : "text-muted"
            )}
          >
            {rank}
          </span>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.01em] break-words sm:truncate">
              {candidate.candidateName || candidate.fileName}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span
                className={clsx(
                  "text-xs font-medium px-2 py-0.5 rounded-md",
                  tone.tag
                )}
              >
                {RECOMMENDATION_LABEL[candidate.recommendation]}
              </span>
              {candidate.candidateName && (
                <span className="font-mono text-xs text-muted truncate max-w-full">
                  {candidate.fileName}
                </span>
              )}
            </div>
          </div>

          <div className="w-14 sm:w-28 shrink-0 text-right">
            <div
              className={clsx(
                "font-mono text-2xl sm:text-4xl font-medium tabular-nums leading-none",
                tone.text
              )}
              aria-label={`Wynik ${candidate.score} na 100`}
            >
              {candidate.score}
            </div>
            <div aria-hidden="true" className="mt-2.5 h-1 rounded-full bg-line overflow-hidden">
              <div className={clsx("h-full", tone.bar)} style={{ width: `${candidate.score}%` }} />
            </div>
          </div>
        </div>

        <div className="sm:pl-[4.5rem]">
          {candidate.manipulationNote && (
            <div
              role="note"
              className="mt-5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 flex items-start gap-3"
            >
              <ShieldAlert
                aria-hidden="true"
                className="h-5 w-5 text-danger shrink-0 mt-0.5"
              />
              <div className="text-sm min-w-0">
                <div className="font-medium">Możliwa próba manipulacji oceną</div>
                <div className="text-ink-soft mt-1 break-words">
                  {candidate.manipulationNote} Sprawdź to CV ręcznie.
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-ink-soft leading-relaxed max-w-[68ch]">
            {candidate.summary}
          </p>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={detailsId}
            className="btn-text mt-4 print:hidden"
          >
            {open ? "Zwiń szczegóły" : "Pokaż szczegóły"}
            <ChevronDown
              aria-hidden="true"
              className={clsx("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Zwinięte szczegóły i tak trafiają na wydruk. */}
      <div
        id={detailsId}
        className={clsx(
          "border-t border-line px-5 py-5 sm:px-6 sm:pl-[6rem] sm:grid-cols-2 gap-x-10 gap-y-6 bg-paper/50 print:grid print:grid-cols-2",
          open ? "grid animate-fade-in" : "hidden"
        )}
      >
        <Section
          title="Mocne strony"
          items={candidate.strengths}
          empty="Brak wskazanych mocnych stron."
        />
        <Section
          title="Słabe strony i braki"
          items={candidate.weaknesses}
          empty="Brak istotnych słabych stron."
        />
        <Section
          title="Pasujące umiejętności"
          items={candidate.matchedSkills}
          empty="Model nie znalazł pasujących umiejętności."
          chips="match"
        />
        <Section
          title="Brakujące umiejętności"
          items={candidate.missingSkills}
          empty="Wszystkie wymagane umiejętności obecne."
          chips="missing"
        />
      </div>
    </article>
  );
}

function Section({
  title,
  items,
  empty,
  chips,
}: {
  title: string;
  items: string[];
  empty: string;
  chips?: "match" | "missing";
}) {
  return (
    <div>
      <h4 className="eyebrow mb-2.5">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : chips ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={clsx(
                "text-xs px-2 py-1 rounded-md border",
                chips === "match"
                  ? "border-line-strong bg-surface text-ink"
                  : "border-dashed border-warn/40 text-warn"
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-ink-soft flex gap-2.5">
              <span aria-hidden="true" className="text-muted shrink-0">
                –
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
