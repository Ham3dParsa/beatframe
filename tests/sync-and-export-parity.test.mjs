import test from "node:test";
import assert from "node:assert/strict";
import { SLIDE_REGISTRY } from "../src/core/registry.js";
import { resolveTempoPlan, computeAnchorStartOffset } from "../src/engine/beat-analyzer.js";
import { StudioAudioEngine } from "../src/engine/audio-sync.js";
import { FastStartMP4Exporter } from "../src/engine/exporter.js";
import { wsolaTimeStretchStereo } from "../src/engine/wsola.js";

function makeMockAudioBuffer(durationSec = 30, sampleRate = 48000, amp = 0.4) {
  const length = Math.floor(durationSec * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const s = amp * Math.sin(0.025 * i);
    left[i] = s;
    right[i] = s;
  }
  return {
    sampleRate,
    length,
    duration: durationSec,
    numberOfChannels: 2,
    getChannelData(ch) {
      return ch === 0 ? left : right;
    },
  };
}

test("SLIDE_REGISTRY declarative events are synced with primaryImpactSec and contain zero middle dots", () => {
  for (const [id, spec] of Object.entries(SLIDE_REGISTRY)) {
    assert.ok(Array.isArray(spec.events) && spec.events.length >= 3, `${id} missing events array`);
    const primaries = spec.events.filter((e) => e.isPrimary);
    assert.equal(primaries.length, 1, `${id} must have exactly one isPrimary event`);
    assert.equal(
      primaries[0].t,
      spec.primaryImpactSec,
      `${id} primaryImpactSec (${spec.primaryImpactSec}) must match primary event t (${primaries[0].t})`
    );
    for (const ev of spec.events) {
      assert.ok(!ev.labelFa.includes("·"), `${id}.${ev.id} labelFa contains forbidden middle dot`);
      assert.ok(ev.t >= 0 && ev.t <= spec.durationSec, `${id}.${ev.id} event time out of bounds`);
    }
  }
});

test("resolveTempoPlan maintains beat-lock and duration invariants across all 3 flex modes", () => {
  const slideSpec = SLIDE_REGISTRY.kinetic; // targetBpm=119.75, durationSec=20.0
  const analysis = {
    effectiveBpm: 108.0,
    deltaPct: 9.8,
    isRubato: false,
    status: "stretchable",
    duration: 45,
    barPeriodSec: (60 / 108.0) * 4,
  };

  for (const flexMode of ["music_to_clip", "clip_to_music", "balanced"]) {
    const plan = resolveTempoPlan(analysis, { flexMode, pitchLock: true, clipSpeed: 1.0 }, slideSpec);
    assert.equal(plan.flexMode, flexMode);
    assert.equal(plan.canSync, true);
    assert.ok(plan.clipSpeed >= 0.85 && plan.clipSpeed <= 1.15);
    assert.ok(plan.audioRate >= 0.80 && plan.audioRate <= 1.25);

    // Effective duration invariant: baseDur / clipSpeed
    assert.ok(
      Math.abs(plan.effectiveDuration - slideSpec.durationSec / plan.clipSpeed) < 1e-6,
      `Duration invariant failed in ${flexMode}`
    );

    // Beat-lock invariant: effectiveSlideBpm === effectiveBpm * audioRate
    const effectiveMusicBpm = analysis.effectiveBpm * plan.audioRate;
    assert.ok(
      Math.abs(plan.effectiveSlideBpm - effectiveMusicBpm) < 0.05,
      `Beat-lock failed in ${flexMode}: slide=${plan.effectiveSlideBpm}, music=${effectiveMusicBpm}`
    );

    if (flexMode === "music_to_clip") {
      assert.equal(plan.clipSpeed, 1.0);
      assert.equal(plan.usePitchLock, true);
    } else if (flexMode === "clip_to_music") {
      assert.equal(plan.audioRate, 1.0);
      assert.equal(plan.usePitchLock, false);
    } else if (flexMode === "balanced") {
      assert.ok(plan.clipSpeed < 1.0 && plan.audioRate > 1.0);
      assert.equal(plan.usePitchLock, true);
    }
  }

  // Manual clipSpeed override in "off" mode
  const offPlan = resolveTempoPlan(analysis, { flexMode: "off", clipSpeed: 1.12 }, slideSpec);
  assert.equal(offPlan.canSync, false);
  assert.equal(offPlan.audioRate, 1.0);
  assert.equal(offPlan.clipSpeed, 1.12);
  assert.ok(Math.abs(offPlan.effectiveDuration - 20.0 / 1.12) < 1e-6);
});

