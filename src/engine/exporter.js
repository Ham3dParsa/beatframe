import { getDuration, FPS } from "../core/registry.js";

// =========================================================================
// PURE-JS FAST-START ISO-BMFF MP4 MUXER + WEBM DURATION PATCHER
// =========================================================================
function u32be(v) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v >>> 0, false);
  return b;
}

function concatBytes(parts) {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

function strBytes(s) {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

function mp4Box(type, payloadParts) {
  const payload = Array.isArray(payloadParts) ? concatBytes(payloadParts) : payloadParts;
  const size = 8 + payload.byteLength;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, size, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function mp4FullBox(type, version, flags, payloadParts) {
  const hdr = new Uint8Array(4);
  hdr[0] = version & 0xff;
  hdr[1] = (flags >>> 16) & 0xff;
  hdr[2] = (flags >>> 8) & 0xff;
  hdr[3] = flags & 0xff;
  const parts = Array.isArray(payloadParts) ? [hdr, ...payloadParts] : [hdr, payloadParts];
  return mp4Box(type, parts);
}

function toUint8Array(bufOrView) {
  if (!bufOrView) return new Uint8Array(0);
  if (bufOrView instanceof Uint8Array) return bufOrView;
  if (ArrayBuffer.isView(bufOrView)) {
    return new Uint8Array(bufOrView.buffer, bufOrView.byteOffset, bufOrView.byteLength);
  }
  return new Uint8Array(bufOrView);
}

function encodeDescrLength(len) {
  return new Uint8Array([len & 0x7f]);
}

function buildEsdsBox(audioSpecificConfig, bitrate = 128000) {
  const asc = audioSpecificConfig && audioSpecificConfig.byteLength >= 2
    ? toUint8Array(audioSpecificConfig)
    : new Uint8Array([0x11, 0x90]); // AAC-LC, 48000Hz, stereo

  const decSpecInfo = concatBytes([
    new Uint8Array([0x05]),
    encodeDescrLength(asc.byteLength),
    asc,
  ]);

  const decCfgBody = new Uint8Array(13);
  const dv = new DataView(decCfgBody.buffer);
  decCfgBody[0] = 0x40; // MPEG-4 Audio
  decCfgBody[1] = 0x15; // AudioStream (5 << 2) | 1
  // bufferSizeDB = 0 (3 bytes)
  dv.setUint32(5, bitrate, false);
  dv.setUint32(9, bitrate, false);

  const decCfgPayload = concatBytes([decCfgBody, decSpecInfo]);
  const decCfgDescr = concatBytes([
    new Uint8Array([0x04]),
    encodeDescrLength(decCfgPayload.byteLength),
    decCfgPayload,
  ]);

  const slCfgDescr = new Uint8Array([0x06, 0x01, 0x02]);
  const esPayload = concatBytes([
    new Uint8Array([0x00, 0x02, 0x00]), // ES_ID=2, flags=0
    decCfgDescr,
    slCfgDescr,
  ]);
  const esDescr = concatBytes([
    new Uint8Array([0x03]),
    encodeDescrLength(esPayload.byteLength),
    esPayload,
  ]);

  return mp4FullBox("esds", 0, 0, esDescr);
}

function buildFastStartMP4({
  width,
  height,
  fps,
  durationSec,
  videoChunks,
  avcC,
  audioChunks,
  audioSampleRate = 48000,
  audioChannels = 2,
  audioSpecificConfig = null,
  audioCodec = "mp4a.40.2",
}) {
  const ftyp = mp4Box("ftyp", [
    strBytes("isom"),
    u32be(0x00000200),
    strBytes("isom"),
    strBytes("iso2"),
    strBytes("avc1"),
    strBytes("mp41"),
  ]);

  const mvhdTimescale = 1000;
  const mvhdDuration = Math.round(durationSec * mvhdTimescale);
  const videoTimescale = 90000;
  const videoSampleDelta = Math.round(videoTimescale / fps); // 3000 for 30fps
  const videoDuration = videoChunks.length * videoSampleDelta;
  const defaultAudioDelta = audioCodec === "opus" ? 960 : 1024;
  let audioDuration = 0;
  const audioDeltas = audioChunks.map((c) => {
    const d = c.durationUs ? Math.max(1, Math.round((c.durationUs * audioSampleRate) / 1_000_000)) : defaultAudioDelta;
    audioDuration += d;
    return d;
  });

  const unityMatrix = new Uint8Array([
    0x00, 0x01, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0x00, 0x01, 0x00, 0x00, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0x40, 0x00, 0x00, 0x00,
  ]);

  function buildMvhd(nextTrackId) {
    const b = new Uint8Array(96);
    const dv = new DataView(b.buffer);
    dv.setUint32(8, mvhdTimescale, false);
    dv.setUint32(12, mvhdDuration, false);
    dv.setUint32(16, 0x00010000, false); // rate 1.0
    dv.setUint16(20, 0x0100, false);     // volume 1.0
    b.set(unityMatrix, 32);
    dv.setUint32(92, nextTrackId, false);
    return mp4FullBox("mvhd", 0, 0, b);
  }

  function buildTkhd(trackId, isAudio) {
    const b = new Uint8Array(80);
    const dv = new DataView(b.buffer);
    dv.setUint32(8, trackId, false);
    dv.setUint32(16, mvhdDuration, false);
    dv.setUint16(32, isAudio ? 0x0100 : 0, false);
    b.set(unityMatrix, 36);
    dv.setUint32(72, isAudio ? 0 : (width << 16), false);
    dv.setUint32(76, isAudio ? 0 : (height << 16), false);
    return mp4FullBox("tkhd", 0, 3, b);
  }

  function buildMdhd(timescale, duration) {
    const b = new Uint8Array(20);
    const dv = new DataView(b.buffer);
    dv.setUint32(8, timescale, false);
    dv.setUint32(12, duration, false);
    dv.setUint16(16, 0x55c4, false); // 'und'
    return mp4FullBox("mdhd", 0, 0, b);
  }

  function buildHdlr(handlerType, name) {
    const pre = new Uint8Array(20);
    pre.set(strBytes(handlerType), 4);
    return mp4FullBox("hdlr", 0, 0, [pre, strBytes(name + "\0")]);
  }

  function buildDinf() {
    const urlBox = mp4FullBox("url ", 0, 1, new Uint8Array(0));
    const dref = mp4FullBox("dref", 0, 0, [u32be(1), urlBox]);
    return mp4Box("dinf", dref);
  }

  function buildStts(sampleCount, sampleDelta) {
    return mp4FullBox("stts", 0, 0, [u32be(1), u32be(sampleCount), u32be(sampleDelta)]);
  }

  function buildSttsFromDeltas(deltas) {
    if (!deltas.length) return mp4FullBox("stts", 0, 0, [u32be(0)]);
    const runs = [];
    let cur = deltas[0], cnt = 1;
    for (let i = 1; i < deltas.length; i++) {
      if (deltas[i] === cur) cnt++;
      else { runs.push([cnt, cur]); cur = deltas[i]; cnt = 1; }
    }
    runs.push([cnt, cur]);
    const parts = [u32be(runs.length)];
    for (const [c, d] of runs) { parts.push(u32be(c), u32be(d)); }
    return mp4FullBox("stts", 0, 0, parts);
  }

  function buildStsc() {
    return mp4FullBox("stsc", 0, 0, [u32be(1), u32be(1), u32be(1), u32be(1)]);
  }

  function buildStsz(chunks) {
    const b = new Uint8Array(8 + chunks.length * 4);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, 0, false);
    dv.setUint32(4, chunks.length, false);
    for (let i = 0; i < chunks.length; i++) {
      dv.setUint32(8 + i * 4, chunks[i].data.byteLength, false);
    }
    return mp4FullBox("stsz", 0, 0, b);
  }

  function buildStco(offsets) {
    const b = new Uint8Array(4 + offsets.length * 4);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, offsets.length, false);
    for (let i = 0; i < offsets.length; i++) {
      dv.setUint32(4 + i * 4, offsets[i] >>> 0, false);
    }
    return mp4FullBox("stco", 0, 0, b);
  }

  function buildVideoStss() {
    const keyIndices = [];
    for (let i = 0; i < videoChunks.length; i++) {
      if (videoChunks[i].isKey) keyIndices.push(i + 1);
    }
    if (keyIndices.length === 0 && videoChunks.length > 0) keyIndices.push(1);
    const b = new Uint8Array(4 + keyIndices.length * 4);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, keyIndices.length, false);
    for (let i = 0; i < keyIndices.length; i++) {
      dv.setUint32(4 + i * 4, keyIndices[i], false);
    }
    return mp4FullBox("stss", 0, 0, b);
  }

  function buildVideoStsd() {
    const entryHead = new Uint8Array(78);
    const dv = new DataView(entryHead.buffer);
    dv.setUint16(6, 1, false);          // data_reference_index
    dv.setUint16(24, width, false);
    dv.setUint16(26, height, false);
    dv.setUint32(28, 0x00480000, false); // 72 dpi
    dv.setUint32(32, 0x00480000, false);
    dv.setUint16(40, 1, false);          // frame_count
    dv.setUint16(74, 0x0018, false);     // depth 24
    dv.setInt16(76, -1, false);

    const avcCBox = mp4Box("avcC", toUint8Array(avcC));
    const colrPayload = new Uint8Array([
      0x6e, 0x63, 0x6c, 0x78, // 'nclx'
      0x00, 0x01,             // BT.709 / sRGB primaries
      0x00, 0x0d,             // IEC 61966-2-1 sRGB transfer (matches HTML5 Canvas)
      0x00, 0x01,             // BT.709 matrix
      0x00,                   // standard studio range
    ]);
    const colrBox = mp4Box("colr", colrPayload);
    const avc1 = mp4Box("avc1", [entryHead, avcCBox, colrBox]);
    return mp4FullBox("stsd", 0, 0, [u32be(1), avc1]);
  }

  function buildAudioStsd() {
    const entryHead = new Uint8Array(28);
    const dv = new DataView(entryHead.buffer);
    dv.setUint16(6, 1, false);              // data_reference_index
    dv.setUint16(16, audioChannels, false); // channel count
    dv.setUint16(18, 16, false);            // sample size
    dv.setUint32(24, audioSampleRate << 16, false);
    if (audioCodec === "opus") {
      const dOps = new Uint8Array(11);
      const odv = new DataView(dOps.buffer);
      dOps[0] = 0;                          // Version
      dOps[1] = audioChannels;              // OutputChannelCount
      odv.setUint16(2, 312, false);         // PreSkip (312 samples @ 48kHz)
      odv.setUint32(4, audioSampleRate, false);
      odv.setInt16(8, 0, false);            // OutputGain
      dOps[10] = 0;                         // ChannelMappingFamily
      const opusEntry = mp4Box("Opus", [entryHead, mp4Box("dOps", dOps)]);
      return mp4FullBox("stsd", 0, 0, [u32be(1), opusEntry]);
    }
    const esds = buildEsdsBox(audioSpecificConfig, 128000);
    const mp4a = mp4Box("mp4a", [entryHead, esds]);
    return mp4FullBox("stsd", 0, 0, [u32be(1), mp4a]);
  }

  function buildMoov(videoOffsets, audioOffsets) {
    const vmhd = mp4FullBox("vmhd", 0, 1, new Uint8Array(8));
    const vStbl = mp4Box("stbl", [
      buildVideoStsd(),
      buildStts(videoChunks.length, videoSampleDelta),
      buildVideoStss(),
      buildStsc(),
      buildStsz(videoChunks),
      buildStco(videoOffsets),
    ]);
    const vMinf = mp4Box("minf", [vmhd, buildDinf(), vStbl]);
    const vMdia = mp4Box("mdia", [
      buildMdhd(videoTimescale, videoDuration),
      buildHdlr("vide", "VideoHandler"),
      vMinf,
    ]);
    const vTrak = mp4Box("trak", [buildTkhd(1, false), vMdia]);

    const tracks = [vTrak];
    if (audioChunks.length > 0) {
      const smhd = mp4FullBox("smhd", 0, 0, new Uint8Array(4));
      const aStbl = mp4Box("stbl", [
        buildAudioStsd(),
        buildSttsFromDeltas(audioDeltas),
        buildStsc(),
        buildStsz(audioChunks),
        buildStco(audioOffsets),
      ]);
      const aMinf = mp4Box("minf", [smhd, buildDinf(), aStbl]);
      const aMdia = mp4Box("mdia", [
        buildMdhd(audioSampleRate, audioDuration),
        buildHdlr("soun", "SoundHandler"),
        aMinf,
      ]);
      const aTrak = mp4Box("trak", [buildTkhd(2, true), aMdia]);
      tracks.push(aTrak);
    }

    return mp4Box("moov", [buildMvhd(audioChunks.length > 0 ? 3 : 2), ...tracks]);
  }

  // Pass 1: measure moov size with zeroed offsets
  const dummyVOffsets = new Uint32Array(videoChunks.length);
  const dummyAOffsets = new Uint32Array(audioChunks.length);
  const moovPass1 = buildMoov(dummyVOffsets, dummyAOffsets);

  // Pass 2: compute exact absolute byte offsets into mdat (Fast-Start: ftyp -> moov -> mdat)
  let cursor = ftyp.byteLength + moovPass1.byteLength + 8;
  const vOffsets = new Uint32Array(videoChunks.length);
  for (let i = 0; i < videoChunks.length; i++) {
    vOffsets[i] = cursor;
    cursor += videoChunks[i].data.byteLength;
  }
  const aOffsets = new Uint32Array(audioChunks.length);
  for (let i = 0; i < audioChunks.length; i++) {
    aOffsets[i] = cursor;
    cursor += audioChunks[i].data.byteLength;
  }

  const moov = buildMoov(vOffsets, aOffsets);
  const mdatPayloadSize = cursor - (ftyp.byteLength + moov.byteLength + 8);
  const mdatHeader = concatBytes([u32be(8 + mdatPayloadSize), strBytes("mdat")]);

  const parts = [ftyp, moov, mdatHeader];
  for (let i = 0; i < videoChunks.length; i++) parts.push(videoChunks[i].data);
  for (let i = 0; i < audioChunks.length; i++) parts.push(audioChunks[i].data);
  return new Blob(parts, { type: "video/mp4" });
}

