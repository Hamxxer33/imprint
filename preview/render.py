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


def u8(seed: bytes, plate: int, x: int, y: int) -> int:
    payload = seed + plate.to_bytes(1, "big") + bytes([x, y])
    return digest(payload)[0]


def density(score: int) -> int:
    return 24 + (score * 216) // 255


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


def draw_plate(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    color: tuple[int, int, int],
    threshold: int,
    plate: int,
    seed: bytes,
    cell: int,
    gap: int,
) -> None:
    ox, oy = origin
    for y in range(8):
        for x in range(8):
            on = u8(seed, plate, x, y) < threshold
            fill = color if on else CELL_OFF
            x0 = ox + x * (cell + gap)
            y0 = oy + y * (cell + gap)
            draw.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=4, fill=fill)


def render_png(profile: Profile) -> Image.Image:
    seed = packed_seed(profile)
    img = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)

    cell = 56
    gap = 8
    plate_w = 8 * cell + 7 * gap
    gutter = 48
    grid_w = plate_w * 2 + gutter
    left = (SIZE - grid_w) // 2
    top = (SIZE - grid_w) // 2

    plates = [
        (0, CYAN, density(profile.scores["REACH"]), left, top),
        (1, MAGENTA, density(profile.scores["VOICE"]), left + plate_w + gutter, top),
        (2, YELLOW, density(profile.scores["HEAT"]), left, top + plate_w + gutter),
        (
            3,
            BLACK,
            density((profile.scores["VINTAGE"] + profile.scores["NATIVE"]) // 2),
            left + plate_w + gutter,
            top + plate_w + gutter,
        ),
    ]

    for plate, color, threshold, x, y in plates:
        well = 14
        draw.rounded_rectangle(
            [x - well, y - well, x + plate_w + well, y + plate_w + well],
            radius=12,
            fill=WELL,
            outline=WELL_LINE,
            width=1,
        )
        draw_plate(draw, (x, y), color, threshold, plate, seed, cell, gap)
    return img


def render_svg(profile: Profile) -> str:
    seed = packed_seed(profile)
    cell = 40
    gap = 4
    plate_w = 8 * (cell + gap) - gap
    gutter = 40
    left = 32
    top = 32
    plates = [
        (0, "#00B5E2", density(profile.scores["REACH"]), left, top),
        (1, "#E6007A", density(profile.scores["VOICE"]), left + plate_w + gutter, top),
        (2, "#F0BA00", density(profile.scores["HEAT"]), left, top + plate_w + gutter),
        (
            3,
            "#111216",
            density((profile.scores["VINTAGE"] + profile.scores["NATIVE"]) // 2),
            left + plate_w + gutter,
            top + plate_w + gutter,
        ),
    ]
    rects: list[str] = []
    for plate, color, threshold, ox, oy in plates:
        for y in range(8):
            for x in range(8):
                on = u8(seed, plate, x, y) < threshold
                fill = color if on else "#ECEEF2"
                x0 = ox + x * (cell + gap)
                y0 = oy + y * (cell + gap)
                rects.append(
                    f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" rx="3" fill="{fill}"/>'
                )
    plates_svg = "\n  ".join(rects)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  {plates_svg}
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
