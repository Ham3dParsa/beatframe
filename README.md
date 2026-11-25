# BeatFrame

Zero-dependency ES-module Canvas reel studio for beat-synced vertical (`9:16`) and horizontal (`16:9`) motion reels, featuring a pure-JS beat analyzer, stereo-coherent WSOLA time-stretching, interactive audio sync drawer, and Fast-Start MP4 export.

## Quick Start

```bash
# Run unit tests (Node >= 18, zero external dependencies)
npm test

# Serve locally on http://localhost:4173
npm run dev
```

Open `http://localhost:4173` in a modern Chromium browser. Use keys `1`–`5` to switch reels, `Space` to play/pause, `[` / `]` to jump acts, `A` to toggle `9:16` / `16:9`, `M` to mute, and `H` to toggle the HUD.

## Architecture Map

```
beatframe-repo/
├── index.html                   # HTML shell + HUD & #audioSyncDrawer markup
├── package.json                 # Zero-dependency ESM scripts (dev, test)
├── AGENTS.md                    # Deep-module agent operating guide
├── assets/audio/                # Binary default MP3 tracks (loaded via fetch)
│   ├── bit2-lofi.mp3
│   ├── atashkadeh-persian.mp3
│   ├── kinetic-futurebass.mp3
│   └── atashpro-synthwave.mp3
├── src/
│   ├── main.js                  # Bootstrap, rAF loop, shortcuts, prefs, verification hooks
│   ├── styles/studio.css        # Studio layout, HUD, and audio sync drawer styles
│   ├── core/registry.js         # SLIDE_REGISTRY + Node-safe math/PRNG/Canvas/pixel helpers
│   ├── reels/                   # Reel adapters behind REEL_RENDERERS seam
│   │   ├── index.js
│   │   ├── bit2.js
│   │   ├── atashkadeh.js
│   │   ├── kinetic.js
│   │   └── atashpro.js          # Serves both atashpro and cyberpro palettes + glitch FX
│   ├── engine/
│   │   ├── beat-analyzer.js     # Pure ES module: 3-band IIR onset flux + BPM/drop ranker
│   │   ├── wsola.js             # Pure ES module: stereo-coherent WSOLA time-stretcher
│   │   ├── audio-sync.js        # StudioAudioEngine: track fetch, custom uploads, offline mix
│   │   └── exporter.js          # FastStartMP4Exporter (WebCodecs MP4 + MediaRecorder fallback)
│   └── ui/studio-hud.js         # Thin HUD & #audioSyncDrawer mini-waveform controller
└── tests/
    ├── beat-analyzer.test.mjs   # Node unit tests for BeatAnalyzer
    └── wsola.test.mjs           # Node unit tests for wsolaTimeStretchStereo
```

## Adding a New Reel

1. **Register metadata** in `src/core/registry.js` under `SLIDE_REGISTRY` (`id`, `labelFa`, `durationSec`, `targetBpm`, `primaryImpactSec`, `acts`, `tlLabels`, `tlMarks`, `defaultTrackUrl`).
2. **Add a renderer adapter** in `src/reels/<your-reel>.js` exporting `(ctx, W, H, t, isPortrait) => void`.
3. **Wire it into the seam** in `src/reels/index.js` under `REEL_RENDERERS`.
4. **Add a selector button** in `index.html` with `data-style="<your-reel>"` and place its default MP3 in `assets/audio/`.