// Pure-JS WebM EBML Duration patcher for Tier-2 MediaRecorder fallback
async function patchWebMDuration(blob, durationMs) {
  try {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const dv = new DataView(buf);

    function readVint(pos, isId = false) {
      if (pos >= bytes.length) return null;
      const first = bytes[pos];
      let mask = 0x80;
      let len = 1;
      while (len <= 8 && (first & mask) === 0) {
        mask >>= 1;
        len++;
      }
      if (len > 8 || pos + len > bytes.length) return null;
      let val = isId ? first : (first & (mask - 1));
      for (let i = 1; i < len; i++) {
        val = val * 256 + bytes[pos + i];
      }
      return { val, len };
    }

    function writeVintSize(val, len) {
      const out = new Uint8Array(len);
      let v = val;
      for (let i = len - 1; i >= 0; i--) {
        out[i] = v & 0xff;
        v = Math.floor(v / 256);
      }
      out[0] |= 1 << (8 - len);
      return out;
    }

    // Locate Segment (0x18538067) and Info (0x1549A966)
    let pos = 0;
    let segSizePos = -1, segSizeLen = 0, segSizeVal = 0, segUnknown = false;
    while (pos < bytes.length - 8) {
      const id = readVint(pos, true);
      if (!id) break;
      const sz = readVint(pos + id.len, false);
      if (!sz) break;
      const dataStart = pos + id.len + sz.len;
      if (id.val === 0x18538067) {
        segSizePos = pos + id.len;
        segSizeLen = sz.len;
        segSizeVal = sz.val;
        segUnknown = (sz.len === 8 && bytes[segSizePos] === 0x01 && bytes[segSizePos + 1] === 0xff);
        pos = dataStart;
        break;
      }
      pos = dataStart + sz.val;
    }
    if (segSizePos < 0) return blob;

    // Scan top-level children of Segment for Info (0x1549A966)
    const scanEnd = Math.min(bytes.length, pos + 65536);
    while (pos < scanEnd) {
      const id = readVint(pos, true);
      if (!id) break;
      const sz = readVint(pos + id.len, false);
      if (!sz) break;
      const infoSizePos = pos + id.len;
      const infoDataStart = pos + id.len + sz.len;
      const infoEnd = infoDataStart + sz.val;

      if (id.val === 0x1549a966 && infoEnd <= bytes.length) {
        let p = infoDataStart;
        let timecodeScale = 1000000;
        let durPos = -1, durSize = 0;
        while (p < infoEnd) {
          const cid = readVint(p, true);
          if (!cid) break;
          const csz = readVint(p + cid.len, false);
          if (!csz) break;
          const cStart = p + cid.len + csz.len;
          if (cid.val === 0x2ad7b1) {
            let scale = 0;
            for (let k = 0; k < csz.val; k++) scale = scale * 256 + bytes[cStart + k];
            if (scale > 0) timecodeScale = scale;
          } else if (cid.val === 0x4489) {
            durPos = cStart;
            durSize = csz.val;
          }
          p = cStart + csz.val;
        }

        const durTicks = (durationMs * 1_000_000) / timecodeScale;
        if (durPos >= 0 && (durSize === 4 || durSize === 8)) {
          const out = new Uint8Array(bytes);
          const odv = new DataView(out.buffer);
          if (durSize === 4) odv.setFloat32(durPos, durTicks, false);
          else odv.setFloat64(durPos, durTicks, false);
          return new Blob([out], { type: blob.type || "video/webm" });
        }

        // Insert 11-byte Duration element (0x44 0x89 0x88 <float64>) at end of Info
        const durElem = new Uint8Array(11);
        durElem[0] = 0x44;
        durElem[1] = 0x89;
        durElem[2] = 0x88;
        new DataView(durElem.buffer).setFloat64(3, durTicks, false);

        const newInfoVal = sz.val + durElem.byteLength;
        const maxForLen = Math.pow(2, 7 * sz.len) - 2;
        const newInfoSizeBytes = newInfoVal <= maxForLen
          ? writeVintSize(newInfoVal, sz.len)
          : writeVintSize(newInfoVal, sz.len + 1);
        const deltaBytes = durElem.byteLength + (newInfoSizeBytes.byteLength - sz.len);

        const before = new Uint8Array(bytes.slice(0, infoSizePos));
        if (!segUnknown && segSizePos < before.length) {
          const newSegVal = segSizeVal + deltaBytes;
          const maxSeg = Math.pow(2, 7 * segSizeLen) - 2;
          if (newSegVal <= maxSeg) {
            before.set(writeVintSize(newSegVal, segSizeLen), segSizePos);
          }
        }
        const infoBody = bytes.slice(infoDataStart, infoEnd);
        const after = bytes.slice(infoEnd);
        return new Blob([before, newInfoSizeBytes, infoBody, durElem, after], {
          type: blob.type || "video/webm",
        });
      }
      pos = infoEnd;
    }
  } catch (_e) {
    // Fall through to original blob
  }
  return blob;
}


