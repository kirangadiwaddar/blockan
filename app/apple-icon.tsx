import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const DOTS = [
  { cx: 60, cy: 60, opacity: 1 },
  { cx: 90, cy: 60, opacity: 1 },
  { cx: 120, cy: 60, opacity: 1 },
  { cx: 60, cy: 90, opacity: 1 },
  { cx: 90, cy: 90, opacity: 1 },
  { cx: 120, cy: 90, opacity: 0.25 },
  { cx: 60, cy: 120, opacity: 1 },
  { cx: 90, cy: 120, opacity: 0.25 },
  { cx: 120, cy: 120, opacity: 0.25 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#FF1616",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {DOTS.map(({ cx, cy, opacity }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: `rgba(255,255,255,${opacity})`,
              left: cx - 7,
              top: cy - 7,
            }}
          />
        ))}
      </div>
    ),
    { ...size }
  );
}
