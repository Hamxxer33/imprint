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

    title = font(28, bold=True)
    typeface = font(22, bold=True)
    mono = font(22)
    small = font(16)
    tiny = font(14)

    pad = 72
    draw.text((pad, 48), "IMPRINT", font=title, fill=INK)
    draw.text((SIZE - pad, 48), f"#{profile.token_id:04d}", font=mono, fill=MUTE, anchor="ra")
    draw.text((pad, 86), profile.type_name.upper(), font=typeface, fill=INK)
    draw.text(
        (SIZE - pad, 86),
        profile.rarity.upper(),
        font=small,
        fill=RARITY_COLOR[profile.rarity],
        anchor="ra",
    )
    draw.text((pad, 118), f"@{profile.handle}", font=small, fill=FAINT)
    draw.text((SIZE - pad, 118), "BASE", font=small, fill=FAINT, anchor="ra")

    cell = 46
    gap = 6
    plate_w = 8 * cell + 7 * gap
    gutter = 48
    grid_w = plate_w * 2 + gutter
    left = (SIZE - grid_w) // 2
    top = 188

    plates = [
        (0, CYAN, density(profile.scores["REACH"]), "C  REACH", left, top),
        (1, MAGENTA, density(profile.scores["VOICE"]), "M  VOICE", left + plate_w + gutter, top),
        (2, YELLOW, density(profile.scores["HEAT"]), "Y  HEAT", left, top + plate_w + 56),
        (
            3,
            BLACK,
            density((profile.scores["VINTAGE"] + profile.scores["NATIVE"]) // 2),
            "K  NATIVE",
            left + plate_w + gutter,
            top + plate_w + 56,
        ),
    ]

    for plate, color, threshold, label, x, y in plates:
        well = 14
        draw.rounded_rectangle(
            [x - well, y - well, x + plate_w + well, y + plate_w + well],
            radius=12,
            fill=WELL,
            outline=WELL_LINE,
            width=1,
        )
        draw_plate(draw, (x, y), color, threshold, plate, seed, cell, gap)
        draw.text((x, y + plate_w + 22), label, font=tiny, fill=FAINT)

    footer_y = SIZE - 58
    draw.text(
        (pad, footer_y),
        f"{profile.labels['VOICE']}  ·  {profile.labels['NATIVE']}  ·  {profile.labels['BAGS']}",
        font=tiny,
        fill=FAINT,
    )
    draw.text((SIZE - pad, footer_y), f"SCORE {profile.rarity_score}", font=tiny, fill=FAINT, anchor="ra")
    return img


def render_svg(profile: Profile) -> str:
    seed = packed_seed(profile)
    cell = 36
    gap = 2
    plate_w = 8 * (cell + gap) - gap
    gutter = 40
    left = 84
    top = 128
    plates = [
        (0, "#00B5E2", density(profile.scores["REACH"]), left, top),
        (1, "#E6007A", density(profile.scores["VOICE"]), left + plate_w + gutter, top),
        (2, "#F0BA00", density(profile.scores["HEAT"]), left, top + plate_w + 48),
        (
            3,
            "#111216",
            density((profile.scores["VINTAGE"] + profile.scores["NATIVE"]) // 2),
            left + plate_w + gutter,
            top + plate_w + 48,
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
    rarity_hex = {
        "Common": "#8C92A0",
        "Uncommon": "#2EA05A",
        "Rare": "#007ACC",
        "Epic": "#8C46DC",
        "Legendary": "#C88C14",
    }[profile.rarity]
    plates_svg = "\n  ".join(rects)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#FFFFFF"/>
  <text x="84" y="48" fill="#0C0E12" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700">IMPRINT</text>
  <text x="716" y="48" text-anchor="end" fill="#5A6070" font-family="ui-monospace, monospace" font-size="18">#{profile.token_id:04d}</text>
  <text x="84" y="78" fill="#0C0E12" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700">{profile.type_name.upper()}</text>
  <text x="716" y="78" text-anchor="end" fill="{rarity_hex}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14">{profile.rarity.upper()}</text>
  <text x="84" y="102" fill="#8C92A0" font-family="ui-monospace, monospace" font-size="13">@{profile.handle}</text>
  <text x="716" y="102" text-anchor="end" fill="#8C92A0" font-family="ui-monospace, monospace" font-size="13">BASE</text>
  {plates_svg}
</svg>
"""


def metadata(profile: Profile, image_name: str) -> dict:
    return {
        "name": f"Imprint #{profile.token_id}",
        "description": (
            f"{profile.type_name} — a 1/1 imprint of @{profile.handle}'s X history "
            f"and Base wallet. Rarity {profile.rarity}."
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
