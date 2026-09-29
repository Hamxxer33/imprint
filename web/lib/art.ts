import { concatHex, keccak256, toHex, type Hex } from "viem";
import { rarityName, rarityScore, typeName, type Scores } from "./traits";

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
  { plate: 0, color: "#00B5E2", score: (s) => s.reach, ox: 84, oy: 128 },
  { plate: 1, color: "#E6007A", score: (s) => s.voice, ox: 428, oy: 128 },
  { plate: 2, color: "#F0BA00", score: (s) => s.heat, ox: 84, oy: 472 },
  { plate: 3, color: "#111216", score: (s) => Math.floor((s.vintage + s.native) / 2), ox: 428, oy: 472 },
];

const RARITY_COLOR: Record<string, string> = {
  Common: "#8C92A0",
  Uncommon: "#2EA05A",
  Rare: "#007ACC",
  Epic: "#8C46DC",
  Legendary: "#C88C14",
};

export function renderSvg(id: number, traits: Hex, scores: Scores, handle: string): string {
  const cell = 36;
  const gap = 2;
  const rects: string[] = [];
  for (const p of PLATES) {
    const threshold = density(p.score(scores));
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const fill = cellOn(traits, p.plate, x, y, threshold) ? p.color : "#ECEEF2";
        const x0 = p.ox + x * (cell + gap);
        const y0 = p.oy + y * (cell + gap);
        rects.push(
          `<rect x="${x0}" y="${y0}" width="36" height="36" rx="3" fill="${fill}"/>`,
        );
      }
    }
  }
  const type = typeName(scores).toUpperCase();
  const rarity = rarityName(rarityScore(scores)).toUpperCase();
  const color = RARITY_COLOR[rarityName(rarityScore(scores))];
  const token = String(id).padStart(4, "0");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  <text x="84" y="48" fill="#0C0E12" font-family="sans-serif" font-size="20" font-weight="700">IMPRINT</text>
  <text x="716" y="48" text-anchor="end" fill="#5A6070" font-family="monospace" font-size="18">#${token}</text>
  <text x="84" y="78" fill="#0C0E12" font-family="sans-serif" font-size="18" font-weight="700">${type}</text>
  <text x="716" y="78" text-anchor="end" fill="${color}" font-family="sans-serif" font-size="14">${rarity}</text>
  <text x="84" y="102" fill="#8C92A0" font-family="monospace" font-size="13">${handle}</text>
  <text x="716" y="102" text-anchor="end" fill="#8C92A0" font-family="monospace" font-size="13">BASE</text>
  ${rects.join("")}
</svg>`;
}
