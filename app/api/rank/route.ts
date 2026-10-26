import { NextResponse } from "next/server";
import { guardRequest } from "@/lib/apiGuard";
import {
  MAX_CHARS_PER_CV,
  MAX_FILES,
  MAX_JOB_DESCRIPTION,
  MIN_JOB_DESCRIPTION,
} from "@/lib/limits";
import { rankCvsWithAi, toPublicError, type CvInput } from "@/lib/rankCvs";

export const runtime = "nodejs";
export const maxDuration = 120;

// Same teksty CV (pliki są parsowane wcześniej przez /api/parse).
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB
const MAX_ID_LENGTH = 64;
const MAX_FILE_NAME_LENGTH = 255;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function readCvs(raw: unknown): CvInput[] | string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "Wgraj przynajmniej jedno CV.";
  }
  if (raw.length > MAX_FILES) {
    return `Maksymalnie ${MAX_FILES} plików na raz.`;
  }

  const ids = new Set<string>();
  const cvs: CvInput[] = [];
  for (const item of raw) {
    const { id, fileName, text } = (item ?? {}) as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > MAX_ID_LENGTH ||
      typeof fileName !== "string" ||
      typeof text !== "string"
    ) {
      return "Nieprawidłowe dane CV.";
    }
    if (ids.has(id)) {
      return "Zduplikowany identyfikator CV.";
    }
    ids.add(id);
    cvs.push({
      id,
      fileName: fileName.slice(0, MAX_FILE_NAME_LENGTH),
      text: text.slice(0, MAX_CHARS_PER_CV + 100),
    });
  }
  return cvs;
}

export async function POST(request: Request) {
  const denied = guardRequest(request, "rank");
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Zapytanie jest za duże." }, { status: 413 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Nieprawidłowe dane zapytania.");
    }

    const jobDescription = String(body.jobDescription ?? "").trim();

    if (jobDescription.length < MIN_JOB_DESCRIPTION) {
      return badRequest(
        `Opis stanowiska musi mieć co najmniej ${MIN_JOB_DESCRIPTION} znaków.`
      );
    }
    if (jobDescription.length > MAX_JOB_DESCRIPTION) {
      return badRequest(
        `Opis stanowiska może mieć najwyżej ${MAX_JOB_DESCRIPTION} znaków.`
      );
    }

    const cvs = readCvs(body.cvs);
    if (typeof cvs === "string") return badRequest(cvs);

    // Zawsze pełny ranking - widok Top 3 przycina go po stronie klienta.
    const result = await rankCvsWithAi(jobDescription, cvs);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/rank] error:", err);
    const { message, status } = toPublicError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
