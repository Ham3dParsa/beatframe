import { renderBit2 } from "./bit2.js";
import { renderAtashkadeh } from "./atashkadeh.js";
import { renderKinetic } from "./kinetic.js";
import { renderAtashProReel, renderCyberProReel } from "./atashpro.js";

export const REEL_RENDERERS = {
  bit2: renderBit2,
  atashkadeh: renderAtashkadeh,
  kinetic: renderKinetic,
  atashpro: renderAtashProReel,
  cyberpro: renderCyberProReel,
};

export function renderReel(style, ctx, W, H, t, isPortrait) {
  const renderer = REEL_RENDERERS[style] || REEL_RENDERERS.kinetic;
  renderer(ctx, W, H, t, isPortrait);
}
