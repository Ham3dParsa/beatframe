import { SLIDE_REGISTRY, getSlideSpec, getDuration, clamp } from "./core/registry.js";
import { createShortcutStore } from "./core/shortcuts.js";
import { REEL_RENDERERS, renderReel } from "./reels/index.js";
import { StudioAudioEngine } from "./engine/audio-sync.js";
import { FastStartMP4Exporter } from "./engine/exporter.js";
import { createStudioHud } from "./ui/studio-hud.js";

const STORAGE_KEY = "hamzaban_reels_prefs_v1";

const canvas = document.getElementById("reelCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const audio = new StudioAudioEngine();
const shortcuts = createShortcutStore();

const state = {
  style: "bit2",
  aspect: "9:16",
  t: 0.0,
  playing: true,
  exporting: false,
  lastFrameMs: performance.now(),
  hudHover: false,
  hudFocus: false,
  hudPinnedHidden: false,
  hudDockedTop: false,
  inactivityTimer: null,
  toastTimer: null,
  exporter: null,
  exportCancelFlag: false,
};

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      style: state.style,
      aspect: state.aspect,
      hudDockedTop: state.hudDockedTop,
      hudPinnedHidden: state.hudPinnedHidden,
    }));
  } catch (_e) {}
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function renderFrame(t) {
  const W = canvas.width;
  const H = canvas.height;
  const isPortrait = state.aspect === "9:16";
  renderReel(state.style, ctx, W, H, t, isPortrait);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const hud = createStudioHud({
  state,
  audio,
  canvas,
  shortcuts,
  onStyleChange: applyStyle,
  onAspectChange: applyAspect,
  onSetPlaying: setPlaying,
  onRestart: restartPlayback,
  onJumpAct: jumpAct,
  onSeek: seekTo,
  onStartExport: startVideoExport,
  onExportPng: exportPNG,
  onCancelExport: cancelVideoExport,
  onSavePrefs: savePrefs,
});

function applyAspect(aspect) {
  state.aspect = aspect === "16:9" ? "16:9" : "9:16";
  const isPortrait = state.aspect === "9:16";
  canvas.width = isPortrait ? 1080 : 1920;
  canvas.height = isPortrait ? 1920 : 1080;
  hud.updateAspectButton(state.aspect);
  savePrefs();
  renderFrame(state.t);
}

function applyStyle(style) {
  if (!REEL_RENDERERS[style]) return;
  state.style = style;
  state.t = 0.0;
  audio.resetCues(true);
  hud.updateStyleButtons(style);
  hud.updateTimelineChrome(style);
  hud.refreshAudioTrimUI();
  savePrefs();
  renderFrame(state.t);
  hud.syncTimelineUI();
}

function setPlaying(p) {
  state.playing = p;
  hud.updatePlayButton(p);
  if (!p) audio.stopAll();
  state.lastFrameMs = performance.now();
  hud.updateHudVisibility();
}

function seekTo(sec) {
  state.t = clamp(sec, 0, getDuration(state.style));
  audio.resetCues(true);
  renderFrame(state.t);
  hud.syncTimelineUI();
}

function restartPlayback() {
  seekTo(0.0);
  if (!state.playing) setPlaying(true);
}

function jumpAct(dir) {
  const acts = getSlideSpec(state.style).acts;
  const cur = state.t;
  let target = acts[0];
  if (dir > 0) {
    target = acts.find((a) => a > cur + 0.15) ?? 0;
  } else {
    const prevs = acts.filter((a) => a < cur - 0.25);
    target = prevs.length ? prevs[prevs.length - 1] : acts[acts.length - 1];
  }
  seekTo(target);
}

function exportPNG() {
  const aspectTag = state.aspect === "9:16" ? "9x16" : "16x9";
  const timeTag = state.t.toFixed(1).replace(".", "s");
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `beatframe-${state.style}-${aspectTag}-${timeTag}.png`);
    hud.showToast("عکس PNG ذخیره شد");
  }, "image/png");
}

function cancelVideoExport() {
  state.exportCancelFlag = true;
  if (state.exporter) state.exporter.cancel();
}

