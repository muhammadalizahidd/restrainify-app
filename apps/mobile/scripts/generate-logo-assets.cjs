/* global require, __dirname, console */
/* eslint-disable @typescript-eslint/no-require-imports -- plain Node build script */
/**
 * Regenerates every logo-derived image from assets/restrainify-logo.png (512x512, white background):
 *   - assets/restrainify-mark.png   square crop around the shield, for in-app use (no resampling)
 *   - assets/restrainify-icon.png   1024x1024 adaptive-icon master (shield inside the safe zone)
 *   - android mipmap-* launcher icons (adaptive foreground, legacy square, legacy round)
 *
 * The launcher icons were previously generated from a 64x64 logo, which is why they looked pixelated.
 * Usage: node scripts/generate-logo-assets.cjs
 */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const source = PNG.sync.read(fs.readFileSync(path.join(root, "assets/restrainify-logo.png")));

// The source has a faint off-white square behind the shield. Push near-white pixels to pure white (with a
// short ramp so anti-aliased edges stay smooth) so it doesn't show on the white icon backgrounds.
for (let i = 0; i < source.data.length; i += 4) {
  const min = Math.min(source.data[i], source.data[i + 1], source.data[i + 2]);
  const t = Math.min(1, Math.max(0, (min - 228) / (242 - 228)));
  for (let k = 0; k < 3; k++) source.data[i + k] = Math.round(source.data[i + k] + (255 - source.data[i + k]) * t);
}

// Shield bounds: the first and last rows/columns that are noticeably darker than the white background.
function contentBox(img) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if ((img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3 < 235) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}
const box = contentBox(source);
const shieldW = box.x1 - box.x0;
const shieldH = box.y1 - box.y0;
const cx = (box.x0 + box.x1) / 2;
const cy = (box.y0 + box.y1) / 2;

function sample(x, y) {
  // Bilinear sample of the source, white outside it.
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const px = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= source.width || yy >= source.height) return [255, 255, 255];
    const i = (yy * source.width + xx) * 4;
    return [source.data[i], source.data[i + 1], source.data[i + 2]];
  };
  const a = px(x0, y0), b = px(x0 + 1, y0), c = px(x0, y0 + 1), d = px(x0 + 1, y0 + 1);
  return [0, 1, 2].map(k => (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c[k] * (1 - fx) + d[k] * fx) * fy);
}

/**
 * Renders a size x size image: white background, the shield scaled so its height is `shieldFraction` of the
 * canvas and centred. `shape` limits the opaque area ("square", "circle"); outside it is transparent.
 * 4x4 supersampling per pixel gives clean downscaling.
 */
function render(size, shieldFraction, shape = "square") {
  const out = new PNG({ width: size, height: size });
  const scale = (shieldFraction * size) / shieldH; // destination px per source px
  // Enough subsamples per pixel to average every source pixel it covers when shrinking.
  const ss = Math.max(4, Math.ceil(2 / scale));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, cover = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const dx = x + (sx + 0.5) / ss, dy = y + (sy + 0.5) / ss;
          if (shape === "circle" && Math.hypot(dx - size / 2, dy - size / 2) > size / 2) continue;
          const [cr, cg, cb] = sample(cx + (dx - size / 2) / scale - 0.5, cy + (dy - size / 2) / scale - 0.5);
          r += cr; g += cg; b += cb; cover++;
        }
      }
      const i = (y * size + x) * 4;
      if (cover === 0) { out.data[i] = out.data[i + 1] = out.data[i + 2] = out.data[i + 3] = 0; continue; }
      out.data[i] = Math.round(r / cover); out.data[i + 1] = Math.round(g / cover); out.data[i + 2] = Math.round(b / cover);
      out.data[i + 3] = Math.round((255 * cover) / (ss * ss));
    }
  }
  return out;
}

function write(rel, png) {
  const file = path.join(root, rel);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`${rel}  ${png.width}x${png.height}`);
}

// In-app mark: an exact square crop (no resampling) with ~6% breathing room around the shield.
{
  const side = Math.round(Math.max(shieldW, shieldH) * 1.12);
  const left = Math.round(cx - side / 2), top = Math.round(cy - side / 2);
  const mark = new PNG({ width: side, height: side });
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const si = ((top + y) * source.width + (left + x)) * 4, di = (y * side + x) * 4;
      mark.data[di] = source.data[si]; mark.data[di + 1] = source.data[si + 1]; mark.data[di + 2] = source.data[si + 2]; mark.data[di + 3] = 255;
    }
  }
  write("assets/restrainify-mark.png", mark);
}

// Adaptive icons are masked to circles/squircles; a circular launcher shows the central 72 of 108 dp.
// The shield's furthest point is 0.54 x its height from its centre, so at 60% of the canvas it just fills
// that visible circle: as large as possible without the mask cutting into it.
const ADAPTIVE_SHIELD = 0.6;
write("assets/restrainify-icon.png", render(1024, ADAPTIVE_SHIELD));

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, k] of Object.entries(densities)) {
  const dir = `android/app/src/main/res/mipmap-${name}`;
  write(`${dir}/ic_launcher_foreground.png`, render(Math.round(108 * k), ADAPTIVE_SHIELD));
  write(`${dir}/ic_launcher.png`, render(Math.round(48 * k), 0.78));
  write(`${dir}/ic_launcher_round.png`, render(Math.round(48 * k), 0.78, "circle"));
}
