import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            background:
              "linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
            lineHeight: 1,
          }}
        >
          CV
        </div>
      </div>
    ),
    { ...size }
  );
}
