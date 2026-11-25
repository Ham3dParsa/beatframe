import {
  FONT_FA, FONT_KUFI, FONT_MONO, RECALL_BUTTONS,
  mulberry32, clamp, lerp, norm,
  easeOutCubic, easeOutQuint, easeInCubic, easeOutBack,
  drawText, BIT2, SPRITES, drawSprite, createBayerPattern, drawPixelBox, drawBit2Marker,
} from "../core/registry.js";

// =========================================================================
// REEL 01: 2-BIT RETRO PIXEL ARCADE (4 x 5.0s Equal Acts)
// =========================================================================
function renderBit2(ctx, W, H, t, isPortrait) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const ditherLightMid = createBayerPattern(ctx, BIT2.LIGHT, BIT2.LIME, 6);
  const ditherDarkMid = createBayerPattern(ctx, BIT2.INK, BIT2.MID, 6);

  // Base crisp screen light
  ctx.fillStyle = BIT2.LIGHT;
  ctx.fillRect(0, 0, W, H);

  // Subtle 2-bit LCD pixel grid lines
  ctx.fillStyle = "rgba(13, 25, 18, 0.045)";
  const gridStep = 12;
  for (let x = 0; x < W; x += gridStep) ctx.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += gridStep) ctx.fillRect(0, y, W, 2);

  // Outer arcade bezel border
  const pad = isPortrait ? 44 : 36;
  const bw = 8;
  ctx.fillStyle = BIT2.INK;
  ctx.fillRect(pad, pad, W - pad * 2, bw);
  ctx.fillRect(pad, H - pad - bw, W - pad * 2, bw);
  ctx.fillRect(pad, pad, bw, H - pad * 2);
  ctx.fillRect(W - pad - bw, pad, bw, H - pad * 2);

  // -----------------------------------------------------------------------
  // ACT 1: 0.0–4.2s HOOK — ARCADE ALERT SLAM
  // -----------------------------------------------------------------------
  if (t < 5.657) {
    const slam = easeOutBack(norm(t, 0.0, 0.42), 1.6);
    const shakeAmp = t < 0.55 ? (1 - t / 0.55) * 18 : (t > 1.4 && t < 1.85 ? 8 : 0);
    const rng = mulberry32(Math.floor(t * 60) + 101);
    const sx = Math.round((rng() - 0.5) * 2 * shakeAmp);
    const sy = Math.round((rng() - 0.5) * 2 * shakeAmp);

    const flashOn = Math.floor(t * 7) % 2 === 0;
    ctx.save();
    ctx.translate(sx, sy);

    const stripH = isPortrait ? 92 : 70;
    ctx.fillStyle = flashOn ? ditherDarkMid : ditherLightMid;
    ctx.fillRect(pad + bw, pad + bw, W - (pad + bw) * 2, stripH);
    ctx.fillRect(pad + bw, H - pad - bw - stripH, W - (pad + bw) * 2, stripH);

    drawPixelBox(ctx, pad + 36, pad + stripH + 24, W - (pad + 36) * 2, 68, BIT2.INK, BIT2.INK, null, 4);
    drawText(ctx, "ALERT // BACKLOG", W * 0.5, pad + stripH + 58, {
      dir: "ltr",
      font: `900 ${isPortrait ? 34 : 30}px ${FONT_MONO}`,
      fill: flashOn ? BIT2.LIGHT : BIT2.LIME,
    });

    const iconScale = isPortrait ? 9 : 7;
    const iconSize = 16 * iconScale;
    const iconY = isPortrait ? H * 0.245 : H * 0.24;
    drawSprite(ctx, SPRITES.alert, W * 0.5 - iconSize * 0.5, iconY - iconSize * 0.5, iconScale);

    const boxW = isPortrait ? W - 120 : W * 0.72;
    const boxH = isPortrait ? 430 : 320;
    const boxX = (W - boxW) * 0.5;
    const boxY = isPortrait ? H * 0.35 : H * 0.35;

    ctx.save();
    ctx.translate(W * 0.5, boxY + boxH * 0.5);
    ctx.scale(0.82 + 0.18 * slam, 0.82 + 0.18 * slam);
    ctx.translate(-W * 0.5, -(boxY + boxH * 0.5));

    drawPixelBox(ctx, boxX, boxY, boxW, boxH, flashOn ? BIT2.LIGHT : BIT2.LIME, BIT2.INK, BIT2.MID, 10);

    drawText(ctx, "دو سه روز نبودی؟", W * 0.5, boxY + (isPortrait ? 86 : 64), {
      dir: "rtl",
      font: `900 ${isPortrait ? 52 : 44}px ${FONT_KUFI}`,
      fill: BIT2.MID,
    });

    drawText(ctx, "۱۶۴ کارت روی هم جمع شده!", W * 0.5, boxY + (isPortrait ? 168 : 126), {
      dir: "rtl",
      font: `900 ${isPortrait ? 50 : 48}px ${FONT_KUFI}`,
      fill: BIT2.INK,
      maxWidth: boxW - 64,
    });

    const hpW = boxW - 96;
    const hpH = isPortrait ? 60 : 52;
    const hpX = boxX + 48;
    const hpY = boxY + (isPortrait ? 244 : 182);
    drawPixelBox(ctx, hpX, hpY, hpW, hpH, BIT2.LIGHT, BIT2.INK, null, 6);

    const fillRatio = clamp(0.35 + norm(t, 0.2, 2.2) * 0.65);
    const segCount = 16;
    const innerW = hpW - 24;
    const segW = Math.floor(innerW / segCount) - 4;
    const filledSegs = Math.round(fillRatio * segCount);
    for (let i = 0; i < filledSegs; i++) {
      ctx.fillStyle = i >= 12 && flashOn ? BIT2.INK : (i >= 10 ? BIT2.MID : BIT2.LIME);
      ctx.fillRect(hpX + 12 + i * (segW + 4), hpY + 12, segW, hpH - 24);
    }

    drawText(ctx, "کارت هات تلمبار میشن؟", W * 0.5, hpY + hpH + 48, {
      dir: "rtl",
      font: `800 ${isPortrait ? 32 : 28}px ${FONT_FA}`,
      fill: BIT2.INK,
    });

    ctx.restore();

    // Falling pixel backlog blocks piling at bottom
    const blockCount = 14;
    const pileBaseY = H - pad - bw - stripH - 20;
    for (let i = 0; i < blockCount; i++) {
      const dropT = norm(t, 0.30 + i * 0.14, 0.82 + i * 0.14);
      const col = i % 7;
      const row = Math.floor(i / 7);
      const bwCard = isPortrait ? 114 : 180;
      const bhCard = isPortrait ? 50 : 38;
      const gap = 14;
      const totalW = 7 * bwCard + 6 * gap;
      const bx = (W - totalW) * 0.5 + col * (bwCard + gap);
      const targetY = pileBaseY - (row + 1) * (bhCard + 10);
      const by = lerp(boxY + boxH + 40, targetY, easeInCubic(dropT));
      if (dropT > 0.01) {
        drawPixelBox(ctx, bx, by, bwCard, bhCard, row === 0 ? BIT2.MID : BIT2.LIME, BIT2.INK, null, 5);
      }
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // ACT 2 (4.2–8.2s FRONT) & ACT 3 (8.2–15.0s BACK + 2x2 RECALL + SPROUT)
  // -----------------------------------------------------------------------
  else if (t < 14.143) {
    const localT = t - 5.657; // 84.85 BPM Midnight_Window true downbeat lock
    const isBack = localT >= 2.829; // Act 2: 5.657-8.486s | Act 3: 8.486-14.143s
    const isRevealTap = localT >= 2.15 && localT < 2.80;
    const isGoodPressed = localT >= 4.95 && localT <= 5.75; // t = 10.61s -> smooth, zero dead pause
    const cardUpdated = localT >= 5.05;
    const sessionFooter = cardUpdated ? "نشست ۱ | کارت ۵ از ۸" : "نشست ۱ | کارت ۴ از ۸";

    // Top Session Bar
    const topSlide = easeOutQuint(norm(localT, 0.05, 0.55));
    const barW = W - (pad + 32) * 2;
    const barH = isPortrait ? 96 : 74;
    const barX = pad + 32;
    const barY = lerp(pad - 100, pad + 26, topSlide);

    drawPixelBox(ctx, barX, barY, barW, barH, BIT2.INK, BIT2.INK, BIT2.MID, 6);
    drawText(ctx, "همزبان", barX + barW - 30, barY + barH * 0.5, {
      dir: "rtl",
      align: "right",
      font: `900 ${isPortrait ? 38 : 32}px ${FONT_KUFI}`,
      fill: BIT2.LIME,
    });
    drawText(ctx, "امروز ۱۳ مرور و ۷ کارت جدید", barX + 30, barY + barH * 0.5, {
      dir: "rtl",
      align: "left",
      font: `800 ${isPortrait ? 30 : 26}px ${FONT_FA}`,
      fill: BIT2.LIGHT,
    });

    const cardW = isPortrait ? W - 120 : W * 0.54;
    const cardH = isPortrait ? 600 : 510;
    const cardX = isPortrait ? (W - cardW) * 0.5 : pad + 40;
    const cardY = isPortrait ? barY + barH + 38 : barY + barH + 28;

    // Flip transition right across the 8.2s Act 2 -> Act 3 boundary
    const flipScaleX = isBack
      ? easeOutBack(norm(localT, 2.829, 3.18), 1.2)
      : (localT > 2.70 ? Math.max(0.12, 1 - norm(localT, 2.70, 2.829)) : easeOutBack(norm(localT, 0.25, 0.72), 1.3));

    ctx.save();
    ctx.translate(cardX + cardW * 0.5, cardY + cardH * 0.5);
    ctx.scale(clamp(flipScaleX, 0.08, 1.05), 1);
    ctx.translate(-(cardX + cardW * 0.5), -(cardY + cardH * 0.5));

    drawPixelBox(ctx, cardX, cardY, cardW, cardH, BIT2.LIGHT, BIT2.INK, BIT2.MID, 10);

    const bandH = isPortrait ? 70 : 58;
    ctx.fillStyle = BIT2.LIME;
    ctx.fillRect(cardX + 10, cardY + 10, cardW - 20, bandH);
    ctx.fillStyle = BIT2.INK;
    ctx.fillRect(cardX + 10, cardY + 10 + bandH, cardW - 20, 6);

    drawText(ctx, isBack ? "با سرعت دلخواه خودت یاد بگیر" : "کلمه های متناسب با هدف و سطح خودت", cardX + cardW - 28, cardY + 10 + bandH * 0.5, {
      dir: "rtl",
      align: "right",
      font: `800 ${isPortrait ? 24 : 21}px ${FONT_FA}`,
      fill: BIT2.INK,
      maxWidth: cardW - 140,
    });

    drawPixelBox(ctx, cardX + 24, cardY + (isPortrait ? 20 : 16), 74, isPortrait ? 48 : 42, BIT2.INK, BIT2.INK, null, 4);
    drawText(ctx, "B2", cardX + 61, cardY + (isPortrait ? 44 : 37), {
      dir: "ltr",
      font: `900 ${isPortrait ? 28 : 24}px ${FONT_MONO}`,
      fill: BIT2.LIGHT,
    });

    if (!isBack) {
      // ACT 2: FRONT CARD
      drawText(ctx, "???", cardX + cardW * 0.5, cardY + (isPortrait ? 195 : 162), {
        dir: "ltr",
        font: `900 ${isPortrait ? 104 : 88}px ${FONT_MONO}`,
        fill: BIT2.INK,
      });

      drawText(ctx, "چه واژه ای یعنی «سازش کردن»؟", cardX + cardW * 0.5, cardY + (isPortrait ? 315 : 258), {
        dir: "rtl",
        font: `900 ${isPortrait ? 42 : 36}px ${FONT_KUFI}`,
        fill: BIT2.MID,
        maxWidth: cardW - 72,
      });

      const hintY = cardY + (isPortrait ? 404 : 332);
      drawPixelBox(ctx, cardX + cardW * 0.5 - 245, hintY - 30, 490, 60, BIT2.LIGHT, BIT2.MID, null, 5);
      drawText(ctx, "SYN: Negotiate  |  ANT: Dispute", cardX + cardW * 0.5, hintY, {
        dir: "ltr",
        font: `800 ${isPortrait ? 24 : 22}px ${FONT_MONO}`,
        fill: BIT2.INK,
      });

      drawText(ctx, sessionFooter, cardX + cardW - 34, cardY + cardH - 42, {
        dir: "rtl",
        align: "right",
        font: `800 ${isPortrait ? 26 : 23}px ${FONT_FA}`,
        fill: BIT2.MID,
      });
    } else {
      // ACT 3: BACK CARD
      drawText(ctx, "Compromise", cardX + cardW * 0.5, cardY + (isPortrait ? 174 : 144), {
        dir: "ltr",
        font: `900 ${isPortrait ? 84 : 72}px ${FONT_MONO}`,
        fill: BIT2.INK,
      });

      drawText(ctx, "/'kɑːmprəmaɪz/", cardX + cardW * 0.5, cardY + (isPortrait ? 236 : 196), {
        dir: "ltr",
        font: `700 ${isPortrait ? 32 : 27}px ${FONT_MONO}`,
        fill: BIT2.MID,
      });

      ctx.fillStyle = BIT2.MID;
      ctx.fillRect(cardX + cardW * 0.2, cardY + (isPortrait ? 276 : 228), cardW * 0.6, 6);

      drawText(ctx, "سازش کردن، کوتاه آمدن طرفین", cardX + cardW * 0.5, cardY + (isPortrait ? 346 : 286), {
        dir: "rtl",
        font: `900 ${isPortrait ? 46 : 40}px ${FONT_KUFI}`,
        fill: BIT2.INK,
        maxWidth: cardW - 64,
      });

      const synY = cardY + (isPortrait ? 430 : 356);
      drawPixelBox(ctx, cardX + 44, synY - 30, cardW - 88, 60, BIT2.LIGHT, BIT2.MID, null, 5);
      drawText(ctx, "SYN: Negotiate, Settle  |  ANT: Dispute", cardX + cardW * 0.5, synY, {
        dir: "ltr",
        font: `800 ${isPortrait ? 23 : 21}px ${FONT_MONO}`,
        fill: BIT2.MID,
        maxWidth: cardW - 110,
      });

      drawText(ctx, sessionFooter, cardX + cardW - 34, cardY + cardH - 42, {
        dir: "rtl",
        align: "right",
        font: `800 ${isPortrait ? 27 : 24}px ${FONT_FA}`,
        fill: cardUpdated ? BIT2.INK : BIT2.MID,
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
      const revFill = isRevealTap ? BIT2.INK : BIT2.LIME;
      const revTxt = isRevealTap ? BIT2.LIGHT : BIT2.INK;
      drawPixelBox(ctx, cardX + off, ctrlY + off, cardW, revH, revFill, BIT2.INK, isRevealTap ? null : BIT2.MID, 7);
      drawText(ctx, "نمایش پاسخ", cardX + off + cardW * 0.5, ctrlY + off + revH * 0.5, {
        dir: "rtl",
        font: `900 ${isPortrait ? 42 : 36}px ${FONT_KUFI}`,
        fill: revTxt,
      });

      if (localT >= 1.55 && localT < 2.81) {
        const mt = easeOutQuint(norm(localT, 1.55, 2.12));
        const cx = lerp(cardX + cardW * 0.85, cardX + cardW * 0.54, mt);
        const cy = lerp(ctrlY + revH + 75, ctrlY + revH * 0.62, mt) + (isRevealTap ? 5 : 0);
        drawSprite(ctx, SPRITES.cursor, cx, cy, isPortrait ? 5 : 4);
      }
    } else {
      const gapX = isPortrait ? 20 : 18;
      const gapY = isPortrait ? 20 : 16;
      const btnW = Math.floor((cardW - gapX) / 2);
      const btnH = isPortrait ? 118 : 110;
      const btnEnter = easeOutCubic(norm(localT, 2.88, 3.28));

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

        const fill = pressed ? BIT2.INK : (isGood ? BIT2.LIME : BIT2.LIGHT);
        const txtFill = pressed ? BIT2.LIGHT : BIT2.INK;
        const shadow = pressed ? null : BIT2.MID;

        drawPixelBox(ctx, bx + offset, by + offset, btnW, btnH, fill, BIT2.INK, shadow, 6);

        const markX = bx + offset + btnW - 34;
        const markY = by + offset + btnH * 0.5;
        drawBit2Marker(ctx, markX, markY, btn.id, pressed, BIT2);

        drawText(ctx, btn.label, bx + offset + btnW - 60, markY, {
          dir: "rtl",
          align: "right",
          font: `900 ${isPortrait ? 31 : 28}px ${FONT_KUFI}`,
          fill: txtFill,
          maxWidth: btnW - 80,
        });
      }
    }

    // PIXEL SPROUT ARENA (Stage 1 -> Stage 2 -> Stage 3)
    const sproutStage = !isBack ? 1 : (!cardUpdated ? 2 : 3);
    const spW = isPortrait ? cardW : (W - (cardX + cardW) - pad - 76);
    const spH = isPortrait ? 590 : (cardH + 26 + btnAreaH);
    const spX = isPortrait ? cardX : (cardX + cardW + 32);
    const spY = isPortrait ? (ctrlY + btnAreaH + 38) : cardY;

    drawPixelBox(ctx, spX, spY, spW, spH, BIT2.LIGHT, BIT2.INK, BIT2.MID, 8);
    ctx.fillStyle = ditherLightMid;
    ctx.fillRect(spX + 8, spY + spH - (isPortrait ? 124 : 118), spW - 16, isPortrait ? 116 : 110);
    ctx.fillStyle = BIT2.INK;
    ctx.fillRect(spX + 8, spY + spH - (isPortrait ? 124 : 118), spW - 16, 6);

    const faStage = ["۰", "۱", "۲", "۳"][sproutStage];
    drawText(ctx, `پیشرفت نشست ۱ | مرحله ${faStage} از ۳`, spX + spW * 0.5, spY + 46, {
      dir: "rtl",
      font: `900 ${isPortrait ? 30 : 25}px ${FONT_KUFI}`,
      fill: BIT2.INK,
    });

    const stageSprite = sproutStage === 1 ? SPRITES.sprout1 : (sproutStage === 2 ? SPRITES.sprout2 : SPRITES.sprout3);
    const bounceT = sproutStage === 2 ? norm(localT, 2.829, 3.28) : (sproutStage === 3 ? norm(localT, 5.05, 5.55) : 1);
    const spScale = 16;
    const spPx = 16 * spScale;
    const jumpY = sproutStage > 1 ? -Math.sin(bounceT * Math.PI) * 26 : 0;
    const spriteX = spX + (spW - spPx) * 0.5;
    const spriteY = spY + (isPortrait ? 140 : 185) + jumpY;

    drawSprite(ctx, stageSprite, spriteX, spriteY, spScale);

    const progW = spW - 84;
    const progH = 38;
    const progX = spX + 42;
    const progY = spY + spH - 76;
    drawPixelBox(ctx, progX, progY, progW, progH, BIT2.LIGHT, BIT2.INK, null, 5);
    const doneCount = cardUpdated ? 5 : 4;
    const fillW = Math.round(((progW - 16) * doneCount) / 8);
    ctx.fillStyle = BIT2.MID;
    ctx.fillRect(progX + 8, progY + 8, fillW, progH - 16);
    drawPixelBox(ctx, progX + progW * 0.5 - 42, progY + 2, 84, progH - 4, BIT2.INK, BIT2.INK, null, 2);
    drawText(ctx, `${doneCount}/8`, progX + progW * 0.5, progY + progH * 0.5 + 1, {
      dir: "ltr",
      font: `900 22px ${FONT_MONO}`,
      fill: BIT2.LIGHT,
    });

    // Pixel cursor snapping to خوب بود (t = 10.15–12.40s)
    if (localT >= 4.25 && localT <= 6.80) {
      const moveT = easeOutQuint(norm(localT, 4.25, 4.92));
      const startX = cardX + cardW * 0.85;
      const startY = ctrlY + btnAreaH + 60;
      const cx = lerp(startX, targetBtnCenter.x + 28, moveT);
      const cy = lerp(startY, targetBtnCenter.y + 12, moveT) + (isGoodPressed ? 5 : 0);
      drawSprite(ctx, SPRITES.cursor, cx, cy, isPortrait ? 5 : 4);
    }

    // Chunky Pixel "+1" Burst inside Sprout Arena (t = 10.95–13.20s)
    if (localT >= 5.05 && localT <= 7.80) {
      const bt = norm(localT, 5.05, 7.80);
      const burstX = spX + spW * 0.5;
      const burstBaseY = spriteY - 18;
      const pRng = mulberry32(4207);
      for (let p = 0; p < 12; p++) {
        const ang = -Math.PI * (0.15 + pRng() * 0.7);
        const dist = (22 + pRng() * 88) * easeOutCubic(bt);
        const px = Math.round(burstX + Math.cos(ang) * dist);
        const py = Math.round(burstBaseY + Math.sin(ang) * dist - bt * 18);
        const sz = bt < 0.7 ? 12 : 8;
        ctx.fillStyle = p % 2 === 0 ? BIT2.INK : BIT2.MID;
        ctx.fillRect(px, py, sz, sz);
      }
      const plusY = burstBaseY - 8 - easeOutCubic(bt) * 34;
      drawPixelBox(ctx, burstX - 48, plusY - 24, 96, 48, BIT2.INK, BIT2.INK, null, 4);
      drawText(ctx, "+1", burstX, plusY, {
        dir: "ltr",
        font: `900 34px ${FONT_MONO}`,
        fill: BIT2.LIME,
      });
    }

    // Hard Pixel Staircase Wipe Transition (localT = 0.0–0.45s)
    if (localT < 0.45) {
      const wp = norm(localT, 0.0, 0.45);
      const cols = 12;
      const colW = Math.ceil(W / cols);
      ctx.fillStyle = BIT2.INK;
      for (let c = 0; c < cols; c++) {
        const colProg = clamp((wp * 1.4) - (c / cols) * 0.4);
        const coverH = Math.round((1 - colProg) * H);
        if (coverH > 0) ctx.fillRect(c * colW, 0, colW + 1, coverH);
      }
    }
  }

  // -----------------------------------------------------------------------
  // ACT 4: 15.0–20.0s LOCKUP — 2-BIT VICTORY BRAND SCREEN
  // -----------------------------------------------------------------------
  else {
    const localT = t - 14.143;
    const pop = easeOutBack(norm(localT, 0.08, 0.65), 1.6);

    ctx.fillStyle = BIT2.INK;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = ditherDarkMid;
    const ribH = isPortrait ? 120 : 86;
    ctx.fillRect(0, 0, W, ribH);
    ctx.fillRect(0, H - ribH, W, ribH);

    const pw = isPortrait ? W - 120 : W * 0.68;
    const ph = isPortrait ? 960 : 680;
    const px = (W - pw) * 0.5;
    const py = (H - ph) * 0.5;

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(0.86 + 0.14 * pop, 0.86 + 0.14 * pop);
    ctx.translate(-W * 0.5, -H * 0.5);

    drawPixelBox(ctx, px, py, pw, ph, BIT2.LIGHT, BIT2.LIME, BIT2.MID, 12);

    const starScale = isPortrait ? 10 : 8;
    const starSize = 16 * starScale;
    drawSprite(ctx, SPRITES.star, W * 0.5 - starSize * 0.5, py + (isPortrait ? 72 : 44), starScale);

    drawText(ctx, "همزبان", W * 0.5, py + (isPortrait ? 330 : 244), {
      dir: "rtl",
      font: `900 ${isPortrait ? 128 : 108}px ${FONT_KUFI}`,
      fill: BIT2.INK,
    });

    ctx.fillStyle = BIT2.MID;
    ctx.fillRect(W * 0.5 - 180, py + (isPortrait ? 426 : 322), 360, 8);

    drawText(ctx, "همزبان تو تمام مسیر کنارته", W * 0.5, py + (isPortrait ? 514 : 396), {
      dir: "rtl",
      font: `900 ${isPortrait ? 46 : 42}px ${FONT_FA}`,
      fill: BIT2.INK,
      maxWidth: pw - 72,
    });

    drawText(ctx, "همین جا توی تلگرام", W * 0.5, py + (isPortrait ? 592 : 458), {
      dir: "rtl",
      font: `800 ${isPortrait ? 36 : 32}px ${FONT_FA}`,
      fill: BIT2.MID,
    });

    const pillW = isPortrait ? 560 : 500;
    const pillH = isPortrait ? 114 : 94;
    const pillX = W * 0.5 - pillW * 0.5;
    const pillY = py + ph - (isPortrait ? 204 : 156);
    drawPixelBox(ctx, pillX, pillY, pillW, pillH, BIT2.INK, BIT2.INK, BIT2.LIME, 6);
    drawText(ctx, "@HamZabanRobot", W * 0.5, pillY + pillH * 0.5, {
      dir: "ltr",
      font: `900 ${isPortrait ? 48 : 42}px ${FONT_MONO}`,
      fill: BIT2.LIGHT,
    });

    ctx.restore();

    const blink = Math.floor(localT * 5) % 2 === 0;
    ctx.fillStyle = blink ? BIT2.LIME : BIT2.LIGHT;
    const corners = [
      [px - 32, py - 32],
      [px + pw + 16, py - 32],
      [px - 32, py + ph + 16],
      [px + pw + 16, py + ph + 16],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, 16, 16);
    }
  }

  ctx.restore();
}


export { renderBit2 };
export default renderBit2;
