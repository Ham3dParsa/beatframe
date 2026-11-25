import test from "node:test";
import assert from "node:assert/strict";
import {
  BeatAnalyzer,
  analyzeTrack,
  foldBpmToTarget,
  computeWaveformPeaks,
  resolveTempoPlan,
  computeAnchorStartOffset,
  snapToAnchorPeak,
} from "../src/engine/beat-analyzer.js";
import { SLIDE_REGISTRY } from "../src/core/registry.js";

/**
 * Build a minimal AudioBuffer-compatible object containing a synthetic
 * 4/4 kick+hat click track at an exact BPM with a stronger downbeat on beat 1.
 */
function makeSyntheticClickTrack({ bpm, durationSec = 28, sampleRate = 44100 }) {
  const length = Math.floor(durationSec * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const beatPeriod = 60 / bpm;

  let beatIdx = 0;
  for (let tBeat = 0.05; tBeat < durationSec - 0.1; tBeat += beatPeriod, beatIdx++) {
    const start = Math.floor(tBeat * sampleRate);
    const isDownbeat = beatIdx % 4 === 0;
    const amp = isDownbeat ? 0.95 : 0.65;
    const hitLen = Math.min(Math.floor(sampleRate * 0.06), length - start);
    for (let i = 0; i < hitLen; i++) {
      const env = Math.exp((-i / sampleRate) * 42);
      const s = amp * env * (0.75 * Math.sin((2 * Math.PI * 90 * i) / sampleRate) + 0.25 * Math.sin((2 * Math.PI * 700 * i) / sampleRate));
      left[start + i] += s;
      right[start + i] += s;
    }
  }

  return {
    sampleRate,
    duration: durationSec,
    length,
    numberOfChannels: 2,
    getChannelData(ch) {
      return ch === 0 ? left : right;
    },
  };
}

test("BeatAnalyzer exports expected pure interface including v6 helpers", () => {
  assert.equal(typeof BeatAnalyzer.analyzeTrack, "function");
  assert.equal(typeof BeatAnalyzer.foldBpmToTarget, "function");
  assert.equal(typeof BeatAnalyzer.computeWaveformPeaks, "function");
  assert.equal(typeof BeatAnalyzer.resolveTempoPlan, "function");
  assert.equal(typeof BeatAnalyzer.computeAnchorStartOffset, "function");
  assert.equal(typeof BeatAnalyzer.snapToAnchorPeak, "function");
  assert.equal(typeof resolveTempoPlan, "function");
  assert.equal(typeof computeAnchorStartOffset, "function");
  assert.equal(typeof snapToAnchorPeak, "function");
});

test("BeatAnalyzer accurately detects 85 BPM, 120 BPM, and 128 BPM click tracks", () => {
  const cases = [
    { bpm: 85, slideId: "bit2" },
    { bpm: 120, slideId: "kinetic" },
    { bpm: 128, slideId: "atashpro" },
  ];

  for (const { bpm, slideId } of cases) {
    const buf = makeSyntheticClickTrack({ bpm, durationSec: 32 });
    const res = analyzeTrack(buf, slideId, SLIDE_REGISTRY);

    assert.equal(res.isRubato, false, `Expected rhythmic detection at ${bpm} BPM`);
    assert.ok(
      Math.abs(res.effectiveBpm - bpm) <= 1.5,
      `Expected ~${bpm} BPM, got effectiveBpm=${res.effectiveBpm} (detected=${res.detectedBpm})`
    );
    assert.equal(res.status, "compatible", `Expected compatible status for ${bpm} BPM on ${slideId}`);
    assert.ok(res.topSlices.length >= 1, "Expected at least one ranked slice");
    assert.equal(res.peaks.length, 140, "Expected 140 normalized waveform peaks");
    assert.ok(Array.isArray(res.onsetTimesSec) && res.onsetTimesSec.length >= 8, "Expected salient onsetTimesSec");
    assert.ok(Array.isArray(res.anchorPeaks) && res.anchorPeaks.length >= 4 && res.anchorPeaks.length <= 24, "Expected salient anchorPeaks");
    for (let i = 1; i < res.onsetTimesSec.length; i++) {
      assert.ok(res.onsetTimesSec[i] - res.onsetTimesSec[i - 1] >= 0.059, "Onsets must be >= 60ms apart");
    }
    for (const p of res.anchorPeaks) {
      assert.ok(Number.isFinite(p.timeSec) && p.timeSec >= 0);
      assert.ok(p.strength >= 0 && p.strength <= 1.0001);
      assert.ok(["drop", "downbeat", "hit"].includes(p.kind));
    }
  }
});

test("foldBpmToTarget folds half-time and double-time tempos cleanly", () => {
  const doubleTime = foldBpmToTarget(64, 128);
  assert.equal(doubleTime.effectiveBpm, 128);
  assert.ok(doubleTime.deltaPct < 0.01);

  const halfTime = foldBpmToTarget(170, 85);
  assert.equal(halfTime.effectiveBpm, 85);
  assert.ok(halfTime.deltaPct < 0.01);
});

test("analyzeTrack widens stretchable threshold to 22% and suggestedRate to [0.80, 1.25]", () => {
  // 100 BPM track against kinetic (119.75 BPM) => ~16.5% delta => stretchable (previously mismatch > 12%)
  const track100 = makeSyntheticClickTrack({ bpm: 100, durationSec: 28 });
  const res = analyzeTrack(track100, "kinetic", SLIDE_REGISTRY);

  assert.equal(res.status, "stretchable", `Expected stretchable at ~16.5% delta, got ${res.status} (delta=${res.deltaPct}%)`);
  assert.ok(res.suggestedRate >= 1.15 && res.suggestedRate <= 1.25, `Expected suggestedRate in [1.15, 1.25], got ${res.suggestedRate}`);
});

test("analyzeTrack recommends a better-matching slide on tempo mismatch", () => {
  // 128 BPM track tested against bit2 (target 84.85 BPM) => folded 64 BPM => 24.6% > 22% => mismatch
  const track128 = makeSyntheticClickTrack({ bpm: 128, durationSec: 32 });
  const res = analyzeTrack(track128, "bit2", SLIDE_REGISTRY);

  assert.equal(res.status, "mismatch");
  assert.ok(
    res.recommendedSlideId === "atashpro" || res.recommendedSlideId === "cyberpro",
    `Expected 127.5 BPM slide recommendation, got ${res.recommendedSlideId}`
  );
});

test("computeWaveformPeaks returns normalized [0, 1] array with exact bar count", () => {
  const buf = makeSyntheticClickTrack({ bpm: 120, durationSec: 10 });
  const peaks = computeWaveformPeaks(buf, 64);
  assert.equal(peaks.length, 64);
  let maxVal = 0;
  for (let i = 0; i < peaks.length; i++) {
    assert.ok(Number.isFinite(peaks[i]), "Peak must be finite");
    assert.ok(peaks[i] >= 0 && peaks[i] <= 1.0001, `Peak out of range: ${peaks[i]}`);
    if (peaks[i] > maxVal) maxVal = peaks[i];
  }
  assert.ok(maxVal >= 0.99, `Expected normalized peak near 1.0, got ${maxVal}`);
});

test("snapToAnchorPeak snaps to strongest anchorPeak within radius or nearest bar grid point", () => {
  const analysis = {
    isRubato: false,
    duration: 30,
    barPeriodSec: 2.0,
    barTimes: [0.5, 2.5, 4.5, 6.5, 8.5],
    anchorPeaks: [
      { timeSec: 4.52, strength: 0.65, kind: "downbeat" },
      { timeSec: 4.62, strength: 0.95, kind: "drop" },
      { timeSec: 10.0, strength: 0.80, kind: "hit" },
    ],
  };

  // Within 0.25s of both 4.52 and 4.62 => picks strongest (4.62)
  assert.equal(snapToAnchorPeak(4.55, analysis, 0.25), 4.62);
  // Outside radius of all anchorPeaks => snaps to nearest barTimes[0] + k * barPeriodSec (0.5 + 3*2.0 = 6.5)
  assert.equal(snapToAnchorPeak(6.8, analysis, 0.25), 6.5);
});
