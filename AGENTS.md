# BeatFrame Agent Operating Guide

BeatFrame is a zero-dependency ES-module Canvas reel studio built as **deep modules** with small **Interfaces**, explicit **Seams**, and high **Locality**.

## Architecture: 5 Deep Modules

| Module | Path | Interface | Seam & Locality |
|---|---|---|---|
| **Registry & Primitives** | `src/core/registry.js` | `SLIDE_REGISTRY`, `getSlideSpec`, `getDuration`, math/PRNG/easing, Canvas & pixel-art helpers (`SPRITES` lazy-loaded) | Single source of truth for slide timing, BPM targets, default track URLs, and shared draw helpers. Zero top-level DOM calls so Node tests import it directly. |
| **BeatAnalyzer** | `src/engine/beat-analyzer.js` | `analyzeTrack(audioBuffer, activeSlideId, registry)`, `foldBpmToTarget(bpm, targetBpm)`, `computeWaveformPeaks(audioBuffer, numBars)` | Pure DSP **Module** (3-band IIR flux, autocorrelation, downbeat phase lock, drop ranker). Zero DOM dependency — tested directly at its **Interface** in Node.js. |
| **WSOLA Stretcher** | `src/engine/wsola.js` | `wsolaTimeStretchStereo(leftIn, rightIn, sampleRate, rate, outFrames)` | Pure stereo-coherent overlap-add **Module**. Zero DOM dependency — tested directly at its **Interface** in Node.js. |
| **StudioAudioEngine** | `src/engine/audio-sync.js` | `ensure`, `ensureMusicBuffer`, `ensureAnalysis`, `setCustomTrack`, `updateSyncSettings`, `buildSyncedSlice`, `processCues`, `renderOfflineBuffer` | Owns `fetch()` loading of `./assets/audio/*.mp3` with procedural synth fallback, `syncedSliceBuffers`, Varispeed/WSOLA pitch-lock, and bar-aligned auto-loop. |
| **FastStartMP4Exporter** | `src/engine/exporter.js` | `new FastStartMP4Exporter({ canvas, audio, renderFrame, syncTimelineUI, onProgress, onTimeChange }).run(style)` + `buildFastStartMP4` | Owns WebCodecs H.264/AAC encoding, pure-JS ISO-BMFF fast-start (`moov` before `mdat`) muxing, and `MediaRecorder` WebM fallback. |

### Reel Adapters (`src/reels/`)
- Each reel (`bit2.js`, `atashkadeh.js`, `kinetic.js`, `atashpro.js`) is an **Adapter** behind the **Seam** in `src/reels/index.js` (`REEL_RENDERERS[style](ctx, W, H, t, isPortrait)`).
- `atashpro.js` serves both `atashpro` and `cyberpro` via palette/mode parameter plus the synthwave glitch post-pass.
- `src/ui/studio-hud.js` is a thin DOM **Adapter** wiring HUD controls and `#audioSyncDrawer` to `StudioAudioEngine`.

## Hard Product & Copy Invariants
1. **Zero middle dots (`·`)**: Separate inline items with `|` or spaces in Persian copy, badges, and UI labels. Never insert `·` anywhere in `src/` or `index.html`.
2. **Plain Persian user copy**: Keep visible labels and toasts free of developer jargon or English implementation terms (exception: standard units like `BPM`, `PNG`, `MP4`, `9:16`, `16:9`).
3. **Zero ZWNJ canvas bugs**: Use explicit `ctx.direction` (`"rtl"` / `"ltr"`) via `drawText()` and avoid ZWNJ characters in Canvas strings that break shaping across headless/desktop fonts.
4. **No Base64 audio blobs in JS**: Keep default audio tracks as binary `.mp3` files under `assets/audio/` loaded via `fetch()`.
5. **Preserve verification hooks**: Keep `window.__BEATFRAME__` and `window.__HAMZABAN__` intact in `src/main.js`.

## Verification Commands
- Unit tests (pure DSP modules): `npm test` (runs `node --test tests/*.test.mjs`)
- Local dev server: `npm run dev` (serves on `http://localhost:4173`)
- Middle-dot invariant check: `grep -rn "·" src/ index.html` (must return 0 matches)