// =========================================================================
// TWO-TIER FAST-START MP4 EXPORTER (WebCodecs Primary + MediaRecorder Fallback)
// =========================================================================
class FastStartMP4Exporter {
  constructor({ canvas, audio, renderFrame, syncTimelineUI, onProgress, onTimeChange }) {
    this.canvas = canvas;
    this.audio = audio;
    this.renderFrame = renderFrame;
    this.syncTimelineUI = syncTimelineUI;
    this.onProgress = onProgress;
    this.onTimeChange = onTimeChange || (() => {});
    this.cancelled = false;
    this.activeRecorder = null;
  }

  cancel() {
    this.cancelled = true;
    if (this.activeRecorder && this.activeRecorder.state !== "inactive") {
      this.activeRecorder.stop();
    }
  }

  async findSupportedVideoConfig(width, height, fps) {
    if (typeof VideoEncoder === "undefined") return null;
    const codecs = [
      "avc1.640028", // High Profile L4.0
      "avc1.64002a", // High Profile L4.2
      "avc1.4d002a", // Main Profile L4.2
      "avc1.4d0028", // Main Profile L4.0
      "avc1.420028", // Baseline L4.0
      "avc1.42001f", // Baseline L3.1
    ];
    for (const codec of codecs) {
      const cfg = {
        codec,
        width,
        height,
        bitrate: 16_000_000,
        bitrateMode: "variable",
        latencyMode: "quality",
        framerate: fps,
        avc: { format: "avc" },
      };
      try {
        const res = await VideoEncoder.isConfigSupported(cfg);
        if (res && res.supported) return cfg;
      } catch (_e) {
        // Try next profile
      }
    }
    return null;
  }