async function startVideoExport(opts = {}) {
  if (state.exporting) return null;

  state.exporting = true;
  state.exportCancelFlag = false;
  state.playing = false;
  audio.stopAll();
  hud.setExportUiActive(true);

  const exporter = new FastStartMP4Exporter({
    canvas,
    audio,
    renderFrame,
    syncTimelineUI: hud.syncTimelineUI,
    onProgress: hud.updateExportProgress,
    onTimeChange: (t) => { state.t = t; },
  });
  state.exporter = exporter;

  let result = null;
  try {
    result = await exporter.run(state.style);
  } catch (err) {
    console.error("Video export error:", err);
    hud.showToast("خطا در خروجی ویدیو");
  } finally {
    state.exporting = false;
    state.exporter = null;
    hud.setExportUiActive(false);
    if (!opts.keepPaused) setPlaying(true);
  }

  if (result && result.blob && !exporter.cancelled) {
    const plan = audio.getTempoPlan(state.style);
    const effDur = plan.effectiveDuration;
    const aspectTag = state.aspect === "9:16" ? "9x16" : "16x9";
    const filename = `beatframe-${state.style}-${aspectTag}-${Math.round(effDur)}s.${result.ext}`;
    window.__LAST_EXPORT__ = { ...result, filename };
    if (!opts.skipDownload) {
      downloadBlob(result.blob, filename);
    }
    const secStr = (result.elapsedMs / 1000).toFixed(1);
    hud.showToast(
      result.tier === "webcodecs-mp4"
        ? `ویدیوی MP4 با صدای همگام در ${secStr} ثانیه آماده شد`
        : `ویدیوی ${effDur.toFixed(1)} ثانیه ای با صدا آماده و دانلود شد`
    );
    return window.__LAST_EXPORT__;
  } else if (exporter.cancelled) {
    hud.showToast("خروجی ویدیو لغو شد");
  }
  return null;
}

const SHORTCUT_HANDLERS = {
  playPause: () => { setPlaying(!state.playing); hud.wakeHud(); },
  restart: () => { restartPlayback(); hud.wakeHud(); },
  mute: () => { hud.toggleMute(); },
  stepBack: () => { seekTo(state.t - 1.0); hud.wakeHud(); },
  stepForward: () => { seekTo(state.t + 1.0); hud.wakeHud(); },
  frameBack: () => { seekTo(state.t - (1 / 30)); hud.wakeHud(); },
  frameForward: () => { seekTo(state.t + (1 / 30)); hud.wakeHud(); },
  prevAct: () => { jumpAct(-1); hud.wakeHud(); },
  nextAct: () => { jumpAct(1); hud.wakeHud(); },
  nudgeBarBack: () => { hud.nudgeBar(-1); },
  nudgeBarForward: () => { hud.nudgeBar(1); },
  nudgeFineBack: () => { hud.nudgeFine(-0.1); },
  nudgeFineForward: () => { hud.nudgeFine(0.1); },
  toggleSyncDrawer: () => { hud.toggleSyncDrawer(); },
  cycleSyncMode: () => { hud.cycleFlexMode(); },
  togglePitchLock: () => { hud.togglePitchLock(); },
  syncClipToMusic: () => { hud.snapSelectedEventToPeak({ useCurrentPlayhead: false }); },
  toggleBeatMagnet: () => { hud.toggleBeatMagnet(); },
  toggleAutoLoop: () => { hud.toggleAutoLoop(); },
  slice1: () => { hud.selectSlice(0); },
  slice2: () => { hud.selectSlice(1); },
  slice3: () => { hud.selectSlice(2); },
  pinAnchor: () => { hud.snapSelectedEventToPeak({ useCurrentPlayhead: true }); },
  slide1: () => { applyStyle("bit2"); hud.wakeHud(); },
  slide2: () => { applyStyle("atashkadeh"); hud.wakeHud(); },
  slide3: () => { applyStyle("kinetic"); hud.wakeHud(); },
  slide4: () => { applyStyle("atashpro"); hud.wakeHud(); },
  slide5: () => { applyStyle("cyberpro"); hud.wakeHud(); },
  toggleHud: () => { state.hudPinnedHidden = !state.hudPinnedHidden; hud.applyHudMode(); },
  toggleAspect: () => { applyAspect(state.aspect === "9:16" ? "16:9" : "9:16"); hud.wakeHud(); },
  exportVideo: () => { startVideoExport(); },
  exportPng: () => { exportPNG(); },
  toggleHelp: () => { hud.toggleHelpModal(); },
  closeOverlay: () => { hud.closeTopOverlay(); },
};

window.addEventListener("keydown", (e) => {
  if (hud.isCapturingShortcut()) {
    hud.handleRebindKeydown(e);
    return;
  }
  if (state.exporting) return;

  const actionId = shortcuts.matchEvent(e);
  if (!actionId) return;

  const handler = SHORTCUT_HANDLERS[actionId];
  if (!handler) return;

  e.preventDefault();
  handler();
});

function tick(now) {
  const dt = Math.min((now - state.lastFrameMs) / 1000, 0.05);
  state.lastFrameMs = now;

  if (state.playing && !state.exporting) {
    const dur = getDuration(state.style);
    const { clipSpeed } = audio.getTempoPlan(state.style);
    const safeSpeed = clipSpeed || 1.0;
    state.t += dt * safeSpeed;
    if (state.t >= dur) {
      state.t = state.t % dur;
      audio.resetCues(true);
    }
    const wallT = state.t / safeSpeed;
    audio.processCues(state.style, wallT);
    renderFrame(state.t);
    hud.syncTimelineUI();
  }
  requestAnimationFrame(tick);
}

