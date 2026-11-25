// BeatFrame v6 Stereo-Coherent WSOLA Time-Stretcher
// Features:
// - Two-stage coarse-to-fine search (4x anti-aliased decimated mono + O(1) prefix energy table)
// - Periodic Hann window (48ms, 50% overlap for |rate-1|<=0.12, auto 75% overlap for |rate-1|>0.12)
// - 3-point parabolic sub-sample refinement with fractional linear interpolation read
// - Transient-aware onset lock ([onset - 6ms, onset + 18ms] 1:1 advance)
// - Optional in-place gain & linear fade-in/fade-out
// - Reusable inline Blob Web Worker adapter with transferable buffers + generationId echo

export function wsolaTimeStretchStereo(leftIn, rightIn, sampleRate, rate, outFrames, opts = {}) {
  // rate = targetBpm / sourceBpm (> 1 speeds up, < 1 slows down)
  const inLen = leftIn.length;
  const outL = new Float32Array(outFrames);
  const outR = new Float32Array(outFrames);
  if (inLen < 8 || outFrames <= 0) {
    return { outL, outR };
  }

  const winNorm = new Float32Array(outFrames);

  // 48ms periodic Hann window, rounded to a multiple of 4 for clean 50% / 75% hops & 4x decimation
  const W = Math.max(32, (Math.round(sampleRate * 0.048) + 2) & ~3);
  const useHighOverlap = Math.abs(rate - 1.0) > 0.12;
  const Ha = useHighOverlap ? (W >> 2) : (W >> 1);
  const maxDelta = Math.round(sampleRate * 0.018); // +/-18ms coarse search range

  // Periodic Hann window: 0.5 * (1 - cos(2 * PI * k / W))
  const hann = new Float32Array(W);
  const twoPiOverW = (2 * Math.PI) / W;
  for (let k = 0; k < W; k++) {
    hann[k] = 0.5 * (1 - Math.cos(twoPiOverW * k));
  }

  // Mono sum for stereo-coherent cross-correlation (prevents L/R phase wobble)
  const mono = new Float32Array(inLen);
  for (let i = 0; i < inLen; i++) {
    mono[i] = 0.5 * (leftIn[i] + rightIn[i]);
  }

  // 4x anti-aliased decimated mono + O(1) running squared-energy prefix table
  const len4 = inLen >> 2;
  const mono4 = new Float32Array(len4);
  const cumE4 = new Float64Array(len4 + 1);
  let accE = 0;
  for (let j = 0; j < len4; j++) {
    const base = j << 2;
    const v = 0.25 * (mono[base] + mono[base + 1] + mono[base + 2] + mono[base + 3]);
    mono4[j] = v;
    accE += v * v;
    cumE4[j + 1] = accE;
  }

  // Prepare sorted transient onset sample list (if provided)
  let onsets = null;
  if (opts && opts.onsetSamples && opts.onsetSamples.length > 0) {
    const raw = opts.onsetSamples;
    onsets = new Int32Array(raw.length);
    for (let i = 0; i < raw.length; i++) onsets[i] = Math.round(raw[i]);
    let sorted = true;
    for (let i = 1; i < onsets.length; i++) {
      if (onsets[i] < onsets[i - 1]) { sorted = false; break; }
    }
    if (!sorted) onsets.sort();
  }
  const onsetPre = Math.round(sampleRate * 0.006);  // 6ms before onset
  const onsetPost = Math.round(sampleRate * 0.018); // 18ms after onset
  let onsetIdx = 0;

  // Correlation template length
  const corrLen = Math.min(Ha, Math.max(16, inLen >> 2));
  const corrLen4 = Math.max(4, corrLen >> 2);
  const maxDelta4 = Math.max(1, maxDelta >> 2);
  const maxStart = Math.max(0, inLen - W - 1);
  const maxStart4 = Math.max(0, len4 - corrLen4 - 1);

  let lastBestInF = 0;
  let outPos = 0;
  const fineRadius = 6;
  const fineScores = new Float64Array(fineRadius * 2 + 1);

  while (outPos < outFrames) {
    const nomIn = Math.round(outPos * rate);
    if (nomIn >= inLen - 32) break;

    let bestInF = Math.min(nomIn, maxStart);

    if (outPos > 0) {
      // Transient-aware onset lock: advance 1:1 naturally inside [onset - 6ms, onset + 18ms]
      let inOnsetLock = false;
      if (onsets) {
        while (onsetIdx < onsets.length && onsets[onsetIdx] + onsetPost < nomIn) {
          onsetIdx++;
        }
        if (
          onsetIdx < onsets.length &&
          nomIn >= onsets[onsetIdx] - onsetPre &&
          nomIn <= onsets[onsetIdx] + onsetPost
        ) {
          inOnsetLock = true;
        }
      }

      const natPosF = Math.min(lastBestInF + Ha, maxStart);
      if (inOnsetLock) {
        bestInF = natPosF;
      } else {
        const natPos = Math.round(natPosF);
        const natPos4 = Math.min(natPos >> 2, maxStart4);
        const eA4 = cumE4[natPos4 + corrLen4] - cumE4[natPos4];

        const lo4 = Math.max(0, (nomIn >> 2) - maxDelta4);
        const hi4 = Math.min(maxStart4, (nomIn >> 2) + maxDelta4);

        let bestCoarse4 = Math.min(Math.max(nomIn >> 2, lo4), hi4);
        if (hi4 >= lo4 && eA4 > 1e-10) {
          let bestCorr4 = -Infinity;
          const invSqrtEA4 = 1.0 / Math.sqrt(eA4);
          const lim4 = corrLen4 - 3;
          for (let c4 = lo4; c4 <= hi4; c4++) {
            const eB4 = cumE4[c4 + corrLen4] - cumE4[c4];
            if (eB4 <= 1e-10) continue;
            let dot = 0;
            let k = 0;
            for (; k < lim4; k += 4) {
              dot += mono4[natPos4 + k] * mono4[c4 + k]
                + mono4[natPos4 + k + 1] * mono4[c4 + k + 1]
                + mono4[natPos4 + k + 2] * mono4[c4 + k + 2]
                + mono4[natPos4 + k + 3] * mono4[c4 + k + 3];
            }
            for (; k < corrLen4; k++) {
              dot += mono4[natPos4 + k] * mono4[c4 + k];
            }
            if (dot <= 0 && bestCorr4 > 0) continue;
            const sc = (dot * invSqrtEA4) / (Math.sqrt(eB4) + 1e-7);
            if (sc > bestCorr4) {
              bestCorr4 = sc;
              bestCoarse4 = c4;
            }
          }
        }

        // Stage-2 fine search: +/-6 samples at full rate around bestCoarse4 * 4
        const coarseCenter = Math.min(bestCoarse4 << 2, maxStart);
        const fineLo = Math.max(0, coarseCenter - fineRadius);
        const fineHi = Math.min(maxStart, coarseCenter + fineRadius);
        const fineCount = fineHi - fineLo + 1;

        if (fineCount > 0 && natPos + corrLen <= inLen) {
          let eAFine = 0;
          for (let k = 0; k < corrLen; k++) {
            const a = mono[natPos + k];
            eAFine += a * a;
          }

          if (eAFine > 1e-10) {
            let bestFineIdx = 0;
            let bestFineCorr = -Infinity;
            for (let idx = 0; idx < fineCount; idx++) {
              const cand = fineLo + idx;
              let dot = 0;
              let eB = 0;
              for (let k = 0; k < corrLen; k++) {
                const a = mono[natPos + k];
                const b = mono[cand + k];
                dot += a * b;
                eB += b * b;
              }
              const sc = dot / (Math.sqrt(eAFine * eB) + 1e-7);
              fineScores[idx] = sc;
              if (sc > bestFineCorr) {
                bestFineCorr = sc;
                bestFineIdx = idx;
              }
            }

            let refined = fineLo + bestFineIdx;
            // 3-point parabolic sub-sample interpolation
            if (bestFineIdx > 0 && bestFineIdx < fineCount - 1) {
              const sL = fineScores[bestFineIdx - 1];
              const sC = fineScores[bestFineIdx];
              const sR = fineScores[bestFineIdx + 1];
              const denom = sL - 2 * sC + sR;
              if (Math.abs(denom) > 1e-12 && sC >= sL && sC >= sR) {
                const frac = Math.max(-0.5, Math.min(0.5, 0.5 * (sL - sR) / denom));
                refined += frac;
              }
            }
            bestInF = Math.max(0, Math.min(maxStart, refined));
          } else {
            bestInF = coarseCenter;
          }
        } else {
          bestInF = coarseCenter;
        }
      }
    }

    // Overlap-add with fractional linear interpolation read
    const baseIdx = Math.floor(bestInF);
    const alpha = bestInF - baseIdx;
    const avail = Math.min(W, inLen - 1 - baseIdx, outFrames - outPos);
    if (alpha > 1e-5) {
      const oneMinus = 1 - alpha;
      for (let k = 0; k < avail; k++) {
        const w = hann[k];
        const idx = baseIdx + k;
        outL[outPos + k] += (leftIn[idx] * oneMinus + leftIn[idx + 1] * alpha) * w;
        outR[outPos + k] += (rightIn[idx] * oneMinus + rightIn[idx + 1] * alpha) * w;
        winNorm[outPos + k] += w;
      }
    } else {
      const availInt = Math.min(W, inLen - baseIdx, outFrames - outPos);
      for (let k = 0; k < availInt; k++) {
        const w = hann[k];
        const idx = baseIdx + k;
        outL[outPos + k] += leftIn[idx] * w;
        outR[outPos + k] += rightIn[idx] * w;
        winNorm[outPos + k] += w;
      }
    }

    lastBestInF = bestInF;
    outPos += Ha;
  }

  // Normalize OLA window sum + optional in-place gain & fade-in/fade-out
  const gain = (opts && opts.gain !== undefined) ? opts.gain : 1.0;
  const fadeInSamples = (opts && opts.fadeInSec > 0) ? Math.round(opts.fadeInSec * sampleRate) : 0;
  const fadeOutSamples = (opts && opts.fadeOutSec > 0) ? Math.round(opts.fadeOutSec * sampleRate) : 0;
  const fadeOutStart = Math.max(0, outFrames - fadeOutSamples);
  const applyEnv = gain !== 1.0 || fadeInSamples > 0 || fadeOutSamples > 0;

  if (applyEnv) {
    for (let i = 0; i < outFrames; i++) {
      const n = winNorm[i];
      if (n > 1e-4) {
        let g = gain / n;
        if (fadeInSamples > 0 && i < fadeInSamples) {
          g *= i / fadeInSamples;
        }
        if (fadeOutSamples > 0 && i >= fadeOutStart) {
          g *= (outFrames - 1 - i) / Math.max(1, fadeOutSamples);
        }
        outL[i] *= g;
        outR[i] *= g;
      }
    }
  } else {
    for (let i = 0; i < outFrames; i++) {
      const n = winNorm[i];
      if (n > 1e-4) {
        outL[i] /= n;
        outR[i] /= n;
      }
    }
  }

  return { outL, outR };
}

