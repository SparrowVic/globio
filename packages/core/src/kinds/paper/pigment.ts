import { Color } from 'three';

const FALLBACK_INK = '#5b3a1f';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Paper layers accept the canonical arc/marker color API, but visually
 * reinterpret every input as ink or watercolor pigment. This keeps shared
 * demo fixtures useful while preventing neon cyber colors from leaking
 * into the atlas personality.
 */
export const paperPigment = (
  input: string | null | undefined,
  fallback = FALLBACK_INK,
): Color => {
  const source = input && input !== '' ? input : fallback || FALLBACK_INK;
  const color = new Color();
  const rgb = parseCssRgb(source);
  if (rgb) {
    color.setRGB(rgb.r, rgb.g, rgb.b);
  } else {
    try {
      color.set(source);
    } catch {
      color.set(fallback || FALLBACK_INK);
    }
  }

  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  const out = new Color();
  out.setHSL(
    hsl.h,
    clamp(hsl.s * 0.42 + 0.13, 0.16, 0.52),
    clamp(hsl.l * 0.48 + 0.12, 0.24, 0.5),
  );
  return out;
};

const parseCssRgb = (value: string): { r: number; g: number; b: number } | null => {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (!match) return null;
  return {
    r: clamp(Number(match[1]) / 255, 0, 1),
    g: clamp(Number(match[2]) / 255, 0, 1),
    b: clamp(Number(match[3]) / 255, 0, 1),
  };
};
