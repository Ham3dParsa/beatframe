import { clamp, SLIDE_REGISTRY } from "../core/registry.js";

export const BeatAnalyzer = (() => {
      function biquadCoeffs(type, fc, fs, Q = 0.7071) {
        const w0 = 2 * Math.PI * fc / fs;
        const cosw = Math.cos(w0);
        const sinw = Math.sin(w0);
        const alpha = sinw / (2 * Q);
        let b0, b1, b2, a0, a1, a2;
        if (type === "lowpass") {
          b0 = (1 - cosw) / 2; b1 = 1 - cosw; b2 = (1 - cosw) / 2;
          a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
        } else if (type === "highpass") {
          b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2;
          a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
        } else {
          b0 = alpha; b1 = 0; b2 = -alpha;
          a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha;
        }
        return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
      }

      function foldBpmToTarget(bpm, targetBpm) {
        const cands = [bpm * 0.5, bpm, bpm * 2.0];
        let best = bpm;
        let bestErr = Infinity;
        for (let i = 0; i < cands.length; i++) {
          const c = cands[i];
          if (c < 55 || c > 210) continue;
          const err = Math.abs(c - targetBpm) / targetBpm;
          if (err < bestErr) { bestErr = err; best = c; }
        }
        return { effectiveBpm: best, deltaPct: bestErr * 100 };
      }

      function computeWaveformPeaks(audioBuffer, numBars = 140) {
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
        const len = ch0.length;
        const peaks = new Float32Array(numBars);
        const step = Math.max(1, Math.floor(len / numBars));
        const stride = Math.max(1, Math.floor(step / 64));
        let maxP = 0.001;
        for (let b = 0; b < numBars; b++) {
          const start = b * step;
          const end = Math.min(len, start + step);
          let p = 0;
          for (let i = start; i < end; i += stride) {
            const v = Math.abs((ch0[i] + ch1[i]) * 0.5);
            if (v > p) p = v;
          }
          peaks[b] = p;
          if (p > maxP) maxP = p;
        }
        for (let b = 0; b < numBars; b++) peaks[b] /= maxP;
        return peaks;
      }

      function resolveTempoPlan(analysis, syncCfg = {}, slideSpec = SLIDE_REGISTRY.bit2) {
        const spec = slideSpec || SLIDE_REGISTRY.bit2;
        const baseDur = spec.durationSec || 20.0;
        const targetBpm = spec.targetBpm || 120.0;

        let flexMode = syncCfg && syncCfg.flexMode;
        if (!flexMode) {
          flexMode = (syncCfg && syncCfg.tempoSnap) ? "music_to_clip" : "off";
        }
        if (flexMode !== "off" && flexMode !== "music_to_clip" && flexMode !== "clip_to_music" && flexMode !== "balanced") {
          flexMode = "off";
        }

        const manualSpeed = (syncCfg && syncCfg.clipSpeed !== undefined && syncCfg.clipSpeed !== null)
          ? clamp(Number(syncCfg.clipSpeed) || 1.0, 0.85, 1.15)
          : 1.0;

        const hasTrack = Boolean(analysis && !analysis.isRubato && analysis.effectiveBpm > 0);
        const deltaPct = analysis && Number.isFinite(analysis.deltaPct)
          ? Math.round(analysis.deltaPct * 10) / 10
          : 0;
        const trackEligible = Boolean(hasTrack && analysis.status !== "mismatch");

        let clipSpeed = 1.0;
        let audioRate = 1.0;
        let canSync = false;

        if (flexMode === "off") {
          clipSpeed = manualSpeed;
          audioRate = 1.0;
          canSync = false;
        } else if (!trackEligible) {
          clipSpeed = manualSpeed;
          audioRate = 1.0;
          canSync = false;
        } else if (flexMode === "music_to_clip") {
          clipSpeed = manualSpeed;
          const desiredAudio = (targetBpm * clipSpeed) / analysis.effectiveBpm;
          audioRate = clamp(desiredAudio, 0.80, 1.25);
          canSync = true;
        } else if (flexMode === "clip_to_music") {
          const desiredClip = analysis.effectiveBpm / targetBpm;
          clipSpeed = clamp(desiredClip, 0.85, 1.15);
          audioRate = 1.0;
          canSync = true;
        } else if (flexMode === "balanced") {
          const desiredClip = Math.sqrt(analysis.effectiveBpm / targetBpm);
          clipSpeed = clamp(desiredClip, 0.85, 1.15);
          const desiredAudio = (targetBpm * clipSpeed) / analysis.effectiveBpm;
          audioRate = clamp(desiredAudio, 0.80, 1.25);
          canSync = true;
        }

        const effectiveDuration = baseDur / clipSpeed;
        const effectiveSlideBpm = Math.round(targetBpm * clipSpeed * 100) / 100;
        const usePitchLock = Boolean(canSync && syncCfg && syncCfg.pitchLock && Math.abs(audioRate - 1.0) > 0.002);

        return {
          flexMode,
          clipSpeed,
          audioRate,
          effectiveDuration,
          effectiveSlideBpm,
          deltaPct,
          usePitchLock,
          canSync,
        };
      }

      function computeAnchorStartOffset({
        trackPeakSec = 0,
        reelEventSec = 0,
        clipSpeed = 1.0,
        audioRate = 1.0,
        trackDuration = 0,
        effectiveDuration = 20.0,
        autoLoop = false,
        barPeriodSec = 0,
      } = {}) {
        const safeClipSpeed = Math.max(0.1, Number(clipSpeed) || 1.0);
        const safeAudioRate = Math.max(0.1, Number(audioRate) || 1.0);
        const realEventSec = reelEventSec / safeClipSpeed;
        const rawStart = trackPeakSec - realEventSec * safeAudioRate;

        const neededSrcDur = effectiveDuration * safeAudioRate;
        const maxStart = autoLoop
          ? Math.max(0, trackDuration - 0.5)
          : Math.max(0, trackDuration - neededSrcDur);

        let candidate = rawStart;
        // If autoLoop is enabled and rawStart is negative with a known barPeriodSec, wrap forward by whole bars
        if (autoLoop && candidate < 0 && barPeriodSec > 0.25 && maxStart > 0) {
          const barsToAdd = Math.ceil(-candidate / barPeriodSec);
          const wrapped = candidate + barsToAdd * barPeriodSec;
          if (wrapped <= maxStart) {
            candidate = wrapped;
          }
        }

        const startOffset = clamp(candidate, 0, maxStart);
        const clamped = Math.abs(startOffset - rawStart) > 1e-6;
        const driftSec = clamped
          ? Math.round(((startOffset - rawStart) / safeAudioRate) * 1000) / 1000
          : 0;

        return {
          startOffset: Math.round(startOffset * 1000) / 1000,
          clamped,
          driftSec,
        };
      }

      function snapToAnchorPeak(rawSec, analysis, snapRadiusSec = 0.25) {
        const t = Math.max(0, Number(rawSec) || 0);
        if (!analysis) return t;

        const peaks = analysis.anchorPeaks;
        if (Array.isArray(peaks) && peaks.length > 0) {
          let best = null;
          let bestDist = Infinity;
          for (let i = 0; i < peaks.length; i++) {
            const p = peaks[i];
            const d = Math.abs(p.timeSec - t);
            if (d <= snapRadiusSec) {
              if (!best || p.strength > best.strength + 1e-6 || (Math.abs(p.strength - best.strength) <= 1e-6 && d < bestDist)) {
                best = p;
                bestDist = d;
              }
            }
          }
          if (best) return best.timeSec;
        }

        if (!analysis.isRubato && Array.isArray(analysis.barTimes) && analysis.barTimes.length > 0 && analysis.barPeriodSec > 0) {
          const origin = analysis.barTimes[0];
          const k = Math.round((t - origin) / analysis.barPeriodSec);
          const snapped = clamp(origin + k * analysis.barPeriodSec, 0, analysis.duration || Infinity);
          return Math.round(snapped * 1000) / 1000;
        }

        return t;
      }

      function analyzeTrack(audioBuffer, activeSlideId, registry = SLIDE_REGISTRY) {
        const tStart = performance.now();
        const sr = audioBuffer.sampleRate;
        const dur = audioBuffer.duration;
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
        const dec = 4;
        const dSr = sr / dec;
        const dLen = Math.floor(ch0.length / dec);
        const mono = new Float32Array(dLen);
        if (ch1) {
          for (let i = 0; i < dLen; i++) {
            const idx = i * dec;
            mono[i] = 0.5 * (ch0[idx] + ch1[idx]);
          }
        } else {
          for (let i = 0; i < dLen; i++) mono[i] = ch0[i * dec];
        }

        // 3-band IIR filters
        const lpC = biquadCoeffs("lowpass", 150, dSr, 0.7071);
        const bpC = biquadCoeffs("bandpass", 900, dSr, 0.7);
        const hpC = biquadCoeffs("highpass", 2600, dSr, 0.7071);

        const hop = Math.max(1, Math.round(dSr * 0.01)); // 10ms hop (100Hz)
        const nFrames = Math.floor(dLen / hop);
        const lowE = new Float32Array(nFrames);
        const midE = new Float32Array(nFrames);
        const hiE = new Float32Array(nFrames);
        const rmsEnv = new Float32Array(nFrames);

        let lx1 = 0, lx2 = 0, ly1 = 0, ly2 = 0;
        let mx1 = 0, mx2 = 0, my1 = 0, my2 = 0;
        let hx1 = 0, hx2 = 0, hy1 = 0, hy2 = 0;

        for (let f = 0; f < nFrames; f++) {
          const base = f * hop;
          let lSum = 0, mSum = 0, hSum = 0, rSum = 0;
          for (let j = 0; j < hop; j++) {
            const x = mono[base + j];
            rSum += x * x;
            const ly = lpC.b0 * x + lpC.b1 * lx1 + lpC.b2 * lx2 - lpC.a1 * ly1 - lpC.a2 * ly2;
            lx2 = lx1; lx1 = x; ly2 = ly1; ly1 = ly;
            lSum += ly * ly;

            const my = bpC.b0 * x + bpC.b1 * mx1 + bpC.b2 * mx2 - bpC.a1 * my1 - bpC.a2 * my2;
            mx2 = mx1; mx1 = x; my2 = my1; my1 = my;
            mSum += my * my;

            const hy = hpC.b0 * x + hpC.b1 * hx1 + hpC.b2 * hx2 - hpC.a1 * hy1 - hpC.a2 * hy2;
            hx2 = hx1; hx1 = x; hy2 = hy1; hy1 = hy;
            hSum += hy * hy;
          }
          lowE[f] = Math.sqrt(lSum / hop);
          midE[f] = Math.sqrt(mSum / hop);
          hiE[f] = Math.sqrt(hSum / hop);
          rmsEnv[f] = Math.sqrt(rSum / hop);
        }

        // Log-compressed half-wave rectified spectral flux
        const rawFlux = new Float32Array(nFrames);
        const lowFlux = new Float32Array(nFrames);
        for (let f = 1; f < nFrames; f++) {
          const dl = Math.max(0, Math.log1p(12 * lowE[f]) - Math.log1p(12 * lowE[f - 1]));
          const dm = Math.max(0, Math.log1p(10 * midE[f]) - Math.log1p(10 * midE[f - 1]));
          const dh = Math.max(0, Math.log1p(10 * hiE[f]) - Math.log1p(10 * hiE[f - 1]));
          lowFlux[f] = dl;
          rawFlux[f] = 2.0 * dl + 1.0 * dm + 0.4 * dh;
        }

        // Adaptive local mean subtraction (15-frame window)
        const flux = new Float32Array(nFrames);
        const winR = 7;
        let maxFlux = 0;
        for (let f = 0; f < nFrames; f++) {
          const a = Math.max(0, f - winR);
          const b = Math.min(nFrames - 1, f + winR);
          let s = 0;
          for (let k = a; k <= b; k++) s += rawFlux[k];
          const avg = s / (b - a + 1);
          const v = Math.max(0, rawFlux[f] - avg * 1.12);
          flux[f] = v;
          if (v > maxFlux) maxFlux = v;
        }

        // Extract salient onset times: local maxima of adaptive flux > 0.25 * maxFlux, >= 60ms apart
        const onsetTimesSec = [];
        const onsetThresh = maxFlux * 0.25;
        if (onsetThresh > 1e-6) {
          let lastOnsetFrame = -100;
          for (let f = 1; f < nFrames - 1; f++) {
            const v = flux[f];
            if (v > onsetThresh && v >= flux[f - 1] && v > flux[f + 1]) {
              if (f - lastOnsetFrame >= 6) {
                onsetTimesSec.push(Math.round(f * 0.01 * 1000) / 1000);
                lastOnsetFrame = f;
              } else if (v > flux[lastOnsetFrame]) {
                onsetTimesSec[onsetTimesSec.length - 1] = Math.round(f * 0.01 * 1000) / 1000;
                lastOnsetFrame = f;
              }
            }
          }
        }

        // Mean-centered autocorrelation with 4-beat harmonic comb over 60..180 BPM (lag 33..100 frames at 100Hz)
        const minLag = 33;
        const maxLag = 100;
        const maxUse = Math.min(nFrames, 12000); // analyze up to 120s for tracks with long intros
        let fluxMean = 0;
        for (let i = 0; i < maxUse; i++) fluxMean += flux[i];
        fluxMean /= Math.max(1, maxUse);
        const fluxC = new Float32Array(maxUse);
        let energy0 = 0;
        for (let i = 0; i < maxUse; i++) {
          const v = flux[i] - fluxMean;
          fluxC[i] = v;
          energy0 += v * v;
        }
        energy0 = Math.max(energy0, 1e-6);

        const maxLagExt = Math.min(408, Math.floor(maxUse / 2));
        const acf = new Float32Array(maxLagExt + 2);
        for (let lag = 16; lag <= maxLagExt; lag++) {
          let sum = 0;
          const lim = maxUse - lag;
          for (let i = 0; i < lim; i++) sum += fluxC[i] * fluxC[i + lag];
          acf[lag] = sum / energy0;
        }

        const acfPeakAt = (x) => {
          if (x < 16 || x > maxLagExt - 1) return 0;
          const i = Math.round(x);
          const lo = Math.max(16, i - 1);
          const hi = Math.min(maxLagExt, i + 1);
          let mx = 0;
          for (let k = lo; k <= hi; k++) if (acf[k] > mx) mx = acf[k];
          return mx;
        };

        // Evaluate 4-beat bar harmonic comb on 0.25-frame fractional grid
        const gridStep = 0.25;
        const nGrid = Math.floor((maxLag - minLag) / gridStep) + 1;
        const combArr = new Float32Array(nGrid);
        let bestIdx = 0;
        let bestScore = -1;
        let sumComb = 0;
        for (let g = 0; g < nGrid; g++) {
          const fLag = minLag + g * gridStep;
          const c = 1.0 * acfPeakAt(fLag)
            + 0.65 * acfPeakAt(fLag * 2.0)
            + 0.45 * acfPeakAt(fLag * 3.0)
            + 0.60 * acfPeakAt(fLag * 4.0)
            + 0.25 * acfPeakAt(fLag * 0.5);
          combArr[g] = c;
          sumComb += c;
          const candBpm = 6000 / fLag;
          const prior = Math.exp(-0.5 * Math.pow((candBpm - 105) / 48, 2));
          const wScore = c * (0.86 + 0.14 * prior);
          if (wScore > bestScore) {
            bestScore = wScore;
            bestIdx = g;
          }
        }
        let bestLagF = minLag + bestIdx * gridStep;

        // Octave disambiguation (avoid sub-73 BPM half-time or >155 BPM double-time aliases)
        if (bestLagF > 82) {
          const halfIdx = Math.round((bestLagF * 0.5 - minLag) / gridStep);
          if (halfIdx >= 0 && halfIdx < nGrid && combArr[halfIdx] >= 0.85 * combArr[bestIdx]) {
            bestIdx = halfIdx;
            bestLagF = minLag + bestIdx * gridStep;
          }
        } else if (bestLagF < 38.7) {
          const dblIdx = Math.round((bestLagF * 2.0 - minLag) / gridStep);
          if (dblIdx >= 0 && dblIdx < nGrid && combArr[dblIdx] >= 0.88 * combArr[bestIdx]) {
            bestIdx = dblIdx;
            bestLagF = minLag + bestIdx * gridStep;
          }
        }

        // Parabolic sub-frame refinement on acf[bestLag] for +/-0.1 BPM precision
        let refinedLag = bestLagF;
        const iLag = Math.round(bestLagF);
        if (iLag > 16 && iLag < maxLagExt) {
          const yL = acf[iLag - 1];
          const yC = acf[iLag];
          const yR = acf[iLag + 1];
          const denom = (yL - 2 * yC + yR);
          if (Math.abs(denom) > 1e-9 && yC >= yL && yC >= yR) {
            refinedLag = iLag + clamp(0.5 * (yL - yR) / denom, -0.5, 0.5);
          }
        }
        const detectedBpm = Math.round((6000 / refinedLag) * 10) / 10;
        const beatPeriodSec = 60 / detectedBpm;
        const barPeriodSec = beatPeriodSec * 4;

        // Z-score + absolute correlation magnitude confidence
        const meanComb = sumComb / Math.max(1, nGrid);
        let varComb = 0;
        for (let g = 0; g < nGrid; g++) {
          const d = combArr[g] - meanComb;
          varComb += d * d;
        }
        const stdComb = Math.max(Math.sqrt(varComb / Math.max(1, nGrid)), 1e-5);
        const zScore = (combArr[bestIdx] - meanComb) / stdComb;
        const absScale = Math.min(1.0, combArr[bestIdx] / 0.16);
        const confidence = clamp(((zScore - 1.2) / 3.5) * absScale, 0, 1);

        // Phase lock beats + pick strongest downbeat among 4 beat slots
        const stepFrames = refinedLag;
        const phaseSteps = Math.max(8, Math.round(stepFrames));
        let bestPhase = 0;
        let bestPhaseScore = -1;
        for (let p = 0; p < phaseSteps; p++) {
          let sc = 0;
          for (let pos = p; pos < nFrames; pos += stepFrames) {
            sc += flux[Math.round(pos)] || 0;
          }
          if (sc > bestPhaseScore) { bestPhaseScore = sc; bestPhase = p; }
        }
        let bestDownbeatIdx = 0;
        let bestDownbeatScore = -1;
        for (let slot = 0; slot < 4; slot++) {
          let sc = 0;
          for (let pos = bestPhase + slot * stepFrames; pos < nFrames; pos += stepFrames * 4) {
            const idx = Math.round(pos);
            sc += (lowFlux[idx] || 0) * 1.4 + (flux[idx] || 0);
          }
          if (sc > bestDownbeatScore) { bestDownbeatScore = sc; bestDownbeatIdx = slot; }
        }
        const firstBarSec = ((bestPhase + bestDownbeatIdx * stepFrames) * 0.01) % barPeriodSec;
        const barTimes = [];
        for (let bt = firstBarSec; bt < dur; bt += barPeriodSec) barTimes.push(bt);

        // Compute mean track RMS
        let meanRms = 0;
        for (let f = 0; f < nFrames; f++) meanRms += rmsEnv[f];
        meanRms = Math.max(meanRms / Math.max(1, nFrames), 1e-4);

        const sliceRms = (tA, tB) => {
          const iA = clamp(Math.floor(tA * 100), 0, nFrames - 1);
          const iB = clamp(Math.floor(tB * 100), iA + 1, nFrames);
          let s = 0;
          for (let i = iA; i < iB; i++) s += rmsEnv[i];
          return s / Math.max(1, iB - iA);
        };
        const peakFluxNear = (tSec, radSec = 0.07) => {
          const iA = clamp(Math.floor((tSec - radSec) * 100), 0, nFrames - 1);
          const iB = clamp(Math.ceil((tSec + radSec) * 100), iA, nFrames - 1);
          let mx = 0;
          for (let i = iA; i <= iB; i++) if (flux[i] > mx) mx = flux[i];
          return mx;
        };

        // Top 16-24 salient anchor peaks (drops, downbeats, strong hits)
        const peakCandidates = [];
        for (let i = 0; i < barTimes.length; i++) {
          const bt = barTimes[i];
          const preR = sliceRms(Math.max(0, bt - 1.2), bt);
          const postR = sliceRms(bt, Math.min(dur, bt + 1.6));
          const contrast = (postR - preR) / meanRms;
          const pf = peakFluxNear(bt, 0.08);
          const isDrop = contrast > 0.35;
          const rawScore = Math.max(0.01, pf * 1.2 + Math.max(0, contrast) * 1.5 + (postR / meanRms) * 0.25);
          peakCandidates.push({
            timeSec: Math.round(bt * 1000) / 1000,
            rawScore,
            kind: isDrop ? "drop" : "downbeat",
          });
        }
        for (let i = 0; i < onsetTimesSec.length; i++) {
          const ot = onsetTimesSec[i];
          const fIdx = clamp(Math.round(ot * 100), 0, nFrames - 1);
          const pf = flux[fIdx];
          if (pf > maxFlux * 0.45) {
            peakCandidates.push({
              timeSec: ot,
              rawScore: pf * 1.05,
              kind: "hit",
            });
          }
        }
        peakCandidates.sort((a, b) => b.rawScore - a.rawScore);
        const minPeakSep = Math.max(0.35, beatPeriodSec * 0.75);
        const pickedPeaks = [];
        let maxPeakScore = 1e-6;
        for (let i = 0; i < peakCandidates.length && pickedPeaks.length < 24; i++) {
          const c = peakCandidates[i];
          if (pickedPeaks.every((p) => Math.abs(p.timeSec - c.timeSec) >= minPeakSep)) {
            if (c.rawScore > maxPeakScore) maxPeakScore = c.rawScore;
            pickedPeaks.push(c);
          }
        }
        const anchorPeaks = pickedPeaks
          .map((p) => ({
            timeSec: p.timeSec,
            strength: Math.round(clamp(p.rawScore / maxPeakScore, 0, 1) * 1000) / 1000,
            kind: p.kind,
          }))
          .sort((a, b) => a.timeSec - b.timeSec);

        // Active slide compatibility + cross-slide recommendation (widened stretchable <= 22.0%)
        const activeSlide = registry[activeSlideId] || registry.bit2;
        const fold = foldBpmToTarget(detectedBpm, activeSlide.targetBpm);
        const isRubato = confidence < 0.28;
        let status = "mismatch";
        if (isRubato) status = "rubato";
        else if (fold.deltaPct <= 4.0) status = "compatible";
        else if (fold.deltaPct <= 22.0) status = "stretchable";

        let bestSlideId = activeSlide.id;
        let bestSlideDelta = fold.deltaPct;
        if (!isRubato) {
          Object.values(registry).forEach((s) => {
            const f2 = foldBpmToTarget(detectedBpm, s.targetBpm);
            if (f2.deltaPct < bestSlideDelta - 1.2) {
              bestSlideDelta = f2.deltaPct;
              bestSlideId = s.id;
            }
          });
        }
        const recommendedSlideId = (status === "mismatch" && bestSlideId !== activeSlide.id && bestSlideDelta <= 22.0)
          ? bestSlideId
          : null;

        // Top-3 suggested start-offsets for active slide
        const slideDur = activeSlide.durationSec;
        const impactT = activeSlide.primaryImpactSec;
        const maxStart = Math.max(0, dur - slideDur);
        let topSlices = [];
        if (maxStart <= 0.4) {
          topSlices = [{ startSec: 0, score: 1, label: "۱. از ابتدا" }];
        } else {
          const candidates = [];
          const candStarts = isRubato
            ? Array.from({ length: Math.max(1, Math.floor(maxStart / 2.0)) }, (_, k) => k * 2.0)
            : barTimes.filter((bt) => bt <= maxStart);
          if (candStarts.length === 0) candStarts.push(0);

          for (let i = 0; i < candStarts.length; i++) {
            const t0 = candStarts[i];
            const preRms = sliceRms(Math.max(0, t0 + impactT - 1.6), t0 + impactT);
            const postRms = sliceRms(t0 + impactT, Math.min(dur, t0 + impactT + 2.2));
            const impactContrast = (postRms - preRms) / meanRms + peakFluxNear(t0 + impactT, 0.08) * 1.1;
            const entryPunch = peakFluxNear(t0, 0.06) * 0.9 + (sliceRms(t0, Math.min(dur, t0 + 1.5)) / meanRms) * 0.5;
            const overallRms = sliceRms(t0, Math.min(dur, t0 + slideDur)) / meanRms;
            const floorPenalty = overallRms < 0.45 ? -1.4 : overallRms * 0.6;
            const exitPenalty = -peakFluxNear(t0 + slideDur, 0.05) * 0.25;
            const total = impactContrast * 0.45 + entryPunch * 0.25 + floorPenalty * 0.20 + exitPenalty * 0.10;
            candidates.push({ startSec: Math.round(t0 * 100) / 100, score: total });
          }
          candidates.sort((a, b) => b.score - a.score);
          const minSep = Math.max(6.0, barPeriodSec * 4);
          const labels = ["۱. اوج اصلی", "۲. شروع کوبنده", "۳. بخش میانی"];
          for (let i = 0; i < candidates.length && topSlices.length < 3; i++) {
            const c = candidates[i];
            if (topSlices.every((p) => Math.abs(p.startSec - c.startSec) >= minSep)) {
              topSlices.push({ startSec: c.startSec, score: c.score, label: labels[topSlices.length] });
            }
          }
        }

        const peaks = computeWaveformPeaks(audioBuffer, 140);
        return {
          detectedBpm,
          effectiveBpm: Math.round(fold.effectiveBpm * 10) / 10,
          targetBpm: activeSlide.targetBpm,
          deltaPct: Math.round(fold.deltaPct * 10) / 10,
          suggestedRate: clamp(activeSlide.targetBpm / Math.max(1, fold.effectiveBpm), 0.80, 1.25),
          confidence: Math.round(confidence * 100) / 100,
          isRubato,
          isShort: dur < slideDur - 0.15,
          status,
          recommendedSlideId,
          barPeriodSec,
          barTimes,
          onsetTimesSec,
          anchorPeaks,
          topSlices,
          peaks,
          duration: dur,
          elapsedMs: Math.round(performance.now() - tStart),
        };
      }

      return {
        analyzeTrack,
        foldBpmToTarget,
        computeWaveformPeaks,
        resolveTempoPlan,
        computeAnchorStartOffset,
        snapToAnchorPeak,
      };
    })();

export const {
  analyzeTrack,
  foldBpmToTarget,
  computeWaveformPeaks,
  resolveTempoPlan,
  computeAnchorStartOffset,
  snapToAnchorPeak,
} = BeatAnalyzer;
