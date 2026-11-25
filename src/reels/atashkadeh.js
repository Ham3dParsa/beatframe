import {
  FONT_FA, FONT_KUFI, FONT_MONO, RECALL_BUTTONS,
  mulberry32, clamp, lerp, norm,
  easeOutCubic, easeOutQuint, easeOutBack,
  drawText, ATASH, ATASH_MAP, CURSOR_ROWS, SPRITES,
  buildPixelSprite, drawSprite, createBayerPattern, drawPixelBox, drawBit2Marker, drawPersianCornerSteps,
} from "../core/registry.js";

const ATASH_SPRITES = {
  // State 0: Weak flickering spark (frame A & B)
  s0a: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110............011...",
    "...110............011...",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110......2.......011..",
    "..110.....232......011..",
    "..110....11211.....011..",
    "..110...1111111....011..",
    "..110....11111.....011..",
    "..110.....111......011..",
    "..110....11111.....011..",
    "..110...1111111....011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),
  s0b: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110............011...",
    "...110............011...",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110..............011..",
    "..110......2.......011..",
    "..110....11211.....011..",
    "..110...1111111....011..",
    "..110....11111.....011..",
    "..110.....111......011..",
    "..110....11111.....011..",
    "..110...1111111....011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),

  // State 1: 1 steady warm flame
  s1a: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110............011...",
    "...110............011...",
    "..110......2.......011..",
    "..110.....222......011..",
    "..110.....232......011..",
    "..110....22322.....011..",
    "..110....23332.....011..",
    "..110....23332.....011..",
    "..110.....232......011..",
    "..110.....222......011..",
    "..110....12221.....011..",
    "..110...1111111....011..",
    "..110....11111.....011..",
    "..110.....121......011..",
    "..110....11111.....011..",
    "..110...1111111....011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),
  s1b: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110............011...",
    "...110............011...",
    "..110.......2......011..",
    "..110......222.....011..",
    "..110.....2232.....011..",
    "..110....22332.....011..",
    "..110....23332.....011..",
    "..110....23332.....011..",
    "..110.....232......011..",
    "..110.....222......011..",
    "..110....12221.....011..",
    "..110...1111111....011..",
    "..110....11111.....011..",
    "..110.....121......011..",
    "..110....11111.....011..",
    "..110...1111111....011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),

  // State 2: Growing organic single flame swaying warmly
  s2a: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110......2.....011...",
    "...110.....22.....011...",
    "..110.....222......011..",
    "..110....22322.....011..",
    "..110....233322....011..",
    "..110...2233332....011..",
    "..110...2333332....011..",
    "..110...2233322....011..",
    "..110....22322.....011..",
    "..110....22222.....011..",
    "..110...12222221...011..",
    "..110...11111111...011..",
    "..110....111111....011..",
    "..110.....1221.....011..",
    "..110....111111....011..",
    "..110...11111111...011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),
  s2b: buildPixelSprite([
    ".........111111.........",
    ".......1112222111.......",
    "......111000000111......",
    ".....1100......0011.....",
    "....110..........011....",
    "...110.....2......011...",
    "...110.....22.....011...",
    "..110.....222......011..",
    "..110....22322.....011..",
    "..110...223332.....011..",
    "..110...2333322....011..",
    "..110...2333332....011..",
    "..110...2233322....011..",
    "..110....22322.....011..",
    "..110....22222.....011..",
    "..110...12222221...011..",
    "..110...11111111...011..",
    "..110....111111....011..",
    "..110.....1221.....011..",
    "..110....111111....011..",
    "..110...11111111...011..",
    ".1111111111111111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),

  // State 3: Natural roaring campfire blaze with dancing tip & floating sparks
  s3a: buildPixelSprite([
    ".........111111.........",
    ".......1112332111.......",
    "......111000000111......",
    ".....1100...2..0011.....",
    "....110..3..22...011....",
    "...110.....222....011...",
    "...110....22322.3.011...",
    "..110....223332....011..",
    "..110...22333322...011..",
    "..110..223333332...011..",
    "..110..2333333322..011..",
    "..110..2333333332..011..",
    "..110..2233333322..011..",
    "..110...22333322...011..",
    "..110....222222....011..",
    "..110...12233221...011..",
    "..110..1111111111..011..",
    "..110...11122111...011..",
    "..110.....1221.....011..",
    "..110....111111....011..",
    "..110...11111111...011..",
    ".1111111112222111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),
  s3b: buildPixelSprite([
    ".........111111.........",
    ".......1112332111.......",
    "......111000000111......",
    ".....1100..2...0011.....",
    "....110...22..3..011....",
    "...110....222.....011...",
    "...110.3.22322....011...",
    "..110....233322....011..",
    "..110...22333322...011..",
    "..110...233333322..011..",
    "..110..2233333332..011..",
    "..110..2333333332..011..",
    "..110..2233333322..011..",
    "..110...22333322...011..",
    "..110....222222....011..",
    "..110...12233221...011..",
    "..110..1111111111..011..",
    "..110...11122111...011..",
    "..110.....1221.....011..",
    "..110....111111....011..",
    "..110...11111111...011..",
    ".1111111112222111111111.",
    "111111111111111111111111",
    "000000000000000000000000",
  ], ATASH_MAP),
};


// =========================================================================
// REEL 02: ATASHKADEH 2-BIT (Persian Fire Temple 4-Color Pixel Streak Reel)
// =========================================================================
function drawRisingPixelEmbers(ctx, cx, baseY, spreadW, riseH, t, count, pixelSz) {
  const rng = mulberry32(9917);
  for (let i = 0; i < count; i++) {
    const phase = rng();
    const speed = 0.42 + rng() * 0.35;
    const prog = (t * speed + phase) % 1;
    const driftX = (rng() - 0.5) * spreadW + Math.sin(t * 4 + i * 1.7) * 10;
    const ex = Math.round((cx + driftX) / pixelSz) * pixelSz;
    const ey = Math.round((baseY - prog * riseH) / pixelSz) * pixelSz;
    if (prog < 0.85) {
      ctx.fillStyle = prog < 0.35 ? ATASH.PARCH : ATASH.EMBER;
      ctx.fillRect(ex, ey, pixelSz, pixelSz);
    }
  }
}


function renderAtashkadeh(ctx, W, H, t, isPortrait) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const ditherNightBrick = createBayerPattern(ctx, ATASH.INK, ATASH.BRICK, 6);
  const ditherBrickEmber = createBayerPattern(ctx, ATASH.BRICK, ATASH.EMBER, 6);
  const flick = Math.floor(t * 6) % 2 === 0;

  // Deep Persian night ink canvas
  ctx.fillStyle = ATASH.INK;
  ctx.fillRect(0, 0, W, H);

  // Subtle architectural pixel grid
  ctx.fillStyle = "rgba(254, 243, 199, 0.032)";
  const gridStep = 16;
  for (let x = 0; x < W; x += gridStep) ctx.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += gridStep) ctx.fillRect(0, y, W, 2);

  // Clean outer brick border
  const pad = isPortrait ? 44 : 36;
  const bw = 8;
  ctx.fillStyle = ATASH.BRICK;
  ctx.fillRect(pad, pad, W - pad * 2, bw);
  ctx.fillRect(pad, H - pad - bw, W - pad * 2, bw);
  ctx.fillRect(pad, pad, bw, H - pad * 2);
  ctx.fillRect(W - pad - bw, pad, bw, H - pad * 2);

  // -----------------------------------------------------------------------
  // ACT 1: 0.0–4.2s HOOK — DIM EMBER & PERSIAN ARCH WARNING
  // -----------------------------------------------------------------------
  if (t < 4.013) {
    const enter = easeOutBack(norm(t, 0.0, 0.45), 1.4);
    const pulse = Math.floor(t * 4) % 2 === 0;

    // Top & bottom subtle brick dither ribbons
    const ribH = isPortrait ? 86 : 64;
    ctx.fillStyle = ditherNightBrick;
    ctx.fillRect(pad + bw, pad + bw, W - (pad + bw) * 2, ribH);
    ctx.fillRect(pad + bw, H - pad - bw - ribH, W - (pad + bw) * 2, ribH);

    // Status pill: استریک در خطر...
    const warnW = isPortrait ? 480 : 440;
    const warnH = isPortrait ? 74 : 62;
    const warnX = (W - warnW) * 0.5;
    const warnY = pad + ribH + (isPortrait ? 52 : 28);
    drawPixelBox(
      ctx,
      warnX,
      warnY,
      warnW,
      warnH,
      pulse ? ATASH.BRICK : ATASH.INK,
      ATASH.EMBER,
      null,
      6
    );
    drawText(ctx, "پیوستگی شما در خطره...", W * 0.5, warnY + warnH * 0.5, {
      dir: "rtl",
      font: `900 ${isPortrait ? 36 : 30}px ${FONT_KUFI}`,
      fill: pulse ? ATASH.PARCH : ATASH.EMBER,
    });

    // Iconic Pixel Persian Arched Fire Altar — State 0 (weak flickering spark)
    const altarScale = isPortrait ? 17 : 13;
    const altarPx = 24 * altarScale;
    const altarX = (W - altarPx) * 0.5;
    const altarY = isPortrait ? H * 0.255 : H * 0.22;

    ctx.save();
    ctx.translate(W * 0.5, altarY + altarPx * 0.5);
    ctx.scale(0.9 + 0.1 * enter, 0.9 + 0.1 * enter);
    ctx.translate(-W * 0.5, -(altarY + altarPx * 0.5));
    drawSprite(ctx, flick ? ATASH_SPRITES.s0a : ATASH_SPRITES.s0b, altarX, altarY, altarScale);
    ctx.restore();

    // Clean parchment/brick headline panel below the arch
    const boxW = isPortrait ? W - 120 : W * 0.68;
    const boxH = isPortrait ? 340 : 250;
    const boxX = (W - boxW) * 0.5;
    const boxY = isPortrait ? altarY + altarPx + 62 : altarY + altarPx + 24;

    drawPixelBox(ctx, boxX, boxY, boxW, boxH, ATASH.INK, ATASH.BRICK, ATASH.BRICK, 8);
    drawPersianCornerSteps(ctx, boxX + 16, boxY + 16, boxW - 32, boxH - 32, ATASH.EMBER, 8);

    drawText(ctx, "یادت میره سر وقت مطالعه کنی؟", W * 0.5, boxY + (isPortrait ? 124 : 92), {
      dir: "rtl",
      font: `900 ${isPortrait ? 52 : 46}px ${FONT_KUFI}`,
      fill: ATASH.PARCH,
      maxWidth: boxW - 80,
    });

    // Subtle saffron pixel rule
    ctx.fillStyle = ATASH.EMBER;
    ctx.fillRect(W * 0.5 - 140, boxY + (isPortrait ? 186 : 136), 280, 6);

    drawText(ctx, "آتشکده‌ات تو همزبان منتظرته!", W * 0.5, boxY + (isPortrait ? 254 : 186), {
      dir: "rtl",
      font: `900 ${isPortrait ? 48 : 42}px ${FONT_KUFI}`,
      fill: ATASH.EMBER,
      maxWidth: boxW - 80,
    });
  }

  // -----------------------------------------------------------------------
  // ACT 2 (4.2–8.2s FRONT) & ACT 3 (8.2–15.0s BACK + 3-FLAME IGNITION!)
  // -----------------------------------------------------------------------
  else if (t < 16.054) {
    const localT = t - 4.013; // 119.60 BPM Crown_of_the_Plateau bar-locked
    const isBack = localT >= 4.013; // Act 2: 4.013-8.027s | Act 3: 8.027-16.054s
    const isRevealTap = localT >= 3.30 && localT < 3.96;
    const isGoodPressed = localT >= 8.027 && localT <= 8.85; // t = 12.04s (Bar 7)
    const flameStage = !isBack ? 1 : (localT < 8.027 ? 1 : (localT < 8.65 ? 2 : 3));
    const cardUpdated = localT >= 8.12;
    const sessionFooter = cardUpdated ? "نشست ۱ | کارت ۵ از ۸" : "نشست ۱ | کارت ۴ از ۸";

    // Top Session Bar
    const topSlide = easeOutQuint(norm(localT, 0.05, 0.55));
    const barW = W - (pad + 32) * 2;
    const barH = isPortrait ? 94 : 74;
    const barX = pad + 32;
    const barY = lerp(pad - 100, pad + 26, topSlide);

    drawPixelBox(ctx, barX, barY, barW, barH, ATASH.BRICK, ATASH.EMBER, ATASH.INK, 6);
    drawText(ctx, "همزبان", barX + barW - 28, barY + barH * 0.5, {
      dir: "rtl",
      align: "right",
      font: `900 ${isPortrait ? 38 : 32}px ${FONT_KUFI}`,
      fill: ATASH.PARCH,
    });
    drawText(ctx, "امروز ۴ نشست داری | ۱۳ مرور و ۷ جدید", barX + 28, barY + barH * 0.5, {
      dir: "rtl",
      align: "left",
      font: `800 ${isPortrait ? 27 : 24}px ${FONT_FA}`,
      fill: ATASH.PARCH,
      maxWidth: barW - 190,
    });

    // Main Card Coordinates (clean symmetric layout matching Reel 01)
    const cardW = isPortrait ? W - 120 : W * 0.54;
    const cardH = isPortrait ? 580 : 500;
    const cardX = isPortrait ? (W - cardW) * 0.5 : pad + 40;
    const cardY = isPortrait ? barY + barH + 36 : barY + barH + 28;

    const flipScaleX = isBack
      ? easeOutBack(norm(localT, 4.013, 4.36), 1.2)
      : (localT > 3.88 ? Math.max(0.12, 1 - norm(localT, 3.88, 4.013)) : easeOutBack(norm(localT, 0.25, 0.72), 1.3));

    ctx.save();
    ctx.translate(cardX + cardW * 0.5, cardY + cardH * 0.5);
    ctx.scale(clamp(flipScaleX, 0.08, 1.05), 1);
    ctx.translate(-(cardX + cardW * 0.5), -(cardY + cardH * 0.5));

    drawPixelBox(ctx, cardX, cardY, cardW, cardH, ATASH.PARCH, ATASH.EMBER, ATASH.BRICK, 10);

    // Card header band (Terracotta Brick)
    const bandH = isPortrait ? 68 : 56;
    ctx.fillStyle = ATASH.BRICK;
    ctx.fillRect(cardX + 10, cardY + 10, cardW - 20, bandH);
    ctx.fillStyle = ATASH.INK;
    ctx.fillRect(cardX + 10, cardY + 10 + bandH, cardW - 20, 6);

    drawText(ctx, isBack ? "آتشکده ات رو با فعالیت روزانه برافروخته نگه دار" : "کلمه های متناسب با هدف و سطح خودت", cardX + cardW - 28, cardY + 10 + bandH * 0.5, {
      dir: "rtl",
      align: "right",
      font: `800 ${isPortrait ? 24 : 21}px ${FONT_FA}`,
      fill: ATASH.PARCH,
      maxWidth: cardW - 140,
    });

    drawPixelBox(ctx, cardX + 24, cardY + (isPortrait ? 19 : 15), 74, isPortrait ? 48 : 42, ATASH.INK, ATASH.EMBER, null, 4);
    drawText(ctx, "B2", cardX + 61, cardY + (isPortrait ? 43 : 36), {
      dir: "ltr",
      font: `900 ${isPortrait ? 28 : 24}px ${FONT_MONO}`,
      fill: ATASH.EMBER,
    });

    if (!isBack) {
      // ACT 2: FRONT CARD
      drawText(ctx, "???", cardX + cardW * 0.5, cardY + (isPortrait ? 190 : 160), {
        dir: "ltr",
        font: `900 ${isPortrait ? 104 : 86}px ${FONT_MONO}`,
        fill: ATASH.INK,
      });

      drawText(ctx, "چه واژه ای یعنی «عمل گرا و واقع بین»؟", cardX + cardW * 0.5, cardY + (isPortrait ? 310 : 254), {
        dir: "rtl",
        font: `900 ${isPortrait ? 40 : 35}px ${FONT_KUFI}`,
        fill: ATASH.BRICK,
        maxWidth: cardW - 72,
      });

      const hintY = cardY + (isPortrait ? 396 : 326);
      drawPixelBox(ctx, cardX + cardW * 0.5 - 250, hintY - 30, 500, 60, ATASH.PARCH, ATASH.BRICK, null, 5);
      drawText(ctx, "SYN: Practical  |  ANT: Idealistic", cardX + cardW * 0.5, hintY, {
        dir: "ltr",
        font: `800 ${isPortrait ? 23 : 21}px ${FONT_MONO}`,
        fill: ATASH.INK,
      });

      drawText(ctx, sessionFooter, cardX + cardW - 34, cardY + cardH - 40, {
        dir: "rtl",
        align: "right",
        font: `800 ${isPortrait ? 26 : 23}px ${FONT_FA}`,
        fill: ATASH.BRICK,
      });
    } else {
      // ACT 3: BACK CARD
      drawText(ctx, "Pragmatic", cardX + cardW * 0.5, cardY + (isPortrait ? 172 : 142), {
        dir: "ltr",
        font: `900 ${isPortrait ? 86 : 74}px ${FONT_MONO}`,
        fill: ATASH.INK,
      });

      drawText(ctx, "/præɡˈmætɪk/", cardX + cardW * 0.5, cardY + (isPortrait ? 234 : 194), {
        dir: "ltr",
        font: `700 ${isPortrait ? 32 : 27}px ${FONT_MONO}`,
        fill: ATASH.BRICK,
      });

      ctx.fillStyle = ATASH.EMBER;
      ctx.fillRect(cardX + cardW * 0.2, cardY + (isPortrait ? 274 : 226), cardW * 0.6, 6);

      drawText(ctx, "عمل گرا، واقع بین", cardX + cardW * 0.5, cardY + (isPortrait ? 344 : 284), {
        dir: "rtl",
        font: `900 ${isPortrait ? 52 : 44}px ${FONT_KUFI}`,
        fill: ATASH.INK,
        maxWidth: cardW - 64,
      });

      const synY = cardY + (isPortrait ? 426 : 352);
      drawPixelBox(ctx, cardX + 44, synY - 30, cardW - 88, 60, ATASH.PARCH, ATASH.BRICK, null, 5);
      drawText(ctx, "SYN: Practical, Realistic  |  ANT: Idealistic", cardX + cardW * 0.5, synY, {
        dir: "ltr",
        font: `800 ${isPortrait ? 22 : 20}px ${FONT_MONO}`,
        fill: ATASH.BRICK,
        maxWidth: cardW - 110,
      });

      drawText(ctx, sessionFooter, cardX + cardW - 34, cardY + cardH - 40, {
        dir: "rtl",
        align: "right",
        font: `800 ${isPortrait ? 27 : 24}px ${FONT_FA}`,
        fill: cardUpdated ? ATASH.INK : ATASH.BRICK,
      });
    }

    ctx.restore();

    // CONTROLS BELOW CARD
    const ctrlY = cardY + cardH + (isPortrait ? 34 : 26);
    const btnAreaH = isPortrait ? 256 : 236;
    let targetBtnCenter = { x: cardX + cardW * 0.5, y: ctrlY + 60 };

    if (!isBack) {
      const revH = isPortrait ? 114 : 96;
      const off = isRevealTap ? 6 : 0;
      const revFill = isRevealTap ? ATASH.BRICK : ATASH.EMBER;
      const revTxt = isRevealTap ? ATASH.PARCH : ATASH.INK;
      drawPixelBox(ctx, cardX + off, ctrlY + off, cardW, revH, revFill, ATASH.PARCH, isRevealTap ? null : ATASH.BRICK, 7);
      drawText(ctx, "نمایش پاسخ", cardX + off + cardW * 0.5, ctrlY + off + revH * 0.5, {
        dir: "rtl",
        font: `900 ${isPortrait ? 42 : 36}px ${FONT_KUFI}`,
        fill: revTxt,
      });

      if (localT >= 2.65 && localT < 3.98) {
        const mt = easeOutQuint(norm(localT, 2.65, 3.28));
        const cx = lerp(cardX + cardW * 0.85, cardX + cardW * 0.54, mt);
        const cy = lerp(ctrlY + revH + 75, ctrlY + revH * 0.62, mt) + (isRevealTap ? 5 : 0);
        drawSprite(ctx, SPRITES.cursorAtash, cx, cy, isPortrait ? 5 : 4);
      }
    } else {
      const gapX = isPortrait ? 20 : 18;
      const gapY = isPortrait ? 20 : 16;
      const btnW = Math.floor((cardW - gapX) / 2);
      const btnH = isPortrait ? 118 : 110;
      const btnEnter = easeOutCubic(norm(localT, 4.06, 4.46));

      for (let i = 0; i < 4; i++) {
        const btn = RECALL_BUTTONS[i];
        const row = Math.floor(i / 2);
        const colRTL = i % 2;
        const bx = colRTL === 0 ? (cardX + btnW + gapX) : cardX;
        const by = ctrlY + row * (btnH + gapY) + (1 - btnEnter) * 32;
        const isGood = btn.id === "good";
        const pressed = isGood && isGoodPressed;
        const offset = pressed ? 6 : 0;

        if (isGood) {
          targetBtnCenter = { x: bx + btnW * 0.5, y: by + btnH * 0.5 };
        }

        const fill = pressed ? ATASH.INK : (isGood ? ATASH.EMBER : ATASH.PARCH);
        const txtFill = pressed ? ATASH.PARCH : ATASH.INK;
        const borderCol = pressed ? ATASH.EMBER : ATASH.BRICK;
        const shadow = pressed ? null : ATASH.BRICK;

        drawPixelBox(ctx, bx + offset, by + offset, btnW, btnH, fill, borderCol, shadow, 6);

        const markX = bx + offset + btnW - 34;
        const markY = by + offset + btnH * 0.5;
        drawBit2Marker(ctx, markX, markY, btn.id, pressed, ATASH);

        drawText(ctx, btn.label, bx + offset + btnW - 60, markY, {
          dir: "rtl",
          align: "right",
          font: `900 ${isPortrait ? 31 : 28}px ${FONT_KUFI}`,
          fill: txtFill,
          maxWidth: btnW - 80,
        });
      }
    }

    // ---------------------------------------------------------------------
    // ATASHKADEH STREAK ARENA (1 Flame -> 2 Flames -> 3 Flames سه آتیشه!)
    // ---------------------------------------------------------------------
    const arW = isPortrait ? cardW : (W - (cardX + cardW) - pad - 76);
    const arH = isPortrait ? 610 : (cardH + 26 + btnAreaH);
    const arX = isPortrait ? cardX : (cardX + cardW + 32);
    const arY = isPortrait ? (ctrlY + btnAreaH + 36) : cardY;

    drawPixelBox(ctx, arX, arY, arW, arH, ATASH.INK, ATASH.EMBER, ATASH.BRICK, 8);
    ctx.fillStyle = ditherNightBrick;
    ctx.fillRect(arX + 8, arY + arH - (isPortrait ? 116 : 112), arW - 16, isPortrait ? 108 : 104);
    ctx.fillStyle = ATASH.EMBER;
    ctx.fillRect(arX + 8, arY + arH - (isPortrait ? 116 : 112), arW - 16, 6);

    // Top Arena Title
    const stageLabel = flameStage === 1
      ? "آتشکده شما روشن شد"
      : (flameStage === 2 ? "بوووووم!!" : "حسابی آتیش به پا می‌کنی!");
    drawText(ctx, stageLabel, arX + arW * 0.5, arY + 46, {
      dir: "rtl",
      font: `900 ${isPortrait ? 30 : 25}px ${FONT_KUFI}`,
      fill: flameStage === 3 ? ATASH.EMBER : ATASH.PARCH,
    });

    // Pixel Altar Sprite (State 1 -> State 2 -> State 3)
    const altarSprite = flameStage === 1
      ? (flick ? ATASH_SPRITES.s1a : ATASH_SPRITES.s1b)
      : (flameStage === 2
        ? (flick ? ATASH_SPRITES.s2a : ATASH_SPRITES.s2b)
        : (flick ? ATASH_SPRITES.s3a : ATASH_SPRITES.s3b));

    const ignitePop = flameStage === 3
      ? easeOutBack(norm(localT, 8.65, 9.05), 1.5)
      : (flameStage === 2 ? easeOutBack(norm(localT, 8.027, 8.42), 1.3) : 1);
    const arScale = isPortrait ? 14 : 13;
    const altarPx = 24 * arScale;
    const altarX = arX + (arW - altarPx) * 0.5;
    const altarY = arY + (isPortrait ? 104 : 148);

    ctx.save();
    ctx.translate(arX + arW * 0.5, altarY + altarPx * 0.5);
    ctx.scale(0.92 + 0.08 * ignitePop, 0.92 + 0.08 * ignitePop);
    ctx.translate(-(arX + arW * 0.5), -(altarY + altarPx * 0.5));
    drawSprite(ctx, altarSprite, altarX, altarY, arScale);
    ctx.restore();

    // Rising pixel embers when 3 flames ignite
    if (flameStage === 3) {
      drawRisingPixelEmbers(ctx, arX + arW * 0.5, altarY + 86, altarPx * 0.56, 84, localT, 12, 8);
    }

    // Bottom badge strip: 3 flame pips + bold "سه آتیشه!" badge on stage 3
    const footY = arY + arH - (isPortrait ? 58 : 56);
    if (flameStage === 3) {
      const badgePop = easeOutBack(norm(localT, 8.65, 9.10), 1.6);
      const bw3 = isPortrait ? 360 : 320;
      const bh3 = isPortrait ? 68 : 62;
      ctx.save();
      ctx.translate(arX + arW * 0.5, footY);
      ctx.scale(0.84 + 0.16 * badgePop, 0.84 + 0.16 * badgePop);
      drawPixelBox(ctx, -bw3 * 0.5, -bh3 * 0.5, bw3, bh3, ATASH.EMBER, ATASH.PARCH, ATASH.INK, 5);
      drawText(ctx, "چه آتیشی!", 0, 1, {
        dir: "rtl",
        font: `900 ${isPortrait ? 38 : 34}px ${FONT_KUFI}`,
        fill: ATASH.INK,
      });
      ctx.restore();
    } else {
      // 3 crisp pixel flame slots (1 or 2 lit)
      const slotW = 76;
      const slotGap = 24;
      const totalSlotsW = 3 * slotW + 2 * slotGap;
      const sx0 = arX + (arW - totalSlotsW) * 0.5;
      for (let f = 0; f < 3; f++) {
        const lit = f < flameStage;
        drawPixelBox(
          ctx,
          sx0 + f * (slotW + slotGap),
          footY - 22,
          slotW,
          44,
          lit ? ATASH.EMBER : ATASH.INK,
          lit ? ATASH.PARCH : ATASH.BRICK,
          null,
          4
        );
      }
    }

    // Pixel cursor tapping خوب بود (t = 10.15–12.40s)
    if (localT >= 7.35 && localT <= 9.65) {
      const moveT = easeOutQuint(norm(localT, 7.35, 7.98));
      const startX = cardX + cardW * 0.85;
      const startY = ctrlY + btnAreaH + 60;
      const cx = lerp(startX, targetBtnCenter.x + 28, moveT);
      const cy = lerp(startY, targetBtnCenter.y + 12, moveT) + (isGoodPressed ? 5 : 0);
      drawSprite(ctx, SPRITES.cursorAtash, cx, cy, isPortrait ? 5 : 4);
    }

    // Hard Pixel Staircase Wipe Transition (localT = 0.0–0.45s)
    if (localT < 0.45) {
      const wp = norm(localT, 0.0, 0.45);
      const cols = 12;
      const colW = Math.ceil(W / cols);
      ctx.fillStyle = ATASH.BRICK;
      for (let c = 0; c < cols; c++) {
        const colProg = clamp((wp * 1.4) - (c / cols) * 0.4);
        const coverH = Math.round((1 - colProg) * H);
        if (coverH > 0) ctx.fillRect(c * colW, 0, colW + 1, coverH);
      }
    }
  }

  // -----------------------------------------------------------------------
  // ACT 4: 15.0–20.0s LOCKUP — 3-FLAME PIXEL ATASHKADEH EMBLEM
  // -----------------------------------------------------------------------
  else {
    const localT = t - 16.054;
    const pop = easeOutBack(norm(localT, 0.08, 0.65), 1.5);

    ctx.fillStyle = ATASH.INK;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = ditherNightBrick;
    const ribH = isPortrait ? 120 : 84;
    ctx.fillRect(0, 0, W, ribH);
    ctx.fillRect(0, H - ribH, W, ribH);

    const pw = isPortrait ? W - 112 : W * 0.72;
    const ph = isPortrait ? 1120 : 760;
    const px = (W - pw) * 0.5;
    const py = (H - ph) * 0.5;

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(0.88 + 0.12 * pop, 0.88 + 0.12 * pop);
    ctx.translate(-W * 0.5, -H * 0.5);

    drawPixelBox(ctx, px, py, pw, ph, ATASH.INK, ATASH.EMBER, ATASH.BRICK, 10);
    drawPersianCornerSteps(ctx, px + 22, py + 22, pw - 44, ph - 44, ATASH.BRICK, 10);

    // Bold 3-Flame Pixel Atashkadeh Emblem
    const embScale = isPortrait ? 14 : 10;
    const embPx = 24 * embScale;
    const embX = W * 0.5 - embPx * 0.5;
    const embY = py + (isPortrait ? 64 : 36);
    drawSprite(ctx, flick ? ATASH_SPRITES.s3a : ATASH_SPRITES.s3b, embX, embY, embScale);
    drawRisingPixelEmbers(ctx, W * 0.5, embY + 64, embPx * 0.55, 68, localT, 10, 8);

    // Brand Wordmark
    drawText(ctx, "همزبان", W * 0.5, embY + embPx + (isPortrait ? 92 : 66), {
      dir: "rtl",
      font: `900 ${isPortrait ? 126 : 98}px ${FONT_KUFI}`,
      fill: ATASH.PARCH,
    });

    // Saffron pixel divider
    ctx.fillStyle = ATASH.EMBER;
    ctx.fillRect(W * 0.5 - 180, embY + embPx + (isPortrait ? 176 : 126), 360, 8);

    drawText(ctx, "آتشکده‌ات رو هر روز روشن نگه دار :)", W * 0.5, embY + embPx + (isPortrait ? 250 : 182), {
      dir: "rtl",
      font: `900 ${isPortrait ? 46 : 38}px ${FONT_FA}`,
      fill: ATASH.EMBER,
      maxWidth: pw - 72,
    });

    drawText(ctx, "با سرعت دلخواه خودت یاد بگیر", W * 0.5, embY + embPx + (isPortrait ? 326 : 238), {
      dir: "rtl",
      font: `800 ${isPortrait ? 36 : 30}px ${FONT_FA}`,
      fill: ATASH.PARCH,
      maxWidth: pw - 72,
    });

    // Handle Pill (strictly LTR)
    const pillW = isPortrait ? 560 : 480;
    const pillH = isPortrait ? 112 : 88;
    const pillX = W * 0.5 - pillW * 0.5;
    const pillY = py + ph - (isPortrait ? 174 : 128);
    drawPixelBox(ctx, pillX, pillY, pillW, pillH, ATASH.EMBER, ATASH.PARCH, ATASH.BRICK, 6);
    drawText(ctx, "@HamZabanRobot", W * 0.5, pillY + pillH * 0.5, {
      dir: "ltr",
      font: `900 ${isPortrait ? 48 : 40}px ${FONT_MONO}`,
      fill: ATASH.INK,
    });

    ctx.restore();

    // Corner ember pulses
    ctx.fillStyle = flick ? ATASH.EMBER : ATASH.PARCH;
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


export { renderAtashkadeh, drawRisingPixelEmbers };
export default renderAtashkadeh;
