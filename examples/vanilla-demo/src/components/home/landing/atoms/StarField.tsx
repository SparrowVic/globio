import { useMemo } from 'react';

/**
 * A static, tiled star pattern for the stage background. Generated once as
 * an SVG data URI (deterministic LCG so every load matches) and painted by
 * CSS — zero per-frame cost, unlike the WebGL starfield inside a canvas,
 * which would stop at the canvas edge and betray the crop.
 */
export function StarField({ className }: { readonly className?: string }) {
  const tile = useMemo(() => {
    let seed = 20260907;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const stars: string[] = [];
    for (let i = 0; i < 110; i += 1) {
      const x = (rand() * 700).toFixed(1);
      const y = (rand() * 700).toFixed(1);
      const size = rand();
      const radius = size > 0.92 ? 1.5 : size > 0.7 ? 1.05 : 0.7;
      const alpha = (0.25 + rand() * 0.6).toFixed(2);
      const warm = rand() > 0.72;
      const fill = warm ? '%23ffe9c4' : '%23dcebff';
      stars.push(`<circle cx='${x}' cy='${y}' r='${radius}' fill='${fill}' fill-opacity='${alpha}'/>`);
    }
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='700' viewBox='0 0 700 700'%3E${stars.join('')}%3C/svg%3E")`;
  }, []);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ backgroundImage: tile, backgroundSize: '700px 700px' }}
    />
  );
}
