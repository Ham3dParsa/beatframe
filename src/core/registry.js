// BeatFrame Core Registry & Shared Helpers (Node-safe: zero top-level DOM side effects)

// =========================================================================
// CONSTANTS & DETERMINISTIC PRNG (Mulberry32)
// =========================================================================
const SLIDE_REGISTRY = {
  bit2: {
    id: "bit2",
    defaultTrackUrl: "./assets/audio/bit2-lofi.mp3",
    labelFa: "۰۱ استایل 2-BIT",
    durationSec: 20.0,
    targetBpm: 84.85,
    timeSig: [4, 4],
    primaryImpactSec: 5.657,
    events: [
      { id: "act2_drop", labelFa: "ورود پرده ۲", t: 5.657, isPrimary: true },
      { id: "reveal", labelFa: "نمایش پاسخ", t: 8.486 },
      { id: "outro", labelFa: "بستن و لوگو", t: 14.143 },
    ],
    acts: [0, 5.657, 8.486, 14.143],
    tlLabels: "<span>Hook | 5.66s</span><span>Front | 8.49s</span><span>Reveal | 14.14s</span><span>Outro | 20s</span>",
    tlMarks: [28.29, 42.43, 70.72],
    isPro: false,
  },
  atashkadeh: {
    id: "atashkadeh",
    defaultTrackUrl: "./assets/audio/atashkadeh-persian.mp3",
    labelFa: "۰۲ آتشکده 2-BIT",
    durationSec: 20.0,
    targetBpm: 119.60,
    timeSig: [4, 4],
    primaryImpactSec: 4.013,
    events: [
      { id: "act2_drop", labelFa: "ورود پرده ۲", t: 4.013, isPrimary: true },
      { id: "reveal", labelFa: "نمایش پاسخ", t: 8.027 },
      { id: "outro", labelFa: "بستن و لوگو", t: 16.054 },
    ],
    acts: [0, 4.013, 8.027, 16.054],
    tlLabels: "<span>Hook | 4.01s</span><span>Front | 8.03s</span><span>Reveal | 16.05s</span><span>Outro | 20s</span>",
    tlMarks: [20.07, 40.13, 80.27],
    isPro: false,
  },
  kinetic: {
    id: "kinetic",
    defaultTrackUrl: "./assets/audio/kinetic-futurebass.mp3",
    labelFa: "۰۳ کینتیک پانچ",
    durationSec: 20.0,
    targetBpm: 119.75,
    timeSig: [4, 4],
    primaryImpactSec: 4.008,
    events: [
      { id: "act2_drop", labelFa: "ورود پرده ۲", t: 4.008, isPrimary: true },
      { id: "reveal", labelFa: "نمایش کارت", t: 8.017 },
      { id: "beat_zoom", labelFa: "زوم ضربدار", t: 14.029 },
      { id: "outro", labelFa: "بستن و لوگو", t: 16.034 },
    ],
    acts: [0, 4.008, 8.017, 14.029, 16.034],
    tlLabels: "<span>Hook | 4.01s</span><span>Front | 8.02s</span><span>Reveal | 16.03s</span><span>Outro | 20s</span>",
    tlMarks: [20.04, 40.08, 80.17],
    isPro: false,
  },
  atashpro: {
    id: "atashpro",
    defaultTrackUrl: "./assets/audio/atashpro-synthwave.mp3",
    labelFa: "۰۴ آتشکده پرو",
    durationSec: 30.0,
    targetBpm: 127.50,
    timeSig: [4, 4],
    primaryImpactSec: 3.765,
    events: [
      { id: "act2_drop", labelFa: "شروع کوبنده", t: 3.765, isPrimary: true },
      { id: "s1_surge", labelFa: "شعله اول", t: 11.294 },
      { id: "s2_surge", labelFa: "اوج پرده ۳", t: 18.824 },
      { id: "white_hot", labelFa: "فلاش سفید داغ", t: 24.471 },
      { id: "outro", labelFa: "بستن و لوگو", t: 26.353 },
    ],
    acts: [0, 3.765, 11.294, 18.824, 26.353],
    tlLabels: "<span>Cold | 3.76s</span><span>S1 | 11.29s</span><span>S2 | 18.82s</span><span>S3-4 | 26.35s</span><span>Outro | 30s</span>",
    tlMarks: [12.55, 37.65, 62.75, 87.84],
    isPro: true,
  },
  cyberpro: {
    id: "cyberpro",
    defaultTrackUrl: "./assets/audio/atashpro-synthwave.mp3",
    labelFa: "۰۵ سایبرپانک",
    durationSec: 30.0,
    targetBpm: 127.50,
    timeSig: [4, 4],
    primaryImpactSec: 3.765,
    events: [
      { id: "act2_drop", labelFa: "شروع کوبنده", t: 3.765, isPrimary: true },
      { id: "s1_surge", labelFa: "شعله اول", t: 11.294 },
      { id: "s2_surge", labelFa: "اوج پرده ۳", t: 18.824 },
      { id: "white_hot", labelFa: "فلاش سفید داغ", t: 24.471 },
      { id: "outro", labelFa: "بستن و لوگو", t: 26.353 },
    ],
    acts: [0, 3.765, 11.294, 18.824, 26.353],
    tlLabels: "<span>Cold | 3.76s</span><span>S1 | 11.29s</span><span>S2 | 18.82s</span><span>S3-4 | 26.35s</span><span>Outro | 30s</span>",
    tlMarks: [12.55, 37.65, 62.75, 87.84],
    isPro: true,
  },
};
const DURATION = 20.0;
function getSlideSpec(style) {
  const s = style || "bit2";
  return SLIDE_REGISTRY[s] || SLIDE_REGISTRY.bit2;
}
function getDuration(style) {
  return getSlideSpec(style).durationSec;
}
const FPS = 60;
const FONT_FA = '"Vazirmatn", "Noto Sans Arabic", "Tahoma", "Segoe UI", system-ui, sans-serif';
const FONT_KUFI = '"Noto Kufi Arabic", "Vazirmatn", "Noto Sans Arabic", "Tahoma", sans-serif';
const FONT_MONO = '"JetBrains Mono", "DejaVu Sans Mono", "SFMono-Regular", ui-monospace, monospace';