test("computeAnchorStartOffset maintains exact drop-alignment invariance across flex modes", () => {
  const slideSpec = SLIDE_REGISTRY.kinetic;
  const analysis = {
    effectiveBpm: 108.0,
    deltaPct: 9.8,
    isRubato: false,
    status: "stretchable",
  };
  const trackPeakSec = 14.25;
  const reelEventSec = slideSpec.primaryImpactSec; // 4.008s

  for (const flexMode of ["music_to_clip", "clip_to_music", "balanced"]) {
    const plan = resolveTempoPlan(analysis, { flexMode, pitchLock: true, clipSpeed: 1.0 }, slideSpec);
    const res = computeAnchorStartOffset({
      trackPeakSec,
      reelEventSec,
      clipSpeed: plan.clipSpeed,
      audioRate: plan.audioRate,
      trackDuration: 60.0,
      effectiveDuration: plan.effectiveDuration,
      autoLoop: false,
      barPeriodSec: (60 / 108.0) * 4,
    });

    assert.equal(res.clamped, false, `Unexpected clamp in ${flexMode}`);
    assert.equal(res.driftSec, 0, `Unexpected drift in ${flexMode}`);

    // Verify invariance: at tReal = reelEventSec / clipSpeed, source audio position equals trackPeakSec
    const tRealEvent = reelEventSec / plan.clipSpeed;
    const landedSourceSec = res.startOffset + tRealEvent * plan.audioRate;
    assert.ok(
      Math.abs(landedSourceSec - trackPeakSec) < 0.002,
      `Anchor invariance failed in ${flexMode}: landed=${landedSourceSec}, expected=${trackPeakSec}`
    );
  }

  // Clamped case: peak occurs before the reel event time
  const clampedRes = computeAnchorStartOffset({
    trackPeakSec: 1.0,
    reelEventSec: 5.0,
    clipSpeed: 1.0,
    audioRate: 1.0,
    trackDuration: 40.0,
    effectiveDuration: 20.0,
    autoLoop: false,
  });
  assert.equal(clampedRes.startOffset, 0);
  assert.equal(clampedRes.clamped, true);
  assert.ok(clampedRes.driftSec > 0);
});

test("StudioAudioEngine generation-ID race protection drops stale builds and prevents raw fallback while building", async () => {
  // Controllable SyncNodeAdapter with deferred promise gates
  const gates = [];
  const SyncNodeAdapter = {
    stretch(payload) {
      return new Promise((resolve) => {
        gates.push({
          payload,
          release() {
            const { outL, outR } = wsolaTimeStretchStereo(
              payload.leftIn,
              payload.rightIn,
              payload.sampleRate,
              payload.rate,
              payload.outFrames,
              payload.opts
            );
            // Tag channel 0 sample 100 with generationId marker so we can inspect which build won
            outL[100] = payload.generationId * 0.1;
            resolve({ outL, outR, generationId: payload.generationId });
          },
        });
      });
    },
    dispose() {},
  };

  const engine = new StudioAudioEngine({ wsolaAdapter: SyncNodeAdapter });
  const style = "kinetic";
  const mockBuf = makeMockAudioBuffer(35, 16000);
  engine.musicBuffers[style] = mockBuf;
  engine.customArrayBuffers[style] = new ArrayBuffer(16);
  engine.trackAnalyses[style] = {
    effectiveBpm: 108.0,
    deltaPct: 9.8,
    isRubato: false,
    status: "stretchable",
    duration: 35,
    barPeriodSec: (60 / 108.0) * 4,
    onsetTimesSec: [0.5, 1.0, 1.5],
  };

  // Mock audio context to verify syncMusic never falls back to raw musicBuffers while _building[style] === true
  let startedBuffers = [];
  engine.ctx = {
    state: "running",
    currentTime: 0,
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        disconnect() {},
        start() { startedBuffers.push(this.buffer); },
        stop() {},
      };
    },
  };
  engine.musicGain = {};

  // Kick off overlapping builds: gen 1 (slow) then gen 2 (fast)
  const p1 = engine.updateSyncSettings(style, { flexMode: "music_to_clip", pitchLock: true, startOffset: 1.0 });
  assert.equal(engine._building[style], true, "Expected _building flag true while build 1 is in flight");

  // syncMusic MUST NOT play raw unstretched musicBuffers while building
  engine.syncMusic(style, 0.5);
  assert.equal(startedBuffers.length, 0, "syncMusic must never fall back to raw musicBuffers during build");

  const p2 = engine.updateSyncSettings(style, { flexMode: "music_to_clip", pitchLock: true, startOffset: 2.0 });
  assert.equal(gates.length, 2, "Expected two overlapping stretch invocations");
  assert.equal(gates[0].payload.generationId, 1);
  assert.equal(gates[1].payload.generationId, 2);

  // Release gen 2 FIRST, then stale gen 1 SECOND
  gates[1].release();
  await p2;
  assert.equal(engine._building[style], false, "Expected _building false after latest gen completes");
  assert.equal(engine.syncedSliceMeta[style].gen, 2);
  assert.ok(Math.abs(engine.syncedSliceBuffers[style].getChannelData(0)[100] - 0.2) < 1e-6);

  // Now release stale gen 1: must be dropped and NOT overwrite gen 2
  gates[0].release();
  await p1;
  assert.equal(engine.syncedSliceMeta[style].gen, 2, "Stale gen 1 must not overwrite gen 2 metadata");
  assert.ok(
    Math.abs(engine.syncedSliceBuffers[style].getChannelData(0)[100] - 0.2) < 1e-6,
    "Stale gen 1 must not overwrite gen 2 buffer"
  );

  // Now syncMusic plays the synced slice buffer (never raw)
  engine.syncMusic(style, 0.5);
  assert.equal(startedBuffers.length, 1);
  assert.equal(startedBuffers[0], engine.syncedSliceBuffers[style]);
});