export function createWsolaAdapter({ useWorker = typeof Worker !== "undefined" && typeof Blob !== "undefined" } = {}) {
  if (!useWorker) {
    return {
      async stretch(payload) {
        const { leftIn, rightIn, sampleRate, rate, outFrames, opts = {}, generationId = 0 } = payload;
        const { outL, outR } = wsolaTimeStretchStereo(leftIn, rightIn, sampleRate, rate, outFrames, opts);
        return { outL, outR, generationId };
      },
      dispose() {},
    };
  }

  let worker = null;
  let blobUrl = null;
  let nextReqId = 1;
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    const workerSrc = `
      const wsolaTimeStretchStereo = ${wsolaTimeStretchStereo.toString()};
      self.onmessage = function(e) {
        const { reqId, generationId, leftIn, rightIn, sampleRate, rate, outFrames, opts } = e.data;
        try {
          const { outL, outR } = wsolaTimeStretchStereo(leftIn, rightIn, sampleRate, rate, outFrames, opts || {});
          self.postMessage({ reqId, generationId, outL, outR }, [outL.buffer, outR.buffer]);
        } catch (err) {
          self.postMessage({ reqId, generationId, error: err && err.message ? err.message : String(err) });
        }
      };
    `;
    const blob = new Blob([workerSrc], { type: "application/javascript" });
    blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl);
    worker.onmessage = (e) => {
      const { reqId, generationId, outL, outR, error } = e.data;
      const entry = pending.get(reqId);
      if (!entry) return;
      pending.delete(reqId);
      if (error) entry.reject(new Error(error));
      else entry.resolve({ outL, outR, generationId });
    };
    worker.onerror = (err) => {
      for (const [, entry] of pending) {
        entry.reject(err);
      }
      pending.clear();
    };
    return worker;
  }

  return {
    stretch(payload) {
      const { leftIn, rightIn, sampleRate, rate, outFrames, opts = {}, generationId = 0 } = payload;
      const w = ensureWorker();
      const reqId = nextReqId++;
      // Copy into transferable Float32Arrays so caller buffers remain intact
      const lCopy = new Float32Array(leftIn);
      const rCopy = new Float32Array(rightIn);
      const cleanOpts = { ...opts };
      const transferList = [lCopy.buffer, rCopy.buffer];
      if (cleanOpts.onsetSamples) {
        const oCopy = new Int32Array(cleanOpts.onsetSamples);
        cleanOpts.onsetSamples = oCopy;
        transferList.push(oCopy.buffer);
      }
      return new Promise((resolve, reject) => {
        pending.set(reqId, { resolve, reject });
        w.postMessage(
          { reqId, generationId, leftIn: lCopy, rightIn: rCopy, sampleRate, rate, outFrames, opts: cleanOpts },
          transferList
        );
      });
    },
    dispose() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      pending.clear();
    },
  };
}
