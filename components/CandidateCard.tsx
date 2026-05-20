"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  Trophy,
  Medal,
  Award,
} from "lucide-react";
import { clsx } from "clsx";
import type { RankedCandidate } from "@/lib/rankCvs";

type Props = {
  candidate: RankedCandidate;
  rank: number;
};

const RECOMMENDATION_LABEL: Record<RankedCandidate["recommendation"], string> = {
  strong_match: "Świetne dopasowanie",
  good_match: "Solidne dopasowanie",
  weak_match: "Słabe dopasowanie",
  no_match: "Brak dopasowania",
};

const RECOMMENDATION_STYLE: Record<RankedCandidate["recommendation"], string> = {
  strong_match: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  good_match: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  weak_match: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  no_match: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function rankBadge(rank: number) {
  if (rank === 1)
    return {
      icon: Trophy,
      className: "from-yellow-400 to-amber-500 text-amber-950",
    };
  if (rank === 2)
    return {
      icon: Medal,
      className: "from-slate-300 to-slate-400 text-slate-900",
    };
  if (rank === 3)
    return {
      icon: Award,
      className: "from-orange-400 to-orange-600 text-orange-950",
    };
  return null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-sky-400";
  if (score >= 30) return "text-amber-400";
  return "text-rose-400";
}

export function CandidateCard({ candidate, rank }: Props) {
  const [open, setOpen] = useState(rank <= 3);
  const badge = rankBadge(rank);

  return (
    <div
      className={clsx(
        "glass rounded-2xl overflow-hidden transition-all animate-slide-up",
        rank === 1 && "ring-2 ring-primary/50 shadow-lg shadow-primary/20"
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg",
              badge
                ? `bg-gradient-to-br ${badge.className}`
                : "bg-white/5 text-white/70"
            )}
          >
            {badge ? (
              <badge.icon className="h-6 w-6" />
            ) : (
              <span>#{rank}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-lg sm:text-xl font-semibold truncate">
                {candidate.candidateName || candidate.fileName}
              </h3>
              {candidate.candidateName && (
                <span className="text-xs text-white/40 inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {candidate.fileName}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "text-xs font-medium px-2.5 py-1 rounded-full border",
                  RECOMMENDATION_STYLE[candidate.recommendation]
                )}
              >
                {RECOMMENDATION_LABEL[candidate.recommendation]}
              </span>
              <span className="text-xs text-white/40">
                Pozycja w rankingu: #{rank}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={clsx(
                "text-3xl sm:text-4xl font-bold tabular-nums",
                scoreColor(candidate.score)
              )}
            >
              {candidate.score}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              dopasowanie
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/70 leading-relaxed">
          {candidate.summary}
        </p>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
        >
          {open ? "Zwiń szczegóły" : "Pokaż szczegóły"}
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 p-5 sm:p-6 grid sm:grid-cols-2 gap-5 bg-white/[0.015] animate-fade-in">
          <Section
            title="Mocne strony"
            items={candidate.strengths}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            empty="Brak wskazanych mocnych stron."
          />
          <Section
            title="Słabe strony / braki"
            items={candidate.weaknesses}
            icon={<XCircle className="h-4 w-4 text-rose-400" />}
            empty="Brak istotnych słabych stron."
          />
          <Section
            title="Pasujące umiejętności"
            items={candidate.matchedSkills}
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            empty="AI nie znalazło pasujących umiejętności."
            chips
          />
          <Section
            title="Brakujące umiejętności"
            items={candidate.missingSkills}
            icon={<Sparkles className="h-4 w-4 text-amber-400" />}
            empty="Wszystkie wymagane umiejętności obecne."
            chips
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  icon,
  empty,
  chips,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  empty: string;
  chips?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-white/80 mb-2 inline-flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-white/40 italic">{empty}</p>
      ) : chips ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-white/70 flex gap-2">
              <span className="text-white/30 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
