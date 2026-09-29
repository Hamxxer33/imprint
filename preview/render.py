"""Render Imprint NFTs: unique type per person, OpenSea traits, white field."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from traits import Profile

OUT = Path(__file__).resolve().parent
SIZE = 1200
BG = (255, 255, 255)
INK = (12, 14, 18)
MUTE = (90, 96, 110)
FAINT = (140, 146, 160)
WELL = (247, 248, 250)
WELL_LINE = (228, 230, 236)
CELL_OFF = (236, 238, 242)
CYAN = (0, 181, 226)
MAGENTA = (230, 0, 122)
YELLOW = (240, 186, 0)
BLACK = (17, 18, 22)
RARITY_COLOR = {
    "Common": (140, 146, 160),
    "Uncommon": (46, 160, 90),
    "Rare": (0, 122, 204),
    "Epic": (140, 70, 220),
    "Legendary": (200, 140, 20),
}

SAMPLES = [
    Profile(
        token_id=1,
        handle="trench",
        seed_src="imprint:v1:@trench:0x8564d4849A520D9373f3FB3BCC91c7400E3089B6:base",
        scores={
            "VINTAGE": 82,
            "REACH": 96,
            "VOICE": 170,
            "HEAT": 28,
            "NATIVE": 210,
            "BAGS": 37,
            "NAMED": 255,
        },
    ),
    Profile(
        token_id=2,
        handle="ghost",
        seed_src="imprint:v1:@ghost:0x1111111111111111111111111111111111111111:base",
        scores={
            "VINTAGE": 18,
            "REACH": 12,
            "VOICE": 8,
            "HEAT": 6,
            "NATIVE": 14,
            "BAGS": 10,
            "NAMED": 0,
        },
    ),
    Profile(
        token_id=3,
        handle="whale",
        seed_src="imprint:v1:@whale:0x2222222222222222222222222222222222222222:base",
        scores={
            "VINTAGE": 188,
            "REACH": 220,
            "VOICE": 90,
            "HEAT": 160,
            "NATIVE": 240,
            "BAGS": 250,
            "NAMED": 255,
        },
    ),
]


def digest(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def packed_seed(profile: Profile) -> bytes:
    h = digest(profile.seed_src.encode())
    buf = bytearray(h)
    for i, key in enumerate(["VINTAGE", "REACH", "VOICE", "HEAT", "NATIVE", "BAGS", "NAMED"]):
        buf[i] = profile.scores[key]
    return bytes(buf)


def u8(seed: bytes, x: int, y: int) -> bytes:
    return digest(seed + bytes([x, y]))


def grid_n(activity: int) -> int:
    if activity < 52:
        return 4
    if activity < 103:
        return 6
    if activity < 154:
        return 8
    if activity < 205:
        return 12
    return 16


def grid_gap(n: int) -> int:
    if n <= 6:
        return 10
    if n <= 8:
        return 6
    if n <= 12:
        return 4
    return 2


def dim_score(profile: Profile, pick: int) -> int:
    s = profile.scores
    if pick == 0:
        return s["REACH"]
    if pick == 1:
        return s["VOICE"]
    if pick == 2:
        return s["HEAT"]
    return (s["VINTAGE"] + s["NATIVE"]) // 2


INK_RGB = (CYAN, MAGENTA, YELLOW, BLACK)
INK_HEX = ("#00B5E2", "#E6007A", "#F0BA00", "#111216")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for name in names:
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def draw_grid(
    draw: ImageDraw.ImageDraw,
    profile: Profile,
    canvas: int,
    inner: int,
) -> None:
    seed = packed_seed(profile)
    n = grid_n(profile.scores["VOICE"])
    gap = max(2, grid_gap(n) * canvas // 800)
    cell = (inner - gap * (n - 1)) // n
    grid_w = n * cell + (n - 1) * gap
    ox = (canvas - grid_w) // 2
    radius = 12 if cell >= 80 else 6 if cell >= 40 else 3
    for y in range(n):
        for x in range(n):
            h = u8(seed, x, y)
            pick = h[1] % 4
            threshold = 48 + (dim_score(profile, pick) * 180) // 255
            fill = INK_RGB[pick] if h[0] < threshold else CELL_OFF
            x0 = ox + x * (cell + gap)
            y0 = ox + y * (cell + gap)
            draw.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=radius, fill=fill)


def render_png(profile: Profile) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)
    draw_grid(draw, profile, SIZE, 1080)
    return img


def render_svg(profile: Profile) -> str:
    seed = packed_seed(profile)
    n = grid_n(profile.scores["VOICE"])
    gap = grid_gap(n)
    cell = (720 - gap * (n - 1)) // n
    grid_w = n * cell + (n - 1) * gap
    ox = (800 - grid_w) // 2
    rx = 12 if cell >= 80 else 6 if cell >= 40 else 3
    rects: list[str] = []
    for y in range(n):
        for x in range(n):
            h = u8(seed, x, y)
            pick = h[1] % 4
            threshold = 48 + (dim_score(profile, pick) * 180) // 255
            fill = INK_HEX[pick] if h[0] < threshold else "#ECEEF2"
            x0 = ox + x * (cell + gap)
            y0 = ox + y * (cell + gap)
            rects.append(
                f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" rx="{rx}" fill="{fill}"/>'
            )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  {" ".join(rects)}
</svg>
"""


def metadata(profile: Profile, image_name: str) -> dict:
    return {
        "name": f"Imprint #{profile.token_id}",
        "description": (
            f"{profile.type_name}. A 1/1 imprint of a Base wallet. Rarity {profile.rarity}."
        ),
        "image": image_name,
        "attributes": profile.opensea_attributes(),
    }


def render_sheet(profiles: list[Profile]) -> Image.Image:
    gap = 36
    tile = SIZE
    w = tile * len(profiles) + gap * (len(profiles) + 1)
    h = tile + gap * 2
    sheet = Image.new("RGB", (w, h), (255, 255, 255))
    for i, profile in enumerate(profiles):
        png = render_png(profile)
        x = gap + i * (tile + gap)
        sheet.paste(png, (x, gap))
    return sheet


def main() -> None:
    for profile in SAMPLES:
        png = render_png(profile)
        stem = f"imprint-{profile.token_id}"
        png.save(OUT / f"{stem}.png", "PNG")
        (OUT / f"{stem}.svg").write_text(render_svg(profile), encoding="utf-8")
        (OUT / f"{stem}.json").write_text(
            json.dumps(metadata(profile, f"{stem}.svg"), indent=2),
            encoding="utf-8",
        )
        print(
            f"#{profile.token_id}  {profile.type_name}  {profile.rarity}  score={profile.rarity_score}"
        )
    sheet = render_sheet(SAMPLES)
    sheet_path = OUT / "imprint-types.png"
    sheet.save(sheet_path, "PNG")
    print(sheet_path)


if __name__ == "__main__":
    main()
