import { SLIDE_REGISTRY, getSlideSpec, getDuration, clamp } from "../core/registry.js";
import { snapToAnchorPeak } from "../engine/beat-analyzer.js";
import { formatCombo, eventToCombo } from "../core/shortcuts.js";
import { initTooltips } from "./tooltip.js";

const FLEX_ORDER = ["off", "music_to_clip", "clip_to_music", "balanced"];
const FLEX_LABELS = {
  off: "اصلی",
  music_to_clip: "موزیک به کلیپ",
  clip_to_music: "کلیپ به موزیک",
  balanced: "متعادل",
};

const FADE_ORDER = ["soft", "punch", "off"];
const FADE_LABELS = {
  soft: "محو نرم",
  punch: "برش ضربدار",
  off: "خاموش",
};

function fmtMMSS(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${r}`;
}

function formatTime(sec, dur) {
  const s = Math.floor(clamp(sec, 0, dur));
  return `00:${String(s).padStart(2, "0")}`;
}

function formatDurationLabel(sec) {
  const d = Math.max(0.1, Number(sec) || 20);
  return Math.abs(d - Math.round(d)) < 0.05 ? `${Math.round(d)}s` : `${d.toFixed(1)}s`;
}

export function createStudioHud({
  state,
  audio,
  canvas,
  shortcuts,
  onStyleChange,
  onAspectChange,
  onSetPlaying,
  onRestart,
  onJumpAct,
  onSeek,
  onStartExport,
  onExportPng,
  onCancelExport,
  onSavePrefs,
}) {
  const stageEl = document.getElementById("studioStage") || document.querySelector(".stage");
  const hudWrap = document.getElementById("hudWrap");
  const hudPanel = document.getElementById("hudPanel");
  const hudMiniToggle = document.getElementById("hudMiniToggle");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const prevActBtn = document.getElementById("prevActBtn");
  const nextActBtn = document.getElementById("nextActBtn");
  const dockPosBtn = document.getElementById("dockPosBtn");
  const aspectBtn = document.getElementById("aspectBtn");
  const soundBtn = document.getElementById("soundBtn");
  const exportVideoBtn = document.getElementById("exportVideoBtn");
  const exportPngBtn = document.getElementById("exportPngBtn");
  const cancelExportBtn = document.getElementById("cancelExportBtn");
  const helpBtn = document.getElementById("helpBtn");
  const exportBar = document.getElementById("exportBar");
  const exportLabelEl = document.getElementById("exportLabel");
  const exportPct = document.getElementById("exportPct");
  const exportFill = document.getElementById("exportFill");
  const timelineSlider = document.getElementById("timelineSlider");
  const timelineFill = document.getElementById("timelineFill");
  const timelineLabels = document.getElementById("timelineLabels");
  const timelineMarkers = document.getElementById("timelineMarkers");
  const timeReadout = document.getElementById("timeReadout");
  const toastEl = document.getElementById("toast");
  const styleBtns = [...document.querySelectorAll("[data-style]")];

  const uploadAudioBtn = document.getElementById("uploadAudioBtn");
  const audioFileInput = document.getElementById("audioFileInput");
  const audioSyncDrawer = document.getElementById("audioSyncDrawer");
  const syncTrackName = document.getElementById("syncTrackName");
  const syncMusicBpmBadge = document.getElementById("syncMusicBpmBadge");
  const syncDeltaPill = document.getElementById("syncDeltaPill");
  const syncClipBpmBadge = document.getElementById("syncClipBpmBadge");
  const syncCompatBadge = document.getElementById("syncCompatBadge");
  const syncTransferSlideBtn = document.getElementById("syncTransferSlideBtn");
  const syncEventPins = document.getElementById("syncEventPins");
  const snapToPeakBtn = document.getElementById("snapToPeakBtn");
  const syncWaveCanvas = document.getElementById("syncWaveCanvas");
  const syncSliceChips = Array.from(document.querySelectorAll("#syncSliceChips .btn-chip"));
  const flexModeBtns = Array.from(document.querySelectorAll("#flexModeGroup .btn-seg"));
  const pitchLockBtn = document.getElementById("pitchLockBtn");
  const clipSpeedMinusBtn = document.getElementById("clipSpeedMinusBtn");
  const clipSpeedReadout = document.getElementById("clipSpeedReadout");
  const clipSpeedPlusBtn = document.getElementById("clipSpeedPlusBtn");
  const beatMagnetBtn = document.getElementById("beatMagnetBtn");
  const autoLoopBtn = document.getElementById("autoLoopBtn");
  const endingFadeBtn = document.getElementById("endingFadeBtn");
  const nudgeBarMinusBtn = document.getElementById("nudgeBarMinusBtn");
  const nudgeBarPlusBtn = document.getElementById("nudgeBarPlusBtn");
  const pickAudioFileBtn = document.getElementById("pickAudioFileBtn");
  const trimMinusBtn = document.getElementById("trimMinusBtn");
  const trimPlusBtn = document.getElementById("trimPlusBtn");
  const trimInfoText = document.getElementById("trimInfoText");
  const resetAudioBtn = document.getElementById("resetAudioBtn");
  const closeTrimBtn = document.getElementById("closeTrimBtn");

  const helpModal = document.getElementById("bfHelpModal");
  const helpBackdrop = document.getElementById("bfHelpBackdrop");
  const helpGrid = document.getElementById("bfHelpGrid");
  const closeHelpBtn = document.getElementById("closeHelpBtn");
  const resetShortcutsBtn = document.getElementById("resetShortcutsBtn");

  const tooltips = initTooltips({
    getShortcutLabel: (id) => (shortcuts ? formatCombo(shortcuts.getCombo(id)) : ""),
  });

  let capturingActionId = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
  }

  function getSelectedEvent(style = state.style) {
    const spec = getSlideSpec(style);
    const cfg = audio.getSyncSettings(style);
    const events = Array.isArray(spec.events) ? spec.events : [];
    if (events.length === 0) {
      return { id: "primary", labelFa: "اوج اصلی", t: spec.primaryImpactSec, isPrimary: true };
    }
    const found = events.find((ev) => ev.id === cfg.selectedEventId)
      || events.find((ev) => ev.isPrimary)
      || events[0];
    if (cfg.selectedEventId !== found.id) {
      cfg.selectedEventId = found.id;
    }
    return found;
  }

  function getPrerollTimeForEvent(ev, style = state.style) {
    const dur = getDuration(style);
    return clamp(ev.t - 1.2, 0, Math.max(0, dur - 1.5));
  }

  function updateExportDurationLabel(style = state.style) {
    const plan = audio.getTempoPlan(style);
    const label = formatDurationLabel(plan.effectiveDuration);
    exportVideoBtn.innerHTML = `خروجی ویدیو (<span class="ltr-num">${label}</span>)`;
  }

  function updateTimelineChrome(style) {
    const spec = getSlideSpec(style);
    const dur = spec.durationSec;
    timelineSlider.max = String(dur);
    updateExportDurationLabel(style);
    if (timelineLabels) {
      timelineLabels.classList.toggle("is-pro", Boolean(spec.isPro));
      timelineLabels.innerHTML = spec.tlLabels;
    }
    if (timelineMarkers) {
      timelineMarkers.innerHTML = spec.tlMarks
        .map((pct) => `<div class="timeline-marker" style="left:${pct}%"></div>`)
        .join("");
    }
  }

  function updateStyleButtons(style) {
    styleBtns.forEach((b) => {
      const active = b.dataset.style === style;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  function updateAspectButton(aspect) {
    aspectBtn.innerHTML = `<span class="ltr-num">${aspect}</span>`;
    aspectBtn.setAttribute("data-tip-state", `نسبت فعلی: ${aspect}`);
    tooltips.refresh();
  }

  function updatePlayButton(playing) {
    playPauseBtn.textContent = playing ? "توقف" : "پخش";
    playPauseBtn.setAttribute("data-tip-state", playing ? "وضعیت: در حال پخش" : "وضعیت: متوقف");
    tooltips.refresh();
  }

  function isDrawerOpen() {
    return Boolean(audioSyncDrawer && audioSyncDrawer.classList.contains("is-visible"));
  }

  function isHelpOpen() {
    return Boolean(helpModal && !helpModal.hidden);
  }

  function setDrawerControlsDisabled(disabled) {
    if (!audioSyncDrawer) return;
    const controls = audioSyncDrawer.querySelectorAll("button, input, select");
    controls.forEach((el) => {
      el.disabled = disabled;
    });
  }

  function setControlsDisabled(disabled) {
    styleBtns.forEach((b) => (b.disabled = disabled));
    playPauseBtn.disabled = disabled;
    restartBtn.disabled = disabled;
    prevActBtn.disabled = disabled;
    nextActBtn.disabled = disabled;
    aspectBtn.disabled = disabled;
    uploadAudioBtn.disabled = disabled;
    exportVideoBtn.disabled = disabled;
    exportPngBtn.disabled = disabled;
    if (helpBtn) helpBtn.disabled = disabled;
    timelineSlider.disabled = disabled;
    if (disabled) {
      setDrawerControlsDisabled(true);
    } else {
      refreshAudioTrimUI();
    }
  }

  function setExportUiActive(active) {
    setControlsDisabled(active);
    exportBar.classList.toggle("is-visible", active);
    if (active) {
      if (exportPct) exportPct.textContent = "0%";
      exportFill.style.width = "0%";
    }
    updateHudVisibility();
  }

  function updateExportProgress(pct, label) {
    exportFill.style.width = `${pct}%`;
    if (exportLabelEl) {
      exportLabelEl.innerHTML = `${label} <span class="ltr-num" id="exportPct">${pct}%</span>`;
    }
  }

  function updateHudVisibility() {
    if (state.exporting || isDrawerOpen() || isHelpOpen()) {
      hudWrap.classList.remove("is-hidden");
      return;
    }
    if (state.hudPinnedHidden) {
      hudWrap.classList.add("is-hidden");
      return;
    }
    const keepOpen = state.hudHover || state.hudFocus;
    hudWrap.classList.toggle("is-hidden", !keepOpen);
  }

  function applyHudMode() {
    hudWrap.classList.toggle("is-top", state.hudDockedTop);
    dockPosBtn.textContent = state.hudDockedTop ? "پایین" : "بالا";
    dockPosBtn.setAttribute("data-tip-state", state.hudDockedTop ? "موقعیت: بالا" : "موقعیت: پایین");
    hudMiniToggle.textContent = state.hudPinnedHidden ? "پلیر (H)" : "مخفی (H)";
    hudMiniToggle.setAttribute("data-tip-state", state.hudPinnedHidden ? "وضعیت: مخفی" : "وضعیت: نمایان");
    tooltips.refresh();
    updateHudVisibility();
    onSavePrefs();
  }

  function wakeHud() {
    if (state.exporting || isDrawerOpen() || isHelpOpen()) {
      hudWrap.classList.remove("is-hidden");
      clearTimeout(state.inactivityTimer);
      return;
    }
    if (state.hudPinnedHidden) {
      hudWrap.classList.add("is-hidden");
      return;
    }
    hudWrap.classList.remove("is-hidden");
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = setTimeout(updateHudVisibility, 2200);
  }

  function hideHudForCapture(hide) {
    hudWrap.classList.toggle("is-hidden", Boolean(hide));
  }

  function renderEventPins(style = state.style) {
    if (!syncEventPins) return;
    const spec = getSlideSpec(style);
    const selected = getSelectedEvent(style);
    const events = Array.isArray(spec.events) ? spec.events : [];
    syncEventPins.textContent = "";

    events.forEach((ev) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-pin" + (ev.id === selected.id ? " is-active" : "");
      btn.dataset.eventId = ev.id;
      btn.setAttribute("aria-pressed", String(ev.id === selected.id));
      btn.setAttribute("data-tip-title", `لنگر رویداد: ${ev.labelFa}`);
      btn.setAttribute("data-tip-body", "انتخاب این نقطه برای هم تراز کردن با اوج موزیک");
      btn.setAttribute("data-tip-state", `زمان در اسلاید: ${ev.t.toFixed(2)}s`);
      btn.disabled = Boolean(state.exporting);

      const labelSpan = document.createElement("span");
      labelSpan.textContent = `◆ ${ev.labelFa}`;
      const timeSpan = document.createElement("span");
      timeSpan.className = "event-pin-time";
      timeSpan.textContent = `${ev.t.toFixed(1)}s`;

      btn.appendChild(labelSpan);
      btn.appendChild(timeSpan);
      btn.addEventListener("click", () => {
        const cfg = audio.getSyncSettings(state.style);
        cfg.selectedEventId = ev.id;
        renderEventPins(state.style);
        drawSyncWaveform();
        wakeHud();
      });
      syncEventPins.appendChild(btn);
    });
  }

  function drawSyncWaveform() {
    if (!syncWaveCanvas) return;
    const wCtx = syncWaveCanvas.getContext("2d");
    const W = syncWaveCanvas.width;
    const H = syncWaveCanvas.height;
    wCtx.clearRect(0, 0, W, H);

    const st = state.style;
    const spec = getSlideSpec(st);
    const analysis = audio.trackAnalyses[st];
    const hasCustom = Boolean(audio.customArrayBuffers[st]);
    const cfg = audio.getSyncSettings(st);
    const plan = audio.getTempoPlan(st);

    if (!analysis || !analysis.peaks) {
      wCtx.fillStyle = "rgba(148, 163, 184, 0.25)";
      wCtx.fillRect(10, H * 0.5 - 1, W - 20, 2);
      return;
    }

    const dur = Math.max(0.1, analysis.duration);
    const rate = plan.audioRate || 1.0;
    const clipSpeed = plan.clipSpeed || 1.0;
    const winStart = hasCustom ? (cfg.startOffset || 0) : 0;
    const winDur = Math.min(dur - winStart, plan.effectiveDuration * rate);

    // 1. Amber beat/bar ticks
    if (!analysis.isRubato && Array.isArray(analysis.barTimes)) {
      for (let i = 0; i < analysis.barTimes.length; i++) {
        const x = Math.round((analysis.barTimes[i] / dur) * W);
        wCtx.fillStyle = "rgba(245, 158, 11, 0.24)";
        wCtx.fillRect(x, 2, 1, H - 4);
        wCtx.fillStyle = "rgba(245, 158, 11, 0.72)";
        wCtx.fillRect(x, 0, 1.5, 4);
        wCtx.fillRect(x, H - 4, 1.5, 4);
      }
    }

    // Salient anchor peak ticks in amber
    if (Array.isArray(analysis.anchorPeaks)) {
      wCtx.fillStyle = "rgba(245, 158, 11, 0.85)";
      for (let i = 0; i < analysis.anchorPeaks.length; i++) {
        const pk = analysis.anchorPeaks[i];
        const px = Math.round((pk.timeSec / dur) * W);
        const hTick = pk.kind === "drop" ? 6 : 3;
        wCtx.fillRect(px - 0.5, H - hTick, 2, hTick);
      }
    }

    // 2. Sky active slice window
    const x0 = clamp((winStart / dur) * W, 0, W);
    const x1 = clamp(((winStart + winDur) / dur) * W, x0 + 6, W);
    wCtx.fillStyle = "rgba(56, 189, 248, 0.16)";
    wCtx.fillRect(x0, 0, x1 - x0, H);
    wCtx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    wCtx.lineWidth = 1.5;
    wCtx.strokeRect(x0 + 0.5, 0.5, Math.max(2, x1 - x0 - 1), H - 1);

    // 3. Waveform peaks
    const peaks = analysis.peaks;
    const barW = W / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const bx = i * barW;
      const inWin = bx >= x0 && bx <= x1;
      const bh = Math.max(3, peaks[i] * (H - 12));
      wCtx.fillStyle = inWin ? "#38bdf8" : "rgba(148, 163, 184, 0.38)";
      wCtx.fillRect(bx + 0.5, (H - bh) * 0.5, Math.max(1.5, barW - 1.2), bh);
    }

    // 4. Violet Event Pin diamond + vertical stem
    const selectedEv = getSelectedEvent(st);
    const events = Array.isArray(spec.events) ? spec.events : [selectedEv];
    events.forEach((ev) => {
      if (ev.id === selectedEv.id) return;
      const ex = clamp(((winStart + (ev.t / clipSpeed) * rate) / dur) * W, 3, W - 3);
      wCtx.fillStyle = "rgba(167, 139, 250, 0.35)";
      wCtx.fillRect(ex - 0.5, 6, 1, H - 10);
    });

    const pinX = clamp(((winStart + (selectedEv.t / clipSpeed) * rate) / dur) * W, 5, W - 5);
    wCtx.fillStyle = "rgba(167, 139, 250, 0.9)";
    wCtx.fillRect(pinX - 0.75, 11, 1.5, H - 11);

    wCtx.fillStyle = "#a78bfa";
    wCtx.strokeStyle = "#160c2e";
    wCtx.lineWidth = 1;
    wCtx.beginPath();
    wCtx.moveTo(pinX, 2);
    wCtx.lineTo(pinX + 5, 7.5);
    wCtx.lineTo(pinX, 13);
    wCtx.lineTo(pinX - 5, 7.5);
    wCtx.closePath();
    wCtx.fill();
    wCtx.stroke();

    // 5. White playhead
    const playX = clamp(((winStart + (state.t / clipSpeed) * rate) / dur) * W, x0, x1);
    wCtx.fillStyle = "#f8fafc";
    wCtx.fillRect(playX - 0.75, 0, 1.5, H);
  }

  function syncTimelineUI() {
    const dur = getDuration(state.style);
    const pct = (state.t / dur) * 100;
    timelineSlider.max = String(dur);
    timelineSlider.value = state.t.toFixed(2);
    timelineFill.style.width = `${pct}%`;
    timeReadout.textContent = `${formatTime(state.t, dur)} / ${formatTime(dur, dur)}`;
    if (isDrawerOpen()) {
      drawSyncWaveform();
    }
  }

  function refreshAudioTrimUI() {
    const st = state.style;
    const spec = getSlideSpec(st);
    const hasCustom = Boolean(audio.customArrayBuffers[st]);
    const analysis = audio.trackAnalyses[st];
    const cfg = audio.getSyncSettings(st);
    const plan = audio.getTempoPlan(st);
    const locked = Boolean(state.exporting);

    syncTrackName.textContent = hasCustom ? (audio.customNames[st] || "موزیک دلخواه") : "موزیک پیشفرض";
    uploadAudioBtn.classList.toggle("is-open", isDrawerOpen());
    uploadAudioBtn.setAttribute("data-tip-state", isDrawerOpen() ? "وضعیت: باز" : "وضعیت: بسته");

    updateExportDurationLabel(st);
    renderEventPins(st);

    // 3-Role BPM badges + directional Delta Pill
    syncClipBpmBadge.textContent = `▣ کلیپ ${Math.round(plan.effectiveSlideBpm)} BPM`;

    if (analysis) {
      if (analysis.isRubato) {
        syncMusicBpmBadge.textContent = "♪ ریتم آزاد";
        syncDeltaPill.className = "sync-delta-pill";
        syncDeltaPill.textContent = "آزاد";
      } else {
        syncMusicBpmBadge.textContent = `♪ موزیک ${Math.round(analysis.effectiveBpm)} BPM`;
        const signedDiff = ((analysis.effectiveBpm - spec.targetBpm) / Math.max(1, spec.targetBpm)) * 100;
        const sign = signedDiff >= 0 ? "+" : "";
        const pctStr = `${sign}${signedDiff.toFixed(1)}%`;

        syncDeltaPill.className = "sync-delta-pill";
        if (plan.flexMode === "music_to_clip" && plan.canSync) {
          syncDeltaPill.classList.add("is-music-flex");
          syncDeltaPill.textContent = `${pctStr} ♪→▣`;
        } else if (plan.flexMode === "clip_to_music" && plan.canSync) {
          syncDeltaPill.classList.add("is-clip-flex");
          syncDeltaPill.textContent = `${pctStr} ▣→♪`;
        } else if (plan.flexMode === "balanced" && plan.canSync) {
          syncDeltaPill.classList.add("is-balanced-flex");
          syncDeltaPill.textContent = `${pctStr} ♪⇄▣`;
        } else {
          syncDeltaPill.textContent = pctStr;
        }
      }

      syncCompatBadge.className = "sync-badge";
      if (analysis.status === "compatible") {
        syncCompatBadge.classList.add("is-good");
        syncCompatBadge.textContent = `همگام عالی (${analysis.deltaPct}%)`;
      } else if (analysis.status === "stretchable") {
        syncCompatBadge.classList.add("is-stretch");
        syncCompatBadge.textContent = `قابل تطبیق (${analysis.deltaPct}%)`;
      } else if (analysis.status === "rubato") {
        syncCompatBadge.textContent = "ریتم آزاد";
      } else {
        syncCompatBadge.classList.add("is-warn");
        syncCompatBadge.textContent = `اختلاف زیاد (${analysis.deltaPct}%)`;
      }

      if (hasCustom && analysis.recommendedSlideId && SLIDE_REGISTRY[analysis.recommendedSlideId]) {
        const rec = SLIDE_REGISTRY[analysis.recommendedSlideId];
        syncTransferSlideBtn.hidden = false;
        syncTransferSlideBtn.disabled = locked;
        syncTransferSlideBtn.dataset.targetSlide = rec.id;
        syncTransferSlideBtn.textContent = `مناسب تر برای «${rec.labelFa}» ↗`;
      } else {
        syncTransferSlideBtn.hidden = true;
      }
    } else {
      syncMusicBpmBadge.textContent = `♪ موزیک ${Math.round(spec.targetBpm)} BPM`;
      syncDeltaPill.className = "sync-delta-pill";
      syncDeltaPill.textContent = "0%";
      syncCompatBadge.className = "sync-badge";
      syncCompatBadge.textContent = "پیشفرض";
      syncTransferSlideBtn.hidden = true;
    }

    // Flex mode selector
    const canFlex = Boolean(hasCustom && analysis && !analysis.isRubato && analysis.status !== "mismatch");
    flexModeBtns.forEach((b) => {
      const m = b.dataset.flexMode;
      b.disabled = locked || (m !== "off" && !canFlex);
      const isAct = (m === plan.flexMode) || (!canFlex && m === "off");
      b.classList.toggle("is-active", isAct);
      b.setAttribute("aria-pressed", String(isAct));
    });

    // Pitch-lock toggle
    const pitchEligible = Boolean(canFlex && (plan.flexMode === "music_to_clip" || plan.flexMode === "balanced"));
    const pitchOn = Boolean(pitchEligible && cfg.pitchLock);
    pitchLockBtn.disabled = locked || !pitchEligible;
    pitchLockBtn.classList.toggle("is-active", pitchOn);
    pitchLockBtn.setAttribute("aria-pressed", String(pitchOn));
    pitchLockBtn.setAttribute("data-tip-state", pitchOn ? "وضعیت: روشن (WSOLA)" : "وضعیت: خاموش");

    // Inline Clip Speed stepper
    const curSpeed = plan.clipSpeed || 1.0;
    clipSpeedReadout.textContent = `×${curSpeed.toFixed(2)}`;
    clipSpeedReadout.setAttribute(
      "data-tip-state",
      `مدت موثر: ${formatDurationLabel(plan.effectiveDuration)} | ریتم کلیپ: ${Math.round(plan.effectiveSlideBpm)} BPM`
    );
    clipSpeedMinusBtn.disabled = locked || curSpeed <= 0.851;
    clipSpeedPlusBtn.disabled = locked || curSpeed >= 1.149;
    clipSpeedReadout.disabled = locked;

    // Beat Magnet toggle
    const magnetOn = Boolean(cfg.beatMagnet !== false && (!analysis || !analysis.isRubato));
    beatMagnetBtn.disabled = locked || !hasCustom || Boolean(analysis && analysis.isRubato);
    beatMagnetBtn.classList.toggle("is-active", hasCustom && magnetOn);
    beatMagnetBtn.setAttribute("aria-pressed", String(Boolean(hasCustom && magnetOn)));
    beatMagnetBtn.setAttribute("data-tip-state", magnetOn ? "وضعیت: روشن" : "وضعیت: خاموش");

    // Auto-Loop toggle
    autoLoopBtn.disabled = locked || !hasCustom;
    autoLoopBtn.classList.toggle("is-active", hasCustom && Boolean(cfg.autoLoop));
    autoLoopBtn.setAttribute("aria-pressed", String(Boolean(hasCustom && cfg.autoLoop)));
    autoLoopBtn.setAttribute("data-tip-state", cfg.autoLoop ? "وضعیت: روشن" : "وضعیت: خاموش");

    // Ending Fade 3-state button
    const fadeMode = FADE_LABELS[cfg.endingFade] ? cfg.endingFade : "soft";
    endingFadeBtn.disabled = locked;
    endingFadeBtn.dataset.fadeMode = fadeMode;
    endingFadeBtn.textContent = FADE_LABELS[fadeMode];
    endingFadeBtn.setAttribute("data-tip-state", `حالت فعلی: ${FADE_LABELS[fadeMode]}`);

    // Anchor Magnet & Nudge controls
    snapToPeakBtn.disabled = locked || !analysis;
    pickAudioFileBtn.disabled = locked;
    closeTrimBtn.disabled = locked;
    resetAudioBtn.disabled = locked || !hasCustom;
    trimMinusBtn.disabled = locked || !hasCustom;
    trimPlusBtn.disabled = locked || !hasCustom;
    nudgeBarMinusBtn.disabled = locked || !hasCustom;
    nudgeBarPlusBtn.disabled = locked || !hasCustom;

    // Top-3 Slice Chips
    syncSliceChips.forEach((btn, idx) => {
      const sl = analysis && analysis.topSlices && analysis.topSlices[idx];
      btn.disabled = locked || !(hasCustom && sl);
      btn.textContent = sl ? `${sl.label} (${fmtMMSS(sl.startSec)})` : `${idx + 1}. --`;
      btn.classList.toggle("is-active", Boolean(hasCustom && sl && cfg.activeSliceIdx === idx));
    });

    // Time range readout
    if (analysis && hasCustom) {
      const off = cfg.startOffset || 0;
      const end = Math.min(analysis.duration, off + plan.effectiveDuration * plan.audioRate);
      const shortTag = analysis.isShort ? (cfg.autoLoop ? " | چرخه" : " | کوتاه") : "";
      trimInfoText.textContent = `${fmtMMSS(off)} - ${fmtMMSS(end)} / ${fmtMMSS(analysis.duration)}${shortTag}`;
    } else {
      trimInfoText.textContent = `پیشفرض (${Math.round(plan.effectiveSlideBpm)} BPM)`;
    }

    tooltips.refresh();
    drawSyncWaveform();
  }

  async function applySyncChange(patch, toastMsg = "", { seekToPreroll = false } = {}) {
    await audio.updateSyncSettings(state.style, patch);
    if (seekToPreroll) {
      const ev = getSelectedEvent(state.style);
      onSeek(getPrerollTimeForEvent(ev, state.style));
    } else {
      onSeek(state.t);
    }
    refreshAudioTrimUI();
    if (toastMsg) showToast(toastMsg);
    wakeHud();
  }

  async function loadAudioFile(file) {
    if (!file) return false;
    showToast("در حال تحلیل ریتم و پیدا کردن بهترین بازه...");
    const ab = await file.arrayBuffer();
    const res = await audio.setCustomTrack(state.style, ab, file.name);
    if (res && res.decoded) {
      if (audio.muted) toggleMute();
      onSeek(0.0);
      audioSyncDrawer.classList.add("is-visible");
      refreshAudioTrimUI();
      const a = res.analysis;
      const msg = a.isRubato
        ? "موزیک با ریتم آزاد فعال شد"
        : `ریتم ${Math.round(a.effectiveBpm)} BPM تشخیص داده شد | بهترین بازه قفل شد`;
      showToast(msg);
      wakeHud();
      return true;
    }
    showToast("فایل صوتی قابل خواندن نبود");
    wakeHud();
    return false;
  }

  async function snapSelectedEventToPeak({ useCurrentPlayhead = false } = {}) {
    const st = state.style;
    audio.ensure(true);
    const analysis = audio.trackAnalyses[st] || await audio.ensureAnalysis(st);
    if (!analysis) {
      showToast("ابتدا موزیک را بارگذاری کنید");
      return null;
    }
    const cfg = audio.getSyncSettings(st);
    const plan = audio.getTempoPlan(st);
    const ev = getSelectedEvent(st);
    const curEventTrackSec = (cfg.startOffset || 0) + (ev.t / plan.clipSpeed) * plan.audioRate;

    let targetPeakSec = curEventTrackSec;
    if (!useCurrentPlayhead && Array.isArray(analysis.anchorPeaks) && analysis.anchorPeaks.length > 0) {
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < analysis.anchorPeaks.length; i++) {
        const pk = analysis.anchorPeaks[i];
        const d = Math.abs(pk.timeSec - curEventTrackSec);
        if (d <= 2.5 && (!best || pk.strength > best.strength + 0.08 || (Math.abs(pk.strength - best.strength) <= 0.08 && d < bestDist))) {
          best = pk;
          bestDist = d;
        }
      }
      if (!best) {
        for (let i = 0; i < analysis.anchorPeaks.length; i++) {
          const pk = analysis.anchorPeaks[i];
          const d = Math.abs(pk.timeSec - curEventTrackSec);
          if (d < bestDist) {
            best = pk;
            bestDist = d;
          }
        }
      }
      if (best) targetPeakSec = best.timeSec;
    } else if (useCurrentPlayhead) {
      targetPeakSec = (cfg.startOffset || 0) + (state.t / plan.clipSpeed) * plan.audioRate;
    }

    const res = await audio.applyAnchorMagnet(st, targetPeakSec, ev.t);
    const preroll = getPrerollTimeForEvent(ev, st);
    onSeek(preroll);
    if (!state.playing) onSetPlaying(true);
    refreshAudioTrimUI();
    showToast(`«${ev.labelFa}» روی اوج ${res.trackPeakSec.toFixed(1)}s قفل شد`);
    wakeHud();
    return res;
  }

  async function toggleSyncDrawer() {
    if (state.exporting) return;
    const opening = !isDrawerOpen();
    audioSyncDrawer.classList.toggle("is-visible", opening);
    if (opening) {
      audio.ensure(true);
      await audio.ensureAnalysis(state.style);
    }
    refreshAudioTrimUI();
    wakeHud();
  }

  function closeSyncDrawer() {
    if (!isDrawerOpen()) return;
    audioSyncDrawer.classList.remove("is-visible");
    refreshAudioTrimUI();
    wakeHud();
  }

  function cycleFlexMode() {
    const st = state.style;
    const hasCustom = Boolean(audio.customArrayBuffers[st]);
    const analysis = audio.trackAnalyses[st];
    if (!hasCustom || !analysis || analysis.isRubato || analysis.status === "mismatch") {
      showToast("برای تغییر حالت تطبیق، ابتدا موزیک سازگار انتخاب کنید");
      return;
    }
    const plan = audio.getTempoPlan(st);
    const idx = FLEX_ORDER.indexOf(plan.flexMode);
    const next = FLEX_ORDER[(idx + 1) % FLEX_ORDER.length];
    applySyncChange({ flexMode: next }, `حالت تطبیق: ${FLEX_LABELS[next]}`);
  }

  function togglePitchLock() {
    const st = state.style;
    const hasCustom = Boolean(audio.customArrayBuffers[st]);
    const analysis = audio.trackAnalyses[st];
    const plan = audio.getTempoPlan(st);
    if (!hasCustom || !analysis || analysis.isRubato || analysis.status === "mismatch") return;
    if (plan.flexMode !== "music_to_clip" && plan.flexMode !== "balanced") return;
    const cfg = audio.getSyncSettings(st);
    const next = !cfg.pitchLock;
    applySyncChange({ pitchLock: next }, next ? "حفظ تُن صدا (WSOLA) روشن شد" : "حفظ تُن صدا خاموش شد");
  }

  function setClipSpeed(nextSpeed) {
    const st = state.style;
    const clamped = Math.round(clamp(nextSpeed, 0.85, 1.15) * 100) / 100;
    const cfg = audio.getSyncSettings(st);
    const patch = { clipSpeed: clamped };
    if (cfg.flexMode === "clip_to_music" || cfg.flexMode === "balanced") {
      const hasCustom = Boolean(audio.customArrayBuffers[st]);
      const a = audio.trackAnalyses[st];
      patch.flexMode = (hasCustom && a && !a.isRubato && a.status !== "mismatch") ? "music_to_clip" : "off";
    }
    applySyncChange(patch, `سرعت کلیپ: ×${clamped.toFixed(2)}`);
  }

  function toggleBeatMagnet() {
    const st = state.style;
    const cfg = audio.getSyncSettings(st);
    const next = !(cfg.beatMagnet !== false);
    cfg.beatMagnet = next;
    refreshAudioTrimUI();
    showToast(next ? "آهنربای ضرب روشن شد" : "آهنربای ضرب خاموش شد");
    wakeHud();
  }

  function toggleAutoLoop() {
    if (!audio.customArrayBuffers[state.style]) return;
    const cfg = audio.getSyncSettings(state.style);
    const next = !cfg.autoLoop;
    applySyncChange({ autoLoop: next }, next ? "چرخه خودکار روی ضرب فعال شد" : "چرخه خودکار خاموش شد");
  }

  function cycleEndingFade() {
    const cfg = audio.getSyncSettings(state.style);
    const cur = FADE_ORDER.includes(cfg.endingFade) ? cfg.endingFade : "soft";
    const next = FADE_ORDER[(FADE_ORDER.indexOf(cur) + 1) % FADE_ORDER.length];
    applySyncChange({ endingFade: next }, `پایان بندی صدا: ${FADE_LABELS[next]}`);
  }

  function nudgeBar(dir) {
    if (!audio.customArrayBuffers[state.style]) return;
    const a = audio.trackAnalyses[state.style];
    const step = (a && !a.isRubato && a.barPeriodSec > 0.25) ? a.barPeriodSec : 1.0;
    const cur = audio.getSyncSettings(state.style).startOffset || 0;
    applySyncChange({ startOffset: cur + dir * step, activeSliceIdx: -1 });
  }

  function nudgeFine(deltaSec) {
    if (!audio.customArrayBuffers[state.style]) return;
    const cur = audio.getSyncSettings(state.style).startOffset || 0;
    applySyncChange({ startOffset: cur + deltaSec, activeSliceIdx: -1 });
  }

  function selectSlice(idx) {
    if (!audio.customArrayBuffers[state.style]) return;
    const a = audio.trackAnalyses[state.style];
    const sl = a && a.topSlices && a.topSlices[idx];
    if (!sl) return;
    applySyncChange({ startOffset: sl.startSec, activeSliceIdx: idx });
  }

  function toggleMute() {
    const nextMuted = !audio.muted;
    audio.setMuted(nextMuted);
    soundBtn.textContent = nextMuted ? "بی صدا" : "با صدا";
    soundBtn.classList.toggle("is-active", !nextMuted);
    soundBtn.setAttribute("aria-pressed", String(!nextMuted));
    soundBtn.setAttribute("data-tip-state", nextMuted ? "وضعیت: بی صدا" : "وضعیت: با صدا");
    tooltips.refresh();
    wakeHud();
  }

  // Help & Shortcuts Modal
  function renderHelpModal() {
    if (!helpGrid || !shortcuts) return;
    const all = shortcuts.getAll();
    const groups = new Map();
    all.forEach((item) => {
      if (!groups.has(item.group)) {
        groups.set(item.group, { title: item.groupFa, items: [] });
      }
      groups.get(item.group).items.push(item);
    });

    helpGrid.textContent = "";
    groups.forEach((grp) => {
      const card = document.createElement("section");
      card.className = "help-group";

      const heading = document.createElement("h3");
      heading.className = "help-group-title";
      heading.textContent = grp.title;
      card.appendChild(heading);

      grp.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "help-item";

        const label = document.createElement("span");
        label.className = "help-item-label";
        label.textContent = item.labelFa;

        const kbdBtn = document.createElement("button");
        kbdBtn.type = "button";
        kbdBtn.className = "help-kbd";
        kbdBtn.dataset.actionId = item.id;
        if (capturingActionId === item.id) {
          kbdBtn.classList.add("is-capturing");
          kbdBtn.textContent = "کلید جدید...";
        } else {
          if (item.isCustom) kbdBtn.classList.add("is-custom");
          kbdBtn.textContent = item.combo ? formatCombo(item.combo) : "خالی";
        }
        kbdBtn.addEventListener("click", () => {
          capturingActionId = capturingActionId === item.id ? null : item.id;
          renderHelpModal();
        });

        row.appendChild(label);
        row.appendChild(kbdBtn);
        card.appendChild(row);
      });

      helpGrid.appendChild(card);
    });
  }

  function openHelpModal() {
    if (!helpModal || state.exporting) return;
    capturingActionId = null;
    renderHelpModal();
    helpModal.hidden = false;
    tooltips.hide();
    updateHudVisibility();
  }

  function closeHelpModal() {
    if (!helpModal || helpModal.hidden) return;
    capturingActionId = null;
    helpModal.hidden = true;
    wakeHud();
  }

  function toggleHelpModal() {
    if (isHelpOpen()) closeHelpModal();
    else openHelpModal();
  }

  function isCapturingShortcut() {
    return Boolean(capturingActionId && isHelpOpen());
  }

  function handleRebindKeydown(e) {
    if (!isCapturingShortcut()) return false;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === "Escape") {
      capturingActionId = null;
      renderHelpModal();
      return true;
    }

    const combo = eventToCombo(e);
    if (!combo) return true;

    const targetId = capturingActionId;
    const res = shortcuts.rebind(targetId, combo);
    capturingActionId = null;
    renderHelpModal();
    tooltips.refresh();
    if (res.ok) {
      const msg = res.conflictClearedId
        ? `میانبر روی ${formatCombo(combo)} ثبت شد و تداخل قبلی پاک شد`
        : `میانبر روی ${formatCombo(combo)} ثبت شد`;
      showToast(msg);
    }
    return true;
  }

  function closeTopOverlay() {
    if (isHelpOpen()) {
      closeHelpModal();
      return true;
    }
    if (isDrawerOpen()) {
      closeSyncDrawer();
      return true;
    }
    return false;
  }

  // Event bindings
  styleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      onStyleChange(btn.dataset.style);
      wakeHud();
    });
  });

  playPauseBtn.addEventListener("click", () => {
    onSetPlaying(!state.playing);
    wakeHud();
  });

  canvas.addEventListener("click", () => {
    if (state.exporting) return;
    onSetPlaying(!state.playing);
    wakeHud();
  });

  restartBtn.addEventListener("click", () => {
    onRestart();
    wakeHud();
  });

  aspectBtn.addEventListener("click", () => {
    onAspectChange(state.aspect === "9:16" ? "16:9" : "9:16");
    wakeHud();
  });

  soundBtn.addEventListener("click", toggleMute);

  timelineSlider.addEventListener("input", () => {
    const nextT = clamp(parseFloat(timelineSlider.value) || 0, 0, getDuration(state.style));
    onSeek(nextT);
    wakeHud();
  });

  uploadAudioBtn.addEventListener("click", toggleSyncDrawer);
  closeTrimBtn.addEventListener("click", closeSyncDrawer);

  pickAudioFileBtn.addEventListener("click", () => {
    audioFileInput.value = "";
    audioFileInput.click();
    wakeHud();
  });

  audioFileInput.addEventListener("change", async () => {
    const file = audioFileInput.files && audioFileInput.files[0];
    if (file) await loadAudioFile(file);
  });

  // Stage Drag & Drop
  if (stageEl) {
    let dragCounter = 0;
    const isFileDrag = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");

    window.addEventListener("dragover", (e) => {
      if (isFileDrag(e)) e.preventDefault();
    });
    window.addEventListener("drop", (e) => {
      if (isFileDrag(e)) e.preventDefault();
    });

    stageEl.addEventListener("dragenter", (e) => {
      if (!isFileDrag(e) || state.exporting) return;
      e.preventDefault();
      dragCounter++;
      stageEl.classList.add("is-dragover");
    });

    stageEl.addEventListener("dragover", (e) => {
      if (!isFileDrag(e) || state.exporting) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    stageEl.addEventListener("dragleave", (e) => {
      if (!isFileDrag(e)) return;
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) stageEl.classList.remove("is-dragover");
    });

    stageEl.addEventListener("drop", async (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragCounter = 0;
      stageEl.classList.remove("is-dragover");
      if (state.exporting) return;
      const files = Array.from(e.dataTransfer.files || []);
      const audioFile = files.find((f) => /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name) || (f.type && f.type.startsWith("audio/")));
      if (!audioFile) {
        showToast("لطفاً یک فایل صوتی MP3 یا WAV رها کنید");
        return;
      }
      await loadAudioFile(audioFile);
    });
  }

  syncSliceChips.forEach((btn, idx) => {
    btn.addEventListener("click", () => selectSlice(idx));
  });

  flexModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.flexMode;
      applySyncChange({ flexMode: mode }, `حالت تطبیق: ${FLEX_LABELS[mode] || mode}`);
    });
  });

  pitchLockBtn.addEventListener("click", togglePitchLock);
  clipSpeedMinusBtn.addEventListener("click", () => {
    const plan = audio.getTempoPlan(state.style);
    setClipSpeed(plan.clipSpeed - 0.01);
  });
  clipSpeedPlusBtn.addEventListener("click", () => {
    const plan = audio.getTempoPlan(state.style);
    setClipSpeed(plan.clipSpeed + 0.01);
  });
  clipSpeedReadout.addEventListener("dblclick", () => setClipSpeed(1.0));

  snapToPeakBtn.addEventListener("click", () => snapSelectedEventToPeak({ useCurrentPlayhead: false }));
  beatMagnetBtn.addEventListener("click", toggleBeatMagnet);
  autoLoopBtn.addEventListener("click", toggleAutoLoop);
  endingFadeBtn.addEventListener("click", cycleEndingFade);
  nudgeBarMinusBtn.addEventListener("click", () => nudgeBar(-1));
  nudgeBarPlusBtn.addEventListener("click", () => nudgeBar(1));
  trimMinusBtn.addEventListener("click", () => nudgeFine(-0.1));
  trimPlusBtn.addEventListener("click", () => nudgeFine(0.1));

  syncTransferSlideBtn.addEventListener("click", async () => {
    const target = syncTransferSlideBtn.dataset.targetSlide;
    const srcAb = audio.customArrayBuffers[state.style];
    const srcName = audio.customNames[state.style] || "موزیک دلخواه";
    if (!target || !srcAb) return;
    const copy = srcAb.slice(0);
    onStyleChange(target);
    await audio.setCustomTrack(target, copy, srcName);
    onSeek(0.0);
    refreshAudioTrimUI();
    showToast(`موزیک به «${SLIDE_REGISTRY[target].labelFa}» منتقل و همگام شد`);
    wakeHud();
  });

  let waveDragging = false;
  function scrubWaveformAtClientX(clientX, commit = false) {
    const st = state.style;
    if (!audio.customArrayBuffers[st] || state.exporting) return;
    const a = audio.trackAnalyses[st];
    if (!a) return;
    const rect = syncWaveCanvas.getBoundingClientRect();
    const frac = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    let sec = frac * a.duration;
    const cfg = audio.getSyncSettings(st);
    if (cfg.beatMagnet !== false && !a.isRubato) {
      sec = snapToAnchorPeak(sec, a, 0.25);
    }
    cfg.startOffset = clamp(sec, 0, Math.max(0, a.duration - 0.5));
    cfg.activeSliceIdx = -1;
    drawSyncWaveform();
    if (commit) {
      applySyncChange({ startOffset: cfg.startOffset, activeSliceIdx: -1 });
    }
  }

  syncWaveCanvas.addEventListener("pointerdown", (e) => {
    if (!audio.customArrayBuffers[state.style] || state.exporting) return;
    waveDragging = true;
    syncWaveCanvas.setPointerCapture(e.pointerId);
    scrubWaveformAtClientX(e.clientX, false);
  });
  syncWaveCanvas.addEventListener("pointermove", (e) => {
    if (!waveDragging) return;
    scrubWaveformAtClientX(e.clientX, false);
  });
  syncWaveCanvas.addEventListener("pointerup", (e) => {
    if (!waveDragging) return;
    waveDragging = false;
    scrubWaveformAtClientX(e.clientX, true);
  });

  resetAudioBtn.addEventListener("click", async () => {
    audio.resetCustomTrack(state.style);
    onSeek(0.0);
    await audio.ensureAnalysis(state.style);
    refreshAudioTrimUI();
    showToast("موزیک پیشفرض این اسلاید بازگردانی شد");
    wakeHud();
  });

  exportVideoBtn.addEventListener("click", () => onStartExport());
  exportPngBtn.addEventListener("click", () => onExportPng());
  cancelExportBtn.addEventListener("click", () => onCancelExport());

  if (helpBtn) helpBtn.addEventListener("click", toggleHelpModal);
  if (closeHelpBtn) closeHelpBtn.addEventListener("click", closeHelpModal);
  if (helpBackdrop) helpBackdrop.addEventListener("click", closeHelpModal);
  if (resetShortcutsBtn) {
    resetShortcutsBtn.addEventListener("click", () => {
      if (!shortcuts) return;
      shortcuts.resetAll();
      capturingActionId = null;
      renderHelpModal();
      tooltips.refresh();
      showToast("میانبرها به حالت پیشفرض برگشتند");
    });
  }

  hudPanel.addEventListener("mouseenter", () => { state.hudHover = true; wakeHud(); });
  hudPanel.addEventListener("mouseleave", () => { state.hudHover = false; wakeHud(); });
  hudPanel.addEventListener("focusin", () => { state.hudFocus = true; wakeHud(); });
  hudPanel.addEventListener("focusout", () => { state.hudFocus = false; wakeHud(); });
  window.addEventListener("mousemove", wakeHud, { passive: true });
  window.addEventListener("touchstart", wakeHud, { passive: true });

  hudMiniToggle.addEventListener("click", () => {
    state.hudPinnedHidden = !state.hudPinnedHidden;
    applyHudMode();
  });
  prevActBtn.addEventListener("click", () => { onJumpAct(-1); wakeHud(); });
  nextActBtn.addEventListener("click", () => { onJumpAct(1); wakeHud(); });
  dockPosBtn.addEventListener("click", () => {
    state.hudDockedTop = !state.hudDockedTop;
    applyHudMode();
  });

  return {
    showToast,
    updateTimelineChrome,
    updateStyleButtons,
    updateAspectButton,
    updatePlayButton,
    setExportUiActive,
    updateExportProgress,
    updateHudVisibility,
    applyHudMode,
    wakeHud,
    hideHudForCapture,
    syncTimelineUI,
    refreshAudioTrimUI,
    drawSyncWaveform,
    toggleMute,
    toggleSyncDrawer,
    closeSyncDrawer,
    cycleFlexMode,
    togglePitchLock,
    setClipSpeed,
    toggleBeatMagnet,
    toggleAutoLoop,
    cycleEndingFade,
    nudgeBar,
    nudgeFine,
    selectSlice,
    snapSelectedEventToPeak,
    openHelpModal,
    closeHelpModal,
    toggleHelpModal,
    isHelpOpen,
    isDrawerOpen,
    isCapturingShortcut,
    handleRebindKeydown,
    closeTopOverlay,
    loadAudioFile,
  };
}
