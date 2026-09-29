"""OpenSea collection logo + banner from the live grid renderer."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

from render import BG, FAINT, INK, MUTE, SAMPLES, draw_grid, font

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "brand"
PUBLIC = ROOT / "web" / "public"


def render_logo(size: int = 1400) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    draw_grid(draw, SAMPLES[0], size, size - 160)
    label = font(28, bold=True)
    draw.text((size // 2, size - 52), "IMPRINT", font=label, fill=INK, anchor="mm")
    return img


def render_banner(width: int = 1400, height: int = 400) -> Image.Image:
    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)
    title = font(44, bold=True)
    sub = font(18)
    draw.text((56, 148), "IMPRINT", font=title, fill=INK, anchor="lm")
    draw.text((56, 198), "BASE PASSPORTS", font=sub, fill=MUTE, anchor="lm")
    draw.text((56, 228), "$4  ·  1/1  ·  ON-CHAIN", font=sub, fill=FAINT, anchor="lm")

    tile = Image.new("RGB", (height - 48, height - 48), BG)
    tdraw = ImageDraw.Draw(tile)
    draw_grid(tdraw, SAMPLES[0], height - 48, height - 80)
    img.paste(tile, (width - height + 8, 24))
    return img


def render_og(width: int = 1200, height: int = 630) -> Image.Image:
    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)
    title = font(64, bold=True)
    sub = font(24)
    tiny = font(18)
    draw.text((72, 88), "IMPRINT", font=title, fill=INK)
    draw.text((72, 172), "A 1/1 passport of your Base wallet.", font=sub, fill=MUTE)
    draw.text((72, 214), "Mint $4 in ETH. OpenSea rarity on-chain.", font=tiny, fill=FAINT)

    side = 360
    tile = Image.new("RGB", (side, side), BG)
    tdraw = ImageDraw.Draw(tile)
    draw_grid(tdraw, SAMPLES[0], side, side - 24)
    img.paste(tile, (width - side - 64, (height - side) // 2 + 40))
    return img


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    logo = render_logo()
    banner = render_banner()
    og = render_og()

    files = {
        "opensea-logo.png": logo,
        "opensea-banner.png": banner,
        "og.png": og,
    }
    for name, image in files.items():
        path = BRAND / name
        image.save(path, "PNG", optimize=True)
        shutil.copyfile(path, PUBLIC / name)
        print(path, image.size)

    small = logo.resize((350, 350), Image.Resampling.LANCZOS)
    small.save(BRAND / "opensea-logo-350.png", "PNG", optimize=True)
    print(BRAND / "opensea-logo-350.png", small.size)


if __name__ == "__main__":
    main()
