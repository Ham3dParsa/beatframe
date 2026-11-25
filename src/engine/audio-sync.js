import { SLIDE_REGISTRY, getSlideSpec, getDuration, clamp, mulberry32 } from "../core/registry.js";
import { BeatAnalyzer, resolveTempoPlan, computeAnchorStartOffset, snapToAnchorPeak } from "./beat-analyzer.js";
import { createWsolaAdapter } from "./wsola.js";

function getFadeOutSec(endingFade) {
  if (endingFade === "punch") return 0.25;
  if (endingFade === "off") return 0.03;
  return 1.4;
}

function makeStereoAudioBuffer(ctx, outL, outR, sampleRate) {
  const len = outL.length;
  if (ctx && typeof ctx.createBuffer === "function") {
    const b = ctx.createBuffer(2, len, sampleRate);
    b.copyToChannel(outL, 0);
    b.copyToChannel(outR, 1);
    return b;
  }
  if (typeof AudioBuffer !== "undefined") {
    const b = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate });
    b.copyToChannel(outL, 0);
    b.copyToChannel(outR, 1);
    return b;
  }
  return {
    sampleRate,
    length: len,
    duration: len / sampleRate,
    numberOfChannels: 2,
    getChannelData(ch) {
      return ch === 0 ? outL : outR;
    },
  };
}

function prepareSegmentPureJS(buf, startOff, neededSrcSec, sampleRate, autoLoop, analysis) {
  const rawFrames = Math.max(1, Math.ceil(neededSrcSec * sampleRate));
  const outL = new Float32Array(rawFrames);
  const outR = new Float32Array(rawFrames);
  const srcL = buf.getChannelData(0);
  const srcR = buf.numberOfChannels > 1 ? buf.getChannelData(1) : srcL;
  const srcSr = buf.sampleRate || sampleRate;
  const srcLen = srcL.length;
  const ratio = srcSr / sampleRate;
  const availSrcSec = Math.max(0.1, buf.duration - startOff);

  const readLinear = (arr, pos) => {
    if (pos < 0 || pos >= srcLen - 1) return pos >= 0 && pos < srcLen ? arr[pos | 0] : 0;
    const i = pos | 0;
    const f = pos - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  };

  if (autoLoop && availSrcSec < neededSrcSec) {
    const barLen = (analysis && !analysis.isRubato && analysis.barPeriodSec > 0.5)
      ? Math.max(analysis.barPeriodSec, Math.floor(availSrcSec / analysis.barPeriodSec) * analysis.barPeriodSec)
      : availSrcSec;
    const loopLen = clamp(barLen, 0.5, availSrcSec);
    const xfade = Math.min(0.035, loopLen * 0.15);
    let cursor = 0;
    let iter = 0;
    while (cursor < neededSrcSec && iter < 40) {
      const segDur = Math.min(loopLen, neededSrcSec - cursor + xfade);
      const startFrame = Math.floor(cursor * sampleRate);
      const segFrames = Math.min(rawFrames - startFrame, Math.ceil(segDur * sampleRate));
      const xfadeFrames = Math.max(1, Math.round(xfade * sampleRate));
      for (let k = 0; k < segFrames; k++) {
        const srcPos = (startOff * srcSr) + k * ratio;
        let g = 1.0;
        if (iter > 0 && k < xfadeFrames) g *= k / xfadeFrames;
        if (cursor + segDur < neededSrcSec && k >= segFrames - xfadeFrames) {
          g *= Math.max(0, (segFrames - 1 - k) / xfadeFrames);
        }
        outL[startFrame + k] += readLinear(srcL, srcPos) * g;
        outR[startFrame + k] += readLinear(srcR, srcPos) * g;
      }
      cursor += Math.max(0.25, loopLen - xfade);
      iter++;
    }
  } else {
    const copyFrames = Math.min(rawFrames, Math.ceil(availSrcSec * sampleRate));
    for (let k = 0; k < copyFrames; k++) {
      const srcPos = (startOff * srcSr) + k * ratio;
      outL[k] = readLinear(srcL, srcPos);
      outR[k] = readLinear(srcR, srcPos);
    }
  }
  return { outL, outR };
}

function renderVarispeedPureJS(prepL, prepR, rate, outFrames, sampleRate, fadeInSec, fadeOutSec, gain) {
  const outL = new Float32Array(outFrames);
  const outR = new Float32Array(outFrames);
  const inLen = prepL.length;
  const fadeInSamples = Math.max(0, Math.round(fadeInSec * sampleRate));
  const fadeOutSamples = Math.max(0, Math.round(fadeOutSec * sampleRate));
  const fadeOutStart = Math.max(0, outFrames - fadeOutSamples);

  for (let i = 0; i < outFrames; i++) {
    const pos = i * rate;
    const idx = pos | 0;
    if (idx >= inLen - 1) break;
    const f = pos - idx;
    let g = gain;
    if (fadeInSamples > 0 && i < fadeInSamples) g *= i / fadeInSamples;
    if (fadeOutSamples > 0 && i >= fadeOutStart) g *= (outFrames - 1 - i) / Math.max(1, fadeOutSamples);
    outL[i] = (prepL[idx] * (1 - f) + prepL[idx + 1] * f) * g;
    outR[i] = (prepR[idx] * (1 - f) + prepR[idx + 1] * f) * g;
  }
  return { outL, outR };
}

const defaultTrackCache = new Map();

export function getTrackUrlForStyle(style) {
  return getSlideSpec(style).defaultTrackUrl || "./assets/audio/bit2-lofi.mp3";
}

function trackApiUrlFor(url) {
  const file = String(url).split("/").pop() || "";
  const basename = file.replace(/\.mp3$/i, "");
  return basename ? `/api/track/${encodeURIComponent(basename)}` : null;
}

async function fetchDefaultTrackBuffer(style) {
  const url = getTrackUrlForStyle(style);
  if (defaultTrackCache.has(url)) {
    return defaultTrackCache.get(url).slice(0);
  }
  const apiUrl = trackApiUrlFor(url);
  const candidates = apiUrl ? [apiUrl, url] : [url];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        console.warn(`[BeatFrame audio] HTTP ${res.status} fetching ${candidate}`);
        continue;
      }
      const ab = await res.arrayBuffer();
      if (!ab || ab.byteLength < 64) {
        console.warn(`[BeatFrame audio] Empty or truncated audio (${ab ? ab.byteLength : 0} bytes) from ${candidate}`);
        continue;
      }
      defaultTrackCache.set(url, ab.slice(0));
      return ab;
    } catch (err) {
      console.warn(`[BeatFrame audio] Fetch failed for ${candidate}:`, err);
    }
  }
  return null;
}

// =========================================================================
// STUDIO WEB AUDIO SFX ENGINE (Split Monitor/Export Bus + Offline Renderer)
// =========================================================================
function createNoiseBuffer(audioCtx) {
  const sr = audioCtx.sampleRate;
  const len = Math.floor(sr * 1.2);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const rng = mulberry32(88421);
  for (let i = 0; i < len; i++) {
    data[i] = rng() * 2 - 1;
  }
  return buf;
}

function createStudioMasterChain(audioCtx) {
  const bus = audioCtx.createGain();
  bus.gain.value = 1.0;

  const warmth = audioCtx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 7800;
  warmth.Q.value = 0.6;

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 18;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.14;

  bus.connect(warmth);
  warmth.connect(compressor);
  return { bus, warmth, compressor };
}

