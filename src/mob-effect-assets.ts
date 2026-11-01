// Private whole original mob_effect_screen materials from fixed Bedrock v1.26.60.5.
// List backgrounds are distinct from the 24px HUD slot background textures.
import type { ClassicSkinAsset } from './classic-skin';
import { inviteAssets } from './invite-assets';

export const mobEffectAssets = Object.freeze({
  mouseThumb: { url: new URL("./assets/mob-effect/classic-button.png", import.meta.url).href, width: 5, height: 5, metadata: {"nineslice_size":2,"base_size":[5,5]} },
  closeDefault: { url: new URL("./assets/mob-effect/legacy_pocket_close_button_default.png", import.meta.url).href, width: 18, height: 18, metadata: {"nineslice_size":2,"base_size":[18,18]} },
  closePressed: { url: new URL("./assets/mob-effect/legacy_pocket_close_button_pressed.png", import.meta.url).href, width: 18, height: 18, metadata: {"nineslice_size":2,"base_size":[18,18]} },
  screenBackground: { url: new URL("./assets/player-permissions/screen_background.png", import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":0,"base_size":[1,1]} },
  scrollTrack: { url: new URL("./assets/document-viewer/ScrollRail.png", import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":1,"base_size":[1,1]} },
  scrollHandle: { url: new URL("./assets/document-viewer/ScrollHandle.png", import.meta.url).href, width: 3, height: 5, metadata: {"nineslice_size":[1,2,1,2],"base_size":[3,5]} },
  touchThumb: { url: new URL("./assets/document-viewer/touchScrollBox.png", import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":1,"base_size":[1,1]} },
  effectBackground: inviteAssets.effect_background,
  ambientBackground: { url: new URL("./assets/mob-effect/effect_background_ambient.png", import.meta.url).href, width: 120, height: 32, metadata: {"nineslice_size":4,"base_size":[120,32]} },
  mainBackground: { url: new URL("./assets/mob-effect/mob_effect_background.png", import.meta.url).href, width: 14, height: 14, metadata: {"nineslice_size":4,"base_size":[14,14]} },
  buttonBackground: { url: new URL("./assets/mob-effect/pocket_tab_right_side.png", import.meta.url).href, width: 14, height: 14, metadata: {"nineslice_size":3,"base_size":[14,14]} },
} as const satisfies Readonly<Record<string, ClassicSkinAsset>>);

/** Named originals reuse the existing HUD icon bank only. Unknown engine #texture
 * bindings remain a host-supplied whole-image choice; there is no replacement art. */
export const mobEffectIconBackgrounds = Object.freeze({
  "absorption": "var(--mc-hud-overlay-texture-effect-absorption)",
  "bad-omen": "var(--mc-hud-overlay-texture-effect-bad-omen)",
  "blindness": "var(--mc-hud-overlay-texture-effect-blindness)",
  "breath-of-the-nautilus": "var(--mc-hud-overlay-texture-effect-breath-of-the-nautilus)",
  "conduit-power": "var(--mc-hud-overlay-texture-effect-conduit-power)",
  "darkness": "var(--mc-hud-overlay-texture-effect-darkness)",
  "fire-resistance": "var(--mc-hud-overlay-texture-effect-fire-resistance)",
  "haste": "var(--mc-hud-overlay-texture-effect-haste)",
  "health-boost": "var(--mc-hud-overlay-texture-effect-health-boost)",
  "hunger": "var(--mc-hud-overlay-texture-effect-hunger)",
  "infested": "var(--mc-hud-overlay-texture-effect-infested)",
  "invisibility": "var(--mc-hud-overlay-texture-effect-invisibility)",
  "jump-boost": "var(--mc-hud-overlay-texture-effect-jump-boost)",
  "levitation": "var(--mc-hud-overlay-texture-effect-levitation)",
  "mining-fatigue": "var(--mc-hud-overlay-texture-effect-mining-fatigue)",
  "nausea": "var(--mc-hud-overlay-texture-effect-nausea)",
  "night-vision": "var(--mc-hud-overlay-texture-effect-night-vision)",
  "oozing": "var(--mc-hud-overlay-texture-effect-oozing)",
  "poison": "var(--mc-hud-overlay-texture-effect-poison)",
  "raid-omen": "var(--mc-hud-overlay-texture-effect-raid-omen)",
  "regeneration": "var(--mc-hud-overlay-texture-effect-regeneration)",
  "resistance": "var(--mc-hud-overlay-texture-effect-resistance)",
  "slow-falling": "var(--mc-hud-overlay-texture-effect-slow-falling)",
  "slowness": "var(--mc-hud-overlay-texture-effect-slowness)",
  "speed": "var(--mc-hud-overlay-texture-effect-speed)",
  "strength": "var(--mc-hud-overlay-texture-effect-strength)",
  "trial-omen": "var(--mc-hud-overlay-texture-effect-trial-omen)",
  "village-hero": "var(--mc-hud-overlay-texture-effect-village-hero)",
  "water-breathing": "var(--mc-hud-overlay-texture-effect-water-breathing)",
  "weakness": "var(--mc-hud-overlay-texture-effect-weakness)",
  "weaving": "var(--mc-hud-overlay-texture-effect-weaving)",
  "wind-charged": "var(--mc-hud-overlay-texture-effect-wind-charged)",
  "wither": "var(--mc-hud-overlay-texture-effect-wither)",
} as const);