test("FastStartMP4Exporter binds onTimeChange and renderOfflineBuffer reuses cached signature", async () => {
  const times = [];
  const exporter = new FastStartMP4Exporter({
    canvas: { width: 1080, height: 1920 },
    audio: {},
    renderFrame: () => {},
    syncTimelineUI: () => {},
    onProgress: () => {},
    onTimeChange: (t) => times.push(t),
  });
  exporter.onTimeChange(3.25);
  assert.deepEqual(times, [3.25]);

  // Default no-op when onTimeChange omitted
  const exporterNoOp = new FastStartMP4Exporter({
    canvas: {},
    audio: {},
    renderFrame: () => {},
    syncTimelineUI: () => {},
    onProgress: () => {},
  });
  assert.equal(typeof exporterNoOp.onTimeChange, "function");
  assert.doesNotThrow(() => exporterNoOp.onTimeChange(1.0));

  // Verify renderOfflineBuffer caches & reuses syncedSliceBuffers when signature matches
  let stretchCalls = 0;
  const countingAdapter = {
    async stretch(payload) {
      stretchCalls++;
      const { outL, outR } = wsolaTimeStretchStereo(
        payload.leftIn,
        payload.rightIn,
        payload.sampleRate,
        payload.rate,
        payload.outFrames,
        payload.opts
      );
      return { outL, outR, generationId: payload.generationId };
    },
    dispose() {},
  };

  const engine = new StudioAudioEngine({ wsolaAdapter: countingAdapter });
  const style = "kinetic";
  engine.musicBuffers[style] = makeMockAudioBuffer(35, 16000);
  engine.customArrayBuffers[style] = new ArrayBuffer(16);
  engine.trackAnalyses[style] = {
    effectiveBpm: 108.0,
    deltaPct: 9.8,
    isRubato: false,
    status: "stretchable",
    duration: 35,
    barPeriodSec: (60 / 108.0) * 4,
    onsetTimesSec: [],
  };

  await engine.updateSyncSettings(style, { flexMode: "balanced", pitchLock: true });
  assert.equal(stretchCalls, 1);

  const plan = engine.getTempoPlan(style);
  const exactDur = Math.round(plan.effectiveDuration * 30) / 30;
  // First call with exact 30fps-snapped duration rebuilds to exact parity
  const buf1 = await engine.renderOfflineBuffer(style, exactDur, 48000);
  assert.equal(buf1.length, Math.ceil(exactDur * 48000));
  const callsAfterFirst = stretchCalls;

  // Second call with identical signature reuses cached buffer without rebuilding
  const buf2 = await engine.renderOfflineBuffer(style, exactDur, 48000);
  assert.equal(buf2, buf1);
  assert.equal(stretchCalls, callsAfterFirst);
});
