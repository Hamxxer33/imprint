"""Turn X + wallet scores into a unique type and OpenSea attributes."""

from __future__ import annotations

from dataclasses import dataclass

BANDS = [
    (52, 0),
    (103, 1),
    (154, 2),
    (205, 3),
    (256, 4),
]

WORDS = {
    "REACH": ("Ghost", "Micro", "Known", "Loud", "Famous"),
    "VOICE": ("Mute", "Quiet", "Poster", "Machine", "Broadcast"),
    "HEAT": ("Cold", "Warm", "Hot", "Blazing", "Viral"),
    "NATIVE": ("Fresh", "Settler", "Native", "Elder", "Ancient"),
    "BAGS": ("Thin", "Funded", "Stacked", "Heavy", "Whale"),
    "VINTAGE": ("New", "Young", "Settled", "Veteran", "OG"),
    "NAMED": ("Anon", "Anon", "Named", "Named", "Verified"),
}

TIER = (
    (70, "Common"),
    (110, "Uncommon"),
    (150, "Rare"),
    (190, "Epic"),
    (256, "Legendary"),
)


@dataclass(frozen=True)
class Profile:
    token_id: int
    handle: str
    scores: dict[str, int]
    seed_src: str

    @property
    def bands(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for key, value in self.scores.items():
            for cap, idx in BANDS:
                if value < cap:
                    out[key] = idx
                    break
        return out

    @property
    def labels(self) -> dict[str, str]:
        b = self.bands
        return {key: WORDS[key][b[key]] for key in WORDS if key in b}

    @property
    def type_name(self) -> str:
        ranked = sorted(
            (
                (self.scores[k], k)
                for k in ("REACH", "VOICE", "HEAT", "NATIVE", "BAGS", "VINTAGE")
            ),
            reverse=True,
        )
        a = self.labels[ranked[0][1]]
        b = self.labels[ranked[1][1]]
        if a == b:
            b = self.labels[ranked[2][1]]
        return f"{a} {b}"

    @property
    def rarity_score(self) -> int:
        keys = ("REACH", "VOICE", "HEAT", "NATIVE", "BAGS", "VINTAGE")
        mean = sum(self.scores[k] for k in keys) // len(keys)
        peak = max(self.scores[k] for k in keys)
        named = 12 if self.scores.get("NAMED", 0) >= 200 else 0
        spread = peak - min(self.scores[k] for k in keys)
        return min(255, mean // 2 + peak // 3 + spread // 8 + named)

    @property
    def rarity(self) -> str:
        score = self.rarity_score
        for cap, name in TIER:
            if score < cap:
                return name
        return "Legendary"

    def opensea_attributes(self) -> list[dict]:
        labels = self.labels
        attrs: list[dict] = [
            {"trait_type": "Type", "value": self.type_name},
            {"trait_type": "Rarity", "value": self.rarity},
            {"trait_type": "Handle", "value": f"@{self.handle}"},
            {"trait_type": "Reach", "value": labels["REACH"]},
            {"trait_type": "Voice", "value": labels["VOICE"]},
            {"trait_type": "Heat", "value": labels["HEAT"]},
            {"trait_type": "Native", "value": labels["NATIVE"]},
            {"trait_type": "Bags", "value": labels["BAGS"]},
            {"trait_type": "Vintage", "value": labels["VINTAGE"]},
            {"trait_type": "Named", "value": labels["NAMED"]},
            {
                "trait_type": "Rarity Score",
                "display_type": "number",
                "value": self.rarity_score,
            },
        ]
        return attrs
