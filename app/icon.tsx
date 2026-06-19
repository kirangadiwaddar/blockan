import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#FF1616",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 3×3 dot grid */}
        {[
          { cx: 10, cy: 10, opacity: 1 },
          { cx: 16, cy: 10, opacity: 1 },
          { cx: 22, cy: 10, opacity: 1 },
          { cx: 10, cy: 16, opacity: 1 },
          { cx: 16, cy: 16, opacity: 1 },
          { cx: 22, cy: 16, opacity: 0.25 },
          { cx: 10, cy: 22, opacity: 1 },
          { cx: 16, cy: 22, opacity: 0.25 },
          { cx: 22, cy: 22, opacity: 0.25 },
        ].map(({ cx, cy, opacity }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: `rgba(255,255,255,${opacity})`,
              left: cx - 2,
              top: cy - 2,
            }}
          />
        ))}
      </div>
    ),
    { ...size }
  );
}