// Real HamZaban 4 Recall Buttons (2x2 RTL order: [Row1-R, Row1-L, Row2-R, Row2-L])
const RECALL_BUTTONS = [
  { id: "again", label: "یادم نیامد", dot: "#EF4444" },
  { id: "hard",  label: "به سختی یادم اومد", dot: "#F59E0B" },
  { id: "good",  label: "خوب بود", dot: "#22C55E" },
  { id: "easy",  label: "خیلی آسون", dot: "#A855F7" },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const norm = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// Snappy easing curves
const easeOutCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeOutQuint = (x) => 1 - Math.pow(1 - clamp(x), 5);
const easeInCubic = (x) => Math.pow(clamp(x), 3);
const easeOutBack = (x, s = 1.75) => {
  const c = clamp(x) - 1;
  return 1 + (s + 1) * c * c * c + s * c * c;
};
const easeSpring = (x) => {
  const t = clamp(x);
  if (t === 0 || t === 1) return t;
  return 1 - Math.exp(-8.5 * t) * Math.cos(14.0 * t);
};

// =========================================================================
// CANVAS HELPERS (Explicit RTL / LTR Direction Safety, Zero ZWNJ)
// =========================================================================
function drawText(ctx, text, x, y, opts = {}) {
  ctx.save();
  ctx.direction = opts.dir || "rtl";
  ctx.textAlign = opts.align || "center";
  ctx.textBaseline = opts.baseline || "middle";
  if (opts.font) ctx.font = opts.font;
  if (opts.fill) ctx.fillStyle = opts.fill;
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  if (opts.maxWidth) {
    ctx.fillText(text, x, y, opts.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth || 2;
    ctx.strokeText(text, x, y);
  }
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 2) {
  roundRectPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Playful Telegram-style spoiler bar that shimmers then reveals Persian translation
function drawSpoilerTranslationBar(ctx, x, y, w, h, text, revealProg, opts) {
  const r = opts.radius ?? 10;
  fillRoundRect(ctx, x, y, w, h, r, opts.bg, opts.border, opts.borderWidth || 1.5);

  if (revealProg > 0.05) {
    drawText(ctx, text, x + w * 0.5, y + h * 0.5, {
      dir: "rtl",
      font: opts.font,
      fill: opts.textColor,
      alpha: clamp(revealProg),
      maxWidth: w - 28,
    });
  }

  if (revealProg < 0.99) {
    const veilAlpha = 1 - revealProg;
    ctx.save();
    roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(4, r - 2));
    ctx.clip();
    ctx.globalAlpha = veilAlpha;
    ctx.fillStyle = opts.veilBg;
    ctx.fillRect(x, y, w, h);
    const rng = mulberry32(opts.seed || 901);
    const dotCount = Math.floor((w * h) / 170);
    for (let i = 0; i < dotCount; i++) {
      const dx = x + 6 + rng() * (w - 12);
      const dy = y + 6 + rng() * (h - 12);
      const sz = rng() > 0.6 ? 3 : 2;
      ctx.fillStyle = rng() > 0.5 ? opts.speckleA : opts.speckleB;
      ctx.fillRect(dx, dy, sz, sz);
    }
    ctx.restore();
  }
}

// =========================================================================
// 2-BIT PIXEL ART SPRITE ENGINE (Strict 4-Color Palettes, Integer Snapped)
// =========================================================================
const BIT2 = {
  INK: "#0D1912",
  MID: "#2D5A36",
  LIME: "#8CC63F",
  LIGHT: "#EBF5C8",
};

const ATASH = {
  INK: "#130E1A",
  BRICK: "#6E3226",
  EMBER: "#F59E0B",
  PARCH: "#FEF3C7",
};

const BIT2_MAP = {
  ".": null,
  "0": BIT2.INK,
  "1": BIT2.MID,
  "2": BIT2.LIME,
  "3": BIT2.LIGHT,
};

const ATASH_MAP = {
  ".": null,
  "0": ATASH.INK,
  "1": ATASH.BRICK,
  "2": ATASH.EMBER,
  "3": ATASH.PARCH,
};

function buildPixelSprite(rows, paletteMap = BIT2_MAP) {
  const h = rows.length;
  const w = rows[0].length;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  octx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const col = paletteMap[row[x]];
      if (col) {
        octx.fillStyle = col;
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  return off;
}


const CURSOR_ROWS = [
  "00..........",
  "030.........",
  "0330........",
  "03330.......",
  "033330......",
  "0333330.....",
  "03333330....",
  "033333330...",
  "0333333330..",
  "03333000000.",
  "033030......",
  "030.030.....",
  "00..030.....",
  ".....00.....",
];

// 16x16 Crisp Pixel-Art Sprites for Reel 01
let _spritesCache = null;
export function getSprites() {
  if (_spritesCache) return _spritesCache;
  _spritesCache = {
  alert: buildPixelSprite([
    ".......00.......",
    "......0220......",
    "......0220......",
    ".....023320.....",
    ".....020020.....",
    "....02200220....",
    "....02200220....",
    "...0222002220...",
    "...0222002220...",
    "..022220022220..",
    "..022222222220..",
    ".02222200222220.",
    ".02222200222220.",
    "0222222222222220",
    "0000000000000000",
    "................",
  ]),
  cursor: buildPixelSprite(CURSOR_ROWS, BIT2_MAP),
  cursorAtash: buildPixelSprite(CURSOR_ROWS, ATASH_MAP),
  sprout1: buildPixelSprite([
    "................",
    "................",
    "................",
    "................",
    "................",
    "......00..00....",
    ".....02200220...",
    ".....02322320...",
    "......002200....",
    ".......0220.....",
    "..000000000000..",
    "..011111111110..",
    "...0000000000...",
    "...0112222110...",
    "....01111110....",
    "....00000000....",
  ]),
  sprout2: buildPixelSprite([
    "................",
    "................",
    ".....00..00.....",
    "....02200220....",
    "...0232002320...",
    "...0222002220...",
    "....00222200....",
    "......0220......",
    "......0220......",
    "......0120......",
    "..000000000000..",
    "..011111111110..",
    "...0000000000...",
    "...0112222110...",
    "....01111110....",
    "....00000000....",
  ]),
  sprout3: buildPixelSprite([
    "..3....00....3..",
    "......0330......",
    "....00233200....",
    "...0232332320...",
    "...0222222220...",
    "....00222200....",
    "..00..0220..00..",
    ".0230.0220.0320.",
    "..022001200220..",
    "...0000120000...",
    "..000000000000..",
    "..011111111110..",
    "...0000000000...",
    "...0112222110...",
    "....01111110....",
    "....00000000....",
  ]),
  star: buildPixelSprite([
    ".......00.......",
    "......0330......",
    "......0330......",
    ".....023320.....",
    "0000023333200000",
    "0233333333333320",
    ".02333333333320.",
    "..022333333220..",
    "...0223333220...",
    "...0223333220...",
    "..022200002220..",
    "..0220....0220..",
    ".0220......0220.",
    ".000........000.",
    "................",
    "................",
  ]),
};

// 24x24 Persian Arched Fire Altar (Atashkadeh / Majmar) Pixel Sprites
// Strictly 4 colors: 0=#130E1A, 1=#6E3226, 2=#F59E0B, 3=#FEF3C7
  return _spritesCache;
}

export const SPRITES = new Proxy({}, {
  get(_target, prop) {
    return getSprites()[prop];
  },
});

function drawSprite(ctx, sprite, x, y, pixelScale) {
  const s = Math.max(1, Math.round(pixelScale));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x), Math.round(y), sprite.width * s, sprite.height * s);
  ctx.restore();
}

function createBayerPattern(ctx, c1, c2, cell = 4) {
  const patCanvas = document.createElement("canvas");
  patCanvas.width = cell * 2;
  patCanvas.height = cell * 2;
  const pctx = patCanvas.getContext("2d");
  pctx.fillStyle = c1;
  pctx.fillRect(0, 0, cell * 2, cell * 2);
  pctx.fillStyle = c2;
  pctx.fillRect(0, 0, cell, cell);
  pctx.fillRect(cell, cell, cell, cell);
  return ctx.createPattern(patCanvas, "repeat");
}

function drawPixelBox(ctx, x, y, w, h, fill, border = BIT2.INK, shadow = null, b = 6) {
  const ix = Math.round(x), iy = Math.round(y), iw = Math.round(w), ih = Math.round(h);
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillRect(ix + Math.round(b * 1.4), iy + Math.round(b * 1.4), iw, ih);
  }
  ctx.fillStyle = border;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = fill;
  ctx.fillRect(ix + b, iy + b, iw - b * 2, ih - b * 2);
}

