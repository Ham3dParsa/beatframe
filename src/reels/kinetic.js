import {
  FONT_FA, FONT_MONO, RECALL_BUTTONS,
  clamp, norm, easeOutCubic, easeOutQuint, easeInCubic, easeOutBack, easeSpring,
  drawText, roundRectPath, fillRoundRect, drawSpoilerTranslationBar,
} from "../core/registry.js";

// =========================================================================
// REEL 03: KINETIC PUNCH (Balanced 4 x 5.0s Propulsive Swiss Motion)
// =========================================================================
const KIN = {
  BLACK: "#0A0A0C",
  WHITE: "#F6F4EF",
  VERMILION: "#FF4522",
  EMERALD: "#10B981",
  PURPLE: "#8B5CF6",
  MUTED_DARK: "#52525B",
};

function drawSwissGrid(ctx, W, H, dark) {
  ctx.strokeStyle = dark ? "rgba(246, 244, 239, 0.08)" : "rgba(10, 10, 12, 0.08)";
  ctx.lineWidth = 1.5;
  const cols = 4;
  for (let i = 1; i < cols; i++) {
    const x = (W / cols) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, H * 0.25); ctx.lineTo(W, H * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H * 0.75); ctx.lineTo(W, H * 0.75); ctx.stroke();
}

