// Cinematic texture set — optional real-Earth maps (day / night / normal /
// specular / clouds) loaded asynchronously and handed to the surface and
// cloud layers. Any subset works; the procedural look fills the gaps.
//
// Colour handling: the cinematic shaders were tuned as "display-ready"
// (no final sRGB encode), so textures are bound with `NoColorSpace` and
// sampled raw — an sRGB-decoded day map would look dark and over-
// contrasted next to the procedural biomes.

import {
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  Texture,
  TextureLoader,
} from 'three';
import type { CinematicTexturesConfig } from '../../types/kinds';

export type CinematicTextureSlot = 'day' | 'night' | 'normal' | 'specular' | 'clouds';

export interface CinematicTextureSetSnapshot {
  readonly day: Texture | null;
  readonly night: Texture | null;
  readonly normal: Texture | null;
  readonly specular: Texture | null;
  readonly clouds: Texture | null;
}

export interface CinematicTextureSetOptions {
  /** Fired whenever the bound set changes (a slot loaded or was cleared). */
  readonly onChange: (snapshot: CinematicTextureSetSnapshot, fadeMs: number) => void;
  /** Max anisotropy supported by the renderer; clamps the config value. */
  readonly maxAnisotropy?: number;
}

const SLOTS: ReadonlyArray<CinematicTextureSlot> = ['day', 'night', 'normal', 'specular', 'clouds'];
const DEFAULT_ANISOTROPY = 8;
const DEFAULT_FADE_MS = 800;

let warnedOnce = false;

export class CinematicTextureSet {
  private readonly loader = new TextureLoader();
  private readonly onChange: CinematicTextureSetOptions['onChange'];
  private readonly maxAnisotropy: number;
  /** Textures this set created (URL loads) and therefore must dispose. */
  private readonly ownedBySlot = new Map<CinematicTextureSlot, Texture>();
  private current: CinematicTextureSetSnapshot = emptySnapshot();
  private generation = 0;
  private fadeMs = DEFAULT_FADE_MS;
  private lastKey: string | null = null;

  public constructor(options: CinematicTextureSetOptions) {
    this.onChange = options.onChange;
    this.maxAnisotropy = options.maxAnisotropy ?? 16;
  }

  public get snapshot(): CinematicTextureSetSnapshot {
    return this.current;
  }

  /**
   * Replace the whole set. `null` / `undefined` clears every slot and
   * returns to the procedural look. URLs load asynchronously and swap in
   * as they arrive; until then the slot keeps whatever it showed before,
   * so a config change never flashes back to procedural. `Texture`
   * instances bind immediately and are never disposed by this class.
   *
   * Calling this with an unchanged config is a no-op — Studio pushes the
   * full config on every knob edit, and reloading five maps per slider
   * tick would thrash the GPU.
   */
  public load(config: CinematicTexturesConfig | null | undefined): void {
    const key = configKey(config);
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.generation += 1;
    const generation = this.generation;
    this.fadeMs = config?.fadeMs !== undefined && config.fadeMs >= 0 ? config.fadeMs : DEFAULT_FADE_MS;
    const anisotropy = Math.max(
      1,
      Math.min(this.maxAnisotropy, config?.anisotropy ?? DEFAULT_ANISOTROPY),
    );

    const next: Record<CinematicTextureSlot, Texture | null> = { ...this.current };
    const pending: Array<{ slot: CinematicTextureSlot; url: string }> = [];
    for (const slot of SLOTS) {
      const value = config?.[slot];
      if (typeof value === 'string' && value !== '') {
        // Keep the previous texture bound while the new one loads.
        pending.push({ slot, url: value });
      } else if (value instanceof Texture) {
        this.releaseSlot(slot);
        next[slot] = this.configure(value, slot, anisotropy);
      } else {
        this.releaseSlot(slot);
        next[slot] = null;
      }
    }

    this.current = next;
    this.onChange(this.current, this.fadeMs);

    for (const { slot, url } of pending) {
      this.loader.load(
        url,
        (texture) => {
          if (generation !== this.generation) {
            texture.dispose();
            return;
          }
          this.releaseSlot(slot);
          this.ownedBySlot.set(slot, texture);
          this.current = { ...this.current, [slot]: this.configure(texture, slot, anisotropy) };
          this.onChange(this.current, this.fadeMs);
        },
        undefined,
        () => {
          if (!warnedOnce) {
            warnedOnce = true;
            console.warn(`[globio] cinematic texture failed to load: ${url} — that slot keeps its previous map (or the procedural look)`);
          }
        },
      );
    }
  }

  public dispose(): void {
    this.generation += 1;
    for (const slot of SLOTS) this.releaseSlot(slot);
    this.current = emptySnapshot();
    this.lastKey = null;
  }

  private configure(texture: Texture, _slot: CinematicTextureSlot, anisotropy: number): Texture {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = anisotropy;
    // Every slot — colour maps and the normal map alike — is sampled raw
    // (see the file header); three's default flipY matches the
    // equirectangular convention the surface shader uses.
    texture.colorSpace = NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  /** Dispose the texture this set owns for `slot`, if any. */
  private releaseSlot(slot: CinematicTextureSlot): void {
    const owned = this.ownedBySlot.get(slot);
    if (owned === undefined) return;
    owned.dispose();
    this.ownedBySlot.delete(slot);
  }
}

/** Identity of a texture config: URLs, Texture uuids, anisotropy, fade. */
const configKey = (config: CinematicTexturesConfig | null | undefined): string => {
  if (!config) return 'none';
  const parts: string[] = [];
  for (const slot of SLOTS) {
    const value = config[slot];
    if (value instanceof Texture) parts.push(`${slot}=tex:${value.uuid}`);
    else if (typeof value === 'string' && value !== '') parts.push(`${slot}=url:${value}`);
  }
  parts.push(`aniso:${config.anisotropy ?? DEFAULT_ANISOTROPY}`, `fade:${config.fadeMs ?? DEFAULT_FADE_MS}`);
  return parts.join('|');
};

const emptySnapshot = (): CinematicTextureSetSnapshot => ({
  day: null,
  night: null,
  normal: null,
  specular: null,
  clouds: null,
});
