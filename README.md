# CV Finder

Aplikacja webowa, w której rekruter wgrywa dowolną liczbę CV, opisuje stanowisko pracy, a **AI szereguje kandydatów od najlepszego do najgorszego** (z uzasadnieniem, mocnymi i słabymi stronami, pasującymi i brakującymi umiejętnościami).

Dostępne tryby:

- **Pełen ranking** – wszystkie CV uszeregowane od najlepszego do najgorszego
- **Top 3** – tylko trzech najlepiej dopasowanych kandydatów (widok można przełączyć po analizie bez ponownego zapytania do AI)

Wyniki można wyeksportować do CSV (format pod polskiego Excela) albo wydrukować / zapisać jako PDF. Ostatni wynik przetrwa odświeżenie strony (sessionStorage, znika po zamknięciu karty), a trwającą analizę można anulować.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + niestandardowy, ciemny UI
- **OpenAI API** (domyślnie `gpt-4o-mini`) z odpowiedzią w trybie `json_schema`
- Parsowanie CV: **`pdf-parse`** + **`pdfjs-dist`** (fallback, silnik z Firefoxa), **`mammoth`** (DOCX), natywnie (TXT)

## Wymagania

- Node.js 18.17+ (zalecane 20+)
- Klucz API z [platform.openai.com](https://platform.openai.com/api-keys)

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env.local
# wpisz OPENAI_API_KEY i NEXT_PUBLIC_SITE_URL w .env.local
npm run dev
```

Aplikacja dostępna pod `http://localhost:3000`.

## Wersja produkcyjna

```bash
npm run build
npm run start
```

## Zmienne środowiskowe

| Zmienna                    | Opis                                                                                 | Wymagane          |
| -------------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| `OPENAI_API_KEY`           | Klucz API OpenAI                                                                     | tak               |
| `OPENAI_MODEL`             | Model do oceny CV (domyślnie `gpt-4o-mini`)                                          | nie               |
| `ACCESS_PASSWORD`          | Hasło wymagane do analizy CV. Bez niego API jest otwarte dla każdego                 | tak (na produkcji) |
| `RATE_LIMIT_RANK_PER_HOUR` | Maks. liczba rankingów na IP na godzinę (domyślnie 10)                               | nie               |
| `RATE_LIMIT_PARSE_PER_HOUR`| Maks. liczba odczytanych plików na IP na godzinę (domyślnie 300)                     | nie               |
| `NEXT_PUBLIC_SITE_URL`     | Pełny URL produkcyjny (np. `https://cv-finder.pl`) - używany dla canonical, OG, sitemap | tak (na produkcji) |
| `GOOGLE_SITE_VERIFICATION` | Wartość meta tagu `google-site-verification` z Search Console                        | nie               |
| `NEXT_PUBLIC_GA_ID`        | Measurement ID Google Analytics 4 (np. `G-XXXXXXXXXX`)                               | nie               |

## SEO - co aplikacja udostępnia "out of the box"

- **`<head>` z pełnym kompletem metadata**: tytuł, opis, keywords, Open Graph, Twitter Card, canonical, hreflang, viewport, theme-color
- **Structured data (JSON-LD)**: `Organization`, `WebSite`, `WebApplication`, `FAQPage`, `BreadcrumbList` - daje rich snippets w wynikach Google
- **Dynamiczny `sitemap.xml`** pod `/sitemap.xml`
- **`robots.txt`** pod `/robots.txt` (blokuje `/api/`, wskazuje sitemap)
- **`manifest.webmanifest`** (PWA-ready, instalowalne na telefonie)
- **Dynamicznie generowane Open Graph image** (1200×630) pod `/opengraph-image`
- **Favicon** (`/icon.svg`) i **Apple Touch Icon** (180×180, generowany dynamicznie)
- **Treść indeksowalna**: hero, sekcja "Jak to działa", "Funkcje", FAQ - cała statyczna treść renderowana jest po stronie serwera (SSR), bot Google ją widzi
- **Semantyczna struktura**: `main`, `section`, `article`, `h1`-`h3`, `ol`/`ul`, ARIA labels, link "Przejdź do treści"
- **Wsparcie GA4** (opcjonalne, włącza się przez `NEXT_PUBLIC_GA_ID`, ładowane dopiero po zgodzie na cookies)

## Wystawienie do Google Search

### Krok 1 — Deploy na Vercel (najszybciej)

1. Wrzuć projekt na GitHub.
2. Wejdź na [vercel.com](https://vercel.com/new) i zaimportuj repo.
3. Dodaj zmienne środowiskowe w Vercel: `OPENAI_API_KEY`, `ACCESS_PASSWORD`, `NEXT_PUBLIC_SITE_URL` (np. `https://cv-finder.vercel.app` lub Twoja domena).
4. Po deploy'u Vercel poda Ci URL produkcyjny.
5. (Opcjonalnie) Dodaj własną domenę w **Settings → Domains**.

> Aplikacja działa też na każdej platformie obsługującej Node.js: Railway, Render, Fly.io, Google Cloud Run, AWS Amplify, własny VPS.

### Krok 2 — Google Search Console

1. Wejdź na [search.google.com/search-console](https://search.google.com/search-console).
2. Dodaj nową usługę typu **„Prefiks URL"** i wklej pełny adres aplikacji.
3. Wybierz weryfikację „znacznikiem HTML" - skopiuj wartość z `content="..."`.
4. Wklej tę wartość do zmiennej `GOOGLE_SITE_VERIFICATION` w Vercel i przeredeployuj. Meta tag zostanie automatycznie dodany do `<head>`.
5. Kliknij **Zweryfikuj** w Search Console.
6. Po weryfikacji wejdź w **Mapy witryn** → wklej `sitemap.xml` → **Prześlij**.
7. Następnie w **Inspekcja adresu URL** sprawdź stronę główną i kliknij **Poproś o zaindeksowanie**.

### Krok 3 — Bing Webmaster Tools (bonus)

W Bing Webmaster Tools jest opcja „Import from Google Search Console" - jednym kliknięciem przeniesiesz weryfikację i sitemapę.

### Krok 4 — Walidacja przed indeksacją

| Co sprawdzić                | Gdzie                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Tytuły, opisy, OG, canonical | [metatags.io](https://metatags.io/) — wklej URL                                                                |
| Rich snippets / JSON-LD     | [search.google.com/test/rich-results](https://search.google.com/test/rich-results)                             |
| Mobile-friendly             | [search.google.com/test/mobile-friendly](https://search.google.com/test/mobile-friendly)                       |
| Wydajność / Core Web Vitals | [PageSpeed Insights](https://pagespeed.web.dev/)                                                               |
| Otwieranie OG na social     | [opengraph.xyz](https://www.opengraph.xyz/), [Twitter Card Validator](https://cards-dev.twitter.com/validator) |

## Limity aplikacji

- Maks. **30 plików** na analizę
- Maks. **4 MB** na plik (każdy plik jest wysyłany osobnym zapytaniem, Vercel odrzuca body powyżej 4,5 MB)
- Maks. **15 000 znaków** z jednego CV (powyżej — automatyczne skrócenie)
- Obsługiwane formaty: **PDF**, **DOCX**, **TXT**
- Ranking jest liczony w partiach po maks. 8 CV / 90 000 znaków, równolegle. Jeśli odpowiedź AI zostanie ucięta na limicie tokenów, partia jest dzielona na pół i oceniana ponownie.

> Zeskanowane CV (obrazy w PDF bez warstwy tekstowej) są wykrywane i pomijane z ostrzeżeniem — pozostałe CV nadal są oceniane.

## Architektura

```
app/
  api/parse/route.ts        # POST: jeden plik CV → tekst
  api/rank/route.ts         # POST (JSON): teksty CV + opis stanowiska → ranking
  layout.tsx                # globalny <head>, metadata, JSON-LD (Organization, WebSite), GA
  page.tsx                  # Server Component - hero, formularz, How it works, Features, FAQ, JSON-LD
  globals.css               # style globalne + design tokens
  sitemap.ts                # /sitemap.xml
  robots.ts                 # /robots.txt
  manifest.ts               # /manifest.webmanifest
  icon.svg                  # favicon
  apple-icon.tsx            # Apple Touch Icon (180x180, generowany dynamicznie)
  opengraph-image.tsx       # OG image 1200x630 (generowany dynamicznie)
components/
  CvFinder.tsx              # interaktywny formularz (client)
  Dropzone.tsx              # drag & drop z listą plików
  Results.tsx               # wyniki: przełącznik Top 3, eksport CSV, druk
  CandidateCard.tsx         # karta kandydata z rozwijaną sekcją
  Analytics.tsx             # GA4 + baner zgody na cookies
lib/
  parseCv.ts                # PDF/DOCX/TXT → tekst (z fallbackiem pdfjs-dist)
  rankCvs.ts                # OpenAI + JSON schema, podział na partie
  apiGuard.ts               # hasło dostępu + limit zapytań na IP
  limits.ts                 # limity wspólne dla klienta i serwera
  exportCsv.ts              # eksport rankingu do CSV
  recommendation.ts         # etykiety rekomendacji
  plural.ts                 # polska odmiana liczebników
  site.ts                   # nazwa, opis, keywords, FAQ - jedno źródło prawdy dla SEO
```

## Bezpieczeństwo i prywatność

- Pliki przetwarzane wyłącznie w pamięci serwera, aplikacja **nigdy ich nie zapisuje**.
- Tekst CV jest wysyłany do OpenAI API. OpenAI nie trenuje modeli na danych z API, ale domyślnie przechowuje je do 30 dni (wykrywanie nadużyć). Pełny brak retencji wymaga zgody OpenAI na Zero Data Retention.
- Treść CV jest traktowana jako niezaufana: znaczniki CV w prompcie mają losowy kod, model ignoruje instrukcje zawarte w CV i zgłasza próby manipulacji (ostrzeżenie na karcie kandydata), a rekomendacja jest wyliczana w kodzie z wyniku.
- Błędy OpenAI są logowane na serwerze, a użytkownik dostaje ogólny komunikat po polsku.
- Google Analytics ładuje się dopiero po zgodzie na cookies analityczne (baner; zmiana decyzji przez „Ustawienia cookies” w stopce).
- Przed publicznym wdrożeniem dodaj politykę prywatności z danymi administratora - aplikacja jej nie zawiera.
- Klucz OpenAI nigdy nie trafia do przeglądarki - cała komunikacja po stronie serwera.
- `robots.txt` blokuje crawlowanie `/api/`.
- `ACCESS_PASSWORD` zamyka API hasłem, a limit zapytań na IP ogranicza koszty. Limit jest trzymany w pamięci procesu: na jednym serwerze Node działa dokładnie, na serverless (Vercel) każda instancja liczy osobno, więc tam traktuj go jako orientacyjny. Główną ochroną jest hasło.
- `X-Robots-Tag` może zostać dodany w `next.config.mjs` jeśli chcesz wyłączyć indeksację konkretnych ścieżek.

## Pomysły na rozszerzenia

- OCR dla zeskanowanych CV (`tesseract.js`)
- Historia rekrutacji w bazie (Postgres + Prisma)
- Wysyłka rankingu e-mailem
- Streaming wyników (Server-Sent Events) dla dużych zestawów CV
- Konto użytkownika z zapisanymi opisami stanowisk
- Wielojęzyczny interfejs (EN/DE/UA) z odpowiednim `hreflang`
