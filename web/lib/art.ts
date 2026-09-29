import { concatHex, keccak256, toHex, type Hex } from "viem";
import type { Scores } from "./traits";

function density(score: number): number {
  return 24 + Math.floor((score * 216) / 255);
}

function cellOn(traits: Hex, plate: number, x: number, y: number, threshold: number): boolean {
  const hash = keccak256(
    concatHex([traits, toHex(plate, { size: 1 }), toHex(x, { size: 1 }), toHex(y, { size: 1 })]),
  );
  return parseInt(hash.slice(-2), 16) < threshold;
}

const PLATES: { plate: number; color: string; score: (s: Scores) => number; ox: number; oy: number }[] = [
  { plate: 0, color: "#00B5E2", score: (s) => s.reach, ox: 32, oy: 32 },
  { plate: 1, color: "#E6007A", score: (s) => s.voice, ox: 420, oy: 32 },
  { plate: 2, color: "#F0BA00", score: (s) => s.heat, ox: 32, oy: 420 },
  { plate: 3, color: "#111216", score: (s) => Math.floor((s.vintage + s.native) / 2), ox: 420, oy: 420 },
];

export function renderSvg(traits: Hex, scores: Scores): string {
  const cell = 40;
  const gap = 4;
  const rects: string[] = [];
  for (const p of PLATES) {
    const threshold = density(p.score(scores));
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const fill = cellOn(traits, p.plate, x, y, threshold) ? p.color : "#ECEEF2";
        const x0 = p.ox + x * (cell + gap);
        const y0 = p.oy + y * (cell + gap);
        rects.push(`<rect x="${x0}" y="${y0}" width="40" height="40" rx="3" fill="${fill}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  ${rects.join("")}
</svg>`;
}