  async findSupportedAudioConfig() {
    if (typeof AudioEncoder === "undefined" || typeof OfflineAudioContext === "undefined") {
      return null;
    }
    const candidates = [
      { codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 },
      { codec: "opus", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 },
    ];
    for (const cfg of candidates) {
      try {
        const res = await AudioEncoder.isConfigSupported(cfg);
        if (res && res.supported) return cfg;
      } catch (_e) {
        // Try next audio codec
      }
    }
    return null;
  }

  async exportWebCodecsMP4(style, width, height, vCfg, aCfg) {
    const baseDur = getDuration(style);
    const plan = (this.audio && typeof this.audio.getTempoPlan === "function")
      ? this.audio.getTempoPlan(style)
      : { clipSpeed: 1.0, effectiveDuration: baseDur };
    const clipSpeed = plan.clipSpeed || 1.0;
    const effectiveDuration = plan.effectiveDuration || baseDur;
    const EXPORT_FPS = 30;
    const TOTAL_FRAMES = Math.round(effectiveDuration * EXPORT_FPS);
    const exactDurationSec = TOTAL_FRAMES / EXPORT_FPS;
    const t0 = performance.now();

    this.onProgress(2, "در حال رندر صدای استودیویی...");

    // 1. Offline Deterministic Audio Render (48kHz stereo, ALWAYS included even if muted)
    const audioBuffer = await this.audio.renderOfflineBuffer(style, exactDurationSec, 48000);
    if (this.cancelled) return null;

    const audioChunks = [];
    let audioSpecificConfig = null;
    let audioError = null;

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !audioSpecificConfig) {
          audioSpecificConfig = toUint8Array(meta.decoderConfig.description).slice();
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        audioChunks.push({ data, timestamp: chunk.timestamp, durationUs: chunk.duration || 0 });
      },
      error: (err) => { audioError = err; },
    });
    audioEncoder.configure(aCfg);

    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
    const totalSamples = audioBuffer.length;
    const frameSize = aCfg.codec === "opus" ? 960 : 1024;

    for (let offset = 0; offset < totalSamples; offset += frameSize) {
      if (this.cancelled) {
        audioEncoder.close();
        return null;
      }
      const count = Math.min(frameSize, totalSamples - offset);
      const planar = new Float32Array(frameSize * 2);
      planar.set(ch0.subarray(offset, offset + count), 0);
      planar.set(ch1.subarray(offset, offset + count), frameSize);

      const audioData = new AudioData({
        format: "f32-planar",
        sampleRate: 48000,
        numberOfFrames: frameSize,
        numberOfChannels: 2,
        timestamp: Math.round((offset / 48000) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }
    await audioEncoder.flush();
    audioEncoder.close();
    if (audioError) throw audioError;

    this.onProgress(10, "در حال رندر فریم های ویدیو (MP4)...");

    // 2. Offline Deterministic Video Render (600 exact frames @ 30fps, keyframe every 1.0s)
    const videoChunks = [];
    let avcC = null;
    let videoError = null;

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) {
          avcC = toUint8Array(meta.decoderConfig.description).slice();
        }
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        videoChunks.push({
          data,
          isKey: chunk.type === "key",
          timestamp: chunk.timestamp,
        });
      },
      error: (err) => { videoError = err; },
    });
    videoEncoder.configure(vCfg);

    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      if (this.cancelled) {
        videoEncoder.close();
        return null;
      }
      if (videoError) throw videoError;

      const tReel = Math.min(baseDur, (frame / EXPORT_FPS) * clipSpeed);
      this.onTimeChange(tReel);
      this.renderFrame(tReel);

      const vf = new VideoFrame(this.canvas, {
        timestamp: Math.round((frame * 1_000_000) / EXPORT_FPS),
        duration: Math.round(1_000_000 / EXPORT_FPS),
      });
      while (videoEncoder.encodeQueueSize > 8 && !this.cancelled) {
        await new Promise((r) => setTimeout(r, 4));
      }
      videoEncoder.encode(vf, { keyFrame: frame % EXPORT_FPS === 0 });
      vf.close();

      if (frame % 4 === 0 || frame === TOTAL_FRAMES - 1) {
        this.syncTimelineUI();
        const pct = 10 + Math.round(((frame + 1) / TOTAL_FRAMES) * 86);
        this.onProgress(pct, "در حال ساخت MP4 با صدای همگام...");
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    await videoEncoder.flush();
    videoEncoder.close();
    if (videoError) throw videoError;
    if (this.cancelled) return null;
    if (!avcC || videoChunks.length === 0) {
      throw new Error("Missing H.264 decoderConfig/avcC from VideoEncoder");
    }

    this.onProgress(98, "در حال بسته بندی Fast-Start MP4...");
    const blob = buildFastStartMP4({
      width,
      height,
      fps: EXPORT_FPS,
      durationSec: exactDurationSec,
      videoChunks,
      avcC,
      audioChunks,
      audioSampleRate: 48000,
      audioChannels: 2,
      audioSpecificConfig,
      audioCodec: aCfg.codec,
    });

    const elapsedMs = Math.round(performance.now() - t0);
    return {
      blob,
      ext: "mp4",
      tier: "webcodecs-mp4",
      codec: `${vCfg.codec}+${aCfg.codec}`,
      videoFrames: videoChunks.length,
      audioFrames: audioChunks.length,
      elapsedMs,
    };
  }

  pickFallbackMime() {
    if (typeof MediaRecorder === "undefined") return null;
    const candidates = [
      { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
      { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
      { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
      { mime: "video/webm", ext: "webm" },
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: "", ext: "webm" };
  }

  exportMediaRecorderFallback(style) {
    return new Promise((resolve, reject) => {
      const chosen = this.pickFallbackMime();
      if (!chosen || !this.canvas.captureStream) {
        reject(new Error("MediaRecorder unsupported"));
        return;
      }

      const t0 = performance.now();
      const stream = this.canvas.captureStream(30);
      const audioTrack = this.audio.getExportStreamTrack();
      if (audioTrack) stream.addTrack(audioTrack);

      const chunks = [];
      let recorder;
      try {
        recorder = chosen.mime
          ? new MediaRecorder(stream, { mimeType: chosen.mime, videoBitsPerSecond: 6_000_000 })
          : new MediaRecorder(stream);
      } catch (_err) {
        recorder = new MediaRecorder(stream);
      }
      this.activeRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        this.audio.stopAll();
        this.audio.setExportMode(false);
        this.activeRecorder = null;

        if (this.cancelled || chunks.length === 0) {
          resolve(null);
          return;
        }
        const baseDur = getDuration(style);
        const plan = (this.audio && typeof this.audio.getTempoPlan === "function")
          ? this.audio.getTempoPlan(style)
          : { clipSpeed: 1.0, effectiveDuration: baseDur };
        const effectiveDuration = plan.effectiveDuration || baseDur;

        let blob = new Blob(chunks, { type: chosen.mime || "video/webm" });
        if (chosen.ext === "webm") {
          blob = await patchWebMDuration(blob, effectiveDuration * 1000);
        }
        resolve({
          blob,
          ext: chosen.ext,
          tier: "mediarecorder-fallback",
          codec: chosen.mime || "default",
          elapsedMs: Math.round(performance.now() - t0),
        });
      };

      const baseDur = getDuration(style);
      const plan = (this.audio && typeof this.audio.getTempoPlan === "function")
        ? this.audio.getTempoPlan(style)
        : { clipSpeed: 1.0, effectiveDuration: baseDur };
      const clipSpeed = plan.clipSpeed || 1.0;
      const effectiveDuration = plan.effectiveDuration || baseDur;

      this.audio.resetCues(true);
      this.onTimeChange(0.0);
      this.renderFrame(0.0);
      this.syncTimelineUI();
      recorder.start(100);

      const startMs = performance.now();
      const step = (now) => {
        if (this.cancelled) {
          if (recorder.state !== "inactive") recorder.stop();
          return;
        }
        const elapsed = (now - startMs) / 1000;
        const curReal = Math.min(elapsed, effectiveDuration);
        const tReel = Math.min(baseDur, curReal * clipSpeed);
        this.onTimeChange(tReel);
        this.audio.processCues(style, curReal);
        this.renderFrame(tReel);
        this.syncTimelineUI();

        const pct = Math.min(100, Math.round((curReal / effectiveDuration) * 100));
        this.onProgress(pct, "در حال ضبط ویدیو با صدا...");

        if (elapsed >= effectiveDuration) {
          if (recorder.state !== "inactive") recorder.stop();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async run(style) {
    this.cancelled = false;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Tier 1: Offline WebCodecs H.264 + AAC + Pure-JS Fast-Start MP4
    const vCfg = await this.findSupportedVideoConfig(width, height, 30);
    const aCfg = vCfg ? await this.findSupportedAudioConfig() : null;

    if (vCfg && aCfg) {
      try {
        const res = await this.exportWebCodecsMP4(style, width, height, vCfg, aCfg);
        if (res || this.cancelled) return res;
      } catch (err) {
        console.warn("WebCodecs MP4 export failed, falling back to MediaRecorder:", err);
      }
    }

    if (this.cancelled) return null;

    // Tier 2: Graceful MediaRecorder fallback with always-on export audio + WebM duration patch
    return await this.exportMediaRecorderFallback(style);
  }
}

export { FastStartMP4Exporter, buildFastStartMP4, patchWebMDuration };
export default FastStartMP4Exporter;
