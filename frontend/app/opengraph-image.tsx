import { ImageResponse } from "next/og";

export const alt = "CV Finder - od stosu CV do krótkiej listy w minutę";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f4f1ea";
const SURFACE = "#fbfaf6";
const INK = "#1c1a17";
const INK_SOFT = "#4a453e";
const MUTED = "#7a7368";
const LINE = "#e2dcd0";
const ACCENT = "#2f6b4f";

const ROWS = [
  { name: "Marta Wiśniewska", score: 95, color: ACCENT },
  { name: "Paweł Dąbrowski", score: 75, color: "#4b6a88" },
  { name: "Tomasz Lewandowski", score: 60, color: "#4b6a88" },
  { name: "Karolina Zając", score: 20, color: "#a33a2c" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 80px",
          backgroundColor: PAPER,
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 22, color: MUTED, letterSpacing: 3 }}>
            CV FINDER
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              columnGap: 18,
              marginTop: 28,
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            <span>Od stosu CV do</span>
            <span style={{ color: ACCENT }}>krótkiej listy</span>
            <span>w minutę.</span>
          </div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 28, lineHeight: 1.4, color: INK_SOFT }}>
            Ranking kandydatów 0–100 z uzasadnieniem, mocnymi stronami i brakami.
          </div>
        </div>

        <div
          style={{
            width: 400,
            display: "flex",
            flexDirection: "column",
            padding: "16px 28px",
            borderRadius: 24,
            border: `1px solid ${LINE}`,
            backgroundColor: SURFACE,
          }}
        >
          {ROWS.map((row, i) => (
            <div
              key={row.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "16px 0",
                borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
              }}
            >
              <div style={{ display: "flex", width: 24, fontSize: 28, color: MUTED }}>{i + 1}</div>
              <div style={{ display: "flex", flex: 1, fontSize: 22 }}>{row.name}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 72 }}>
                <div style={{ display: "flex", fontSize: 26 }}>{row.score}</div>
                <div style={{ display: "flex", width: 72, height: 5, marginTop: 6, borderRadius: 3, backgroundColor: LINE }}>
                  <div style={{ width: `${row.score}%`, height: 5, borderRadius: 3, backgroundColor: row.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