function renderKinetic(ctx, W, H, t, isPortrait) {
  ctx.save();

  // -----------------------------------------------------------------------
  // ACT 1: 0.0–4.2s HOOK — 4 TIGHT 1.05s KINETIC BEATS
  // -----------------------------------------------------------------------
  if (t < 4.008) {
    if (t < 1.002) {
      // Beat 1 (0.00–1.05s)
      const p = easeOutBack(norm(t, 0.0, 0.30), 1.65);
      ctx.fillStyle = KIN.BLACK;
      ctx.fillRect(0, 0, W, H);
      drawSwissGrid(ctx, W, H, true);

      ctx.save();
      ctx.translate(W * 0.5, H * 0.5);
      ctx.scale(1.42 - 0.42 * p, 1.42 - 0.42 * p);
      drawText(ctx, "کارت هات تلمبار میشن؟", 0, 0, {
        dir: "rtl",
        font: `900 ${isPortrait ? 106 : 118}px ${FONT_FA}`,
        fill: KIN.VERMILION,
        maxWidth: W - 120,
      });
      ctx.restore();

      ctx.fillStyle = KIN.VERMILION;
      ctx.fillRect(0, H - 28, W * norm(t, 0.0, 1.002), 28);
    } else if (t < 2.004) {
      // Beat 2 (1.05–2.10s)
      const p = easeOutBack(norm(t, 1.002, 1.30), 1.65);
      ctx.fillStyle = KIN.VERMILION;
      ctx.fillRect(0, 0, W, H);
      drawSwissGrid(ctx, W, H, false);

      ctx.save();
      ctx.translate(W * 0.5, H * 0.5);
      ctx.scale(0.68 + 0.32 * p, 0.68 + 0.32 * p);
      drawText(ctx, "یادت میره سر وقت بخونی؟", 0, 0, {
        dir: "rtl",
        font: `900 ${isPortrait ? 98 : 112}px ${FONT_FA}`,
        fill: KIN.BLACK,
        maxWidth: W - 120,
      });
      ctx.restore();

      ctx.fillStyle = KIN.BLACK;
      ctx.fillRect(0, 0, W * norm(t, 1.002, 2.004), 28);
    } else if (t < 3.006) {
      // Beat 3 (2.10–3.15s)
      const p = easeSpring(norm(t, 2.004, 2.40));
      ctx.fillStyle = KIN.WHITE;
      ctx.fillRect(0, 0, W, H);
      drawSwissGrid(ctx, W, H, false);

      ctx.save();
      ctx.translate(W * 0.5, H * 0.48);
      ctx.scale(0.74 + 0.26 * p, 0.74 + 0.26 * p);
      drawText(ctx, "بسه دیگه!", 0, 0, {
        dir: "rtl",
        font: `900 ${isPortrait ? 196 : 192}px ${FONT_FA}`,
        fill: KIN.BLACK,
      });
      ctx.restore();

      const barW = (isPortrait ? 520 : 560) * easeOutQuint(norm(t, 2.08, 2.56));
      ctx.fillStyle = KIN.EMERALD;
      ctx.fillRect((W - barW) * 0.5, H * 0.48 + (isPortrait ? 128 : 118), barW, 24);
    } else {
      // Beat 4 (3.15–4.20s): Editorial wipe into HamZaban stage
      const p = easeOutQuint(norm(t, 3.006, 3.65));
      ctx.fillStyle = KIN.WHITE;
      ctx.fillRect(0, 0, W, H);
      drawSwissGrid(ctx, W, H, false);

      ctx.fillStyle = KIN.BLACK;
      ctx.fillRect(0, 0, W, H * 0.14 * p);
      drawText(ctx, "همزبان", W * 0.5, H * 0.47, {
        dir: "rtl",
        font: `900 ${isPortrait ? 152 : 144}px ${FONT_FA}`,
        fill: KIN.BLACK,
        alpha: p,
      });
      drawText(ctx, "امروز ۱۳ مرور و ۷ کارت جدید داری", W * 0.5, H * 0.47 + 122, {
        dir: "rtl",
        font: `800 ${isPortrait ? 44 : 40}px ${FONT_FA}`,
        fill: KIN.EMERALD,
        alpha: p,
      });
    }
  }

  // -----------------------------------------------------------------------
  // ACTS 2 & 3 (4.008–16.034s): 2 BEAT-SYNCED FLASHCARDS + SCORE + PROGRESS
  // -----------------------------------------------------------------------
  else if (t < 16.034) {
    const localT = t - 4.008; // 0..12.026s (119.75 BPM: beat = 0.501s, bar = 2.004s)
    const beatPhase = (localT % 0.501) / 0.501;
    const beatKick = Math.exp(-beatPhase * 7.2); // crisp rhythmic pulse on every kick!

    ctx.fillStyle = KIN.WHITE;
    ctx.fillRect(0, 0, W, H);
    drawSwissGrid(ctx, W, H, false);

    // Phase C (14.029–16.034s, localT 10.021–12.026s): Punchy Controlled-Progress Bridge!
    if (localT >= 10.021) {
      const pT = localT - 10.021; // 0..2.005s
      const slam = easeOutBack(norm(pT, 0.0, 0.34), 1.55);
      const zoomPulse = 1 + beatKick * 0.032;

      ctx.fillStyle = KIN.BLACK;
      ctx.fillRect(0, 0, W, H);
      drawSwissGrid(ctx, W, H, true);

      // Top/bottom kinetic energy strips
      ctx.fillStyle = KIN.EMERALD;
      ctx.fillRect(0, 0, W * easeOutQuint(norm(pT, 0.0, 0.45)), 24);
      ctx.fillStyle = KIN.VERMILION;
      ctx.fillRect(W * (1 - easeOutQuint(norm(pT, 0.0, 0.45))), H - 24, W, 24);

      const boxW = isPortrait ? W - 110 : W * 0.70;
      const boxH = isPortrait ? 640 : 480;
      const boxX = (W - boxW) * 0.5;
      const boxY = (H - boxH) * 0.5;

      ctx.save();
      ctx.translate(W * 0.5, H * 0.5);
      ctx.scale((0.86 + 0.14 * slam) * zoomPulse, (0.86 + 0.14 * slam) * zoomPulse);
      ctx.translate(-W * 0.5, -H * 0.5);

      fillRoundRect(ctx, boxX + 14, boxY + 14, boxW, boxH, 28, KIN.EMERALD);
      fillRoundRect(ctx, boxX, boxY, boxW, boxH, 28, KIN.WHITE, KIN.BLACK, 5);

      // Score + controlled time pill
      const pillW = isPortrait ? 520 : 500;
      fillRoundRect(ctx, W * 0.5 - pillW * 0.5, boxY + (isPortrait ? 66 : 48), pillW, 74, 999, KIN.BLACK);
      drawText(ctx, "+۱۲ امتیاز  |  فقط ۵ دقیقه", W * 0.5, boxY + (isPortrait ? 103 : 85), {
        dir: "rtl",
        font: `900 ${isPortrait ? 34 : 31}px ${FONT_FA}`,
        fill: KIN.EMERALD,
      });

      // Punchy short headline
      drawText(ctx, "پیشرفت واقعی، بدون فشار", W * 0.5, boxY + (isPortrait ? 268 : 206), {
        dir: "rtl",
        font: `900 ${isPortrait ? 72 : 66}px ${FONT_FA}`,
        fill: KIN.BLACK,
        maxWidth: boxW - 72,
      });

      // Animated progress velocity bar
      const pbW = boxW - 140;
      const pbX = boxX + 70;
      const pbY = boxY + (isPortrait ? 378 : 284);
      fillRoundRect(ctx, pbX, pbY, pbW, 38, 999, "#E4E4E7", KIN.BLACK, 3);
      const progW = Math.max(40, pbW * easeOutQuint(norm(pT, 0.1, 0.85)) * 0.82);
      fillRoundRect(ctx, pbX, pbY, progW, 38, 999, KIN.EMERALD, KIN.BLACK, 3);

      drawText(ctx, "دقیقاً در جهت هدف و سطح تو", W * 0.5, boxY + (isPortrait ? 496 : 382), {
        dir: "rtl",
        font: `800 ${isPortrait ? 42 : 36}px ${FONT_FA}`,
        fill: KIN.VERMILION,
        maxWidth: boxW - 80,
      });
      ctx.restore();

      // Snappy shutter wipe into Act 4 (pT = 1.65..2.005s)
      if (pT >= 1.65) {
        const wp = easeInCubic(norm(pT, 1.65, 2.005));
        ctx.fillStyle = KIN.BLACK;
        ctx.fillRect(0, 0, W, H * wp);
      }
    } else {
      // Two fast, energetic flashcards with beat-synced zoom & score pops!
      const isCard2 = localT >= 4.009; // Card 1: 4.008-8.017s | Card 2: 8.017-14.029s
      const cT = isCard2 ? (localT - 4.009) : localT;
      const cCfg = !isCard2
        ? {
            tFlip: 1.50,
            tRevStart: 1.05,
            tRevEnd: 1.46,
            tPressStart: 2.35,
            tPressEnd: 3.15,
            tScored: 2.42,
            cefr: "C1",
            cue: "ظرافت معنایی؟",
            hint: "SYN: Subtlety  |  ANT: Obviousness",
            word: "Nuance",
            ipa: "/ˈnjuːɑːns/",
            meaning: "ظرافت معنایی",
            example: "She caught every nuance in his tone.",
            trans: "همه ظرافت های لحنش را متوجه شد.",
            chosenId: "easy",
            chosenCol: KIN.PURPLE,
            xpText: "+۲ امتیاز  |  مرور بعدی: ۲۱ روز دیگه",
            footerBefore: "نشست ۱ | کارت ۴ از ۸",
            footerAfter: "نشست ۱ | کارت ۵ از ۸",
          }
        : {
            tFlip: 1.80,
            tRevStart: 1.32,
            tRevEnd: 1.76,
            tPressStart: 4.008, // t = 12.025s exact Bar 7!
            tPressEnd: 4.85,
            tScored: 4.10,
            cefr: "B2",
            cue: "تاب آور و شکست ناپذیر؟",
            hint: "SYN: Tough, Adaptable  |  ANT: Fragile",
            word: "Resilient",
            ipa: "/rɪˈzɪljənt/",
            meaning: "تاب آور، مقاوم",
            example: "Small daily habits build a resilient mind.",
            trans: "عادت های کوچک روزانه ذهن تاب آور می سازد.",
            chosenId: "good",
            chosenCol: KIN.EMERALD,
            xpText: "+۲ امتیاز  |  مرور بعدی: ۹ روز دیگه",
            footerBefore: "نشست ۱ | کارت ۵ از ۸",
            footerAfter: "نشست ۱ | کارت ۶ از ۸",
          };

      const isBack = cT >= cCfg.tFlip;
      const isRevealTap = cT >= cCfg.tRevStart && cT < cCfg.tRevEnd;
      const isChosenPressed = cT >= cCfg.tPressStart && cT <= cCfg.tPressEnd;
      const cardUpdated = cT >= cCfg.tScored;
      const totalXP = !isCard2 ? (cardUpdated ? 10 : 8) : (cardUpdated ? 12 : 10);
      const sessionFooter = cardUpdated ? cCfg.footerAfter : cCfg.footerBefore;

      // Top Swiss editorial header strip + live XP score counter
      const headerH = isPortrait ? 104 : 78;
      ctx.fillStyle = KIN.BLACK;
      ctx.fillRect(0, 0, W, headerH);
      drawText(ctx, "همزبان", W - 48, headerH * 0.5, {
        dir: "rtl",
        align: "right",
        font: `900 ${isPortrait ? 40 : 34}px ${FONT_FA}`,
        fill: KIN.WHITE,
      });

      // Live score pill on left with beat-synced pop on score update
      const xpPop = cardUpdated ? (1 + beatKick * 0.06) : 1;
      ctx.save();
      ctx.translate(165, headerH * 0.5);
      ctx.scale(xpPop, xpPop);
      fillRoundRect(ctx, -125, -26, 250, 52, 999, totalXP > 0 ? KIN.EMERALD : "#1F2937");
      drawText(ctx, `امتیاز نشست: ${["۸","۱۰","۱۲"][totalXP === 8 ? 0 : (totalXP === 10 ? 1 : 2)]}`, 0, 1, {
        dir: "rtl",
        font: `900 ${isPortrait ? 27 : 24}px ${FONT_FA}`,
        fill: totalXP > 0 ? KIN.BLACK : KIN.WHITE,
      });
      ctx.restore();

      // Goal / Topic / CEFR Filter Chips with subtle beat bounce
      const chips = [
        { text: "مکالمه کاری", bg: KIN.BLACK, fg: KIN.WHITE },
        { text: "تکنولوژی", bg: KIN.VERMILION, fg: KIN.WHITE },
        { text: `سطح ${cCfg.cefr}`, bg: KIN.EMERALD, fg: KIN.BLACK },
      ];
      const chipY = headerH + (isPortrait ? 42 : 20);
      const chipH = isPortrait ? 66 : 50;
      const chipW = isPortrait ? 286 : 300;
      const chipGap = 20;
      const totalChipW = chips.length * chipW + (chips.length - 1) * chipGap;
      const chipStartX = (W - totalChipW) * 0.5;

      for (let i = 0; i < chips.length; i++) {
        const ct = easeOutBack(norm(localT, i * 0.10, i * 0.10 + 0.35), 1.4);
        const cx = chipStartX + totalChipW - (i + 1) * chipW - i * chipGap + (1 - ct) * 160;
        const cyOff = i === 2 ? -beatKick * 4 : 0;
        fillRoundRect(ctx, cx + 5, chipY + 5 + cyOff, chipW, chipH, 999, KIN.BLACK);
        fillRoundRect(ctx, cx, chipY + cyOff, chipW, chipH, 999, chips[i].bg, KIN.BLACK, 3);
        drawText(ctx, chips[i].text, cx + chipW * 0.5, chipY + chipH * 0.5 + cyOff, {
          dir: "rtl",
          font: `800 ${isPortrait ? 29 : 24}px ${FONT_FA}`,
          fill: chips[i].fg,
        });
      }

      // Main Floating Card with purposeful beat-synced micro-zoom & snappy slide on Card #2
      const slideIn = easeOutBack(norm(cT, 0.0, 0.38), 1.25);
      const cardW = isPortrait ? W - 112 : W * 0.66;
      const cardH = isPortrait ? 720 : 500;
      const cardX = (W - cardW) * 0.5 + (isCard2 ? (1 - slideIn) * 320 : 0);
      const cardY = (isPortrait ? chipY + chipH + 48 : chipY + chipH + 22) + (!isCard2 ? (1 - slideIn) * 80 : 0);

      const flipScaleX = isBack
        ? easeOutBack(norm(cT, cCfg.tFlip, cCfg.tFlip + 0.30), 1.2)
        : (cT > cCfg.tFlip - 0.14 ? Math.max(0.12, 1 - norm(cT, cCfg.tFlip - 0.14, cCfg.tFlip)) : 1);
      const cardZoom = 1 + beatKick * 0.022;

      ctx.save();
      ctx.translate(cardX + cardW * 0.5, cardY + cardH * 0.5);
      ctx.scale(clamp(flipScaleX, 0.08, 1.05) * cardZoom, cardZoom);
      ctx.translate(-(cardX + cardW * 0.5), -(cardY + cardH * 0.5));

      fillRoundRect(ctx, cardX + 12, cardY + 12, cardW, cardH, 24, KIN.BLACK);
      fillRoundRect(ctx, cardX, cardY, cardW, cardH, 24, KIN.WHITE, KIN.BLACK, 4);

      fillRoundRect(ctx, cardX + 32, cardY + 26, 86, 44, 999, KIN.EMERALD, KIN.BLACK, 3);
      drawText(ctx, cCfg.cefr, cardX + 75, cardY + 48, {
        dir: "ltr",
        font: `900 26px ${FONT_MONO}`,
        fill: KIN.BLACK,
      });

      if (cardUpdated) {
        const pillW = isPortrait ? 310 : 280;
        fillRoundRect(ctx, cardX + cardW - pillW - 28, cardY + 26, pillW, 44, 999, "#E6FBF3", KIN.EMERALD, 2.5);
        drawText(ctx, sessionFooter, cardX + cardW - pillW * 0.5 - 28, cardY + 48, {
          dir: "rtl",
          font: `800 ${isPortrait ? 26 : 23}px ${FONT_FA}`,
          fill: KIN.BLACK,
        });
      } else {
        drawText(ctx, sessionFooter, cardX + cardW - 32, cardY + 48, {
          dir: "rtl",
          align: "right",
          font: `800 ${isPortrait ? 28 : 25}px ${FONT_FA}`,
          fill: KIN.MUTED_DARK,
        });
      }

      if (!isBack) {
        // FRONT CARD
        ctx.save();
        ctx.translate(cardX + cardW * 0.5, cardY + (isPortrait ? 248 : 184));
        ctx.scale(1 + beatKick * 0.04, 1 + beatKick * 0.04);
        drawText(ctx, "???", 0, 0, {
          dir: "ltr",
          font: `900 ${isPortrait ? 120 : 96}px ${FONT_MONO}`,
          fill: KIN.BLACK,
        });
        ctx.restore();

        ctx.fillStyle = KIN.VERMILION;
        ctx.fillRect(cardX + cardW * 0.5 - 100, cardY + (isPortrait ? 336 : 246), 200, 8);

        drawText(ctx, cCfg.cue, cardX + cardW * 0.5, cardY + (isPortrait ? 430 : 318), {
          dir: "rtl",
          font: `900 ${isPortrait ? 50 : 42}px ${FONT_FA}`,
          fill: KIN.BLACK,
          maxWidth: cardW - 72,
        });

        fillRoundRect(ctx, cardX + cardW * 0.5 - 270, cardY + (isPortrait ? 520 : 382), 540, 58, 999, "#ECE9E1", KIN.BLACK, 2.5);
        drawText(ctx, cCfg.hint, cardX + cardW * 0.5, cardY + (isPortrait ? 549 : 411), {
          dir: "ltr",
          font: `800 ${isPortrait ? 22 : 20}px ${FONT_MONO}`,
          fill: KIN.BLACK,
        });
      } else {
        // BACK CARD + BEAT-SYNCED WORD ZOOM + SPOILER TRANSLATION
        ctx.save();
        ctx.translate(cardX + cardW * 0.5, cardY + (isPortrait ? 182 : 132));
        ctx.scale(1 + beatKick * 0.035, 1 + beatKick * 0.035);
        drawText(ctx, cCfg.word, 0, 0, {
          dir: "ltr",
          font: `900 ${isPortrait ? 102 : 82}px ${FONT_MONO}`,
          fill: KIN.BLACK,
        });
        ctx.restore();

        drawText(ctx, cCfg.ipa, cardX + cardW * 0.5, cardY + (isPortrait ? 256 : 186), {
          dir: "ltr",
          font: `700 ${isPortrait ? 34 : 28}px ${FONT_MONO}`,
          fill: KIN.MUTED_DARK,
        });

        ctx.fillStyle = KIN.VERMILION;
        ctx.fillRect(cardX + cardW * 0.5 - 110, cardY + (isPortrait ? 298 : 218), 220, 8);

        drawText(ctx, cCfg.meaning, cardX + cardW * 0.5, cardY + (isPortrait ? 386 : 282), {
          dir: "rtl",
          font: `900 ${isPortrait ? 74 : 58}px ${FONT_FA}`,
          fill: KIN.BLACK,
        });

        drawText(ctx, cCfg.example, cardX + cardW * 0.5, cardY + (isPortrait ? 496 : 356), {
          dir: "ltr",
          font: `700 ${isPortrait ? 27 : 24}px ${FONT_MONO}`,
          fill: KIN.BLACK,
          maxWidth: cardW - 64,
        });

        const revealProg = easeOutCubic(norm(cT, cCfg.tFlip + 0.35, cCfg.tFlip + 1.05));
        const spBarW = Math.min(cardW - 84, isPortrait ? 820 : 760);
        const spBarH = isPortrait ? 68 : 54;
        drawSpoilerTranslationBar(
          ctx,
          cardX + cardW * 0.5 - spBarW * 0.5,
          cardY + (isPortrait ? 556 : 396),
          spBarW,
          spBarH,
          cCfg.trans,
          revealProg,
          {
            radius: 14,
            bg: "#E6FBF3",
            border: KIN.BLACK,
            borderWidth: 2.5,
            font: `800 ${isPortrait ? 29 : 24}px ${FONT_FA}`,
            textColor: KIN.BLACK,
            veilBg: "#18181B",
            speckleA: "#F6F4EF",
            speckleB: "#A1A1AA",
            seed: 803 + Math.floor(t * 14),
          }
        );
      }

      ctx.restore();

      // Vibrant Smart Next-Review + Score Toast placed cleanly BELOW the 2x2 recall buttons!
      if (cardUpdated) {
        const toastDur = isCard2 ? 1.90 : 1.55;
        const xpT = norm(cT, cCfg.tScored, cCfg.tScored + toastDur);
        const xpSc = easeOutBack(norm(cT, cCfg.tScored, cCfg.tScored + 0.22), 1.4);
        const toastW = Math.min(cardW - 24, isPortrait ? 800 : 720);
        const toastH = isPortrait ? 82 : 64;
        const btnGridBottom = cardY + cardH + (isPortrait ? 44 + 124 * 2 + 20 : 26 + 98 * 2 + 16);
        const toastY = Math.min(H - (isPortrait ? 110 : 48), btnGridBottom + (isPortrait ? 76 : 44));
        ctx.save();
        ctx.translate(cardX + cardW * 0.5, toastY);
        ctx.scale(xpSc, xpSc);
        ctx.globalAlpha = xpT > 0.88 ? Math.max(0, 1 - (xpT - 0.88) / 0.12) : 1;
        fillRoundRect(ctx, -toastW * 0.5 + 8, -toastH * 0.5 + 8, toastW, toastH, 999, KIN.BLACK);
        fillRoundRect(ctx, -toastW * 0.5, -toastH * 0.5, toastW, toastH, 999, cCfg.chosenCol, KIN.BLACK, 4);
        drawText(ctx, cCfg.xpText, 0, 1, {
          dir: "rtl",
          font: `900 ${isPortrait ? 33 : 28}px ${FONT_FA}`,
          fill: KIN.WHITE,
          maxWidth: toastW - 44,
        });
        ctx.restore();
      }

      // CONTROLS BELOW CARD
      const btnY = cardY + cardH + (isPortrait ? 44 : 26);
      if (!isBack) {
        const revH = isPortrait ? 120 : 94;
        const shOff = isRevealTap ? 0 : 8;
        const bOff = isRevealTap ? 8 : 0;
        if (shOff > 0) fillRoundRect(ctx, cardX + shOff, btnY + shOff, cardW, revH, 18, KIN.BLACK);
        fillRoundRect(ctx, cardX + bOff, btnY + bOff, cardW, revH, 18, isRevealTap ? KIN.EMERALD : KIN.BLACK, KIN.BLACK, 3.5);
        drawText(ctx, "نمایش پاسخ", cardX + cardW * 0.5 + bOff, btnY + bOff + revH * 0.5, {
          dir: "rtl",
          font: `900 ${isPortrait ? 42 : 34}px ${FONT_FA}`,
          fill: KIN.WHITE,
        });
      } else {
        const btnGapX = 20;
        const btnGapY = isPortrait ? 20 : 16;
        const btnW = (cardW - btnGapX) / 2;
        const btnH = isPortrait ? 124 : 98;
        const btnSlide = easeOutCubic(norm(cT, cCfg.tFlip + 0.04, cCfg.tFlip + 0.38));

        for (let i = 0; i < 4; i++) {
          const b = RECALL_BUTTONS[i];
          const row = Math.floor(i / 2);
          const colRTL = i % 2;
          const bx = colRTL === 0 ? (cardX + btnW + btnGapX) : cardX;
          const by = btnY + row * (btnH + btnGapY) + (1 - btnSlide) * 28;
          const isChosen = b.id === cCfg.chosenId;
          const pressed = isChosen && isChosenPressed;
          const shOff = pressed ? 0 : 8;
          const bOff = pressed ? 8 : 0;

          if (pressed) {
            const wave = norm(cT, cCfg.tPressStart, cCfg.tPressEnd);
            ctx.save();
            roundRectPath(ctx, bx - wave * 22, by - wave * 22, btnW + wave * 44, btnH + wave * 44, 22);
            ctx.strokeStyle = cCfg.chosenCol;
            ctx.lineWidth = 6 * (1 - wave);
            ctx.globalAlpha = 1 - wave;
            ctx.stroke();
            ctx.restore();
          }

          if (shOff > 0) fillRoundRect(ctx, bx + shOff, by + shOff, btnW, btnH, 16, KIN.BLACK);
          const bg = pressed ? cCfg.chosenCol : (isChosen ? "#F3EEFF" : KIN.WHITE);
          fillRoundRect(ctx, bx + bOff, by + bOff, btnW, btnH, 16, bg, KIN.BLACK, 3.5);

          const dotX = bx + bOff + btnW - 36;
          const dotY = by + bOff + btnH * 0.5;
          ctx.beginPath();
          ctx.arc(dotX, dotY, isPortrait ? 12 : 10, 0, Math.PI * 2);
          ctx.fillStyle = pressed ? KIN.WHITE : b.dot;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = KIN.BLACK;
          ctx.stroke();

          drawText(ctx, b.label, bx + bOff + btnW - 62, dotY, {
            dir: "rtl",
            align: "right",
            font: `900 ${isPortrait ? 34 : 29}px ${FONT_FA}`,
            fill: pressed ? KIN.WHITE : KIN.BLACK,
            maxWidth: btnW - 80,
          });
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // ACT 4: 15.0–20.0s ENERGETIC LOCKUP (Matching Act 1 Kinetic Momentum)
  // -----------------------------------------------------------------------
  else {
    const localT = t - 16.034;
    const splitP = easeOutQuint(norm(localT, 0.0, 0.48));
    // Rhythmic 1.05s pulse matching Act 1's exact beat tempo
    const beatPhase = (localT % 0.501) / 0.501;
    const beatPulse = Math.exp(-beatPhase * 6.5);

    ctx.fillStyle = KIN.BLACK;
    ctx.fillRect(0, 0, W, H);
    drawSwissGrid(ctx, W, H, true);

    // Energetic split-screen geometric frame bars with rhythmic pulse
    const barThick = Math.round((isPortrait ? 28 : 30) + beatPulse * 14);
    if (isPortrait) {
      ctx.fillStyle = KIN.VERMILION;
      ctx.fillRect(0, 0, W * splitP, barThick);
      ctx.fillStyle = KIN.EMERALD;
      ctx.fillRect(W * (1 - splitP), H - barThick, W * splitP, barThick);
    } else {
      ctx.fillStyle = KIN.VERMILION;
      ctx.fillRect(0, 0, barThick, H * splitP);
      ctx.fillStyle = KIN.EMERALD;
      ctx.fillRect(W - barThick, H * (1 - splitP), barThick, H * splitP);
    }

    // Kinetic corner accent ticks pulsing on beat
    const tickW = 72 + beatPulse * 24;
    ctx.fillStyle = KIN.VERMILION;
    ctx.fillRect(isPortrait ? 56 : 72, isPortrait ? 92 : 64, tickW, 8);
    ctx.fillStyle = KIN.EMERALD;
    ctx.fillRect(W - (isPortrait ? 56 : 72) - tickW, H - (isPortrait ? 96 : 68), tickW, 8);

    // Crisp spring entrance for همزبان
    const pop = easeSpring(norm(localT, 0.06, 0.65));
    ctx.save();
    ctx.translate(W * 0.5, H * 0.35);
    ctx.scale(0.84 + 0.16 * pop + beatPulse * 0.025, 0.84 + 0.16 * pop + beatPulse * 0.025);
    drawText(ctx, "همزبان", 0, 0, {
      dir: "rtl",
      font: `900 ${isPortrait ? 160 : 150}px ${FONT_FA}`,
      fill: KIN.WHITE,
    });
    ctx.restore();

    // Sweeping vermilion rule with beat punch
    const ruleW = (320 + beatPulse * 48) * splitP;
    ctx.fillStyle = KIN.VERMILION;
    ctx.fillRect(W * 0.5 - ruleW * 0.5, H * 0.448, ruleW, 10);

    // Staggered kinetic copy entrance
    const sub1 = easeOutBack(norm(localT, 0.22, 0.68), 1.4);
    const sub2 = easeOutBack(norm(localT, 0.42, 0.88), 1.4);

    drawText(ctx, "با سرعت دلخواه خودت یاد بگیر", W * 0.5, H * 0.525 + (1 - sub1) * 28, {
      dir: "rtl",
      font: `900 ${isPortrait ? 48 : 48}px ${FONT_FA}`,
      fill: KIN.WHITE,
      alpha: clamp(sub1),
      maxWidth: W - 140,
    });

    drawText(ctx, "همزبان تو تمام مسیر کنارته", W * 0.5, H * 0.588 + (1 - sub2) * 24, {
      dir: "rtl",
      font: `800 ${isPortrait ? 38 : 34}px ${FONT_FA}`,
      fill: KIN.EMERALD,
      alpha: clamp(sub2),
    });

    // Punchy CTA Pill with rhythmic shadow pop
    const pillEnter = easeOutBack(norm(localT, 0.55, 1.05), 1.5);
    const pillW = isPortrait ? 560 : 520;
    const pillH = isPortrait ? 114 : 98;
    const pillX = (W - pillW) * 0.5;
    const pillY = H * 0.675;
    const sh = Math.round(10 + beatPulse * 6);

    ctx.save();
    ctx.translate(W * 0.5, pillY + pillH * 0.5);
    ctx.scale(0.86 + 0.14 * pillEnter, 0.86 + 0.14 * pillEnter);
    ctx.translate(-W * 0.5, -(pillY + pillH * 0.5));

    fillRoundRect(ctx, pillX + sh, pillY + sh, pillW, pillH, 999, KIN.EMERALD);
    fillRoundRect(ctx, pillX, pillY, pillW, pillH, 999, KIN.WHITE, KIN.BLACK, 4);
    drawText(ctx, "@HamZabanRobot", W * 0.5, pillY + pillH * 0.5, {
      dir: "ltr",
      font: `900 ${isPortrait ? 48 : 44}px ${FONT_MONO}`,
      fill: KIN.BLACK,
    });
    ctx.restore();
  }

  ctx.restore();
}


export { renderKinetic };
export default renderKinetic;