// Distinct 2-bit pixel markers for the 4 recall buttons (supports both palettes)
function drawBit2Marker(ctx, cx, cy, kind, pressed, pal = BIT2) {
  const x = Math.round(cx - 10);
  const y = Math.round(cy - 10);
  const light = pal.LIGHT || pal.PARCH;
  const accent = pal.LIME || pal.EMBER;
  const mid = pal.MID || pal.BRICK;
  const ink = pal.INK;

  const outer = pressed ? light : ink;
  const inner = pressed ? ink : accent;
  const midCol = pressed ? accent : mid;

  if (kind === "again") {
    ctx.fillStyle = outer;
    ctx.fillRect(x, y, 20, 20);
    ctx.fillStyle = pressed ? ink : light;
    ctx.fillRect(x + 5, y + 5, 10, 10);
  } else if (kind === "hard") {
    ctx.fillStyle = outer;
    ctx.fillRect(x, y, 20, 20);
    ctx.fillStyle = midCol;
    ctx.fillRect(x + 4, y + 4, 6, 12);
    ctx.fillStyle = pressed ? ink : light;
    ctx.fillRect(x + 10, y + 4, 6, 12);
  } else if (kind === "good") {
    ctx.fillStyle = outer;
    ctx.fillRect(x, y, 20, 20);
    ctx.fillStyle = inner;
    ctx.fillRect(x + 4, y + 4, 12, 12);
  } else {
    ctx.fillStyle = outer;
    ctx.fillRect(x + 6, y, 8, 20);
    ctx.fillRect(x, y + 6, 20, 8);
    ctx.fillStyle = inner;
    ctx.fillRect(x + 6, y + 6, 8, 8);
  }
}


