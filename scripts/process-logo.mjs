// Processes visuals/logo.png into the three asset variants the site uses:
//
//   public/brand/logo-color.png    — original colors, white BG removed (transparent)
//   public/brand/logo-on-dark.png  — recolored: navy text → white, gold V + lines kept gold
//   public/brand/logo-on-light.png — original colors, white BG removed (alias of color)
//
// Logic: pixels close to pure white become fully transparent. For the on-dark
// variant, near-black/navy pixels are recolored to white while preserving any
// pixel that's clearly within the gold accent range.
//
// Run: node scripts/process-logo.mjs

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "visuals", "logo.png");
const OUT_DIR = path.join(ROOT, "public", "brand");

const WHITE_THRESHOLD = 240; // pixels with R,G,B all >= this are background
const NAVY_LIGHTNESS = 110;  // pixels darker than this on all channels are navy text

// Returns true if pixel is "gold-ish" (the V and underlines).
// The gold in the source is roughly RGB ~ (190, 155, 90) — warm, more red than blue.
function isGold(r, g, b) {
  return r > 140 && g > 110 && b < 140 && r > b + 30;
}

function isWhiteish(r, g, b) {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function isNavyish(r, g, b) {
  return r <= NAVY_LIGHTNESS && g <= NAVY_LIGHTNESS && b <= NAVY_LIGHTNESS + 40;
}

async function process() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Variant A: keep colors, remove white BG.
  const colorBuf = Buffer.alloc(data.length);
  // Variant B: recolor navy → white, keep gold, remove white BG.
  const onDarkBuf = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isWhiteish(r, g, b)) {
      // Fully transparent in both variants.
      colorBuf[i] = 0;
      colorBuf[i + 1] = 0;
      colorBuf[i + 2] = 0;
      colorBuf[i + 3] = 0;
      onDarkBuf[i] = 0;
      onDarkBuf[i + 1] = 0;
      onDarkBuf[i + 2] = 0;
      onDarkBuf[i + 3] = 0;
      continue;
    }

    // Color variant — keep as-is.
    colorBuf[i] = r;
    colorBuf[i + 1] = g;
    colorBuf[i + 2] = b;
    colorBuf[i + 3] = a;

    if (isGold(r, g, b)) {
      // Gold accents stay gold in both variants.
      onDarkBuf[i] = r;
      onDarkBuf[i + 1] = g;
      onDarkBuf[i + 2] = b;
      onDarkBuf[i + 3] = a;
    } else if (isNavyish(r, g, b)) {
      // Navy text → white. Preserve original alpha for AA edges.
      onDarkBuf[i] = 255;
      onDarkBuf[i + 1] = 255;
      onDarkBuf[i + 2] = 255;
      onDarkBuf[i + 3] = a;
    } else {
      // Edge anti-aliasing pixels — push toward white but use original alpha
      // weighted by lightness so soft edges blend cleanly into a dark BG.
      const lightness = (r + g + b) / 3 / 255; // 0..1
      const alpha = Math.round(a * (1 - lightness * 0.6));
      onDarkBuf[i] = 255;
      onDarkBuf[i + 1] = 255;
      onDarkBuf[i + 2] = 255;
      onDarkBuf[i + 3] = alpha;
    }
  }

  await sharp(colorBuf, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, "logo-color.png"));
  await sharp(colorBuf, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, "logo-on-light.png"));
  await sharp(onDarkBuf, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, "logo-on-dark.png"));

  // Trim transparent borders so layout sizing is exact.
  for (const name of ["logo-color.png", "logo-on-dark.png", "logo-on-light.png"]) {
    const file = path.join(OUT_DIR, name);
    const trimmed = await sharp(file).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await fs.writeFile(file, trimmed);
  }

  console.log("Wrote logo variants to", OUT_DIR);
}

process().catch((err) => {
  console.error(err);
  process.exit(1);
});
