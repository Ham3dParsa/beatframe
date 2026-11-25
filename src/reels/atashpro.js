import {
  FONT_FA, FONT_KUFI, FONT_MONO, RECALL_BUTTONS,
  mulberry32, clamp, lerp, norm,
  easeOutCubic, easeOutQuint, easeOutBack,
  drawText, SPRITES, buildPixelSprite, drawSprite, createBayerPattern, drawPixelBox, drawPersianCornerSteps,
} from "../core/registry.js";

// =========================================================================
// REEL 04 (ATASHKADEH PRO): 4-STAGE TEMPERATURE PALETTES & NATURAL ASYMMETRIC FIRE
// =========================================================================
const ATASH_PRO_PALETTES = [
  // Stage 0 (0% — Unlit / Cold night slate & ash)
  {
    BG: "#0B1120",
    DARK: "#1E293B",
    MID: "#334155",
    ACCENT: "#64748B",
    LIGHT: "#CBD5E1",
    CORE: "#94A3B8",
    CARD_BG: "#E2E8F0",
    CARD_INK: "#0F172A",
    LABEL: "خاموش",
    LEVEL_TEXT: "۰ آتیش",
  },
  // Stage 1 (25% — Session 1 Done -> 1 Atash, Warm Amber-Gold)
  {
    BG: "#140F1C",
    DARK: "#451A03",
    MID: "#78350F",
    ACCENT: "#F59E0B",
    LIGHT: "#FEF3C7",
    CORE: "#FFFBEB",
    CARD_BG: "#FEF3C7",
    CARD_INK: "#1C1018",
    LABEL: "۱ آتیش",
    LEVEL_TEXT: "۱ آتیش | گرم شد!",
  },
  // Stage 2 (50% — Session 2 Done -> 2 Atash, Blazing Orange-Crimson)
  {
    BG: "#1A0B0E",
    DARK: "#5C1909",
    MID: "#9A3412",
    ACCENT: "#F97316",
    LIGHT: "#FEF08A",
    CORE: "#FFFBEB",
    CARD_BG: "#FFF7ED",
    CARD_INK: "#1A0B0E",
    LABEL: "۲ آتیش",
    LEVEL_TEXT: "۲ آتیش | شعله ور!",
  },
  // Stage 3 (100% — Session 4 Done -> 3 Atash Peak Blue-White Incandescence!)
  {
    BG: "#090D1F",
    DARK: "#991B1B",
    MID: "#F97316",
    ACCENT: "#38BDF8",
    LIGHT: "#FFFFFF",
    CORE: "#E0F2FE",
    CARD_BG: "#FFFFFF",
    CARD_INK: "#090D1F",
    LABEL: "۳ آتیش | ۱۰۰٪",
    LEVEL_TEXT: "۱۰۰٪ روز کامل شد | ۳ آتیش داغ!",
  },
];

// Natural, organic, asymmetric single-hearth campfire/bonfire sprites (24x24)
// Color keys: 0=BG/Shadow, 1=MID stone/brick, 2=ACCENT outer flame, 3=LIGHT inner flame, 4=CORE incandescent glint
const CYBER_PRO_PALETTES = [
  // Stage 0 (0% — Cold Cyber Night Slate)
  {
    BG: "#070812",
    DARK: "#161B2E",
    MID: "#2D3654",
    ACCENT: "#64748B",
    LIGHT: "#CBD5E1",
    CORE: "#94A3B8",
    CARD_BG: "#E2E8F0",
    CARD_INK: "#070812",
    LABEL: "خاموش",
    LEVEL_TEXT: "۰ آتیش",
  },
  // Stage 1 (25% — Electric Teal / Seafoam Neon)
  {
    BG: "#061319",
    DARK: "#0F3D3E",
    MID: "#0F766E",
    ACCENT: "#14B8A6",
    LIGHT: "#99F6E4",
    CORE: "#F0FDFA",
    CARD_BG: "#ECFEFF",
    CARD_INK: "#061319",
    LABEL: "۱ آتیش",
    LEVEL_TEXT: "۱ آتیش - فیروزه ای!",
  },
  // Stage 2 (50% — Cyber Violet + Electric Cyan)
  {
    BG: "#0E0720",
    DARK: "#3B0764",
    MID: "#7C3AED",
    ACCENT: "#22D3EE",
    LIGHT: "#E9D5FF",
    CORE: "#FFFFFF",
    CARD_BG: "#F5F3FF",
    CARD_INK: "#0E0720",
    LABEL: "۲ آتیش",
    LEVEL_TEXT: "۲ آتیش - شارژ نئونی!",
  },
  // Stage 3 (100% — Hyper Magenta + Cyan + White-Hot Cyber Overload!)
  {
    BG: "#14051A",
    DARK: "#701A75",
    MID: "#DB2777",
    ACCENT: "#EC4899",
    LIGHT: "#22D3EE",
    CORE: "#FFFFFF",
    CARD_BG: "#FFFFFF",
    CARD_INK: "#14051A",
    LABEL: "۳ آتیش - ۱۰۰٪",
    LEVEL_TEXT: "۳ آتیش - اوج نئون!",
  },
];

