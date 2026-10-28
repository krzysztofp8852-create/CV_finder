export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "CV Finder";

export const SITE_TAGLINE = "Znajdź idealnego kandydata z AI";

export const SITE_DESCRIPTION =
  "Wgraj dowolną liczbę CV i opisz stanowisko - AI uszereguje kandydatów od najlepszego do najgorszego, z punktową oceną dopasowania, mocnymi i słabymi stronami oraz brakującymi umiejętnościami.";

export const SITE_KEYWORDS = [
  "CV finder",
  "ranking CV",
  "AI rekrutacja",
  "screening CV",
  "wybór kandydatów",
  "dopasowanie CV do stanowiska",
  "analiza CV AI",
  "narzędzie HR",
  "ATS",
  "ocena kandydatów",
  "rekrutacja IT",
  "OpenAI",
];

export const SITE_LOCALE = "pl_PL";

export const SITE_AUTHOR = "CV Finder";

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Jak działa CV Finder?",
    a: "Wgrywasz dowolną liczbę CV w formacie PDF, DOCX lub TXT, a następnie wklejasz lub opisujesz stanowisko, na które prowadzisz rekrutację. Model AI analizuje każde CV pod kątem dopasowania, przyznaje wynik 0-100 i zwraca ranking wraz z uzasadnieniem - mocne strony, braki, pasujące i brakujące umiejętności.",
  },
  {
    q: "Jakie formaty plików są obsługiwane?",
    a: "PDF, DOCX i TXT. Aplikacja używa pypdf, a w razie problemów pdfminer.six jako fallbacku, dzięki czemu odczyta nawet PDF-y z nietypowymi tablicami XRef. Zeskanowane obrazy (bez warstwy tekstowej) wymagają OCR i są pomijane z ostrzeżeniem.",
  },
  {
    q: "Czy moje CV są przechowywane na serwerze?",
    a: "Aplikacja nie zapisuje CV - pliki są przetwarzane w pamięci serwera i nie trafiają na dysk ani do bazy. Aby wygenerować ocenę, tekst CV jest wysyłany do OpenAI API. OpenAI nie wykorzystuje danych z API do trenowania modeli, ale domyślnie może je przechowywać do 30 dni w celu wykrywania nadużyć. Wgrywając CV, odpowiadasz za posiadanie podstawy prawnej do przetwarzania danych kandydatów (RODO).",
  },
  {
    q: "Ile CV mogę wgrać naraz?",
    a: "Do 30 plików naraz, maksymalnie 4 MB każdy. Dla większych zestawów podziel rekrutację na partie. Każde CV dostaje bezwzględną ocenę 0-100 względem opisu stanowiska, więc wyniki z różnych partii można porównywać.",
  },
  {
    q: "Czym CV Finder różni się od klasycznego ATS?",
    a: "Tradycyjne systemy ATS używają sztywnego matchingu słów kluczowych. CV Finder rozumie kontekst dzięki dużemu modelowi językowemu - rozpoznaje synonimy, blisko powiązane technologie, lata doświadczenia w danej roli i potrafi uzasadnić, dlaczego dany kandydat lepiej pasuje od innego.",
  },
  {
    q: "Czy aplikacja jest darmowa?",
    a: "Sama aplikacja jest open-source i nie pobiera opłat. Płacisz jedynie za zużycie OpenAI API według swojego klucza - dla modelu gpt-4o-mini koszt analizy kilkudziesięciu CV to zwykle kilka groszy.",
  },
  {
    q: "W jakich językach działa CV Finder?",
    a: "Interfejs jest w języku polskim. AI radzi sobie z CV w wielu językach (polski, angielski, niemiecki itd.) - możesz mieszać języki w jednym rankingu, opis stanowiska może być w innym języku niż CV.",
  },
];
