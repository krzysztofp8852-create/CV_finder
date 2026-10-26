import { NextResponse } from "next/server";
import { guardRequest } from "@/lib/apiGuard";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "@/lib/limits";
import { parseCvFile } from "@/lib/parseCv";

export const runtime = "nodejs";
export const maxDuration = 30;

// Zapas na nagłówki multipart ponad sam plik.
const MAX_BODY_SIZE = MAX_FILE_SIZE + 64 * 1024;

/** Odczytuje tekst z jednego CV. Każdy plik idzie osobnym zapytaniem. */
export async function POST(request: Request) {
  const denied = guardRequest(request, "parse");
  if (denied) return denied;

  const tooLargeMessage = `Plik jest większy niż ${MAX_FILE_SIZE_LABEL}.`;

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: tooLargeMessage }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku w zapytaniu." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: tooLargeMessage }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const outcome = await parseCvFile(file.name, buffer, file.type);

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.failure.reason }, { status: 422 });
    }
    return NextResponse.json({ text: outcome.cv.text, charCount: outcome.cv.charCount });
  } catch (err) {
    console.error("[/api/parse] error:", err);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć pliku." },
      { status: 500 }
    );
  }
}