function buildAtashProSprites(m0, m1, m2, m3) {
  // Build 24x24 sprites from supplied 4-stage color maps

  return {
    // Stage 0: Cold dark Persian arch, empty ash bowl, curling faint cold smoke wisp
    s0: [
      buildPixelSprite([
        ".........111111.........",
        ".......1112222111.......",
        "......111000000111......",
        ".....1100......0011.....",
        "....110..........011....",
        "...110............011...",
        "...110............011...",
        "..110..............011..",
        "..110........2.....011..",
        "..110.......2......011..",
        "..110........2.....011..",
        "..110.......2......011..",
        "..110..............011..",
        "..110......2.......011..",
        "..110.....221......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        "..110....11111.....011..",
        "..110.....111......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        ".1111111111111111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m0),
      buildPixelSprite([
        ".........111111.........",
        ".......1112222111.......",
        "......111000000111......",
        ".....1100......0011.....",
        "....110..........011....",
        "...110............011...",
        "...110............011...",
        "..110.......2......011..",
        "..110........2.....011..",
        "..110.......2......011..",
        "..110......2.......011..",
        "..110..............011..",
        "..110.......2......011..",
        "..110......2.......011..",
        "..110.....122......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        "..110....11111.....011..",
        "..110.....111......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        ".1111111111111111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m0),
    ],
    // Stage 1: Cozy growing asymmetric single campfire flame (Amber-Gold)
    s1: [
      buildPixelSprite([
        ".........111111.........",
        ".......1112222111.......",
        "......111000000111......",
        ".....1100......0011.....",
        "....110..........011....",
        "...110............011...",
        "...110......2.....011...",
        "..110......22......011..",
        "..110.....222......011..",
        "..110....22322.....011..",
        "..110....23332.....011..",
        "..110...2234322....011..",
        "..110...223332.....011..",
        "..110....23322.....011..",
        "..110....2222......011..",
        "..110...122221.....011..",
        "..110...1111111....011..",
        "..110....11111.....011..",
        "..110.....121......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        ".1111111111111111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m1),
      buildPixelSprite([
        ".........111111.........",
        ".......1112222111.......",
        "......111000000111......",
        ".....1100......0011.....",
        "....110..........011....",
        "...110............011...",
        "...110.....2......011...",
        "..110.....22.......011..",
        "..110.....222......011..",
        "..110....22322.....011..",
        "..110...223332.....011..",
        "..110...2234322....011..",
        "..110....233322....011..",
        "..110....22332.....011..",
        "..110.....2222.....011..",
        "..110...122221.....011..",
        "..110...1111111....011..",
        "..110....11111.....011..",
        "..110.....121......011..",
        "..110....11111.....011..",
        "..110...1111111....011..",
        ".1111111111111111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m1),
    ],
    // Stage 2: Taller, fiercer asymmetric roaring bonfire + side lick & embers (Orange-Crimson)
    s2: [
      buildPixelSprite([
        ".........111111.........",
        ".......1112332111.......",
        "......111000000111......",
        ".....1100....2.0011.....",
        "....110.....22...011....",
        "...110..3..222....011...",
        "...110....22322...011...",
        "..110....223322....011..",
        "..110...2233332.2..011..",
        "..110..223344322...011..",
        "..110..233444332...011..",
        "..110..2334443322..011..",
        "..110..223343332...011..",
        "..110...2233322....011..",
        "..110....22222.....011..",
        "..110...1223221....011..",
        "..110..111111111...011..",
        "..110...1112111....011..",
        "..110.....1221.....011..",
        "..110....111111....011..",
        "..110...11111111...011..",
        ".1111111112221111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m2),
      buildPixelSprite([
        ".........111111.........",
        ".......1112332111.......",
        "......111000000111......",
        ".....1100..2...0011.....",
        "....110...22..3..011....",
        "...110....222.....011...",
        "...110...22322....011...",
        "..110...2233322....011..",
        "..110.2.2333322....011..",
        "..110..223443322...011..",
        "..110..233444332...011..",
        "..110..223444332...011..",
        "..110..223343322...011..",
        "..110...2233322....011..",
        "..110....22222.....011..",
        "..110...1223221....011..",
        "..110..111111111...011..",
        "..110...1112111....011..",
        "..110.....1221.....011..",
        "..110....111111....011..",
        "..110...11111111...011..",
        ".1111111112221111111111.",
        "111111111111111111111111",
        "000000000000000000000000",
      ], m2),
    ],
    // Stage 3: Towering White-Hot Incandescent Blaze + Electric Cyan-White Core Glint (#E0F2FE)
    s3: [
      buildPixelSprite([
        ".........112211.........",
        ".......1123443211.......",
        "......111002300111......",
        ".....1100..22..0011.....",
        "....110.4.2332.3.011....",
        "...110...233322...011...",
        "...110..2234332.4.011...",
        "..110..223444322...011..",
        "..110.22334443322..011..",
        "..110.23344444332..011..",
        "..110.233444444322.011..",
        "..110.233444444332.011..",
        "..110.223344443322.011..",
        "..110..2233443322..011..",
        "..110...22333322...011..",
        "..110..1223443221..011..",
        "..110.111223322111.011..",
        "..110...11122111...011..",
        "..110.....1221.....011..",
        "..110....112211....011..",
        "..110...11111111...011..",
        ".1111111223333221111111.",
        "111111111122221111111111",
        "000000000000000000000000",
      ], m3),
      buildPixelSprite([
        ".........112211.........",
        ".......1123443211.......",
        "......111003200111......",
        ".....1100...22.0011.....",
        "....110.3..2332..011....",
        "...110.4..23332...011...",
        "...110...2234322..011...",
        "..110..223444332.4.011..",
        "..110..2334443322..011..",
        "..110.22344444332..011..",
        "..110.233444444332.011..",
        "..110.233444444322.011..",
        "..110.223344443322.011..",
        "..110..2233443322..011..",
        "..110...22333322...011..",
        "..110..1223443221..011..",
        "..110.111223322111.011..",
        "..110...11122111...011..",
        "..110.....1221.....011..",
        "..110....112211....011..",
        "..110...11111111...011..",
        ".1111111223333221111111.",
        "111111111122221111111111",
        "000000000000000000000000",
      ], m3),
      buildPixelSprite([
        ".........112211.........",
        ".......1123443211.......",
        "......111002200111......",
        ".....1100.22...0011.....",
        "....110..2332..4.011....",
        "...110..223332....011...",
        "...110.3.2344322..011...",
        "..110..223444332...011..",
        "..110.22334444322..011..",
        "..110.23344444332..011..",
        "..110.233444444322.011..",
        "..110.223444444332.011..",
        "..110.223344443322.011..",
        "..110..2233443322..011..",
        "..110...22333322...011..",
        "..110..1223443221..011..",
        "..110.111223322111.011..",
        "..110...11122111...011..",
        "..110.....1221.....011..",
        "..110....112211....011..",
        "..110...11111111...011..",
        ".1111111223333221111111.",
        "111111111122221111111111",
        "000000000000000000000000",
      ], m3),
    ],
  };
}

const ATASH_PRO_SPRITES = buildAtashProSprites(
  { "0": "#0B1120", "1": "#334155", "2": "#64748B", "3": "#CBD5E1", "4": "#94A3B8" },
  { "0": "#140F1C", "1": "#78350F", "2": "#F59E0B", "3": "#FEF3C7", "4": "#FFFBEB" },
  { "0": "#1A0B0E", "1": "#9A3412", "2": "#F97316", "3": "#FEF08A", "4": "#FFFFFF" },
  { "0": "#090D1F", "1": "#EA580C", "2": "#FACC15", "3": "#38BDF8", "4": "#FFFFFF" }
);

const CYBER_PRO_SPRITES = buildAtashProSprites(
  { "0": "#070812", "1": "#2D3654", "2": "#64748B", "3": "#CBD5E1", "4": "#94A3B8" },
  { "0": "#061319", "1": "#0F766E", "2": "#14B8A6", "3": "#99F6E4", "4": "#F0FDFA" },
  { "0": "#0E0720", "1": "#7C3AED", "2": "#A855F7", "3": "#22D3EE", "4": "#FFFFFF" },
  { "0": "#14051A", "1": "#DB2777", "2": "#EC4899", "3": "#22D3EE", "4": "#FFFFFF" }
);


// =========================================================================
// REEL 04: ATASHKADEH PRO (30.0s | 5 ACTS | COLD -> WHITE-HOT + 128 BPM)
// =========================================================================
function drawProSparkStorm(ctx, cx, baseY, spreadW, riseH, t, stage, pixelSz) {
  const counts = [4, 7, 15, 28];
  const count = counts[clamp(stage, 0, 3)];
  const rng = mulberry32(4049 + stage * 131);
  for (let i = 0; i < count; i++) {
    const phase = rng();
    const speed = stage === 0 ? (0.18 + rng() * 0.16) : (0.45 + stage * 0.18 + rng() * 0.42);
    const prog = (t * speed + phase) % 1;
    const sway = Math.sin(t * (3.2 + stage * 1.4) + i * 2.1) * (stage === 0 ? 12 : 16);
    const driftX = (rng() - 0.5) * spreadW + sway;
    const ex = Math.round((cx + driftX) / pixelSz) * pixelSz;
    const ey = Math.round((baseY - prog * riseH) / pixelSz) * pixelSz;
    if (prog < 0.88) {
      if (stage === 0) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
      } else if (stage === 1) {
        ctx.fillStyle = prog < 0.4 ? "#FEF3C7" : "#F59E0B";
      } else if (stage === 2) {
        ctx.fillStyle = prog < 0.35 ? "#FEF08A" : (prog < 0.7 ? "#F97316" : "#DC2626");
      } else {
        ctx.fillStyle = prog < 0.28 ? "#E0F2FE" : (prog < 0.55 ? "#FFFFFF" : (prog < 0.8 ? "#FACC15" : "#EA580C"));
      }
      const sz = stage === 3 && i % 4 === 0 ? pixelSz * 1.5 : pixelSz;
      ctx.fillRect(ex, ey, Math.round(sz), Math.round(sz));
    }
  }
}

function drawDailyFireMeter(ctx, x, y, w, h, sessionsDone, stage, pal, isPortrait) {
  drawPixelBox(ctx, x, y, w, h, pal.BG, pal.ACCENT, pal.DARK, 6);

  const sessionText = sessionsDone === 0
    ? "تکمیل روز: ۰٪ (۰ از ۴ نشست)"
    : (sessionsDone === 1
      ? "تکمیل روز: ۲۵٪ (۱ از ۴ نشست)"
      : (sessionsDone === 2
        ? "تکمیل روز: ۵۰٪ (۲ از ۴ نشست)"
        : (sessionsDone === 3
          ? "تکمیل روز: ۷۵٪ (۳ از ۴ نشست)"
          : "تکمیل روز: ۱۰۰٪ (۴ از ۴ نشست)")));

  // Right side: Persian session count label
  drawText(ctx, sessionText, x + w - 26, y + h * 0.5, {
    dir: "rtl",
    align: "right",
    font: `900 ${isPortrait ? 27 : 24}px ${FONT_FA}`,
    fill: pal.LIGHT,
    maxWidth: w * 0.52,
  });

  // Left side: 3 distinct horizontal fire-level blocks + level label
  const blockCount = 3;
  const blockW = isPortrait ? 66 : 58;
  const blockH = isPortrait ? 30 : 26;
  const blockGap = 12;
  const bx0 = x + 26;
  const by = y + (h - blockH) * 0.5;
  const blockColors = ["#F59E0B", "#F97316", "#FACC15"];

  for (let i = 0; i < blockCount; i++) {
    const lit = i < stage;
    const bx = bx0 + i * (blockW + blockGap);
    drawPixelBox(
      ctx,
      bx,
      by,
      blockW,
      blockH,
      lit ? (stage === 3 && i === 2 ? "#FFFFFF" : blockColors[i]) : pal.DARK,
      lit ? pal.LIGHT : pal.MID,
      null,
      4
    );
  }

  // Clean 3-block fire gauge without duplicating the arena fire-level label
}

function drawSmartSchedulePill(ctx, cx, cy, w, h, mainText, subText, accentCol, popProg, isPortrait) {
  if (popProg <= 0.01) return;
  const sc = 0.72 + 0.28 * easeOutBack(popProg, 1.55);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.globalAlpha = clamp(popProg * 2.2, 0, 1);

  drawPixelBox(ctx, -w * 0.5, -h * 0.5, w, h, "#0F172A", accentCol, "#020617", 6);
  // Crisp colored top accent bar
  ctx.fillStyle = accentCol;
  ctx.fillRect(-w * 0.5 + 6, -h * 0.5 + 6, w - 12, 6);

  drawText(ctx, mainText, 0, subText ? (isPortrait ? -12 : -10) : 3, {
    dir: "rtl",
    font: `900 ${isPortrait ? 33 : 28}px ${FONT_KUFI}`,
    fill: accentCol,
    maxWidth: w - 44,
  });

  if (subText) {
    drawText(ctx, subText, 0, isPortrait ? 27 : 23, {
      dir: "rtl",
      font: `800 ${isPortrait ? 23 : 19}px ${FONT_FA}`,
      fill: "#F8FAFC",
      maxWidth: w - 44,
    });
  }
  ctx.restore();
}

function renderAtashPro(ctx, W, H, t, isPortrait, isCyber = false) {
  const PRO_PALS = isCyber ? CYBER_PRO_PALETTES : ATASH_PRO_PALETTES;
  const PRO_SPRS = isCyber ? CYBER_PRO_SPRITES : ATASH_PRO_SPRITES;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Determine active temperature stage (0..3) and completed sessions (0..4)
  let stage = 0;
  let sessionsDone = 0;
  if (t < 10.0) { stage = 0; sessionsDone = 0; }
  else if (t < 17.0) { stage = 1; sessionsDone = 1; }
  else if (t < 19.2) { stage = 2; sessionsDone = 2; }
  else if (t < 23.8) { stage = 2; sessionsDone = 3; }
  else { stage = 3; sessionsDone = 4; }

  const pal = PRO_PALS[stage];
  const ditherBgMid = createBayerPattern(ctx, pal.BG, pal.DARK, 6);
  const beatPhase = (t * 127.5 / 60) % 1;
  const beatPulse = Math.exp(-beatPhase * 5.2);

  // Sprite frame selector (faster dancing fire at hotter stages)
  const fireFrames = stage === 0 ? PRO_SPRS.s0
    : (stage === 1 ? PRO_SPRS.s1
      : (stage === 2 ? PRO_SPRS.s2 : PRO_SPRS.s3));
  const fireRate = stage === 0 ? 2.5 : (stage === 1 ? 5.5 : (stage === 2 ? 8.0 : 11.0));
  const fireSprite = fireFrames[Math.floor(t * fireRate) % fireFrames.length];

  // Background + subtle architectural pixel grid
  ctx.fillStyle = pal.BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = stage === 3 ? "rgba(224, 242, 254, 0.045)" : "rgba(255, 255, 255, 0.032)";
  const gridStep = 16;
  for (let gx = 0; gx < W; gx += gridStep) ctx.fillRect(gx, 0, 2, H);
  for (let gy = 0; gy < H; gy += gridStep) ctx.fillRect(0, gy, W, 2);

  // Outer frame border
  const pad = isPortrait ? 40 : 32;
  const bw = 8;
  ctx.fillStyle = pal.MID;
  ctx.fillRect(pad, pad, W - pad * 2, bw);
  ctx.fillRect(pad, H - pad - bw, W - pad * 2, bw);
  ctx.fillRect(pad, pad, bw, H - pad * 2);
  ctx.fillRect(W - pad - bw, pad, bw, H - pad * 2);

  // Helper for horizontal pixel wipe transitions
  const drawHorizontalPixelWipe = (progress, col) => {
    if (progress >= 1 || progress <= 0) return;
    const rows = 14;
    const rowH = Math.ceil(H / rows);
    ctx.fillStyle = col;
    for (let r = 0; r < rows; r++) {
      const rowProg = clamp(progress * 1.45 - (r / rows) * 0.45);
      const coverW = Math.round((1 - rowProg) * W);
      if (coverW > 0) ctx.fillRect(W - coverW, r * rowH, coverW, rowH + 1);
    }
  };

  // Helper for heat-wave flash on stage upgrades
  const drawHeatFlash = (flashStart, flashCol) => {
    if (t >= flashStart && t < flashStart + 0.42) {
      const fp = norm(t, flashStart, flashStart + 0.42);
      ctx.save();
      ctx.globalAlpha = (1 - fp) * 0.55;
      ctx.fillStyle = flashCol;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  // =======================================================================
  // ACT 1 (0.0 - 4.5s): COLD START HOOK — UNLIT ATASHKADEH ON SLATE NIGHT
  // =======================================================================
  if (t < 3.765) {
    const enter = easeOutBack(norm(t, 0.0, 0.5), 1.35);
    const pulse = Math.floor(t * 3.5) % 2 === 0;

    // Top & bottom dither ribbons
    const ribH = isPortrait ? 78 : 56;
    ctx.fillStyle = ditherBgMid;
    ctx.fillRect(pad + bw, pad + bw, W - (pad + bw) * 2, ribH);
    ctx.fillRect(pad + bw, H - pad - bw - ribH, W - (pad + bw) * 2, ribH);

    // Cold status badge
    const badgeW = isPortrait ? 490 : 450;
    const badgeH = isPortrait ? 70 : 58;
    const badgeX = (W - badgeW) * 0.5;
    const badgeY = pad + ribH + (isPortrait ? 86 : 22);
    drawPixelBox(ctx, badgeX, badgeY, badgeW, badgeH, pulse ? pal.DARK : pal.BG, pal.ACCENT, null, 6);
    drawText(ctx, "آتشکده خاموش | ۰ آتیش", W * 0.5, badgeY + badgeH * 0.5, {
      dir: "rtl",
      font: `900 ${isPortrait ? 34 : 28}px ${FONT_KUFI}`,
      fill: pulse ? pal.LIGHT : "#94A3B8",
    });

    // Cold Unlit Persian Arched Altar + subtle rising smoke pixels
    const altarScale = isPortrait ? 19 : 12;
    const altarPx = 24 * altarScale;
    const altarX = (W - altarPx) * 0.5;
    const altarY = isPortrait ? badgeY + badgeH + 64 : badgeY + badgeH + 18;

    ctx.save();
    ctx.translate(W * 0.5, altarY + altarPx * 0.5);
    ctx.scale(0.92 + 0.08 * enter, 0.92 + 0.08 * enter);
    ctx.translate(-W * 0.5, -(altarY + altarPx * 0.5));
    drawSprite(ctx, fireSprite, altarX, altarY, altarScale);
    ctx.restore();
    drawProSparkStorm(ctx, W * 0.5, altarY + altarPx * 0.48, altarPx * 0.22, 95, t, 0, 8);

    // Headline panel
    const boxW = isPortrait ? W - 116 : W * 0.68;
    const boxH = isPortrait ? 300 : 210;
    const boxX = (W - boxW) * 0.5;
    const boxY = altarY + altarPx + (isPortrait ? 48 : 22);

    drawPixelBox(ctx, boxX, boxY, boxW, boxH, pal.BG, pal.MID, pal.DARK, 8);
    drawPersianCornerSteps(ctx, boxX + 16, boxY + 16, boxW - 32, boxH - 32, pal.ACCENT, 8);

    drawText(ctx, "آتشکده امروزت هنوز خاموشه...", W * 0.5, boxY + (isPortrait ? 104 : 76), {
      dir: "rtl",
      font: `900 ${isPortrait ? 50 : 44}px ${FONT_KUFI}`,
      fill: pal.LIGHT,
      maxWidth: boxW - 76,
    });

    ctx.fillStyle = pal.ACCENT;
    ctx.fillRect(W * 0.5 - 140, boxY + (isPortrait ? 160 : 114), 280, 6);

    drawText(ctx, "۴ نشست کوتاه تا اوج حرارت!", W * 0.5, boxY + (isPortrait ? 222 : 160), {
      dir: "rtl",
      font: `900 ${isPortrait ? 46 : 40}px ${FONT_KUFI}`,
      fill: "#F59E0B",
      maxWidth: boxW - 76,
    });

    // Daily Fire Meter at bottom (0 of 4)
    const meterW = boxW;
    const meterH = isPortrait ? 92 : 76;
    const meterX = (W - meterW) * 0.5;
    const meterY = boxY + boxH + (isPortrait ? 40 : 22);
    drawDailyFireMeter(ctx, meterX, meterY, meterW, meterH, 0, 0, pal, isPortrait);
  }

  // =======================================================================
  // ACT 4A (18.5 - 19.7s): 1.2s KINETIC BLITZ — SESSION 3 DONE!
  // =======================================================================
  else if (t >= 18.824 && t < 19.765) {
    const localT = t - 18.824;
    const pop = easeOutBack(norm(localT, 0.04, 0.35), 1.6);
    const checkPop = easeOutBack(norm(localT, 0.32, 0.65), 1.8);

    // Kinetic horizontal speed-lines
    const rng = mulberry32(3031);
    for (let i = 0; i < 18; i++) {
      const ly = pad + 40 + rng() * (H - pad * 2 - 80);
      const lw = 140 + rng() * 320;
      const speed = 1400 + rng() * 1200;
      const lx = ((W + lw) - ((localT * speed + rng() * W) % (W + lw * 2)));
      ctx.fillStyle = i % 2 === 0 ? "rgba(249, 115, 22, 0.25)" : "rgba(254, 240, 138, 0.20)";
      ctx.fillRect(Math.round(lx), Math.round(ly), Math.round(lw), 8);
    }

    // Top Daily Fire Meter (ticks from 2 -> 3 at localT = 0.5)
    const meterW = isPortrait ? W - 120 : W * 0.68;
    const meterH = isPortrait ? 90 : 74;
    drawDailyFireMeter(ctx, (W - meterW) * 0.5, pad + 36, meterW, meterH, localT >= 0.45 ? 3 : 2, 2, pal, isPortrait);

    // Blitz Card
    const bw3 = isPortrait ? W - 120 : W * 0.66;
    const bh3 = isPortrait ? 620 : 460;
    const bx3 = (W - bw3) * 0.5;
    const by3 = (H - bh3) * 0.5 + 16;

    ctx.save();
    ctx.translate(W * 0.5, by3 + bh3 * 0.5);
    ctx.scale(0.84 + 0.16 * pop, 0.84 + 0.16 * pop);
    ctx.translate(-W * 0.5, -(by3 + bh3 * 0.5));

    drawPixelBox(ctx, bx3, by3, bw3, bh3, pal.CARD_BG, pal.ACCENT, pal.MID, 10);

    // Header strip
    ctx.fillStyle = pal.MID;
    ctx.fillRect(bx3 + 10, by3 + 10, bw3 - 20, isPortrait ? 82 : 68);
    drawText(ctx, "نشست ۳ از ۴ ✓", W * 0.5, by3 + 10 + (isPortrait ? 41 : 34), {
      dir: "rtl",
      font: `900 ${isPortrait ? 42 : 34}px ${FONT_KUFI}`,
      fill: pal.LIGHT,
    });

    drawText(ctx, "Meticulous", W * 0.5, by3 + (isPortrait ? 230 : 178), {
      dir: "ltr",
      font: `900 ${isPortrait ? 92 : 78}px ${FONT_MONO}`,
      fill: pal.CARD_INK,
    });

    drawText(ctx, "بسیار دقیق", W * 0.5, by3 + (isPortrait ? 336 : 262), {
      dir: "rtl",
      font: `900 ${isPortrait ? 58 : 48}px ${FONT_KUFI}`,
      fill: pal.MID,
    });

    // Green check badge
    const chkW = isPortrait ? 340 : 300;
    const chkH = isPortrait ? 92 : 78;
    ctx.save();
    ctx.translate(W * 0.5, by3 + bh3 - (isPortrait ? 114 : 88));
    ctx.scale(0.6 + 0.4 * checkPop, 0.6 + 0.4 * checkPop);
    drawPixelBox(ctx, -chkW * 0.5, -chkH * 0.5, chkW, chkH, "#16A34A", "#DCFCE7", "#14532D", 6);
    drawText(ctx, "مرور سریع | تیک خورد ✓", 0, 2, {
      dir: "rtl",
      font: `900 ${isPortrait ? 32 : 28}px ${FONT_KUFI}`,
      fill: "#FFFFFF",
    });
    ctx.restore();

    ctx.restore();
  }

  // =======================================================================
  // ACTS 2, 3, AND 4B (4.5-11.5s, 11.5-18.5s, 19.7-25.5s): INTERACTIVE SESSIONS
  // =======================================================================
  else if (t < 26.353) {
    // Determine session config
    let cfg;
    if (t < 11.294) {
      // ACT 2: Session 1 (Cloze-in-Sentence + Hard -> Tomorrow -> Stage 1)
      cfg = {
        tStart: 3.765,
        tFlip: 6.588,
        tRevTapStart: 5.98,
        tRevTapEnd: 6.54,
        tRateStart: 7.529,
        tRateEnd: 8.32,
        tPillStart: 7.65,
        tComplete: 9.412,
        sessionHeader: "نشست ۱ از ۴ | جمله ناقص",
        cefr: "B2",
        frontMode: "cloze",
        clozeLines: ["Nothing can fully ??? for the", "loss of a loved one."],
        frontHint: "SYN: make up for | atone",
        word: "Compensate",
        ipa: "/ˈkɑːmpenseɪt/",
        meaning: "جبران کردن، غرامت دادن",
        backHint: "SYN: make up for | atone",
        chosenId: "hard",
        chosenCol: "#F59E0B",
        pillMain: "مرور بعدی: فردا",
        pillSub: "سخت بود؟ زودتر برمیگرده!",
        completeBanner: "۲۵٪ وظایف امروز کامل شد!",
        wipeCol: "#334155",
        flashCol: "#F59E0B",
      };
    } else if (t < 18.824) {
      // ACT 3: Session 2 (Definition + Hint + Good -> 9 Days -> Stage 2)
      cfg = {
        tStart: 11.294,
        tFlip: 14.118,
        tRevTapStart: 13.50,
        tRevTapEnd: 14.07,
        tRateStart: 15.059,
        tRateEnd: 15.85,
        tPillStart: 15.18,
        tComplete: 16.941,
        sessionHeader: "نشست ۲ از ۴ (۵۰٪ روز) | تعریف",
        cefr: "B2",
        frontMode: "def",
        frontCue: "چه واژه ای یعنی «منسجم، منطقی و قابل فهم»؟",
        frontHint: "SYN: Logical | Consistent",
        word: "Coherent",
        ipa: "/koʊˈhɪərənt/",
        meaning: "منسجم، منطقی و قابل فهم",
        backHint: "SYN: Logical, Consistent",
        chosenId: "good",
        chosenCol: "#22C55E",
        pillMain: "مرور بعدی: ۹ روز دیگه",
        pillSub: "خوب یادت موند | فاصله مرور بیشتر شد",
        completeBanner: "نصف مسیر امروز رفتی (۵۰٪)!",
        wipeCol: "#78350F",
        flashCol: "#F97316",
      };
    } else {
      // ACT 4B: Session 4 (Antonym Prompt + Easy -> 21 Days -> Stage 3 White-Hot!)
      cfg = {
        tStart: 19.765,
        tFlip: 21.647,
        tRevTapStart: 21.05,
        tRevTapEnd: 21.60,
        tRateStart: 22.588,
        tRateEnd: 23.38,
        tPillStart: 22.70,
        tComplete: 24.471,
        sessionHeader: "نشست ۴ از ۴ | متضادها",
        cefr: "C1",
        frontMode: "ant",
        frontCue: "متضادهای vague و inarticulate؟",
        frontHint: "ANT: vague | inarticulate",
        word: "Articulate",
        ipa: "/ɑːrˈtɪkjʊlət/",
        meaning: "رسا، شیوا و واضح",
        backHint: "ANT: vague, inarticulate",
        chosenId: "easy",
        chosenCol: "#A855F7",
        pillMain: "مرور بعدی: ۲۱ روز دیگه",
        pillSub: "بلدی؟ وقتت رو نمیگیره!",
        completeBanner: "همه نشست های امروز کامل شد (۱۰۰٪)!",
        wipeCol: "#9A3412",
        flashCol: "#E0F2FE",
      };
    }

    const localT = t - cfg.tStart;
    const isBack = t >= cfg.tFlip;
    const isRevTap = t >= cfg.tRevTapStart && t < cfg.tRevTapEnd;
    const isRatePressed = t >= cfg.tRateStart && t <= cfg.tRateEnd;
    const isCompleted = t >= cfg.tComplete;
    const pillProg = norm(t, cfg.tPillStart, cfg.tPillStart + 0.32);

    // Top Bar: Brand + Daily Fire Meter
    const barW = W - (pad + 28) * 2;
    const barH = isPortrait ? 86 : 68;
    const barX = pad + 28;
    const barY = pad + 24;
    drawDailyFireMeter(ctx, barX, barY, barW, barH, sessionsDone, stage, pal, isPortrait);

    // Main Card Geometry (cleanly separated from controls & fire arena in BOTH 9:16 and 16:9)
    const cardW = isPortrait ? W - 112 : W * 0.54;
    const cardH = isPortrait ? 548 : 486;
    const cardX = isPortrait ? (W - cardW) * 0.5 : pad + 36;
    const cardY = barY + barH + (isPortrait ? 28 : 22);

    const flipScaleX = isBack
      ? easeOutBack(norm(t, cfg.tFlip, cfg.tFlip + 0.30), 1.15)
      : (t > cfg.tFlip - 0.14 ? Math.max(0.12, 1 - norm(t, cfg.tFlip - 0.14, cfg.tFlip)) : easeOutBack(norm(localT, 0.12, 0.52), 1.25));

    ctx.save();
    ctx.translate(cardX + cardW * 0.5, cardY + cardH * 0.5);
    ctx.scale(clamp(flipScaleX, 0.08, 1.04), 1);
    ctx.translate(-(cardX + cardW * 0.5), -(cardY + cardH * 0.5));

    drawPixelBox(ctx, cardX, cardY, cardW, cardH, pal.CARD_BG, pal.ACCENT, pal.DARK, 10);

    // Card header band
    const bandH = isPortrait ? 64 : 54;
    ctx.fillStyle = pal.MID;
    ctx.fillRect(cardX + 10, cardY + 10, cardW - 20, bandH);
    ctx.fillStyle = pal.BG;
    ctx.fillRect(cardX + 10, cardY + 10 + bandH, cardW - 20, 6);

    drawText(ctx, cfg.sessionHeader, cardX + cardW - 26, cardY + 10 + bandH * 0.5, {
      dir: "rtl",
      align: "right",
      font: `800 ${isPortrait ? 26 : 22}px ${FONT_FA}`,
      fill: pal.LIGHT,
      maxWidth: cardW - 140,
    });

    drawPixelBox(ctx, cardX + 24, cardY + (isPortrait ? 18 : 14), 72, isPortrait ? 46 : 40, pal.BG, pal.ACCENT, null, 4);
    drawText(ctx, cfg.cefr, cardX + 60, cardY + (isPortrait ? 41 : 34), {
      dir: "ltr",
      font: `900 ${isPortrait ? 26 : 22}px ${FONT_MONO}`,
      fill: pal.ACCENT,
    });

    if (!isBack) {
      // FRONT CARD
      drawText(ctx, "???", cardX + cardW * 0.5, cardY + (isPortrait ? 168 : 148), {
        dir: "ltr",
        font: `900 ${isPortrait ? 96 : 82}px ${FONT_MONO}`,
        fill: pal.CARD_INK,
      });

      if (cfg.frontMode === "cloze") {
        drawText(ctx, cfg.clozeLines[0], cardX + cardW * 0.5, cardY + (isPortrait ? 276 : 236), {
          dir: "ltr",
          font: `800 ${isPortrait ? 34 : 30}px ${FONT_MONO}`,
          fill: pal.CARD_INK,
          maxWidth: cardW - 76,
        });
        drawText(ctx, cfg.clozeLines[1], cardX + cardW * 0.5, cardY + (isPortrait ? 326 : 280), {
          dir: "ltr",
          font: `800 ${isPortrait ? 34 : 30}px ${FONT_MONO}`,
          fill: pal.MID,
          maxWidth: cardW - 76,
        });
      } else {
        drawText(ctx, cfg.frontCue, cardX + cardW * 0.5, cardY + (isPortrait ? 296 : 254), {
          dir: "rtl",
          font: `900 ${isPortrait ? 39 : 34}px ${FONT_KUFI}`,
          fill: pal.MID,
          maxWidth: cardW - 72,
        });
      }

      // Hint strip at bottom of front card
      const hintY = cardY + cardH - (isPortrait ? 86 : 74);
      const hintW = Math.min(cardW - 88, 560);
      drawPixelBox(ctx, cardX + (cardW - hintW) * 0.5, hintY - 28, hintW, 56, "#FFFFFF", pal.MID, null, 5);
      drawText(ctx, cfg.frontHint, cardX + cardW * 0.5, hintY, {
        dir: "ltr",
        font: `800 ${isPortrait ? 23 : 20}px ${FONT_MONO}`,
        fill: pal.CARD_INK,
        maxWidth: hintW - 36,
      });
    } else {
      // BACK CARD
      drawText(ctx, cfg.word, cardX + cardW * 0.5, cardY + (isPortrait ? 156 : 136), {
        dir: "ltr",
        font: `900 ${isPortrait ? 84 : 72}px ${FONT_MONO}`,
        fill: pal.CARD_INK,
      });

      drawText(ctx, cfg.ipa, cardX + cardW * 0.5, cardY + (isPortrait ? 218 : 188), {
        dir: "ltr",
        font: `700 ${isPortrait ? 30 : 26}px ${FONT_MONO}`,
        fill: pal.MID,
      });

      ctx.fillStyle = pal.ACCENT;
      ctx.fillRect(cardX + cardW * 0.22, cardY + (isPortrait ? 256 : 220), cardW * 0.56, 6);

      drawText(ctx, cfg.meaning, cardX + cardW * 0.5, cardY + (isPortrait ? 318 : 276), {
        dir: "rtl",
        font: `900 ${isPortrait ? 46 : 40}px ${FONT_KUFI}`,
        fill: pal.CARD_INK,
        maxWidth: cardW - 64,
      });

      // Back hint OR Smart Schedule Pill in the clean lower card slot (ZERO overlap!)
      const lowerY = cardY + cardH - (isPortrait ? 92 : 80);
      if (pillProg > 0.01) {
        drawSmartSchedulePill(
          ctx,
          cardX + cardW * 0.5,
          lowerY,
          cardW - 76,
          isPortrait ? 120 : 104,
          cfg.pillMain,
          cfg.pillSub,
          cfg.chosenCol,
          pillProg,
          isPortrait
        );
      } else {
        const hintW = Math.min(cardW - 88, 560);
        drawPixelBox(ctx, cardX + (cardW - hintW) * 0.5, lowerY - 28, hintW, 56, "#FFFFFF", pal.MID, null, 5);
        drawText(ctx, cfg.backHint, cardX + cardW * 0.5, lowerY, {
          dir: "ltr",
          font: `800 ${isPortrait ? 22 : 20}px ${FONT_MONO}`,
          fill: pal.MID,
          maxWidth: hintW - 36,
        });
      }
    }
    ctx.restore();

    // CONTROLS BELOW CARD (Reveal Button or 2x2 Real Recall Buttons)
    const ctrlY = cardY + cardH + (isPortrait ? 26 : 22);
    const btnAreaH = isPortrait ? 236 : 216;
    let targetBtnCenter = { x: cardX + cardW * 0.5, y: ctrlY + 54 };

    if (!isBack) {
      const revH = isPortrait ? 108 : 92;
      const off = isRevTap ? 6 : 0;
      drawPixelBox(
        ctx,
        cardX + off,
        ctrlY + off,
        cardW,
        revH,
        isRevTap ? pal.MID : pal.ACCENT,
        pal.LIGHT,
        isRevTap ? null : pal.DARK,
        7
      );
      drawText(ctx, "نمایش پاسخ", cardX + off + cardW * 0.5, ctrlY + off + revH * 0.5, {
        dir: "rtl",
        font: `900 ${isPortrait ? 40 : 34}px ${FONT_KUFI}`,
        fill: isRevTap ? pal.LIGHT : pal.BG,
      });

      if (t >= cfg.tRevTapStart - 0.55 && t < cfg.tFlip) {
        const mt = easeOutQuint(norm(t, cfg.tRevTapStart - 0.55, cfg.tRevTapStart));
        const cx = lerp(cardX + cardW * 0.85, cardX + cardW * 0.54, mt);
        const cy = lerp(ctrlY + revH + 64, ctrlY + revH * 0.58, mt) + (isRevTap ? 5 : 0);
        drawSprite(ctx, SPRITES.cursorAtash, cx, cy, isPortrait ? 5 : 4);
      }
    } else {
      const gapX = isPortrait ? 18 : 16;
      const gapY = isPortrait ? 18 : 14;
      const btnW = Math.floor((cardW - gapX) / 2);
      const btnH = isPortrait ? 108 : 100;
      const btnEnter = easeOutCubic(norm(t, cfg.tFlip, cfg.tFlip + 0.35));

      for (let i = 0; i < 4; i++) {
        const btn = RECALL_BUTTONS[i];
        const row = Math.floor(i / 2);
        const colRTL = i % 2;
        const bx = colRTL === 0 ? (cardX + btnW + gapX) : cardX;
        const by = ctrlY + row * (btnH + gapY) + (1 - btnEnter) * 26;
        const isChosen = btn.id === cfg.chosenId;
        const pressed = isChosen && isRatePressed;
        const highlighted = isChosen && t >= cfg.tRateStart;
        const off = pressed ? 6 : 0;

        if (isChosen) {
          targetBtnCenter = { x: bx + btnW * 0.5, y: by + btnH * 0.5 };
        }

        const fill = highlighted ? cfg.chosenCol : pal.CARD_BG;
        const txtFill = highlighted ? "#0F172A" : pal.CARD_INK;
        const borderCol = highlighted ? "#FFFFFF" : pal.MID;
        const shadow = pressed ? null : pal.DARK;

        drawPixelBox(ctx, bx + off, by + off, btnW, btnH, fill, borderCol, shadow, 6);

        // Crisp color dot indicator on right
        const dotR = isPortrait ? 12 : 10;
        const dotX = bx + off + btnW - 32;
        const dotY = by + off + btnH * 0.5;
        ctx.fillStyle = highlighted ? "#0F172A" : btn.dot;
        ctx.fillRect(Math.round(dotX - dotR), Math.round(dotY - dotR), dotR * 2, dotR * 2);

        drawText(ctx, btn.label, bx + off + btnW - 58, dotY, {
          dir: "rtl",
          align: "right",
          font: `900 ${isPortrait ? 30 : 26}px ${FONT_KUFI}`,
          fill: txtFill,
          maxWidth: btnW - 76,
        });
      }
    }

    // ATASHKADEH FIRE ARENA (Right column in 16:9, Bottom panel in 9:16)
    const arW = isPortrait ? cardW : (W - (cardX + cardW) - pad - 68);
    const arH = isPortrait ? (H - pad - 28 - (ctrlY + btnAreaH + 26)) : (cardH + 22 + btnAreaH);
    const arX = isPortrait ? cardX : (cardX + cardW + 28);
    const arY = isPortrait ? (ctrlY + btnAreaH + 26) : cardY;

    drawPixelBox(ctx, arX, arY, arW, arH, pal.BG, pal.ACCENT, pal.DARK, 8);
    ctx.fillStyle = ditherBgMid;
    const footStripH = isPortrait ? 98 : 96;
    ctx.fillRect(arX + 8, arY + arH - footStripH, arW - 16, footStripH - 8);
    ctx.fillStyle = pal.ACCENT;
    ctx.fillRect(arX + 8, arY + arH - footStripH, arW - 16, 6);

    // Arena Top Status (explains daily progress; bottom badge shows fire stage only)
    const arenaHeader = isCompleted
      ? cfg.completeBanner
      : (stage === 0 ? "با تکمیل اولین نشست روشن میشه" : "با هر نشست، شعله داغ تر میشه");
    drawText(ctx, arenaHeader, arX + arW * 0.5, arY + 42, {
      dir: "rtl",
      font: `900 ${isPortrait ? 31 : 25}px ${FONT_KUFI}`,
      fill: isCompleted ? (stage === 3 ? "#E0F2FE" : pal.ACCENT) : pal.LIGHT,
      maxWidth: arW - 40,
    });

    // Natural Asymmetric Roaring Fire Sprite inside Persian Arch
    const ignitePop = isCompleted ? easeOutBack(norm(t, cfg.tComplete, cfg.tComplete + 0.42), 1.55) : 1.0;
    const beatScale = stage >= 2 ? (1 + beatPulse * (stage === 3 ? 0.045 : 0.025)) : 1.0;
    const maxAltarH = arH - footStripH - 94;
    const maxAltarW = arW - 64;
    const arScale = Math.max(8, Math.floor(Math.min(maxAltarH, maxAltarW) / 24));
    const altarPx = 24 * arScale;
    const altarX = arX + (arW - altarPx) * 0.5;
    const altarY = arY + 74 + Math.max(0, (maxAltarH - altarPx) * 0.5);

    ctx.save();
    ctx.translate(arX + arW * 0.5, altarY + altarPx * 0.5);
    ctx.scale((0.90 + 0.10 * ignitePop) * beatScale, (0.90 + 0.10 * ignitePop) * beatScale);
    ctx.translate(-(arX + arW * 0.5), -(altarY + altarPx * 0.5));
    drawSprite(ctx, fireSprite, altarX, altarY, arScale);
    ctx.restore();

    drawProSparkStorm(ctx, arX + arW * 0.5, altarY + altarPx * 0.45, altarPx * 0.62, Math.min(120, altarPx * 0.48), t, stage, stage === 3 ? 9 : 7);

    // Arena Footer Badge
    const footY = arY + arH - footStripH * 0.5 + 2;
    const footBadgeW = Math.min(arW - 60, isPortrait ? 440 : 360);
    const footBadgeH = isPortrait ? 62 : 56;
    drawPixelBox(
      ctx,
      arX + (arW - footBadgeW) * 0.5,
      footY - footBadgeH * 0.5,
      footBadgeW,
      footBadgeH,
      stage === 0 ? pal.DARK : (stage === 3 ? "#FFFFFF" : pal.ACCENT),
      stage === 3 ? "#E0F2FE" : pal.LIGHT,
      null,
      5
    );
    const footStageLabel = ["خاموش", "۱ آتیش", "۲ آتیش", "۳ آتیش - اوج حرارت!"][stage];
    drawText(ctx, footStageLabel, arX + arW * 0.5, footY + 1, {
      dir: "rtl",
      font: `900 ${isPortrait ? 34 : 28}px ${FONT_KUFI}`,
      fill: stage === 0 ? pal.LIGHT : pal.BG,
      maxWidth: footBadgeW - 28,
    });

    // Pixel Cursor tapping chosen recall button
    if (isBack && t >= cfg.tRateStart - 0.55 && t <= cfg.tRateEnd + 0.35) {
      const moveT = easeOutQuint(norm(t, cfg.tRateStart - 0.55, cfg.tRateStart));
      const cx = lerp(cardX + cardW * 0.85, targetBtnCenter.x + 24, moveT);
      const cy = lerp(ctrlY + btnAreaH + 40, targetBtnCenter.y + 10, moveT) + (isRatePressed ? 5 : 0);
      drawSprite(ctx, SPRITES.cursorAtash, cx, cy, isPortrait ? 5 : 4);
    }

    // Transitions & Heat-Wave Flash
    drawHorizontalPixelWipe(norm(localT, 0.0, 0.38), cfg.wipeCol);
    drawHeatFlash(cfg.tComplete, cfg.flashCol);
  }

  // =======================================================================
  // ACT 5 (25.5 - 30.0s): HEROIC WHITE-HOT BRAND LOCKUP (PULSING TO 128 BPM)
  // =======================================================================
  else {
    const localT = t - 26.353;
    const pop = easeOutBack(norm(localT, 0.06, 0.58), 1.45);
    const p3 = PRO_PALS[3];

    ctx.fillStyle = p3.BG;
    ctx.fillRect(0, 0, W, H);

    // Synthwave horizon grid lines at bottom for subtle retro glow
    ctx.fillStyle = "rgba(250, 204, 21, 0.06)";
    const ribH = isPortrait ? 116 : 78;
    ctx.fillRect(0, 0, W, ribH);
    ctx.fillRect(0, H - ribH, W, ribH);

    const pw = isPortrait ? W - 108 : W * 0.72;
    const ph = isPortrait ? 1180 : 790;
    const px = (W - pw) * 0.5;
    const py = (H - ph) * 0.5;

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(0.88 + 0.12 * pop, 0.88 + 0.12 * pop);
    ctx.translate(-W * 0.5, -H * 0.5);

    drawPixelBox(ctx, px, py, pw, ph, p3.BG, p3.ACCENT, p3.MID, 10);
    drawPersianCornerSteps(ctx, px + 20, py + 20, pw - 40, ph - 40, p3.CORE, 10);

    // White-Hot Blazing Pixel Atashkadeh Emblem pulsing to 128 BPM synthwave beat
    const embScale = isPortrait ? 14 : 10;
    const embPx = 24 * embScale;
    const embX = W * 0.5 - embPx * 0.5;
    const embY = py + (isPortrait ? 58 : 32);

    ctx.save();
    ctx.translate(W * 0.5, embY + embPx * 0.5);
    const bSc = 1 + beatPulse * 0.045;
    ctx.scale(bSc, bSc);
    ctx.translate(-W * 0.5, -(embY + embPx * 0.5));
    drawSprite(ctx, fireSprite, embX, embY, embScale);
    ctx.restore();
    drawProSparkStorm(ctx, W * 0.5, embY + embPx * 0.45, embPx * 0.72, 110, t, 3, 9);

    // Brand Wordmark
    drawText(ctx, "همزبان", W * 0.5, embY + embPx + (isPortrait ? 92 : 66), {
      dir: "rtl",
      font: `900 ${isPortrait ? 124 : 96}px ${FONT_KUFI}`,
      fill: p3.LIGHT,
    });

    // Electric gold-white divider
    ctx.fillStyle = p3.ACCENT;
    ctx.fillRect(W * 0.5 - 190, embY + embPx + (isPortrait ? 174 : 124), 380, 8);
    ctx.fillStyle = p3.CORE;
    ctx.fillRect(W * 0.5 - 80, embY + embPx + (isPortrait ? 174 : 124), 160, 8);

    drawText(ctx, "هر کلمه دقیقاً سر وقتش برمیگرده", W * 0.5, embY + embPx + (isPortrait ? 248 : 180), {
      dir: "rtl",
      font: `900 ${isPortrait ? 45 : 37}px ${FONT_FA}`,
      fill: p3.ACCENT,
      maxWidth: pw - 72,
    });

    drawText(ctx, "آتشکده ات رو روشن نگه دار :)", W * 0.5, embY + embPx + (isPortrait ? 326 : 238), {
      dir: "rtl",
      font: `800 ${isPortrait ? 38 : 31}px ${FONT_FA}`,
      fill: p3.CORE,
      maxWidth: pw - 72,
    });

    // Handle Pill (strictly LTR)
    const pillW = isPortrait ? 560 : 480;
    const pillH = isPortrait ? 110 : 88;
    const pillX = W * 0.5 - pillW * 0.5;
    const pillY = py + ph - (isPortrait ? 168 : 124);
    drawPixelBox(ctx, pillX, pillY, pillW, pillH, p3.ACCENT, p3.LIGHT, p3.MID, 6);
    drawText(ctx, "@HamZabanRobot", W * 0.5, pillY + pillH * 0.5, {
      dir: "ltr",
      font: `900 ${isPortrait ? 48 : 40}px ${FONT_MONO}`,
      fill: p3.BG,
    });

    ctx.restore();

    // Corner beat-synced incandescent sparks
    ctx.fillStyle = beatPulse > 0.45 ? p3.CORE : p3.ACCENT;
    const corners = [
      [px - 28, py - 28],
      [px + pw + 12, py - 28],
      [px - 28, py + ph + 12],
      [px + pw + 12, py + ph + 12],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, 16, 16);
    }
  }

  ctx.restore();
}


// =========================================================================
// SYNTHWAVE RGB-SPLIT GLITCH & CHROMATIC SLICE TRANSITION POST-PASS (Reel 04)
// =========================================================================
let glitchScratch = null;
let glitchScratchCtx = null;

function applySynthwaveGlitchFX(ctx, W, H, t) {
  // Transition windows locked to Reel 04 cuts & fire surges:
  // 4.5s Act2 | 10.0s Fire1 | 11.5s Act3 | 17.0s Fire2 | 18.5s Act4 | 23.8s White-Hot | 25.5s Lockup
  const windows = [
    { a: 3.58, b: 3.96, peak: 3.765, power: 0.95, accent: "#38BDF8", flash: false },
    { a: 11.12, b: 11.48, peak: 11.294, power: 0.95, accent: "#F97316", flash: false },
    { a: 18.65, b: 19.02, peak: 18.824, power: 1.00, accent: "#EC4899", flash: false },
    { a: 24.30, b: 24.82, peak: 24.471, power: 1.22, accent: "#E0F2FE", flash: true },
    { a: 26.18, b: 26.54, peak: 26.353, power: 1.00, accent: "#FACC15", flash: false },
  ];

  let active = null;
  let intensity = 0;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (t >= w.a && t <= w.b) {
      const half = (w.b - w.a) * 0.5;
      const dist = Math.abs(t - w.peak) / half;
      intensity = Math.max(0, 1 - dist * dist) * w.power;
      active = w;
      break;
    }
  }
  if (!active || intensity < 0.04) return;

  if (!glitchScratch || glitchScratch.width !== W || glitchScratch.height !== H) {
    glitchScratch = document.createElement("canvas");
    glitchScratch.width = W;
    glitchScratch.height = H;
    glitchScratchCtx = glitchScratch.getContext("2d", { alpha: false });
  }
  glitchScratchCtx.drawImage(ctx.canvas, 0, 0);

  const frameSeed = Math.floor(t * 36) * 97 + 1337;
  const rng = mulberry32(frameSeed);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Horizontal real-frame pixel-tear slices
  const sliceCount = Math.floor(7 + intensity * 9);
  for (let i = 0; i < sliceCount; i++) {
    const sy = Math.floor(rng() * (H - 40));
    const sh = Math.floor(14 + rng() * (96 * intensity));
    const maxShift = Math.round(W * 0.085 * intensity);
    const dx = Math.round((rng() - 0.5) * 2 * maxShift);
    ctx.drawImage(glitchScratch, 0, sy, W, sh, dx, sy, W, sh);

    // Chromatic cyan / magenta / heat-accent edge ghost on select slices
    if (i % 2 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.28 * clamp(intensity, 0, 1);
      ctx.fillStyle = i % 4 === 0 ? "#22D3EE" : (i % 4 === 2 ? "#EC4899" : active.accent);
      ctx.fillRect(0, sy, W, Math.max(4, Math.floor(sh * 0.35)));
      ctx.restore();
    }
  }

  // 2. Crisp Synthwave RGB split bars & pixel glitch blocks
  const blockCount = Math.floor(5 + intensity * 8);
  for (let b = 0; b < blockCount; b++) {
    const bx = Math.floor(rng() * W);
    const by = Math.floor(rng() * H);
    const bw = Math.floor(40 + rng() * 240 * intensity);
    const bh = Math.floor(6 + rng() * 22);
    ctx.globalAlpha = 0.55 * clamp(intensity, 0, 1);
    ctx.fillStyle = b % 3 === 0 ? "#22D3EE" : (b % 3 === 1 ? "#EC4899" : active.accent);
    ctx.fillRect(bx, by, bw, bh);
  }

  // 3. Retro VHS scanline sweep across frame during transition
  ctx.globalAlpha = 0.24 * clamp(intensity, 0, 1);
  ctx.fillStyle = "#000000";
  for (let y = 0; y < H; y += 6) {
    ctx.fillRect(0, y, W, 2);
  }

  // 4. White-Hot Impact Flash right at 23.84s peak!
  if (active.flash && intensity > 0.75) {
    ctx.globalAlpha = clamp((intensity - 0.75) * 1.4, 0, 0.52);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}


export function renderAtashProReel(ctx, W, H, t, isPortrait) {
  renderAtashPro(ctx, W, H, t, isPortrait, false);
  applySynthwaveGlitchFX(ctx, W, H, t);
}

export function renderCyberProReel(ctx, W, H, t, isPortrait) {
  renderAtashPro(ctx, W, H, t, isPortrait, true);
  applySynthwaveGlitchFX(ctx, W, H, t);
}

export { renderAtashPro, applySynthwaveGlitchFX };
export default renderAtashProReel;
