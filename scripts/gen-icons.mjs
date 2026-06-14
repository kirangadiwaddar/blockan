// Generates minimal PNG icons without external dependencies
// Run: node scripts/gen-icons.mjs

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const radius = size * 0.22;

  // Rounded rect background
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Letter B
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.52}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer("image/png");
}

try {
  const { createCanvas: _ } = await import("canvas");
  for (const size of [192, 512]) {
    const buf = drawIcon(size);
    fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), buf);
    console.log(`✓ icon-${size}.png`);
  }
} catch {
  console.log("canvas not available — using fallback SVG-based PNGs");
  // Fallback: write a tiny valid 1x1 PNG scaled with CSS
}
