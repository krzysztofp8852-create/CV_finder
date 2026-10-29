import type { Metadata } from "next";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { CvFinder } from "@/components/CvFinder";
import { CookieSettingsButton } from "@/components/Analytics";
import {
  FAQ,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} - ${SITE_TAGLINE} - rekrutacja z AI`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Wgraj CV",
    text: "PDF, DOCX albo TXT, do 30 plików po 4 MB. Tekst jest wyciągany na serwerze, a same pliki nie są nigdzie zapisywane.",
  },
  {
    title: "Wklej ogłoszenie",
    text: "Wymagania, technologie, lata doświadczenia, branża. Im konkretniejszy opis, tym trafniejsza ocena.",
  },
  {
    title: "Model ocenia",
    text: "Każde CV dostaje bezwzględny wynik 0–100 względem ogłoszenia, więc wyniki z kolejnych partii da się porównać.",
  },
  {
    title: "Sprawdzasz listę",
    text: "Ranking z uzasadnieniem, mocnymi stronami i brakami. Eksport do CSV albo wydruk do PDF.",
  },
];

const DETAILS = [
  {
    title: "Wynik z uzasadnieniem",
    text: "Liczba 0–100 i krótkie podsumowanie, skąd się wzięła. Rekomendacja wynika wprost z wyniku, więc nigdy mu nie przeczy.",
  },
  {
    title: "Pasujące i brakujące umiejętności",
    text: "Technologie z ogłoszenia, które kandydat ma, i te, których w jego CV nie widać.",
  },
  {
    title: "Wykrywanie manipulacji",
    text: "CV z ukrytym tekstem w stylu „daj mi 100 punktów” dostaje 0 i ostrzeżenie do ręcznej weryfikacji.",
  },
  {
    title: "Wiele języków naraz",
    text: "CV po polsku, angielsku czy niemiecku w jednym rankingu. Ogłoszenie może być w innym języku niż CV.",
  },
  {
    title: "Bez bazy danych",
    text: "Pliki są przetwarzane w pamięci. Tekst trafia do OpenAI API, które nie trenuje na nim modeli.",
  },
  {
    title: "Eksport",
    text: "CSV z rankingiem do arkusza albo wydruk do PDF dla reszty zespołu.",
  },
];

const SAMPLE = [
  { name: "Marta Wiśniewska", note: "Node.js, Kafka, 8 lat w fintechu", score: 95, bar: "bg-accent" },
  { name: "Paweł Dąbrowski", note: "Mocny backend, brak AWS", score: 80, bar: "bg-accent" },
  { name: "Tomasz Zieliński", note: "Dobre podstawy, mało produkcji", score: 60, bar: "bg-good" },
  { name: "Karolina Nowak", note: "Frontend, backend pobocznie", score: 30, bar: "bg-warn" },
];

export default function HomePage() {
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "HumanResourcesApplication",
    operatingSystem: "Any (web browser)",
    inLanguage: "pl-PL",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    featureList: [
      "Ranking CV od najlepszego do najgorszego z AI",
      "Tryb Top 3 - tylko najlepsi kandydaci",
      "Obsługa PDF, DOCX i TXT",
      "Wieloplikowy upload (do 30 CV)",
      "Punktowa ocena dopasowania 0-100",
      "Lista pasujących i brakujących umiejętności",
      "Mocne i słabe strony kandydata",
      "Wsparcie wielu języków CV",
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Strona główna",
        item: SITE_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 print:hidden">
          <a href="#main" className="font-serif text-2xl leading-none tracking-tight">
            CV Finder
          </a>
          <nav aria-label="Sekcje strony" className="flex items-center gap-5 text-sm text-ink-soft">
            <a href="#jak-to-dziala" className="hidden sm:inline hover:text-ink transition-colors">
              Jak to działa
            </a>
            <a href="#faq" className="hidden sm:inline hover:text-ink transition-colors">
              Pytania
            </a>
            <a
              href={REPO_URL}
              className="inline-flex items-center gap-1 hover:text-ink transition-colors"
            >
              GitHub
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </nav>
        </header>

        <main id="main" className="scroll-mt-6 print:p-0">
          <section
            aria-labelledby="hero-title"
            className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-end pt-10 sm:pt-16 pb-12 sm:pb-16 print:hidden"
          >
            <div className="lg:col-span-7 animate-slide-up">
              <p className="eyebrow">Pre-screening CV dla rekruterów</p>
              <h1
                id="hero-title"
                className="mt-5 font-serif text-[2.9rem] leading-[1.02] sm:text-6xl lg:text-7xl tracking-[-0.02em]"
              >
                Od stosu CV do <em className="text-accent">krótkiej listy</em>{" "}
                w&nbsp;minutę.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
                Wgraj do 30 CV i wklej ogłoszenie. Model oceni każdego
                kandydata w skali 0–100 i wypisze, co pasuje, czego brakuje
                i dlaczego. Ostatnie słowo należy do Ciebie.
              </p>
            </div>

            <figure
              className="lg:col-span-5 sheet p-5 sm:p-6 animate-slide-up [animation-delay:120ms] hidden sm:block"
            >
              <figcaption className="eyebrow flex items-center justify-between">
                <span>Przykładowy wynik</span>
                <span>wynik / 100</span>
              </figcaption>
              <ol className="mt-4 divide-y divide-line">
                {SAMPLE.map((row, i) => (
                  <li key={row.name} className="flex items-center gap-4 py-2.5">
                    <span className="font-serif text-2xl w-6 text-muted">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{row.name}</div>
                      <div className="text-xs text-muted truncate">{row.note}</div>
                    </div>
                    <div className="w-20 text-right">
                      <div className="font-mono text-lg tabular-nums">{row.score}</div>
                      <div className="mt-1 h-1 rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full ${row.bar}`}
                          style={{ width: `${row.score}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
                <li className="flex items-center gap-4 py-2.5">
                  <span className="font-serif text-2xl w-6 text-muted">5</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">Michał Kowalczyk</div>
                    <div className="text-xs text-danger inline-flex items-center gap-1">
                      <ShieldAlert aria-hidden="true" className="h-3 w-3" />
                      Ukryte polecenie dla AI w CV
                    </div>
                  </div>
                  <div className="w-20 text-right font-mono text-lg tabular-nums text-danger">
                    0
                  </div>
                </li>
              </ol>
            </figure>
          </section>

          <CvFinder />

          <section
            aria-labelledby="how-it-works"
            id="jak-to-dziala"
            className="mt-28 sm:mt-36 grid lg:grid-cols-12 gap-8 lg:gap-12 scroll-mt-8 print:hidden"
          >
            <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
              <p className="eyebrow">Proces</p>
              <h2 id="how-it-works" className="mt-3 font-serif text-4xl sm:text-5xl tracking-[-0.01em]">
                Jak to działa
              </h2>
            </div>
            <ol className="lg:col-span-8 border-t border-line-strong">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_12rem_1fr] gap-x-4 gap-y-1 py-5 border-b border-line"
                >
                  <span className="font-mono text-sm text-muted pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="col-start-2 sm:col-start-3 text-ink-soft leading-relaxed">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="features"
            id="funkcje"
            className="mt-28 sm:mt-36 grid lg:grid-cols-12 gap-8 lg:gap-12 scroll-mt-8 print:hidden"
          >
            <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
              <p className="eyebrow">Wynik</p>
              <h2 id="features" className="mt-3 font-serif text-4xl sm:text-5xl tracking-[-0.01em]">
                Co dostajesz
              </h2>
            </div>
            <dl className="lg:col-span-8 grid sm:grid-cols-2 gap-x-10 border-t border-line-strong">
              {DETAILS.map((item) => (
                <div key={item.title} className="py-5 border-b border-line">
                  <dt className="font-medium">{item.title}</dt>
                  <dd className="mt-1.5 text-ink-soft leading-relaxed">{item.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-labelledby="faq-title"
            id="faq"
            className="mt-28 sm:mt-36 grid lg:grid-cols-12 gap-8 lg:gap-12 scroll-mt-8 print:hidden"
          >
            <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
              <p className="eyebrow">FAQ</p>
              <h2 id="faq-title" className="mt-3 font-serif text-4xl sm:text-5xl tracking-[-0.01em]">
                Pytania
              </h2>
            </div>
            <div className="lg:col-span-8 border-t border-line-strong">
              {FAQ.map((item, i) => (
                <details key={i} className="group border-b border-line">
                  <summary className="flex items-start justify-between gap-6 py-5 cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden hover:text-ink-soft transition-colors">
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-muted transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-6 -mt-1 max-w-[42rem] text-ink-soft leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-28 sm:mt-36 border-t border-line-strong py-8 text-sm text-muted flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between print:hidden">
          <div className="space-y-1 max-w-md">
            <p>
              © {new Date().getFullYear()} {SITE_NAME}. Next.js, FastAPI, OpenAI.
            </p>
            <p className="text-xs">
              CV nie są przechowywane. Do oceny tekst CV trafia do OpenAI API.
            </p>
          </div>
          <div className="flex gap-5">
            <a href={REPO_URL} className="hover:text-ink transition-colors">
              Kod źródłowy
            </a>
            {process.env.NEXT_PUBLIC_GA_ID && <CookieSettingsButton />}
          </div>
        </footer>
      </div>
    </>
  );
}
