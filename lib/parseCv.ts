import mammoth from "mammoth";

export type ParsedCv = {
  fileName: string;
  text: string;
  charCount: number;
};

export type ParseFailure = {
  fileName: string;
  reason: string;
};

export type ParseOutcome =
  | { ok: true; cv: ParsedCv }
  | { ok: false; failure: ParseFailure };

const MAX_CHARS_PER_CV = 15000;

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function extractPdfWithPdfParse(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractPdfWithPdfJs(buffer: Buffer): Promise<string> {
  // Legacy build działa w Node.js (bez DOM); odzyskuje treść z uszkodzonych XRef.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  await doc.destroy();
  return pages.join("\n\n");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const text = await extractPdfWithPdfParse(buffer);
    if (text && text.trim().length >= 50) {
      return text;
    }
    // Za mało tekstu - spróbuj fallbackiem
    return await extractPdfWithPdfJs(buffer);
  } catch (primaryErr) {
    try {
      return await extractPdfWithPdfJs(buffer);
    } catch (fallbackErr) {
      const primary =
        primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const fallback =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr);
      throw new Error(
        `PDF jest uszkodzony lub niestandardowy (${primary} / ${fallback}). Spróbuj zapisać go ponownie jako PDF lub wyeksportować do DOCX.`
      );
    }
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

function extractTxt(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

async function parseSingle(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<ParsedCv> {
  const lower = fileName.toLowerCase();
  let rawText = "";

  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    rawText = await extractPdf(buffer);
  } else if (
    lower.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    rawText = await extractDocx(buffer);
  } else if (lower.endsWith(".txt") || mimeType.startsWith("text/")) {
    rawText = extractTxt(buffer);
  } else {
    throw new Error(
      `Nieobsługiwany format pliku. Obsługujemy PDF, DOCX i TXT.`
    );
  }

  const cleaned = cleanText(rawText);

  if (cleaned.length < 50) {
    throw new Error(
      "Plik zawiera za mało tekstu (możliwe, że to skan / obrazek bez warstwy tekstowej)."
    );
  }

  const trimmed =
    cleaned.length > MAX_CHARS_PER_CV
      ? cleaned.slice(0, MAX_CHARS_PER_CV) + "\n[...skrócono...]"
      : cleaned;

  return {
    fileName,
    text: trimmed,
    charCount: cleaned.length,
  };
}

export async function parseCvFile(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<ParseOutcome> {
  try {
    const cv = await parseSingle(fileName, buffer, mimeType);
    return { ok: true, cv };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, failure: { fileName, reason } };
  }
}