class StudioAudioSynth {
  constructor(ctx, bus, noiseBuffer, onTrack = null) {
    this.ctx = ctx;
    this.bus = bus;
    this.noiseBuffer = noiseBuffer;
    this.onTrack = onTrack;
    this.baseTime = null; // When non-null, schedules deterministically at baseTime + delay
  }

  _now(delay = 0) {
    const origin = this.baseTime !== null ? this.baseTime : this.ctx.currentTime;
    return Math.max(0, origin + delay);
  }

  _track(node, gainNode = null) {
    if (this.onTrack) this.onTrack(node, gainNode);
  }

  // Layered pitched oscillator with optional filter & pitch sweep
  tone(type, freq, endFreq, dur, vol = 0.24, delay = 0, lpFreq = 5200) {
    if (!this.ctx || !this.bus) return;
    const now = this._now(delay);
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(28, endFreq), now + dur);
    }
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(lpFreq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filt);
    filt.connect(g);
    g.connect(this.bus);
    this._track(osc, g);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  // Crisp filtered noise burst (clicks, transients, fire crackle, air whoosh)
  noise(dur, startFreq, endFreq, q, vol = 0.16, delay = 0, filterType = "bandpass") {
    if (!this.ctx || !this.bus || !this.noiseBuffer) return;
    const now = this._now(delay);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, endFreq), now + dur);
    }
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(0.015, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    this._track(src, g);
    src.start(now, 0, Math.min(1.15, dur + 0.04));
  }

  // Reel 02: Warm Persian frame-drum (Daf-like deep thump + muted skin brush)
  dafThump(vol = 0.34, delay = 0, pitch = 112) {
    this.tone("sine", pitch, pitch * 0.48, 0.22, vol, delay, 650);
    this.tone("triangle", pitch * 1.45, pitch * 0.65, 0.09, vol * 0.38, delay, 900);
    this.noise(0.085, 520, 220, 1.4, vol * 0.35, delay, "bandpass");
  }

  // Reel 02: Santur / plucked string harmonic note (warm bell-like dual partial)
  santurPluck(freq, vol = 0.18, delay = 0, dur = 0.45) {
    this.tone("triangle", freq, freq, dur, vol, delay, 3200);
    this.tone("sine", freq * 2.0, freq * 1.995, dur * 0.55, vol * 0.36, delay, 4800);
    this.noise(0.018, 3400, 1800, 2.2, vol * 0.28, delay, "bandpass");
  }

  // Reel 02: Warm fire/ember ignition whoosh + harmonic shimmer
  emberIgnition(stage = 1, delay = 0) {
    const base = stage === 1 ? 293.66 : (stage === 2 ? 369.99 : 440.0);
    this.noise(0.28, 380, 1900 + stage * 420, 1.3, 0.16 + stage * 0.03, delay, "bandpass");
    this.santurPluck(base, 0.17, delay + 0.02, 0.55);
    this.santurPluck(base * 1.5, 0.13, delay + 0.07, 0.62);
    if (stage === 3) {
      this.santurPluck(587.33, 0.18, delay + 0.12, 0.85);
      this.santurPluck(739.99, 0.14, delay + 0.18, 0.95);
    }
  }

  // Reel 03: Tight Apple/Linear sub-bass punch + crisp transient tick
  kineticCut(pitch = 138, delay = 0) {
    this.tone("sine", pitch, 44, 0.14, 0.38, delay, 420);
    this.tone("triangle", pitch * 2.1, 68, 0.045, 0.16, delay, 1600);
    this.noise(0.022, 3600, 1400, 1.8, 0.14, delay, "highpass");
  }

  // Reel 03: Lush warm Major-9th synth pad swell (C3 G3 B3 D4 E4)
  major9Pad(dur = 3.6, delay = 0) {
    if (!this.ctx || !this.bus) return;
    const notes = [130.81, 196.0, 246.94, 293.66, 329.63];
    const now = this._now(delay);
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(520, now);
    filt.frequency.exponentialRampToValueAtTime(2400, now + dur * 0.45);
    filt.frequency.exponentialRampToValueAtTime(880, now + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.45);
    g.gain.setValueAtTime(0.20, now + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    filt.connect(g);
    g.connect(this.bus);

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(notes[i], now);
      osc.detune.setValueAtTime((i % 2 === 0 ? 1 : -1) * 4.5, now);
      const og = this.ctx.createGain();
      og.gain.value = i === 0 ? 0.35 : 0.16;
      osc.connect(og);
      og.connect(filt);
      this._track(osc, g);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }
  }

  // =======================================================================
  // REEL 04: 128 BPM SYNTHWAVE INSTRUMENTS (Blinding Lights / Stranger Things)
  // =======================================================================
  swKick(vol = 0.44, delay = 0) {
    if (!this.ctx || !this.bus) return;
    const now = this._now(delay);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(148, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.095);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.bus);
    this._track(osc, g);
    osc.start(now);
    osc.stop(now + 0.26);
    // Punchy beater click
    this.noise(0.016, 2600, 900, 1.2, vol * 0.22, delay, "bandpass");
  }

  swSnare(vol = 0.30, delay = 0) {
    if (!this.ctx || !this.bus || !this.noiseBuffer) return;
    const now = this._now(delay);
    // Snare body thump
    this.tone("triangle", 210, 128, 0.11, vol * 0.65, delay, 1600);
    // Classic 80s gated-reverb noise burst (bright punch + crisp gate cutoff)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.setValueAtTime(1750, now);
    hp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol * 0.95, now + 0.006);
    g.gain.setValueAtTime(vol * 0.62, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.bus);
    this._track(src, g);
    src.start(now, 0, 0.24);
  }

  swHat(vol = 0.11, delay = 0, open = false) {
    const dur = open ? 0.12 : 0.036;
    this.noise(dur, 7200, 5200, 1.4, vol, delay, "highpass");
  }

  swBass(freq, dur = 0.11, vol = 0.24, delay = 0, cutoff = 900, q = 3.2) {
    if (!this.ctx || !this.bus) return;
    const now = this._now(delay);
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    sub.type = "triangle";
    sub.frequency.setValueAtTime(freq * 0.5, now);

    filt.type = "lowpass";
    filt.frequency.setValueAtTime(Math.min(4800, cutoff * 1.45), now);
    filt.frequency.exponentialRampToValueAtTime(Math.max(140, cutoff * 0.55), now + dur);
    filt.Q.value = q;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const subG = this.ctx.createGain();
    subG.gain.value = 0.45;
    osc.connect(filt);
    sub.connect(subG);
    subG.connect(filt);
    filt.connect(g);
    g.connect(this.bus);

    this._track(osc, g);
    this._track(sub, g);
    osc.start(now);
    sub.start(now);
    osc.stop(now + dur + 0.025);
    sub.stop(now + dur + 0.025);
  }

  swLead(freq, dur = 0.24, vol = 0.17, delay = 0) {
    if (!this.ctx || !this.bus) return;
    const now = this._now(delay);
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(4200, now);
    filt.frequency.exponentialRampToValueAtTime(1600, now + dur);
    filt.Q.value = 1.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.setValueAtTime(vol * 0.82, now + Math.max(0.02, dur * 0.65));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    filt.connect(g);
    g.connect(this.bus);

    const detunes = [-7, 7];
    for (const dt of detunes) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(dt, now);
      osc.connect(filt);
      this._track(osc, g);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }
  }

  swArp(freq, dur = 0.095, vol = 0.11, delay = 0) {
    this.tone("sawtooth", freq, freq, dur, vol * 0.65, delay, 3800);
    this.tone("triangle", freq * 2, freq * 2, dur * 0.7, vol * 0.35, delay, 5200);
  }

  swRiser(dur = 0.80, vol = 0.24, delay = 0) {
    if (!this.ctx || !this.bus || !this.noiseBuffer) return;
    const now = this._now(delay);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(320, now);
    filt.frequency.exponentialRampToValueAtTime(4800, now + dur);
    filt.Q.value = 2.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.02);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.bus);
    this._track(src, g);
    src.start(now, 0, Math.min(1.15, dur + 0.04));

    // Pitch-rising synth tension tone
    this.tone("sawtooth", 220, 880, dur, vol * 0.45, delay, 3600);
  }

  swCrash(vol = 0.34, delay = 0) {
    if (!this.ctx || !this.bus) return;
    // Massive white-hot impact sub drop + wide cymbal crash + octave chord flash
    this.tone("sine", 130, 34, 0.55, vol * 1.15, delay, 480);
    this.noise(0.85, 5800, 1400, 0.8, vol * 0.78, delay, "highpass");
    this.swLead(349.23, 0.75, vol * 0.42, delay + 0.01);
    this.swLead(523.25, 0.75, vol * 0.38, delay + 0.01);
    this.swLead(698.46, 0.85, vol * 0.36, delay + 0.01);
  }

  swPad(notes, dur = 3.8, vol = 0.18, delay = 0) {
    if (!this.ctx || !this.bus) return;
    const now = this._now(delay);
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(900, now);
    filt.frequency.exponentialRampToValueAtTime(2800, now + dur * 0.35);
    filt.frequency.exponentialRampToValueAtTime(650, now + dur);
    filt.Q.value = 1.2;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.35);
    g.gain.setValueAtTime(vol * 0.88, now + dur * 0.62);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    filt.connect(g);
    g.connect(this.bus);

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(notes[i], now);
      osc.detune.setValueAtTime((i % 2 === 0 ? 1 : -1) * 5.5, now);
      const og = this.ctx.createGain();
      og.gain.value = i === 0 ? 0.36 : 0.16;
      osc.connect(og);
      og.connect(filt);
      this._track(osc, g);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }
  }

  swUiBlip(freq = 660, endFreq = 990, vol = 0.14, delay = 0) {
    this.tone("square", freq, endFreq, 0.06, vol, delay, 3400);
    this.tone("triangle", freq * 0.5, endFreq * 0.5, 0.06, vol * 0.7, delay, 1800);
  }

  swFireSurge(stage = 1, delay = 0) {
    const freqs = stage === 1 ? [349.23, 523.25] : (stage === 2 ? [415.30, 523.25, 622.25] : [349.23, 523.25, 698.46, 830.61]);
    this.noise(0.32, 420, 2400 + stage * 500, 1.3, 0.16 + stage * 0.03, delay, "bandpass");
    freqs.forEach((f, idx) => {
      this.swLead(f, 0.28 + stage * 0.08, 0.12, delay + idx * 0.045);
    });
  }
}

