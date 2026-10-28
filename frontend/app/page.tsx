import type { Metadata } from "next";
import {
  Sparkles,
  Upload,
  Briefcase,
  Trophy,
  ShieldCheck,
  Zap,
  Globe,
  ListChecks,
} from "lucide-react";
import { CvFinder } from "@/components/CvFinder";
import { CookieSettingsButton } from "@/components/Analytics";
import { FAQ, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} - ${SITE_TAGLINE} - rekrutacja z AI`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Trophy,
    title: "Inteligentny ranking",
    text: "AI ocenia każde CV w skali 0-100 i sortuje kandydatów od najlepszego do najgorszego z konkretnym uzasadnieniem.",
  },
  {
    icon: ListChecks,
    title: "Dopasowanie do stanowiska",
    text: "Algorytm porównuje umiejętności, technologie, branżę i lata doświadczenia z opisem oferty pracy.",
  },
  {
    icon: Zap,
    title: "Wynik w kilkanaście sekund",
    text: "Przeanalizowanie 20 CV to zwykle 15-30 sekund. Tradycyjny pre-screening zajmuje godziny.",
  },
  {
    icon: ShieldCheck,
    title: "Prywatność",
    text: "Aplikacja nie zapisuje CV na dysku ani w bazie. Do oceny tekst trafia do OpenAI API, które nie używa go do trenowania modeli.",
  },
  {
    icon: Globe,
    title: "Wiele języków",
    text: "Obsługa CV po polsku, angielsku, niemiecku, hiszpańsku i wielu innych - również mieszanych w jednym rankingu.",
  },
  {
    icon: Upload,
    title: "PDF, DOCX, TXT",
    text: "Wgrywaj różne formaty jednocześnie. Dwa silniki odczytu PDF radzą sobie nawet z uszkodzonymi plikami.",
  },
];

const HOW_IT_WORKS = [
  {
    n: 1,
    title: "Wgraj CV",
    text: "Przeciągnij do 30 plików (PDF, DOCX, TXT) lub wybierz je z dysku. Maksymalnie 4 MB na plik.",
  },
  {
    n: 2,
    title: "Opisz stanowisko",
    text: "Wklej ogłoszenie o pracę albo własny opis - wymagane technologie, doświadczenie, branża, mile widziane skille.",
  },
  {
    n: 3,
    title: "Wybierz tryb",
    text: "Pełen ranking wszystkich kandydatów albo tylko Top 3 najlepiej dopasowanych osób. Widok możesz przełączyć także po analizie.",
  },
  {
    n: 4,
    title: "Zobacz wyniki",
    text: "Otrzymasz uszeregowaną listę z oceną 0-100, podsumowaniem, mocnymi stronami, brakami i listą umiejętności.",
  },
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

      <main
        id="main"
        className="container mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16 print:p-0"
      >
        <header className="text-center mb-12 sm:mb-16 animate-fade-in print:hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6 text-xs text-white/70">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            Wspomagane przez AI
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Znajdź <span className="gradient-text">idealnego</span> kandydata
          </h1>
          <p className="mt-5 text-white/70 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Wgraj dowolną liczbę CV, opisz stanowisko, a AI uszereguje
            kandydatów od najlepszego do najgorszego. Otrzymasz punktową ocenę
            dopasowania, listę mocnych i słabych stron oraz wskazanie
            brakujących umiejętności - wszystko w kilkanaście sekund.
          </p>
        </header>

        <CvFinder />

        <section
          aria-labelledby="how-it-works"
          className="mt-24 sm:mt-32 scroll-mt-8 print:hidden"
          id="jak-to-dziala"
        >
          <div className="text-center mb-10">
            <h2
              id="how-it-works"
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Jak <span className="gradient-text">to działa</span>
            </h2>
            <p className="mt-3 text-white/60 max-w-xl mx-auto">
              Cztery proste kroki dzielą Cię od uszeregowanej listy najlepszych
              kandydatów.
            </p>
          </div>

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0">
            {HOW_IT_WORKS.map((step) => (
              <li
                key={step.n}
                className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold mb-3">
                  {step.n}
                </div>
                <h3 className="font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="features"
          className="mt-24 sm:mt-32 scroll-mt-8 print:hidden"
          id="funkcje"
        >
          <div className="text-center mb-10">
            <h2
              id="features"
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Co dostajesz w <span className="gradient-text">CV Finder</span>
            </h2>
            <p className="mt-3 text-white/60 max-w-xl mx-auto">
              Wszystko, czego potrzebujesz, by szybko wyłonić najlepszych
              kandydatów do rekrutacji.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-3">
                  <f.icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="faq"
          className="mt-24 sm:mt-32 scroll-mt-8 print:hidden"
          id="faq"
        >
          <div className="text-center mb-10">
            <h2
              id="faq"
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Najczęstsze <span className="gradient-text">pytania</span>
            </h2>
            <p className="mt-3 text-white/60 max-w-xl mx-auto">
              Wszystko, co warto wiedzieć przed pierwszym użyciem.
            </p>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="glass rounded-2xl px-5 py-4 group open:bg-white/[0.04]"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-white/90 marker:hidden">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="ml-4 text-white/40 group-open:rotate-45 transition-transform text-xl leading-none"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="cta"
          className="mt-24 sm:mt-32 relative overflow-hidden rounded-3xl glass p-8 sm:p-12 text-center print:hidden"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(circle at 30% 40%, rgba(168,85,247,0.18), transparent 50%), radial-gradient(circle at 70% 60%, rgba(6,182,212,0.14), transparent 50%)",
            }}
          />
          <Briefcase
            aria-hidden="true"
            className="h-10 w-10 text-primary mx-auto mb-4"
          />
          <h2
            id="cta"
            className="text-2xl sm:text-3xl font-bold tracking-tight"
          >
            Gotowy, by skrócić rekrutację z godzin do minut?
          </h2>
          <p className="mt-3 text-white/60 max-w-xl mx-auto">
            Przewiń na górę, wgraj CV i pozwól AI zrobić wstępną selekcję za
            Ciebie.
          </p>
          <a
            href="#main"
            className="btn-primary inline-flex mt-6"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Zacznij teraz
          </a>
        </section>

        <footer className="mt-20 pb-4 text-center text-xs text-white/40 print:hidden">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Zbudowane z Next.js, FastAPI
            i OpenAI.
          </p>
          <p className="mt-1 text-white/30">
            Aplikacja nie przechowuje wgranych CV. Do wygenerowania rankingu
            tekst CV jest przesyłany do OpenAI API.
          </p>
          {process.env.NEXT_PUBLIC_GA_ID && (
            <p className="mt-2 text-white/30">
              <CookieSettingsButton />
            </p>
          )}
        </footer>
      </main>
    </>
  );
}
