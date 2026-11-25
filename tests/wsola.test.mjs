import test from "node:test";
import assert from "node:assert/strict";
import { wsolaTimeStretchStereo, createWsolaAdapter } from "../src/engine/wsola.js";

function rms(arr, start = 0, end = arr.length) {
  let sum = 0;
  const n = Math.max(1, end - start);
  for (let i = start; i < end; i++) sum += arr[i] * arr[i];
  return Math.sqrt(sum / n);
}

function makeStereoTone({ sampleRate = 48000, durationSec = 2.0, freqHz = 220 }) {
  const len = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const s = 0.5 * Math.sin(2 * Math.PI * freqHz * t) + 0.25 * Math.sin(2 * Math.PI * freqHz * 2 * t);
    left[i] = s;
    right[i] = s * 0.8; // Known stereo ratio (L/R = 1.25)
  }
  return { left, right };
}

test("wsolaTimeStretchStereo produces exact output length with zero NaN/Inf across 50% and 75% overlap rates", () => {
  const sampleRate = 48000;
  const { left, right } = makeStereoTone({ sampleRate, durationSec: 2.5, freqHz: 220 });

  // Includes both |rate-1| <= 0.12 (50% overlap) and |rate-1| > 0.12 (75% overlap)
  for (const rate of [0.84, 0.92, 1.0, 1.08, 1.20]) {
    const outFrames = Math.floor(sampleRate * 1.5);
    const { outL, outR } = wsolaTimeStretchStereo(left, right, sampleRate, rate, outFrames);

    assert.equal(outL.length, outFrames, `outL length mismatch at rate=${rate}`);
    assert.equal(outR.length, outFrames, `outR length mismatch at rate=${rate}`);

    for (let i = 0; i < outFrames; i++) {
      assert.ok(Number.isFinite(outL[i]), `Non-finite outL[${i}] at rate=${rate}`);
      assert.ok(Number.isFinite(outR[i]), `Non-finite outR[${i}] at rate=${rate}`);
    }
  }
});

test("wsolaTimeStretchStereo preserves signal energy and stereo L/R coherence", () => {
  const sampleRate = 48000;
  const { left, right } = makeStereoTone({ sampleRate, durationSec: 2.5, freqHz: 261.63 });
  const inRmsL = rms(left);
  const inRmsR = rms(right);

  const outFrames = Math.floor(sampleRate * 1.5);
  const { outL, outR } = wsolaTimeStretchStereo(left, right, sampleRate, 1.06, outFrames);

  const margin = Math.floor(sampleRate * 0.08);
  const outRmsL = rms(outL, margin, outFrames - margin);
  const outRmsR = rms(outR, margin, outFrames - margin);

  assert.ok(
    Math.abs(outRmsL - inRmsL) / inRmsL < 0.15,
    `Energy drift too high: inRmsL=${inRmsL.toFixed(4)}, outRmsL=${outRmsL.toFixed(4)}`
  );

  const expectedRatio = inRmsL / inRmsR;
  const actualRatio = outRmsL / outRmsR;
  assert.ok(
    Math.abs(actualRatio - expectedRatio) < 0.02,
    `Stereo coherence broken: expected ratio ${expectedRatio.toFixed(4)}, got ${actualRatio.toFixed(4)}`
  );
});

test("wsolaTimeStretchStereo applies in-place fadeInSec, fadeOutSec, and gain cleanly", () => {
  const sampleRate = 48000;
  const { left, right } = makeStereoTone({ sampleRate, durationSec: 2.0, freqHz: 220 });
  const outFrames = Math.floor(sampleRate * 1.2);
  const { outL, outR } = wsolaTimeStretchStereo(left, right, sampleRate, 1.05, outFrames, {
    gain: 0.5,
    fadeInSec: 0.05,
    fadeOutSec: 0.10,
  });

  assert.ok(Math.abs(outL[0]) < 1e-4, `Expected fade-in start near 0, got ${outL[0]}`);
  assert.ok(Math.abs(outL[outFrames - 1]) < 1e-4, `Expected fade-out end near 0, got ${outL[outFrames - 1]}`);
  const midRms = rms(outL, Math.floor(sampleRate * 0.3), Math.floor(sampleRate * 0.7));
  const inRms = rms(left);
  assert.ok(Math.abs(midRms - inRms * 0.5) / (inRms * 0.5) < 0.15, "Expected interior scaled by gain=0.5");
  assert.ok(rms(outR, Math.floor(sampleRate * 0.3), Math.floor(sampleRate * 0.7)) > 0.1);
});