class StudioAudioEngine {
  constructor({ wsolaAdapter } = {}) {
    this.wsolaAdapter = wsolaAdapter || createWsolaAdapter();
    this.ctx = null;
    this.bus = null;
    this.warmth = null;
    this.compressor = null;
    this.monitorGain = null;
    this.exportGain = null;
    this.dest = null;
    this.synth = null;
    this.muted = false;
    this.exportMode = false;
    this.firedCues = new Set();
    this.activeNodes = new Set();
    this.lastT = 0;
    this.noiseBuffer = null;
    this.musicBuffers = {};
    this.customArrayBuffers = {};
    this.customStartOffsets = {};
    this.customNames = {};
    this.syncedSliceBuffers = {};
    this.syncedSliceMeta = {};
    this.trackAnalyses = {};
    this.syncSettings = {};
    this.musicDecodePromises = {};
    this._buildGen = {};
    this._building = {};
    this.musicStyle = null;
    this.musicSource = null;
    this.musicStartCtxTime = 0;
    this.musicStartOffset = 0;
    this.musicGain = null;
  }

  ensure(fromGesture = false) {
    const canAutoStart = typeof navigator === "undefined" || !navigator.userActivation
      || navigator.userActivation.hasBeenActive || navigator.userActivation.isActive;
    if (this.ctx) {
      if (fromGesture && this.ctx.state === "suspended") {
        this.ctx.resume().catch((err) => console.warn("[BeatFrame audio] resume failed:", err));
      }
      return;
    }
    if (!fromGesture && !canAutoStart) return;
    const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    if (fromGesture && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => console.warn("[BeatFrame audio] initial resume failed:", err));
    }

    const chain = createStudioMasterChain(this.ctx);
    this.bus = chain.bus;
    this.warmth = chain.warmth;
    this.compressor = chain.compressor;

    // Independent monitorGain (controlled by Mute) and exportGain (always active during export)
    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.value = this.muted ? 0 : 0.36;

    this.exportGain = this.ctx.createGain();
    this.exportGain.gain.value = this.exportMode ? 0.36 : 0;

    this.compressor.connect(this.monitorGain);
    this.monitorGain.connect(this.ctx.destination);

    this.dest = this.ctx.createMediaStreamDestination();
    this.compressor.connect(this.exportGain);
    this.exportGain.connect(this.dest);

    // Dedicated mastered-track gain bus (bypasses synth compressor to preserve studio mastering)
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 1.9;
    this.musicGain.connect(this.monitorGain);
    this.musicGain.connect(this.exportGain);

