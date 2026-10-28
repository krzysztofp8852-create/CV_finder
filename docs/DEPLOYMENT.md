# Wdrożenie i SEO

Instrukcja wdrożenia CV Findera na produkcję i zgłoszenia strony do wyszukiwarek. Opis projektu jest w [README](../README.pl.md).

Przed publicznym wdrożeniem ustaw `ACCESS_PASSWORD` - bez niego każdy, kto znajdzie stronę, może zużywać Twój klucz OpenAI. Dodaj też politykę prywatności z danymi administratora.

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

## Pozostałe uwagi

- `X-Robots-Tag` można dodać w `next.config.mjs`, żeby wyłączyć indeksację wybranych ścieżek.
- Limit zapytań na IP jest trzymany w pamięci procesu: na jednym serwerze Node działa dokładnie, na serverless (Vercel) każda instancja liczy osobno.
