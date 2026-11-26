# REVIEW.md — BeatFrame automated-review guidance

Guidance for the automated reviewers (`opencode-agent`, `kilo-code-bot`) on PRs in this repo.
This file is the shared source of truth for repo-specific traps. Reviewers read it from the
PR base branch (`origin/main`); keep it under 10,000 characters.

BeatFrame is a zero-dependency ES-module Canvas reel studio built as deep modules (`src/core/`,
`src/engine/`) with thin adapters (`src/reels/`, `src/ui/`, `src/main.js`, `index.html`).

## Review style

Gate threshold is "Warnings and above" — fail the check only on confirmed `[critical]` or `[warning]`.

- `[critical]` — security hole, data loss, broken audio/export pipeline, missing verification hooks, secret leak. Must fix.
- `[warning]` — DSP/WSOLA/muxing bug, Canvas ZWNJ/RTL bug, middle dot (`·`) in UI, Base64 audio blob, version/changelog desync, CI trap violation. Must fix.
- `[info]` — nit, style preference, optional polish. Never blocks merge.

Set `APPROVED` only with zero `[critical]`/`[warning]`. Otherwise `REQUEST_CHANGES`.

## Mandatory traps

1. **Zero middle dots (`·`)** — Never insert `·` anywhere in `src/` or `index.html`. Separate inline items with `|` or spaces in Persian copy, badges, and UI labels.
2. **Plain Persian user copy** — Visible labels and toasts in `src/` and `index.html` must be natural Persian without developer jargon or English implementation terms (allowed units: `BPM`, `PNG`, `MP4`, `9:16`, `16:9`).
3. **Zero ZWNJ canvas bugs & `ctx.direction`** — Canvas text rendering must set explicit `ctx.direction` (`"rtl"` / `"ltr"`) via `drawText()` and avoid ZWNJ (`\u200c`) characters in Canvas strings that break shaping across headless/desktop fonts.
4. **No Base64 audio blobs in JS** — Keep default audio tracks as binary `.mp3` files under `assets/audio/` loaded via `fetch()`. Flag any `data:audio/` or embedded base64 audio string in `src/`.
5. **Preserve verification hooks** — `window.__BEATFRAME__` and `window.__HAMZABAN__` in `src/main.js` (including `version`) must stay intact.
6. **WSOLA / Exporter / BeatAnalyzer DSP & muxing** — `src/engine/beat-analyzer.js`, `src/engine/wsola.js`, and `src/engine/exporter.js` are pure DSP/ISO-BMFF muxing modules (`moov` before `mdat`). Flag sample-rate, channel-count, frame-count, or top-level DOM import mistakes (Node tests import `src/core/registry.js` and DSP modules directly without DOM).
7. **Deep-module & adapter seams** — Each reel in `src/reels/` stays an adapter behind `REEL_RENDERERS` in `src/reels/index.js`; `src/ui/studio-hud.js` stays a thin DOM adapter; no DSP/business logic leaks into `index.html` or `src/main.js`.
8. **Version & CHANGELOG sync** — Any behavioral change must bump `VERSION`/`BUILD` in `src/core/version.js`, match `package.json` `version`, and add a `CHANGELOG.md` entry in the same PR (`tests/version.test.mjs`). Docs/tooling-only PRs may skip the bump.
9. **CI workflows (`ci.yml`, `opencode-review.yml`, `opencode.yml`)** — `ci.yml` checkout MUST set `fetch-depth: 0` (shallow checkout breaks `git diff --check origin/main...HEAD` with exit 128) and check `! grep -rn "·" src/ index.html`. Job `timeout-minutes` must exceed the sum of step timeouts; pin third-party actions to full commit SHAs and guard against `[bot]` actor loops (`opencode-agent[bot]`, `kilo-code-bot[bot]`, `!endsWith(github.actor, '[bot]')`). Gate `kilo/*` steps on `env.HAS_KILO == '1'`.
10. **CI expression & Review Gate safety** — Never reference `${{ runner.* }}` in `jobs.<id>.env` (causes `0s` workflow parse failure). Write `.opencode-review-result.json` inside the `.gitignore`d repo root (not `$RUNNER_TEMP`, which hangs headless OpenCode on `external_directory: ask`), run `rm -f` before start, reject if `git ls-files` tracks it, verify `mtime >= startTs`, and fail closed on missing/invalid output. Publish pure-LTR `"Review Gate"` status via `repos.createCommitStatus` (failing closed, never `checks.create`), and minimize transient bot comments via GraphQL instead of deleting them.

## Verify (diff & static checks)

- `npm test` passes (pure DSP + shortcuts + sync/export parity + version sync).
- `node --check server.js` exits 0.
- `grep -rn "·" src/ index.html` returns 0 matches.
- `git diff --check origin/main...HEAD` is clean; no raw secrets or `${{ runner.* }}` in job `env:`.

## Output format

When running via `.github/workflows/opencode-review.yml`, follow `.github/opencode/review_prompt.md` and write `.opencode-review-result.json` in the repository root. Never include preamble or thinking-out-loud in any JSON field or stdout.
