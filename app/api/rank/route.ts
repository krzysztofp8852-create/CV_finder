import { NextResponse } from "next/server";
import { parseCvFile, type ParsedCv, type ParseFailure } from "@/lib/parseCv";
import { rankCvsWithAi } from "@/lib/rankCvs";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILES = 30;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobDescription = String(formData.get("jobDescription") ?? "").trim();
    const topOnlyRaw = String(formData.get("topOnly") ?? "false");
    const topOnly = topOnlyRaw === "true";

    if (jobDescription.length < 20) {
      return NextResponse.json(
        { error: "Opis stanowiska musi mieć co najmniej 20 znaków." },
        { status: 400 }
      );
    }

    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Wgraj przynajmniej jedno CV." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maksymalnie ${MAX_FILES} plików na raz.` },
        { status: 400 }
      );
    }

    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      return NextResponse.json(
        { error: `Plik ${tooLarge.name} jest większy niż 8 MB.` },
        { status: 400 }
      );
    }

    const outcomes = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return parseCvFile(file.name, buffer, file.type);
      })
    );

    const parsed: ParsedCv[] = [];
    const failed: ParseFailure[] = [];
    for (const outcome of outcomes) {
      if (outcome.ok) parsed.push(outcome.cv);
      else failed.push(outcome.failure);
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nie udało się odczytać żadnego z wgranych plików. Sprawdź, czy CV nie są zeskanowanymi obrazami lub uszkodzonymi PDF-ami.",
          failed,
        },
        { status: 400 }
      );
    }

    const result = await rankCvsWithAi(jobDescription, parsed);
    const ranking = topOnly ? result.ranking.slice(0, 3) : result.ranking;

    return NextResponse.json({
      ranking,
      meta: {
        ...result.meta,
        topOnly,
        cvCount: parsed.length,
        failed,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nieznany błąd serwera.";
    console.error("[/api/rank] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