    this.noiseBuffer = createNoiseBuffer(this.ctx);
    this.synth = new StudioAudioSynth(this.ctx, this.bus, this.noiseBuffer, (node, gainNode) => {
      this.track(node, gainNode);
    });
  }

  track(node, gainNode = null) {
    const entry = { node, gainNode };
    this.activeNodes.add(entry);
    node.onended = () => {
      this.activeNodes.delete(entry);
    };
    return entry;
  }

  stopAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const entry of this.activeNodes) {
      try {
        if (entry.gainNode) {
          entry.gainNode.gain.cancelScheduledValues(now);
          entry.gainNode.gain.setTargetAtTime(0.0001, now, 0.015);
        }
        entry.node.stop(now + 0.04);
      } catch (_e) {
        // Node already stopped
      }
    }
    this.activeNodes.clear();
    this.stopMusic();
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.onended = null;
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (_e) {}
      this.musicSource = null;
    }
  }

  getSyncSettings(style) {
    if (!this.syncSettings[style]) {
      this.syncSettings[style] = {
        startOffset: 0.0,
        tempoSnap: false,
        pitchLock: false,
        autoLoop: false,
        beatMagnet: true,
        anchorMode: "start",
        customAnchorSec: 0.0,
        activeSliceIdx: 0,
        flexMode: "off",
        clipSpeed: 1.0,
        endingFade: "soft",
        selectedEventId: "act2_drop",
      };
    }
    return this.syncSettings[style];
  }

  getTempoPlan(style) {
    const spec = getSlideSpec(style);
    const analysis = this.trackAnalyses[style] || null;
    const cfg = this.getSyncSettings(style);
    return resolveTempoPlan(analysis, cfg, spec);
  }

  _computeSliceSignature(style, sampleRate, outFrames, plan, cfg) {
    return JSON.stringify({
      style,
      sampleRate,
      outFrames,
      startOffset: Math.round((cfg.startOffset || 0) * 1000) / 1000,
      flexMode: plan.flexMode,
      clipSpeed: Math.round(plan.clipSpeed * 10000) / 10000,
      audioRate: Math.round(plan.audioRate * 10000) / 10000,
      usePitchLock: Boolean(plan.usePitchLock),
      autoLoop: Boolean(cfg.autoLoop),
      endingFade: cfg.endingFade || "soft",
    });
  }

  async setCustomTrack(style, arrayBuffer, fileName = "") {
    this.ensure(true);
    this._buildGen[style] = (this._buildGen[style] || 0) + 1;
    this._building[style] = false;
    this.customArrayBuffers[style] = arrayBuffer.slice(0);
    this.customNames[style] = fileName;
    delete this.musicBuffers[style];
    delete this.musicDecodePromises[style];
    delete this.syncedSliceBuffers[style];
    delete this.syncedSliceMeta[style];
    delete this.trackAnalyses[style];
    this.stopMusic();
    if (!this.ctx) return null;
    try {
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.musicBuffers[style] = decoded;
      const analysis = BeatAnalyzer.analyzeTrack(decoded, style, SLIDE_REGISTRY);
      this.trackAnalyses[style] = analysis;
      const cfg = this.getSyncSettings(style);
      cfg.startOffset = analysis.topSlices.length ? analysis.topSlices[0].startSec : 0.0;
      cfg.activeSliceIdx = 0;
      cfg.autoLoop = analysis.isShort;
      cfg.clipSpeed = 1.0;
      cfg.selectedEventId = "act2_drop";
      if (analysis.status === "compatible") {
        cfg.tempoSnap = true;
        cfg.pitchLock = false;
        cfg.flexMode = "music_to_clip";
      } else if (analysis.status === "stretchable") {
        cfg.tempoSnap = true;
        cfg.pitchLock = true;
        cfg.flexMode = "music_to_clip";
      } else {
        cfg.tempoSnap = false;
        cfg.pitchLock = false;
        cfg.flexMode = "off";
      }
      this.customStartOffsets[style] = cfg.startOffset;
      await this.buildSyncedSlice(style);
      return { decoded, analysis };
    } catch (_e) {
      return null;
    }
  }

  async ensureAnalysis(style) {
    const buf = await this.ensureMusicBuffer(style);
    if (!buf) return null;
    if (!this.trackAnalyses[style]) {
      this.trackAnalyses[style] = BeatAnalyzer.analyzeTrack(buf, style, SLIDE_REGISTRY);
    }
    return this.trackAnalyses[style];
  }

  async updateSyncSettings(style, patch = {}) {
    const cfg = this.getSyncSettings(style);
    Object.assign(cfg, patch);
    if (patch.flexMode !== undefined && patch.tempoSnap === undefined) {
      cfg.tempoSnap = patch.flexMode !== "off";
    } else if (patch.tempoSnap !== undefined && patch.flexMode === undefined) {
      cfg.flexMode = patch.tempoSnap ? (cfg.flexMode === "off" ? "music_to_clip" : cfg.flexMode) : "off";
    }
    cfg.clipSpeed = clamp(Number(cfg.clipSpeed) || 1.0, 0.85, 1.15);

    const buf = this.musicBuffers[style];
    const plan = this.getTempoPlan(style);
    const neededDur = plan.effectiveDuration * plan.audioRate;
    const maxOff = (buf && !cfg.autoLoop)
      ? Math.max(0, buf.duration - neededDur)
      : (buf ? Math.max(0, buf.duration - 0.5) : 0);
    cfg.startOffset = clamp(Number(cfg.startOffset) || 0, 0, maxOff);
    this.customStartOffsets[style] = cfg.startOffset;
    delete this.syncedSliceBuffers[style];
    delete this.syncedSliceMeta[style];
    this.stopMusic();
    if ((this.customArrayBuffers[style] || buf) && buf) {
      await this.buildSyncedSlice(style);
    }
  }

  async applyAnchorMagnet(style, trackPeakSec, reelEventSec) {
    const spec = getSlideSpec(style);
    const cfg = this.getSyncSettings(style);
    const analysis = this.trackAnalyses[style] || null;
    const buf = this.musicBuffers[style] || null;
    const plan = this.getTempoPlan(style);

    let eventSec = reelEventSec;
    if (eventSec === undefined || eventSec === null) {
      const ev = Array.isArray(spec.events)
        ? spec.events.find((e) => e.id === cfg.selectedEventId) || spec.events.find((e) => e.isPrimary)
        : null;
      eventSec = ev ? ev.t : spec.primaryImpactSec;
    }

    const snappedPeak = (cfg.beatMagnet && analysis)
      ? snapToAnchorPeak(trackPeakSec, analysis)
      : Math.max(0, Number(trackPeakSec) || 0);

    const trackDuration = buf ? buf.duration : (analysis ? analysis.duration : plan.effectiveDuration);
    const res = computeAnchorStartOffset({
      trackPeakSec: snappedPeak,
      reelEventSec: eventSec,
      clipSpeed: plan.clipSpeed,
      audioRate: plan.audioRate,
      trackDuration,
      effectiveDuration: plan.effectiveDuration,
      autoLoop: Boolean(cfg.autoLoop),
      barPeriodSec: analysis ? analysis.barPeriodSec : 0,
    });

    await this.updateSyncSettings(style, {
      startOffset: res.startOffset,
      customAnchorSec: snappedPeak,
      anchorMode: "event",
      activeSliceIdx: -1,
    });

    return { ...res, trackPeakSec: snappedPeak, reelEventSec: eventSec };
  }

  setCustomOffset(style, sec) {
    return this.updateSyncSettings(style, { startOffset: sec, activeSliceIdx: -1 });
  }

  async buildSyncedSlice(style, sampleRate = 48000, exactDurationSec = null) {
    const buf = this.musicBuffers[style];
    if (!buf) return null;

    const gen = (this._buildGen[style] || 0) + 1;
    this._buildGen[style] = gen;
    this._building[style] = true;

    try {
      const cfg = this.getSyncSettings(style);
      const analysis = this.trackAnalyses[style] || null;
      const plan = this.getTempoPlan(style);
      const dur = (exactDurationSec !== null && exactDurationSec !== undefined)
        ? exactDurationSec
        : plan.effectiveDuration;
      const outFrames = Math.max(1, Math.ceil(dur * sampleRate));
      const rate = plan.audioRate;
      const usePitchLock = plan.usePitchLock;
      const startOff = cfg.startOffset || 0;
      const fadeInSec = 0.04;
      const fadeOutSec = getFadeOutSec(cfg.endingFade);
      const signature = this._computeSliceSignature(style, sampleRate, outFrames, plan, cfg);

      // Step 1: Resample source to target sampleRate stereo and assemble needed segment
      const neededSrcSec = dur * rate + 0.15;
      const availSrcSec = Math.max(0.1, buf.duration - startOff);
      const rawFrames = Math.max(1, Math.ceil(neededSrcSec * sampleRate));

      let prepL, prepR;
      let preparedBuf = null;

      if (typeof OfflineAudioContext !== "undefined") {
        const prepCtx = new OfflineAudioContext(2, rawFrames, sampleRate);
        if (cfg.autoLoop && availSrcSec < neededSrcSec) {
          const barLen = (analysis && !analysis.isRubato && analysis.barPeriodSec > 0.5)
            ? Math.max(analysis.barPeriodSec, Math.floor(availSrcSec / analysis.barPeriodSec) * analysis.barPeriodSec)
            : availSrcSec;
          const loopLen = clamp(barLen, 0.5, availSrcSec);
          const xfade = Math.min(0.035, loopLen * 0.15);
          let cursor = 0;
          let iter = 0;
          while (cursor < neededSrcSec && iter < 40) {
            const sNode = prepCtx.createBufferSource();
            sNode.buffer = buf;
            const gNode = prepCtx.createGain();
            const segDur = Math.min(loopLen, neededSrcSec - cursor + xfade);
            if (iter > 0) {
              gNode.gain.setValueAtTime(0.001, cursor);
              gNode.gain.linearRampToValueAtTime(1.0, cursor + xfade);
            } else {
              gNode.gain.setValueAtTime(1.0, 0);
            }
            if (cursor + segDur < neededSrcSec) {
              gNode.gain.setValueAtTime(1.0, Math.max(cursor, cursor + segDur - xfade));
              gNode.gain.linearRampToValueAtTime(0.001, cursor + segDur);
            }
            sNode.connect(gNode);
            gNode.connect(prepCtx.destination);
            sNode.start(cursor, startOff, segDur);
            cursor += Math.max(0.25, loopLen - xfade);
            iter++;
          }
        } else {
          const sNode = prepCtx.createBufferSource();
          sNode.buffer = buf;
          sNode.connect(prepCtx.destination);
          sNode.start(0, startOff, Math.min(availSrcSec, neededSrcSec));
        }

        preparedBuf = await prepCtx.startRendering();
        if (this._buildGen[style] !== gen) return null;
        prepL = preparedBuf.getChannelData(0);
        prepR = preparedBuf.numberOfChannels > 1 ? preparedBuf.getChannelData(1) : prepL;
      } else {
        const seg = prepareSegmentPureJS(buf, startOff, neededSrcSec, sampleRate, Boolean(cfg.autoLoop), analysis);
        prepL = seg.outL;
        prepR = seg.outR;
      }

      let finalBuf;
      if (usePitchLock) {
        // Compute onset sample offsets relative to startOff for transient lock
        let onsetSamples = null;
        if (analysis && Array.isArray(analysis.onsetTimesSec) && analysis.onsetTimesSec.length > 0) {
          const list = [];
          const endOff = startOff + neededSrcSec;
          for (let i = 0; i < analysis.onsetTimesSec.length; i++) {
            const ot = analysis.onsetTimesSec[i];
            if (ot >= startOff && ot <= endOff) {
              list.push(Math.round((ot - startOff) * sampleRate));
            }
          }
          if (list.length > 0) onsetSamples = new Int32Array(list);
        }

        const stretched = await this.wsolaAdapter.stretch({
          leftIn: prepL,
          rightIn: prepR,
          sampleRate,
          rate,
          outFrames,
          opts: { onsetSamples, fadeInSec, fadeOutSec, gain: 0.94 },
          generationId: gen,
        });
        if (this._buildGen[style] !== gen) return null;
        finalBuf = makeStereoAudioBuffer(this.ctx, stretched.outL, stretched.outR, sampleRate);
      } else if (typeof OfflineAudioContext !== "undefined" && preparedBuf) {
        const outCtx = new OfflineAudioContext(2, outFrames, sampleRate);
        const src = outCtx.createBufferSource();
        src.buffer = preparedBuf;
        src.playbackRate.value = rate;
        const g = outCtx.createGain();
        g.gain.setValueAtTime(0.001, 0);
        g.gain.linearRampToValueAtTime(0.94, fadeInSec);
        g.gain.setValueAtTime(0.94, Math.max(0.1, dur - fadeOutSec));
        g.gain.linearRampToValueAtTime(0.001, Math.max(0.2, dur - 0.03));
        src.connect(g);
        g.connect(outCtx.destination);
        src.start(0, 0, dur);
        finalBuf = await outCtx.startRendering();
        if (this._buildGen[style] !== gen) return null;
      } else {
        const res = renderVarispeedPureJS(prepL, prepR, rate, outFrames, sampleRate, fadeInSec, fadeOutSec, 0.94);
        if (this._buildGen[style] !== gen) return null;
        finalBuf = makeStereoAudioBuffer(this.ctx, res.outL, res.outR, sampleRate);
      }

      if (this._buildGen[style] !== gen) return null;
      this.syncedSliceBuffers[style] = finalBuf;
      this.syncedSliceMeta[style] = { signature, sampleRate, durationSec: dur, outFrames, gen };
      return finalBuf;
    } finally {
      if (this._buildGen[style] === gen) {
        this._building[style] = false;
      }
    }
  }

  resetCustomTrack(style) {
    this._buildGen[style] = (this._buildGen[style] || 0) + 1;
    this._building[style] = false;
    delete this.customArrayBuffers[style];
    delete this.customStartOffsets[style];
    delete this.customNames[style];
    delete this.musicBuffers[style];
    delete this.musicDecodePromises[style];
    delete this.syncedSliceBuffers[style];
    delete this.syncedSliceMeta[style];
    delete this.trackAnalyses[style];
    delete this.syncSettings[style];
    this.stopMusic();
  }

  ensureMusicBuffer(style) {
    const key = style;
    if (this.musicBuffers[key]) return Promise.resolve(this.musicBuffers[key]);
    if (this.musicDecodePromises[key]) return this.musicDecodePromises[key];
    if (!this.ctx) return Promise.resolve(null);
    const rawPromise = this.customArrayBuffers[key]
      ? Promise.resolve(this.customArrayBuffers[key].slice(0))
      : fetchDefaultTrackBuffer(style);
    this.musicDecodePromises[key] = rawPromise
      .then(async (raw) => {
        if (!raw) return null;
        const headHex = Array.from(new Uint8Array(raw.slice(0, 4))).map((b) => b.toString(16).padStart(2, "0")).join(" ");
        try {
          return await this.ctx.decodeAudioData(raw.slice(0));
        } catch (err) {
          console.warn(`[BeatFrame audio] decodeAudioData failed for ${key} (${raw.byteLength} bytes, head=${headHex}):`, err);
          return null;
        }
      })
      .then((buf) => {
        if (buf) {
          this.musicBuffers[key] = buf;
        } else {
          delete this.musicDecodePromises[key];
        }
        return buf;
      })
      .catch((err) => {
        delete this.musicDecodePromises[key];
        console.warn(`[BeatFrame audio] ensureMusicBuffer error for ${key}:`, err);
        return null;
      });
    return this.musicDecodePromises[key];
  }

  syncMusic(style, t) {
    if (!this.ctx || !this.musicGain) return;
    if (this.muted && !this.exportMode) {
      this.stopMusic();
      return;
    }
    const key = style;
    // Never fall back to raw unstretched musicBuffers while a synced slice build is in flight
    if (this._building[key]) {
      this.stopMusic();
      return;
    }
    const hasCustom = Boolean(this.customArrayBuffers[key]);
    const hasSynced = Boolean(this.syncedSliceBuffers[key]);
    if (hasCustom && !hasSynced) {
      this.stopMusic();
      return;
    }
    const buf = hasSynced ? this.syncedSliceBuffers[key] : this.musicBuffers[key];
    if (!buf) {
      this.ensureMusicBuffer(style);
      return;
    }
    if (this.ctx.state !== "running") {
      return;
    }
    const baseOff = hasSynced ? 0 : (this.customStartOffsets[key] || 0);
    const safeOffset = clamp(baseOff + t, 0, Math.max(0, buf.duration - 0.05));
    if (this.musicSource && this.musicStyle === key) {
      const expected = this.musicStartOffset + (this.ctx.currentTime - this.musicStartCtxTime);
      if (Math.abs(expected - safeOffset) < 0.14) return;
      this.stopMusic();
    } else if (this.musicSource) {
      this.stopMusic();
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.musicGain);
    this.musicStyle = key;
    this.musicStartCtxTime = this.ctx.currentTime;
    this.musicStartOffset = safeOffset;
    src.onended = () => {
      if (this.musicSource === src) this.musicSource = null;
    };
    src.start(0, safeOffset);
    this.musicSource = src;
  }

  setMuted(m) {
    this.muted = m;
    if (!m) this.ensure(true);
    if (m && !this.exportMode) this.stopAll();
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(m ? 0 : 0.36, this.ctx.currentTime, 0.018);
    }
  }

  setExportMode(active) {
    this.exportMode = Boolean(active);
    if (this.exportMode) this.ensure();
    if (this.exportGain && this.ctx) {
      this.exportGain.gain.setTargetAtTime(this.exportMode ? 0.36 : 0, this.ctx.currentTime, 0.01);
    }
  }

  resetCues(stopPlayingAudio = false) {
    this.firedCues.clear();
    if (stopPlayingAudio) this.stopAll();
  }

  getExportStreamTrack() {
    this.setExportMode(true);
    return this.dest ? this.dest.stream.getAudioTracks()[0] || null : null;
  }

  processCues(style, t) {
    if (t < this.lastT - 0.15) {
      this.firedCues.clear();
      this.stopAll();
    }
    this.lastT = t;
    if (this.muted && !this.exportMode) {
      this.stopMusic();
      return;
    }
    this.ensure();
    this.syncMusic(style, t);
    return;
  }

  async renderOfflineBuffer(style, exactDurationSec = null, sampleRate = 48000) {
    const plan = this.getTempoPlan(style);
    const durationSec = (exactDurationSec !== null && exactDurationSec !== undefined)
      ? exactDurationSec
      : plan.effectiveDuration;
    const totalFrames = Math.max(1, Math.ceil(durationSec * sampleRate));
    const cfg = this.getSyncSettings(style);
    const expectedSig = this._computeSliceSignature(style, sampleRate, totalFrames, plan, cfg);

    // Reuse cached synced slice if signature & exact frame count match
    if (
      this.syncedSliceBuffers[style] &&
      this.syncedSliceMeta[style] &&
      this.syncedSliceMeta[style].signature === expectedSig
    ) {
      return this.syncedSliceBuffers[style];
    }

    if (this.customArrayBuffers[style] || this.musicBuffers[style]) {
      if (!this.musicBuffers[style] && this.customArrayBuffers[style] && typeof OfflineAudioContext !== "undefined") {
        const decCtx = new OfflineAudioContext(2, totalFrames, sampleRate);
        this.musicBuffers[style] = await decCtx.decodeAudioData(this.customArrayBuffers[style].slice(0));
      }
      if (this.musicBuffers[style]) {
        const rebuilt = await this.buildSyncedSlice(style, sampleRate, durationSec);
        if (rebuilt) return rebuilt;
      }
    }

    if (typeof OfflineAudioContext === "undefined") {
      return makeStereoAudioBuffer(null, new Float32Array(totalFrames), new Float32Array(totalFrames), sampleRate);
    }

    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);
    try {
      const rawBuf = await fetchDefaultTrackBuffer(style);
      if (!rawBuf) throw new Error("Default track unavailable");
      const decoded = await offlineCtx.decodeAudioData(rawBuf);
      const src = offlineCtx.createBufferSource();
      src.buffer = decoded;
      const fadeOutSec = getFadeOutSec(cfg.endingFade);
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(0.001, 0);
      g.gain.linearRampToValueAtTime(0.92, 0.05);
      g.gain.setValueAtTime(0.92, Math.max(0.1, durationSec - fadeOutSec));
      g.gain.linearRampToValueAtTime(0.001, Math.max(0.2, durationSec - 0.04));
      src.connect(g);
      g.connect(offlineCtx.destination);
      src.start(0, 0, durationSec);
      return await offlineCtx.startRendering();
    } catch (_err) {
      // Fall through to procedural fallback if decode fails
    }

    const chain = createStudioMasterChain(offlineCtx);
    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.36, 0);
    if (style === "atashpro" && durationSec > 1.0) {
      master.gain.setValueAtTime(0.36, Math.max(0, durationSec - 0.85));
      master.gain.linearRampToValueAtTime(0.0001, Math.max(0.1, durationSec - 0.25));
      master.gain.setValueAtTime(0.0001, durationSec);
    }
    chain.compressor.connect(master);
    master.connect(offlineCtx.destination);

    const noiseBuf = createNoiseBuffer(offlineCtx);
    const synth = new StudioAudioSynth(offlineCtx, chain.bus, noiseBuf, null);

    const cues = CUE_TABLE[style] || [];
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (c.t < durationSec - 0.05) {
        synth.baseTime = c.t;
        c.play(synth);
      }
    }
    return await offlineCtx.startRendering();
  }
}

