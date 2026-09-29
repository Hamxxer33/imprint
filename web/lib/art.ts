import { concatHex, keccak256, toHex, type Hex } from "viem";
import type { Scores } from "./traits";

const INK = ["#00B5E2", "#E6007A", "#F0BA00", "#111216"] as const;

export function gridSize(activity: number): number {
  if (activity < 52) return 4;
  if (activity < 103) return 6;
  if (activity < 154) return 8;
  if (activity < 205) return 12;
  return 16;
}

function gapFor(n: number): number {
  if (n <= 6) return 10;
  if (n <= 8) return 6;
  if (n <= 12) return 4;
  return 2;
}

function scoreFor(pick: number, s: Scores): number {
  if (pick === 0) return s.reach;
  if (pick === 1) return s.voice;
  if (pick === 2) return s.heat;
  return Math.floor((s.vintage + s.native) / 2);
}

export function renderSvg(traits: Hex, scores: Scores): string {
  const n = gridSize(scores.voice);
  const gap = gapFor(n);
  const cell = Math.floor((720 - gap * (n - 1)) / n);
  const gridW = n * cell + (n - 1) * gap;
  const ox = Math.floor((800 - gridW) / 2);
  const rx = cell >= 80 ? 12 : cell >= 40 ? 6 : 3;
  const rects: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const hash = keccak256(concatHex([traits, toHex(x, { size: 1 }), toHex(y, { size: 1 })]));
      const onByte = parseInt(hash.slice(-2), 16);
      const pick = parseInt(hash.slice(-4, -2), 16) % 4;
      const threshold = 48 + Math.floor((scoreFor(pick, scores) * 180) / 255);
      const fill = onByte < threshold ? INK[pick] : "#ECEEF2";
      const x0 = ox + x * (cell + gap);
      const y0 = ox + y * (cell + gap);
      rects.push(
        `<rect x="${x0}" y="${y0}" width="${cell}" height="${cell}" rx="${rx}" fill="${fill}"/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  ${rects.join("")}
</svg>`;
}
