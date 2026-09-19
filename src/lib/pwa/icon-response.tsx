import { ImageResponse } from "next/og";

const BACKGROUND = "#050608";
const SURFACE = "#111419";
const ACCENT = "#87a3ff";
const TEXT = "#f7f8fb";

export function createPwaIconResponse(size: number): ImageResponse {
  const fontSize = Math.round(size * 0.44);
  const letterSpacing = Math.max(2, Math.round(size * 0.02));
  const ringInset = Math.max(8, Math.round(size * 0.06));
  const ringRadius = Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BACKGROUND,
        }}
      >
        <div
          style={{
            width: `${size - ringInset * 2}px`,
            height: `${size - ringInset * 2}px`,
            borderRadius: `${ringRadius}px`,
            border: `2px solid ${ACCENT}`,
            background: SURFACE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TEXT,
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            letterSpacing: `${letterSpacing}px`,
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          N
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