function drawPersianCornerSteps(ctx, x, y, w, h, color, step = 10) {
  ctx.fillStyle = color;
  // Top-left stepped tile corner
  ctx.fillRect(x, y, step * 3, step);
  ctx.fillRect(x, y, step, step * 3);
  // Top-right
  ctx.fillRect(x + w - step * 3, y, step * 3, step);
  ctx.fillRect(x + w - step, y, step, step * 3);
  // Bottom-left
  ctx.fillRect(x, y + h - step, step * 3, step);
  ctx.fillRect(x, y + h - step * 3, step, step * 3);
  // Bottom-right
  ctx.fillRect(x + w - step * 3, y + h - step, step * 3, step);
  ctx.fillRect(x + w - step, y + h - step * 3, step, step * 3);
}


export {
  SLIDE_REGISTRY,
  DURATION,
  getSlideSpec,
  getDuration,
  FPS,
  FONT_FA,
  FONT_KUFI,
  FONT_MONO,
  RECALL_BUTTONS,
  mulberry32,
  clamp,
  lerp,
  norm,
  easeOutCubic,
  easeOutQuint,
  easeInCubic,
  easeOutBack,
  easeSpring,
  drawText,
  roundRectPath,
  fillRoundRect,
  drawSpoilerTranslationBar,
  BIT2,
  ATASH,
  BIT2_MAP,
  ATASH_MAP,
  CURSOR_ROWS,
  buildPixelSprite,
  drawSprite,
  createBayerPattern,
  drawPixelBox,
  drawBit2Marker,
  drawPersianCornerSteps,
};
