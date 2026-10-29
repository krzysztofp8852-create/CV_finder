import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ten sam motyw co icon.svg: uszeregowana lista z zieloną kropką przy pierwszym miejscu.
const bar = (width: number, opacity: number) => ({
  width,
  height: 17,
  borderRadius: 9,
  background: "#f4f1ea",
  opacity,
});

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 14,
          padding: "0 39px",
          background: "#1c1a17",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#5fa37f" }} />
          <div style={bar(65, 1)} />
        </div>
        <div style={bar(101, 0.7)} />
        <div style={bar(73, 0.45)} />
      </div>
    ),
    { ...size }
  );
}