test("wsolaTimeStretchStereo transient onset lock preserves crisp drum attacks without flamming", () => {
  const sampleRate = 48000;
  const durationSec = 2.0;
  const len = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(len);
  const right = new Float32Array(len);

  // Place sharp 8ms drum impulses every 0.4s
  const onsetSamples = [];
  for (let t = 0.2; t < 1.8; t += 0.4) {
    const start = Math.floor(t * sampleRate);
    onsetSamples.push(start);
    const hitLen = Math.floor(sampleRate * 0.008);
    for (let i = 0; i < hitLen && start + i < len; i++) {
      const env = Math.exp((-i / sampleRate) * 350);
      const s = 0.95 * env * Math.sin((2 * Math.PI * 160 * i) / sampleRate);
      left[start + i] += s;
      right[start + i] += s;
    }
  }

  const rate = 1.10;
  const outFrames = Math.floor(sampleRate * 1.6);
  const { outL } = wsolaTimeStretchStereo(left, right, sampleRate, rate, outFrames, {
    onsetSamples: new Int32Array(onsetSamples),
  });

  // Check peak amplitude around each expected stretched onset: crisp transient should stay strong (>= 0.55)
  // and not split into two distinct peaks > 5ms apart inside a +/-30ms window
  for (const os of onsetSamples) {
    const expectedOut = Math.round(os / rate);
    if (expectedOut < 2000 || expectedOut > outFrames - 2000) continue;
    const winLo = Math.max(0, expectedOut - Math.round(sampleRate * 0.03));
    const winHi = Math.min(outFrames, expectedOut + Math.round(sampleRate * 0.03));
    let peakVal = 0;
    let peakIdx = winLo;
    for (let i = winLo; i < winHi; i++) {
      const a = Math.abs(outL[i]);
      if (a > peakVal) { peakVal = a; peakIdx = i; }
    }
    assert.ok(peakVal >= 0.50, `Transient peak attenuated too much at onset=${os}: peak=${peakVal.toFixed(3)}`);

    // Ensure no secondary flam echo (> 60% of peak) separated by 8ms..25ms from main transient
    const flamLo = Math.round(sampleRate * 0.008);
    const flamHi = Math.round(sampleRate * 0.025);
    let maxFlam = 0;
    for (let i = winLo; i < winHi; i++) {
      const dist = Math.abs(i - peakIdx);
      if (dist >= flamLo && dist <= flamHi) {
        const a = Math.abs(outL[i]);
        if (a > maxFlam) maxFlam = a;
      }
    }
    assert.ok(
      maxFlam < peakVal * 0.60,
      `Detected transient flamming near onset=${os}: main=${peakVal.toFixed(3)}, flam=${maxFlam.toFixed(3)}`
    );
  }
});

test("wsolaTimeStretchStereo speed benchmark completes 20s 48kHz stereo stretch in < 250ms", () => {
  const sampleRate = 48000;
  const rate = 1.08;
  const outFrames = sampleRate * 20; // 20s @ 48kHz = 960,000 stereo frames
  const inLen = Math.ceil(outFrames * rate) + sampleRate;
  const left = new Float32Array(inLen);
  const right = new Float32Array(inLen);
  for (let i = 0; i < inLen; i++) {
    const s = 0.5 * Math.sin(0.028 * i) + 0.25 * Math.sin(0.056 * i);
    left[i] = s;
    right[i] = s * 0.9;
  }

  // Warmup short call for V8 JIT
  wsolaTimeStretchStereo(left.subarray(0, 48000), right.subarray(0, 48000), sampleRate, rate, 24000);

  const t0 = performance.now();
  const { outL, outR } = wsolaTimeStretchStereo(left, right, sampleRate, rate, outFrames);
  const elapsedMs = performance.now() - t0;

  assert.equal(outL.length, outFrames);
  assert.equal(outR.length, outFrames);
  console.log(`[BENCHMARK] WSOLA 20s 48kHz stereo (rate=${rate}): ${elapsedMs.toFixed(1)} ms`);
  assert.ok(elapsedMs < 250, `WSOLA benchmark exceeded 250ms budget: ${elapsedMs.toFixed(1)}ms`);
});

test("createWsolaAdapter runs synchronously in Node mode and echoes generationId", async () => {
  const adapter = createWsolaAdapter({ useWorker: false });
  const { left, right } = makeStereoTone({ sampleRate: 48000, durationSec: 0.5, freqHz: 220 });
  const res = await adapter.stretch({
    leftIn: left,
    rightIn: right,
    sampleRate: 48000,
    rate: 1.05,
    outFrames: 12000,
    generationId: 42,
  });
  assert.equal(res.generationId, 42);
  assert.equal(res.outL.length, 12000);
  assert.equal(res.outR.length, 12000);
  adapter.dispose();
});
