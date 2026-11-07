#!/usr/bin/env python3
"""One-off, offline poster generator for images/simulation/*.

NOT part of the Jekyll / GitHub Pages build. Run manually when a new figure is
added:  python tools/make_posters.py

For every source image (GIF / PNG / JPG) it writes
    <stem>.poster.jpg
next to the original, width 800px (proportional), JPEG q80 by default.

Two rules are enforced for EVERY file, so adding a figure cannot regress them:

  1. Hard cap 145,000 B -> strictly below "150KB" whether that is read as
     decimal (150,000 B) or binary (150 KiB = 153,600 B).
  2. A poster must NEVER be larger than its own source. Effective budget is
     min(145_000, source_bytes). Upscaling a small, already-compact source and
     re-encoding it produces a BIGGER and blurrier file (this happened to
     sWkfSq3ZENQJ7h5.jpg: 695x555 / 75,300 B source -> 100,613 B poster).
     When the source is already a compact JPEG at native width, the smallest
     and lossless "poster" is the original bytes themselves -> copy verbatim.
     Otherwise the encoder lowers JPEG quality, then width, until it fits.

GIFs use frame 0; transparency is composited onto white so the JPEG never has
black halos. Originals are never modified or removed.
"""

import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "images", "simulation")
TARGET_W = 800
MAX_BYTES = 145_000
SRC_EXTS = (".gif", ".png", ".jpg", ".jpeg", ".webp")
QUALITIES = (80, 76, 72, 68, 64, 60, 55)


def load_source(path):
    """Return an RGB image: first frame for GIF, plain RGB otherwise."""
    with Image.open(path) as im:
        im.seek(0)
        frame = im.convert("RGBA")
        # GIF palette transparency -> opaque white, no black fringes in JPEG.
        bg = Image.new("RGBA", frame.size, (255, 255, 255, 255))
        return Image.alpha_composite(bg, frame).convert("RGB")


def fit_width(img, width):
    if img.width == width:
        return img
    height = max(1, round(img.height * width / img.width))
    return img.resize((width, height), Image.LANCZOS)


def encode(img, out_path, budget):
    """Try qualities then narrower widths until the file fits `budget`."""
    width = TARGET_W
    cur = img
    for _ in range(6):
        cur = fit_width(img, width)
        for q in QUALITIES:
            cur.save(out_path, "JPEG", quality=q, optimize=True, progressive=True)
            if os.path.getsize(out_path) <= budget:
                return cur.size, q, os.path.getsize(out_path)
        width = int(width * 0.85)
        if width < 320:
            break
    # Smallest attempt; caller verifies the budget and fails loudly if violated.
    return cur.size, QUALITIES[-1], os.path.getsize(out_path)


def main():
    names = sorted(
        fn for fn in os.listdir(SRC_DIR)
        if fn.lower().endswith(SRC_EXTS) and ".poster." not in fn
    )
    total = 0
    print("source dir: %s\n%d source images\n" % (SRC_DIR, len(names)))
    for fn in names:
        stem = os.path.splitext(fn)[0]
        out_name = stem + ".poster.jpg"
        out_path = os.path.join(SRC_DIR, out_name)
        src_path = os.path.join(SRC_DIR, fn)
        src_bytes = os.path.getsize(src_path)
        budget = min(MAX_BYTES, src_bytes)          # rule 2: never exceed source

        with Image.open(src_path) as probe:
            fmt, w0, h0 = probe.format, probe.width, probe.height

        if fmt == "JPEG" and w0 <= TARGET_W and src_bytes <= MAX_BYTES:
            # Already a compact JPEG at native width: reuse verbatim, zero loss.
            shutil.copyfile(src_path, out_path)
            dims, how = (w0, h0), "reuse"
            size = os.path.getsize(out_path)
        else:
            img = load_source(src_path)
            dims, q, size = encode(img, out_path, budget)
            how = "q=%d" % q

        if size > budget:
            raise RuntimeError(
                "%s: %d B > budget %d B (source %d B) -- 'poster <= source' violated"
                % (out_name, size, budget, src_bytes)
            )
        total += size
        print(
            "OK  %-38s %4dx%-4d %-7s %7.1f KiB  <- %s (%dx%d, %s B)"
            % (out_name, dims[0], dims[1], how, size / 1024,
               fn, w0, h0, format(src_bytes, ","))
        )
    print("-" * 96)
    print("%d posters, total %s B = %.2f MiB"
          % (len(names), format(total, ","), total / 1024 / 1024))


if __name__ == "__main__":
    main()