// Strictly time-triggered SFX cues locked to tightened 4-act split (4.2s / 8.2s / 15.0s / 20.0s)
const CUE_TABLE = {
  bit2: [
    // Act 1 (0–4.2s): Retro Game Boy / Playdate backlog drops
    { t: 0.08, play: (a) => { a.tone("square", 240, 98, 0.11, 0.22, 0, 2600); a.tone("triangle", 120, 56, 0.14, 0.28, 0, 900); } },
    { t: 0.68, play: (a) => a.tone("triangle", 190, 82, 0.08, 0.22, 0, 1200) },
    { t: 1.28, play: (a) => a.tone("square", 210, 110, 0.07, 0.16, 0, 2200) },
    { t: 1.95, play: (a) => a.tone("triangle", 175, 76, 0.08, 0.22, 0, 1100) },
    // Act 2 (4.2–8.2s): Staircase wipe + Front card + cursor blip on نمایش پاسخ
    { t: 4.24, play: (a) => { a.tone("square", 330, 660, 0.07, 0.16, 0, 2800); a.tone("square", 660, 880, 0.08, 0.16, 0.06, 3000); } },
    { t: 6.85, play: (a) => a.tone("square", 520, 680, 0.045, 0.14, 0, 2600) },
    { t: 7.40, play: (a) => { a.tone("square", 660, 990, 0.06, 0.18, 0, 3200); a.tone("triangle", 330, 495, 0.06, 0.16, 0, 1800); } },
    // Act 3 (8.2–15.0s): Card reveal + cursor tap خوب بود + retro arpeggio level-up
    { t: 8.24, play: (a) => a.tone("square", 587, 880, 0.08, 0.16, 0, 3000) },
    { t: 10.25, play: (a) => a.tone("square", 523, 659, 0.045, 0.14, 0, 2600) },
    { t: 10.80, play: (a) => {
      a.tone("square", 523.25, 523.25, 0.07, 0.18, 0.00, 3400);
      a.tone("square", 659.25, 659.25, 0.07, 0.18, 0.065, 3400);
      a.tone("square", 783.99, 783.99, 0.08, 0.19, 0.13, 3600);
      a.tone("square", 1046.5, 1046.5, 0.18, 0.21, 0.20, 3800);
      a.tone("triangle", 261.63, 523.25, 0.24, 0.22, 0.00, 1400);
    } },
    // Act 4 (15.0–20.0s): Warm 4-note 8-bit victory fanfare
    { t: 15.05, play: (a) => {
      a.tone("square", 523.25, 523.25, 0.09, 0.17, 0.00, 3000);
      a.tone("square", 659.25, 659.25, 0.09, 0.17, 0.09, 3000);
      a.tone("square", 783.99, 783.99, 0.09, 0.18, 0.18, 3200);
      a.tone("square", 1046.5, 1046.5, 0.34, 0.20, 0.27, 3400);
      a.tone("triangle", 261.63, 261.63, 0.45, 0.24, 0.27, 1200);
    } },
  ],

  atashkadeh: [
    // Act 1 (0–4.2s): Deep Persian frame-drum + dim ember crackle
    { t: 0.08, play: (a) => { a.dafThump(0.36, 0, 108); a.noise(0.18, 900, 420, 1.8, 0.09, 0.06, "bandpass"); } },
    { t: 1.75, play: (a) => a.dafThump(0.22, 0, 128) },
    // Act 2 (4.2–8.2s): Frame-drum transition + santur pluck + tap on نمایش پاسخ
    { t: 4.24, play: (a) => { a.dafThump(0.32, 0, 114); a.santurPluck(293.66, 0.16, 0.06, 0.5); } },
    { t: 4.58, play: (a) => a.santurPluck(369.99, 0.15, 0, 0.48) },
    { t: 7.40, play: (a) => { a.santurPluck(440.0, 0.17, 0, 0.42); a.noise(0.03, 2400, 1100, 1.8, 0.10, 0, "bandpass"); } },
    // Act 3 (8.2–15.0s): Modal reveal + 3-stage fire ignition (روشن شد -> بوووووم!! -> حسابی آتیش به پا میکنی!)
    { t: 8.24, play: (a) => { a.dafThump(0.28, 0, 118); a.santurPluck(440.0, 0.16, 0.04, 0.55); a.santurPluck(587.33, 0.14, 0.11, 0.62); } },
    { t: 10.80, play: (a) => a.emberIgnition(2, 0) },
    { t: 11.30, play: (a) => { a.dafThump(0.34, 0, 104); a.emberIgnition(3, 0.02); } },
    // Act 4 (15.0–20.0s): Warm resonant Persian modal chord + ember shimmer
    { t: 15.05, play: (a) => {
      a.dafThump(0.36, 0, 102);
      a.noise(0.45, 500, 2200, 1.2, 0.14, 0.04, "bandpass");
      a.santurPluck(293.66, 0.18, 0.05, 1.1);
      a.santurPluck(440.00, 0.16, 0.13, 1.1);
      a.santurPluck(587.33, 0.16, 0.21, 1.2);
      a.santurPluck(739.99, 0.14, 0.29, 1.3);
    } },
  ],

  kinetic: [
    // Act 1 (0–4.2s): Tight sub-bass punch + transient tick on every 1.05s beat
    { t: 0.04, play: (a) => a.kineticCut(136, 0) },
    { t: 1.06, play: (a) => a.kineticCut(152, 0) },
    { t: 2.11, play: (a) => a.kineticCut(172, 0) },
    { t: 3.16, play: (a) => { a.kineticCut(144, 0); a.noise(0.22, 600, 2400, 1.2, 0.15, 0.03, "bandpass"); } },
    // Act 2 (4.2–8.2s): Smooth band-passed air whoosh on chip/card slides + tactile click
    { t: 4.24, play: (a) => a.noise(0.18, 700, 2600, 1.4, 0.14, 0, "bandpass") },
    { t: 4.44, play: (a) => a.noise(0.14, 900, 3000, 1.5, 0.11, 0, "bandpass") },
    { t: 7.40, play: (a) => { a.noise(0.025, 3400, 1600, 2.0, 0.18, 0, "bandpass"); a.tone("sine", 240, 90, 0.06, 0.22, 0, 1200); } },
    // Act 3 (8.2–15.0s): Flip whoosh + spoiler shimmer + خیلی آسون punch
    { t: 8.24, play: (a) => { a.kineticCut(150, 0); a.noise(0.18, 800, 2800, 1.3, 0.14, 0.02, "bandpass"); } },
    { t: 9.02, play: (a) => a.noise(0.22, 1600, 3600, 2.2, 0.09, 0, "bandpass") },
    { t: 10.80, play: (a) => {
      a.noise(0.024, 3800, 1800, 2.0, 0.18, 0, "bandpass");
      a.tone("triangle", 523.25, 783.99, 0.09, 0.20, 0.01, 3600);
      a.tone("sine", 783.99, 1046.5, 0.14, 0.18, 0.06, 4200);
    } },
    // Act 4 (15.0–20.0s): Lush warm Major-9th synth pad swell + 1.05s rhythmic pulses
    { t: 15.04, play: (a) => { a.kineticCut(132, 0); a.major9Pad(4.2, 0.04); } },
    { t: 16.09, play: (a) => a.kineticCut(118, 0) },
    { t: 17.14, play: (a) => a.kineticCut(128, 0) },
    { t: 18.19, play: (a) => a.kineticCut(120, 0) },
    { t: 19.24, play: (a) => a.tone("sine", 110, 48, 0.12, 0.24, 0, 380) },
  ],
  atashpro: (() => {
    // 128 BPM Synthwave Soundtrack in F minor (Fm -> Cm -> Eb -> Bb)
    // 16th = 0.1171875s, 8th = 0.234375s, quarter = 0.46875s, 1 bar = 1.875s, 16 bars = 30.0s
    const STEP = 60 / 128 / 4; // 0.1171875s
    const cues = [];

    // F minor chord progression bass roots (low octave, high octave)
    const PROG = [
      { low: 43.65, high: 87.31, arp: [349.23, 523.25, 415.30, 622.25] }, // Fm (F1/F2)
      { low: 65.41, high: 130.81, arp: [261.63, 392.00, 311.13, 523.25] }, // Cm (C2/C3)
      { low: 77.78, high: 155.56, arp: [311.13, 466.16, 392.00, 622.25] }, // Eb (Eb2/Eb3)
      { low: 58.27, high: 116.54, arp: [233.08, 349.23, 293.66, 466.16] }, // Bb (Bb1/Bb2)
    ];

    // Stranger Things pulsing 16th bass pattern (F2 - C3 - Ab2 - G2)
    const ST_ARP = [87.31, 130.81, 103.83, 98.00, 87.31, 130.81, 116.54, 103.83];

    // Blinding Lights-inspired bright F-minor Juno brass lead motif (32 steps = 2 bars)
    // Notes: C5=523.25, Bb4=466.16, Db5=554.37, G4=392.00, Ab4=415.30, F4=349.23, Eb5=622.25, F5=698.46
    const LEAD_RIFF = {
      0: [523.25, 0.30],
      4: [523.25, 0.22],
      6: [466.16, 0.18],
      8: [523.25, 0.18],
      10: [554.37, 0.26],
      13: [392.00, 0.24],
      16: [415.30, 0.34],
      20: [523.25, 0.22],
      22: [466.16, 0.18],
      24: [415.30, 0.20],
      26: [392.00, 0.26],
      29: [349.23, 0.32],
    };
    const LEAD_CLIMAX = {
      0: [698.46, 0.28],
      3: [622.25, 0.18],
      5: [523.25, 0.22],
      8: [698.46, 0.26],
      11: [622.25, 0.18],
      13: [554.37, 0.24],
      16: [523.25, 0.30],
      20: [622.25, 0.22],
      22: [698.46, 0.24],
      25: [830.61, 0.24],
      28: [698.46, 0.34],
    };

    const totalSteps = Math.floor(29.45 / STEP);
    for (let step = 0; step < totalSteps; step++) {
      const t = Number((step * STEP).toFixed(4));
      const stepInBar = step % 16;
      const bar = Math.floor(step / 16);
      const chord = PROG[bar % 4];
      const motifStep = step % 32;

      // ACT 1 (0.0 - 4.5s): Stranger Things dark pulsing 16th bass arp + sweeping filter + heartbeat kick
      if (t < 4.5) {
        const prog = t / 4.5;
        const cutoff = 350 + prog * 750; // 350Hz -> 1100Hz sweep
        const note = ST_ARP[step % ST_ARP.length];
        const isHeartBeat = stepInBar === 0 || stepInBar === 8;
        cues.push({
          t,
          play: (a) => {
            a.swBass(note, STEP * 0.92, 0.23, 0, cutoff, 3.8);
            if (isHeartBeat) a.swKick(0.28, 0);
          },
        });
      }
      // ACT 2 (4.5 - 11.5s): 4-on-the-floor kick + 80s gated snare + driving 8th octave bass
      else if (t < 11.5) {
        const isKick = stepInBar % 4 === 0;
        const isSnare = stepInBar === 4 || stepInBar === 12;
        const isBass = stepInBar % 2 === 0;
        const bassFreq = (stepInBar % 4 === 0) ? chord.low : chord.high;
        const isHat = stepInBar % 2 === 1;
        cues.push({
          t,
          play: (a) => {
            if (isKick) a.swKick(0.42, 0);
            if (isSnare) a.swSnare(0.28, 0);
            if (isBass) a.swBass(bassFreq, STEP * 1.65, 0.26, 0, 1250, 2.2);
            if (isHat) a.swHat(0.075, 0, false);
          },
        });
      }
      // ACT 3 (11.5 - 18.5s): Blinding Lights Juno brassy lead enters + 16th hi-hats + driving drums/bass
      else if (t < 18.5) {
        const isKick = stepInBar % 4 === 0;
        const isSnare = stepInBar === 4 || stepInBar === 12;
        const isBass = stepInBar % 2 === 0;
        const bassFreq = (stepInBar % 4 === 0) ? chord.low : chord.high;
        const leadNote = LEAD_RIFF[motifStep] || null;
        const openHat = stepInBar === 14;
        cues.push({
          t,
          play: (a) => {
            if (isKick) a.swKick(0.44, 0);
            if (isSnare) a.swSnare(0.30, 0);
            if (isBass) a.swBass(bassFreq, STEP * 1.65, 0.27, 0, 1550, 2.4);
            a.swHat(stepInBar % 2 === 0 ? 0.06 : 0.105, 0, openHat);
            if (leadNote) a.swLead(leadNote[0], leadNote[1], 0.165, 0);
          },
        });
      }
      // ACT 4 (18.5 - 25.5s): Full euphoric climax — soaring lead + high 16th synth arp + riser into 23.8s crash
      else if (t < 25.5) {
        const inRiserGap = t >= 23.0 && t < 23.8;
        const isKick = !inRiserGap && stepInBar % 4 === 0;
        const isSnare = !inRiserGap && (stepInBar === 4 || stepInBar === 12);
        const isBass = !inRiserGap && stepInBar % 2 === 0;
        const bassFreq = (stepInBar % 4 === 0) ? chord.low : chord.high;
        const leadNote = !inRiserGap ? (LEAD_CLIMAX[motifStep] || null) : null;
        const arpFreq = chord.arp[step % chord.arp.length] * (stepInBar >= 8 ? 2 : 1);
        cues.push({
          t,
          play: (a) => {
            if (isKick) a.swKick(0.46, 0);
            if (isSnare) a.swSnare(0.32, 0);
            if (isBass) a.swBass(bassFreq, STEP * 1.65, 0.28, 0, 1850, 2.6);
            if (!inRiserGap) a.swHat(stepInBar % 2 === 0 ? 0.07 : 0.115, 0, stepInBar === 14);
            a.swArp(arpFreq, STEP * 0.85, inRiserGap ? 0.13 : 0.10, 0);
            if (leadNote) a.swLead(leadNote[0], leadNote[1], 0.18, 0);
          },
        });
      }
      // ACT 5 (25.5 - 29.45s): Heroic sustained Juno pad + pulsing arp + gentle heartbeat
      else {
        const fade = clamp(1 - (t - 28.4) / 1.15, 0.08, 1);
        const arpFreq = chord.arp[step % chord.arp.length] * 2;
        const isKick = stepInBar % 4 === 0 && t < 28.7;
        cues.push({
          t,
          play: (a) => {
            if (isKick) a.swKick(0.30 * fade, 0);
            a.swArp(arpFreq, STEP * 0.9, 0.10 * fade, 0);
          },
        });
      }
    }

    // Story-locked UI blips, fire ignitions, dramatic riser, white-hot crash, and Act 5 Juno pad
    cues.push(
      { t: 4.50, play: (a) => a.swUiBlip(440, 660, 0.13, 0) },
      { t: 6.95, play: (a) => a.swUiBlip(587.33, 880, 0.14, 0) },
      { t: 8.80, play: (a) => a.swUiBlip(523.25, 698.46, 0.16, 0) },
      { t: 10.00, play: (a) => a.swFireSurge(1, 0) },
      { t: 11.50, play: (a) => a.swUiBlip(523.25, 783.99, 0.13, 0) },
      { t: 13.95, play: (a) => a.swUiBlip(622.25, 932.33, 0.14, 0) },
      { t: 15.80, play: (a) => a.swUiBlip(698.46, 1046.5, 0.16, 0) },
      { t: 17.00, play: (a) => a.swFireSurge(2, 0) },
      { t: 18.52, play: (a) => { a.swUiBlip(698.46, 1396.91, 0.15, 0); a.noise(0.14, 900, 3200, 1.4, 0.12, 0, "bandpass"); } },
      { t: 19.70, play: (a) => a.swUiBlip(587.33, 880, 0.13, 0) },
      { t: 21.25, play: (a) => a.swUiBlip(698.46, 1046.5, 0.14, 0) },
      { t: 22.70, play: (a) => a.swUiBlip(830.61, 1396.91, 0.17, 0) },
      { t: 23.00, play: (a) => a.swRiser(0.78, 0.26, 0) },
      { t: 23.80, play: (a) => { a.swCrash(0.36, 0); a.swFireSurge(3, 0.03); } },
      { t: 25.52, play: (a) => a.swPad([174.61, 261.63, 311.13, 392.00, 415.30], 3.9, 0.21, 0) }
    );

    cues.sort((a, b) => a.t - b.t);
    return cues;
  })(),
};

export { StudioAudioEngine, StudioAudioSynth, CUE_TABLE };
export default StudioAudioEngine;
