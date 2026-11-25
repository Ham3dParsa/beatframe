# Changelog

All notable changes to BeatFrame are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-11-25

First versioned release. Covers the feature drop merged in PR #1.

### Added
- Binary-safe `server.js` with extensionless `/api/track/:id` audio endpoint plus `.gitattributes` so MP3 assets survive Windows checkouts intact.
- User Activation v2 audio unlock: the AudioContext resumes synchronously inside the first user gesture so music and cues start reliably on every platform.
- Web Worker-backed WSOLA time stretching so the sync drawer stays responsive while pitch-locked slices render.
- Clip Speed x Audio Stretch flex mode: the HUD now offers a combined mode that scales clip playback speed against audio stretch independently.
- Event-Anchor Magnet: a magnet toggle plus `pinAnchor` shortcut that snaps reel events to beat peaks.
- RTL-aware micro-tooltips across the HUD for Persian labels.
- 34 keyboard shortcuts covering playback, navigation, slices, sync, style, aspect, and export.
- `src/core/version.js` exposing `VERSION` and `BUILD`; surfaced on `window.__BEATFRAME__`/`window.__HAMZABAN__` as `version`.

### Changed
- `package.json` version moved to `0.6.0` and now tracks `VERSION` via `tests/version.test.mjs`.
