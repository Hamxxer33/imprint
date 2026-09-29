import { concat, keccak256, stringToHex, toHex, type Address, type Hex } from "viem";

export type Scores = {
  vintage: number;
  reach: number;
  voice: number;
  heat: number;
  native: number;
  bags: number;
  named: number;
};

const WORDS: Record<keyof Scores, readonly string[]> = {
  vintage: ["New", "Young", "Settled", "Veteran", "OG"],
  reach: ["Ghost", "Micro", "Connected", "Loud", "Hub"],
  voice: ["Mute", "Quiet", "Active", "Machine", "Relentless"],
  heat: ["Cold", "Warm", "Hot", "Blazing", "Viral"],
  native: ["Fresh", "Settler", "Native", "Elder", "Ancient"],
  bags: ["Thin", "Funded", "Stacked", "Heavy", "Whale"],
  named: ["Anon", "Anon", "Named", "Named", "Basename"],
};

const DIM_ORDER: (keyof Scores)[] = ["vintage", "reach", "voice", "heat", "native", "bags"];

export function band(v: number): number {
  if (v < 52) return 0;
  if (v < 103) return 1;
  if (v < 154) return 2;
  if (v < 205) return 3;
  return 4;
}

export function label(dim: keyof Scores, score: number): string {
  return WORDS[dim][band(score)];
}

export function typeName(scores: Scores): string {
  let i0 = 0;
  for (let i = 1; i < DIM_ORDER.length; i++) {
    if (scores[DIM_ORDER[i]] > scores[DIM_ORDER[i0]]) i0 = i;
  }
  let i1 = i0 === 0 ? 1 : 0;
  for (let i = 0; i < DIM_ORDER.length; i++) {
    if (i === i0) continue;
    if (scores[DIM_ORDER[i]] > scores[DIM_ORDER[i1]]) i1 = i;
  }
  const a = label(DIM_ORDER[i0], scores[DIM_ORDER[i0]]);
  let b = label(DIM_ORDER[i1], scores[DIM_ORDER[i1]]);
  if (a === b) {
    let i2 = 0;
    while (i2 === i0 || i2 === i1) i2++;
    for (let i = 0; i < DIM_ORDER.length; i++) {
      if (i === i0 || i === i1) continue;
      if (scores[DIM_ORDER[i]] > scores[DIM_ORDER[i2]]) i2 = i;
    }
    b = label(DIM_ORDER[i2], scores[DIM_ORDER[i2]]);
  }
  return `${a} ${b}`;
}

export function rarityScore(scores: Scores): number {
  const vals = DIM_ORDER.map((k) => scores[k]);
  const mean = Math.floor(vals.reduce((a, b) => a + b, 0) / 6);
  const peak = Math.max(...vals);
  const low = Math.min(...vals);
  const named = scores.named >= 200 ? 12 : 0;
  return Math.min(255, Math.floor(mean / 2) + Math.floor(peak / 3) + Math.floor((peak - low) / 8) + named);
}

export function rarityName(score: number): string {
  if (score < 70) return "Common";
  if (score < 110) return "Uncommon";
  if (score < 150) return "Rare";
  if (score < 190) return "Epic";
  return "Legendary";
}

export function logScale(n: number, max: number): number {
  if (n <= 0) return 0;
  const v = Math.log10(1 + n) / Math.log10(1 + max);
  return Math.min(255, Math.round(v * 255));
}

export function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function packTraits(scores: Scores, entropy: Hex): Hex {
  const bytes = new Uint8Array(32);
  const raw = entropy.replace(/^0x/i, "").padEnd(64, "0");
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  bytes[0] = clampByte(scores.vintage);
  bytes[1] = clampByte(scores.reach);
  bytes[2] = clampByte(scores.voice);
  bytes[3] = clampByte(scores.heat);
  bytes[4] = clampByte(scores.native);
  bytes[5] = clampByte(scores.bags);
  bytes[6] = clampByte(scores.named);
  return toHex(bytes);
}

export function unpackTraits(packed: Hex): Scores {
  const raw = packed.replace(/^0x/i, "").padStart(64, "0");
  const at = (i: number) => parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  return {
    vintage: at(0),
    reach: at(1),
    voice: at(2),
    heat: at(3),
    native: at(4),
    bags: at(5),
    named: at(6),
  };
}

export function walletXId(address: Address): Hex {
  return keccak256(concat([stringToHex("wallet"), address]));
}

export function sanitizeHandle(input: string): string {
  const cleaned = input.replace(/^@/, "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return cleaned || "anon";
}

export function openseaAttributes(scores: Scores, handle: string) {
  const score = rarityScore(scores);
  return [
    { trait_type: "Type", value: typeName(scores) },
    { trait_type: "Rarity", value: rarityName(score) },
    { trait_type: "Handle", value: handle },
    { trait_type: "Network", value: label("reach", scores.reach) },
    { trait_type: "Activity", value: label("voice", scores.voice) },
    { trait_type: "Heat", value: label("heat", scores.heat) },
    { trait_type: "Native", value: label("native", scores.native) },
    { trait_type: "Bags", value: label("bags", scores.bags) },
    { trait_type: "Vintage", value: label("vintage", scores.vintage) },
    { trait_type: "Named", value: label("named", scores.named) },
    { trait_type: "Rarity Score", display_type: "number", value: score },
  ];
}
