import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CV Finder - Znajdź idealnego kandydata z AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.30) 0%, transparent 50%), #0a0a0f",
          color: "white",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background:
                "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
            }}
          />
          CV Finder
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <span>Znajdź&nbsp;</span>
          <span
            style={{
              background:
                "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            idealnego
          </span>
          <span>&nbsp;kandydata.</span>
        </div>

        <div
          style={{
            fontSize: 34,
            marginTop: 36,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
            maxWidth: 950,
          }}
        >
          Wgraj CV. Opisz stanowisko. AI uszereguje kandydatów od najlepszego
          do najgorszego w kilkanaście sekund.
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 20,
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            PDF · DOCX · TXT
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Ranking 0-100
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Top 3 lub pełna lista
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