// Deterministic verification hook (exposed as both __BEATFRAME__ and __HAMZABAN__)
const studioApi = {
  setStyle: applyStyle,
  setAspect: applyAspect,
  seek: seekTo,
  pause: () => setPlaying(false),
  play: () => setPlaying(true),
  hideHudForCapture: hud.hideHudForCapture,
  exportVideo: (opts) => startVideoExport(opts),
  getLastExport: () => window.__LAST_EXPORT__ || null,
  getRegistry: () => SLIDE_REGISTRY,
  getTempoPlan: (style = state.style) => audio.getTempoPlan(style),
  setClipSpeed: (speed) => hud.setClipSpeed(speed),
  applyAnchorMagnet: (trackPeakSec, reelEventSec) => audio.applyAnchorMagnet(state.style, trackPeakSec, reelEventSec),
  toggleSyncDrawer: () => hud.toggleSyncDrawer(),
  toggleHelpModal: () => hud.toggleHelpModal(),
  getShortcuts: () => shortcuts.getAll(),
  ensureAudioLoaded: async (style = state.style) => {
    audio.ensure(true);
    const buf = await audio.ensureMusicBuffer(style);
    return buf ? { duration: buf.duration, sampleRate: buf.sampleRate, channels: buf.numberOfChannels } : null;
  },
  analyzeTrackForTest: async (style, uint8Array, fileName = "test.mp3") => {
    audio.ensure(true);
    const ab = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
    const res = await audio.setCustomTrack(style, ab, fileName);
    hud.refreshAudioTrimUI();
    return res ? res.analysis : null;
  },
  togglePitchLockForTest: async (on) => {
    await audio.updateSyncSettings(state.style, { flexMode: "music_to_clip", pitchLock: Boolean(on) });
    hud.refreshAudioTrimUI();
    return audio.syncedSliceBuffers[state.style] ? {
      duration: audio.syncedSliceBuffers[state.style].duration,
      sampleRate: audio.syncedSliceBuffers[state.style].sampleRate,
      channels: audio.syncedSliceBuffers[state.style].numberOfChannels,
    } : null;
  },
  getState: () => ({
    style: state.style,
    aspect: state.aspect,
    t: state.t,
    duration: getDuration(state.style),
    clipSpeed: audio.getTempoPlan(state.style).clipSpeed,
    effectiveDuration: audio.getTempoPlan(state.style).effectiveDuration,
    playing: state.playing,
    muted: audio.muted,
    ctxState: audio.ctx ? audio.ctx.state : "none",
    hasBuffer: Boolean(audio.musicBuffers[state.style] || audio.syncedSliceBuffers[state.style]),
    width: canvas.width,
    height: canvas.height,
  }),
};

window.__BEATFRAME__ = studioApi;
window.__HAMZABAN__ = studioApi;

// Bootstrap
const saved = loadPrefs();
if (saved) {
  state.hudDockedTop = Boolean(saved.hudDockedTop);
  state.hudPinnedHidden = Boolean(saved.hudPinnedHidden);
}
applyAspect(saved && saved.aspect ? saved.aspect : "9:16");
applyStyle(saved && saved.style ? saved.style : "kinetic");
hud.applyHudMode();
audio.ensure();
audio.ensureMusicBuffer(state.style);

const GESTURE_EVENTS = ["click", "pointerup", "touchend", "keydown"];
const unlockAudioOnGesture = () => {
  // Synchronous inside user activation gesture (BEFORE any async await)
  audio.ensure(true);
  const resumePromise = (audio.ctx && audio.ctx.state === "suspended")
    ? audio.ctx.resume().catch((err) => console.warn("[BeatFrame audio] gesture resume failed:", err))
    : Promise.resolve();

  Promise.all([resumePromise, audio.ensureMusicBuffer(state.style)]).then(([, buf]) => {
    if (audio.ctx && audio.ctx.state === "running") {
      GESTURE_EVENTS.forEach((ev) => window.removeEventListener(ev, unlockAudioOnGesture, true));
      if (buf && !audio.muted && state.playing) {
        const { clipSpeed } = audio.getTempoPlan(state.style);
        audio.syncMusic(state.style, state.t / (clipSpeed || 1.0));
      }
    }
  });
};
GESTURE_EVENTS.forEach((ev) => window.addEventListener(ev, unlockAudioOnGesture, true));

hud.wakeHud();
requestAnimationFrame(tick);
